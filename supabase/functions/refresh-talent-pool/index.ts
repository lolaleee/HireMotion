import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STOP_WORDS = new Set([
  "and", "the", "for", "with", "from", "that", "this", "will", "have", "years", "year",
  "your", "our", "their", "they", "are", "you", "all", "any", "into", "using", "use",
  "must", "should", "can", "able", "work", "role", "team", "job", "including", "etc",
]);

function keywords(value: string) {
  return [...new Set(value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").split(/\s+/).filter((word) => word.length > 2 && !STOP_WORDS.has(word)))];
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const { applicationId } = await request.json();
    if (!applicationId) throw new Error("applicationId is required");

    const { data: application, error: applicationError } = await admin
      .from("applications")
      .select("id, cv_text, job_posting_id, job_postings!inner(company_id, title)")
      .eq("id", applicationId)
      .single();
    if (applicationError || !application) throw new Error("Application not found");
    if (!application.cv_text) throw new Error("This application has no readable CV text. Retry CV scoring first.");

    const companyId = application.job_postings.company_id;
    const { data: settings } = await admin.from("company_settings").select("pool_match_threshold").eq("company_id", companyId).maybeSingle();
    const threshold = Number(settings?.pool_match_threshold ?? 60);
    const { data: jobs, error: jobsError } = await admin
      .from("job_postings")
      .select("id, title, description, requirements")
      .eq("company_id", companyId)
      .eq("is_open", true)
      .neq("id", application.job_posting_id);
    if (jobsError) throw new Error(`Open roles could not be loaded: ${jobsError.message}`);

    const cvText = application.cv_text.toLowerCase();
    const matches = (jobs ?? []).map((job) => {
      const required = keywords(`${job.title} ${job.description ?? ""} ${job.requirements ?? ""}`);
      const matched = required.filter((keyword) => cvText.includes(keyword));
      const score = required.length ? Math.round((matched.length / required.length) * 100) : 0;
      return {
        application_id: applicationId,
        matched_job_posting_id: job.id,
        score,
        match_summary: `${matched.length} of ${required.length} role keywords found in the CV.`,
        dismissed: false,
      };
    }).filter((match) => match.score >= threshold);

    await admin.from("talent_pool_matches").delete().eq("application_id", applicationId);
    if (matches.length) {
      const { error: insertError } = await admin.from("talent_pool_matches").upsert(matches, { onConflict: "application_id,matched_job_posting_id" });
      if (insertError) throw new Error(`Talent pool matches could not be saved: ${insertError.message}`);
    }

    return new Response(JSON.stringify({ matches: matches.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Talent pool refresh failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
