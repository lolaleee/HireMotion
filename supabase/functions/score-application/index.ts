import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";
import { getDocument } from "https://esm.sh/pdfjs-dist@4.10.38/legacy/build/pdf.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STOP_WORDS = new Set([
  "and", "the", "for", "with", "from", "that", "this", "will", "have", "years", "year",
  "your", "our", "their", "they", "are", "you", "all", "any", "into", "using", "use",
  "must", "should", "can", "able", "work", "role", "team", "job", "including", "etc",
]);

function decodeXml(value: string) {
  return value
    .replace(/<w:tab\s*\/?>(\s*)/g, " ")
    .replace(/<w:br\s*\/?>(\s*)/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractDocx(bytes: Uint8Array) {
  const zip = await JSZip.loadAsync(bytes);
  const documentXml = await zip.file("word/document.xml")?.async("text");
  if (!documentXml) throw new Error("DOCX document text could not be read");
  return decodeXml(documentXml);
}

async function extractPdf(bytes: Uint8Array) {
  const document = await getDocument({
    data: bytes,
    disableWorker: true,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
  }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item: { str?: string }) => item.str ?? "").join(" "));
  }
  return pages.join("\n").trim();
}

async function extractText(fileName: string, bytes: Uint8Array) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return extractPdf(bytes);
  if (extension === "docx") return extractDocx(bytes);
  throw new Error("Only PDF and DOCX files can be matched automatically");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let applicationId = "";
  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    ({ applicationId } = await request.json());
    if (!applicationId) throw new Error("applicationId is required");

    const { data: application, error: applicationError } = await admin
      .from("applications")
      .select("id, cv_file_name, cv_file_path, job_postings(title, description, requirements)")
      .eq("id", applicationId)
      .single();
    if (applicationError || !application) throw new Error("Application not found");

    await admin.from("applications").update({ scoring_status: "processing", scoring_error: null }).eq("id", applicationId);

    const { data: file, error: fileError } = await admin.storage.from("cvs").download(application.cv_file_path);
    if (fileError || !file) throw new Error(`CV could not be downloaded: ${fileError?.message ?? "file not found"}`);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const cvText = await extractText(application.cv_file_name, bytes);
    if (cvText.length < 20) throw new Error("The CV did not contain readable text");

    const job = application.job_postings as { title?: string; description?: string; requirements?: string } | null;
    const openAiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
    if (!openAiKey) throw new Error("OPENAI_API_KEY is not configured in Supabase secrets");

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are a careful recruitment screening assistant. Evaluate only evidence in the CV and job description. Do not infer protected characteristics or make decisions based on age, gender, ethnicity, religion, disability, nationality, marital status, photo, or address. Return valid JSON only with: decision (strong_match, possible_match, not_a_match), score (integer 0-100), summary (string), matches (array of concise evidence strings), gaps (array of missing or unclear requirements), concerns (array of factual review notes). A score is not a hiring decision; flag uncertainty for human review.",
          },
          {
            role: "user",
            content: JSON.stringify({
              position: job?.title ?? "Untitled role",
              description: job?.description ?? "",
              requirements: job?.requirements ?? "",
              cv: cvText.slice(0, 50000),
            }),
          },
        ],
      }),
    });
    if (!aiResponse.ok) throw new Error(`OpenAI ${aiResponse.status}: ${await aiResponse.text()}`);

    const aiPayload = await aiResponse.json();
    const rawResult = aiPayload.choices?.[0]?.message?.content;
    if (!rawResult) throw new Error("OpenAI returned no screening result");
    const result = JSON.parse(rawResult) as {
      decision?: string;
      score?: number;
      summary?: string;
      matches?: string[];
      gaps?: string[];
      concerns?: string[];
    };
    const allowedDecisions = new Set(["strong_match", "possible_match", "not_a_match"]);
    const decision = allowedDecisions.has(result.decision ?? "") ? result.decision : "possible_match";
    const score = Math.max(0, Math.min(100, Math.round(Number(result.score ?? 0))));
    const matched = Array.isArray(result.matches) ? result.matches.slice(0, 20) : [];
    const missing = Array.isArray(result.gaps) ? result.gaps.slice(0, 20) : [];
    const concerns = Array.isArray(result.concerns) ? result.concerns.slice(0, 20) : [];
    const fitSummary = result.summary?.trim() || "AI screening completed. Review the evidence before making a hiring decision.";

    const { error: updateError } = await admin.from("applications").update({
      fit_score: score,
      fit_summary: fitSummary,
      fit_matches: matched,
      fit_gaps: [...missing, ...concerns].slice(0, 20),
      fit_decision: decision,
      cv_text: cvText.slice(0, 50000),
      scoring_status: "scored",
      scoring_error: null,
      scored_at: new Date().toISOString(),
    }).eq("id", applicationId);
    if (updateError) throw new Error(`Score could not be saved: ${updateError.message}`);

    return new Response(JSON.stringify({ score, decision, matched, missing, concerns }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CV scoring failed";
    if (applicationId) {
      await admin.from("applications").update({ scoring_status: "failed", scoring_error: message }).eq("id", applicationId);
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
