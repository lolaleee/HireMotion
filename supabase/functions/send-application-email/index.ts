import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.15";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await request.json();
    const { applicationId, event, subject, text, recipient } = payload;
    if (!applicationId || !["submitted", "shortlisted", "interview_scheduled", "rejected"].includes(event)) {
      return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: application, error } = await admin
      .from("applications")
      .select("candidate_name, candidate_email, reference_code, job_postings(title)")
      .eq("id", applicationId)
      .single();
    if (error || !application) throw new Error("Application not found");

    const firstName = application.candidate_name.split(" ")[0];
    const jobTitle = application.job_postings?.title ?? "the role";
    const candidateEmail = recipient ?? application.candidate_email;
    const defaultContent = event === "submitted"
      ? `Hi ${firstName},\n\nWe received your application for ${jobTitle}. Your reference number is ${application.reference_code}.\n\nWe will contact you when there is an update.`
      : event === "shortlisted"
        ? `Hi ${firstName},\n\nYou have been shortlisted for ${jobTitle}. Our team will contact you with the next steps.`
        : event === "interview_scheduled"
          ? `Hi ${firstName},\n\nYour interview for ${jobTitle} has been scheduled. Please review the interview details in this email.`
          : `Hi ${firstName},\n\nThank you for applying for ${jobTitle}. We have decided to move forward with other candidates at this time.`;

    const mailSubject = subject || (event === "submitted" ? `Application received - ${jobTitle}` : event === "shortlisted" ? `You've been shortlisted - ${jobTitle}` : event === "interview_scheduled" ? `Interview scheduled - ${jobTitle}` : `Update on your application - ${jobTitle}`);
    const content = text || defaultContent;
    const smtpHost = Deno.env.get("SMTP_HOST")?.trim();
    const smtpPort = Number(Deno.env.get("SMTP_PORT") ?? "587");
    const smtpUser = Deno.env.get("SMTP_USER")?.trim();
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    const smtpFrom = Deno.env.get("SMTP_FROM")?.trim();
    if (!smtpHost || !smtpUser || !smtpPassword || !smtpFrom) {
      throw new Error("SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM must be configured in Supabase secrets");
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPassword },
    });
    await transporter.sendMail({
      from: smtpFrom,
      to: candidateEmail,
      subject: mailSubject,
      text: content,
    });

    return new Response(JSON.stringify({ sent: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Email failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
