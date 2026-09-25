import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { jobPostings } from "../../lib/mockData";
import { supabase } from "../../lib/supabaseClient";

export default function JobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", location: "", coverNote: "" });
  const [error, setError] = useState("");
  const [job, setJob] = useState(() => (supabase ? null : jobPostings.find((j) => j.id === jobId)));
  const [loading, setLoading] = useState(Boolean(supabase));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) return undefined;
    let mounted = true;
    supabase.from("job_postings").select("*").eq("id", jobId).eq("is_open", true).maybeSingle().then(({ data, error: queryError }) => {
      if (!mounted) return;
      if (queryError) setError("This posting is temporarily unavailable.");
      setJob(data ?? null);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [jobId]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function selectFile(nextFile) {
    setError("");
    if (!nextFile) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const extension = nextFile.name.split(".").pop()?.toLowerCase();
    if (!allowedTypes.includes(nextFile.type) && !["pdf", "doc", "docx"].includes(extension)) {
      setError("Please choose a PDF, DOC, or DOCX file.");
      return;
    }
    if (nextFile.size > 5 * 1024 * 1024) {
      setError("Your CV must be 5 MB or smaller.");
      return;
    }
    setFile(nextFile);
  }

  if (loading) return <p className="pt-10 text-ink-2">Loading posting...</p>;
  if (!job) {
    return (
      <div className="pt-10">
        <p className="text-ink-2">Couldn't find that posting.</p>
        <Link to="/" className="text-teal text-sm">← Back to open roles</Link>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Please attach your CV before submitting.");
      return;
    }
    if (!supabase) {
      setError("Applications are unavailable until Supabase is configured.");
      return;
    }

    setSubmitting(true);
    const applicationId = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${applicationId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("cvs").upload(filePath, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (uploadError) {
      setSubmitting(false);
      setError(`CV upload failed: ${uploadError.message}`);
      return;
    }

    const { data: application, error: insertError } = await supabase.rpc("submit_application", {
      p_id: applicationId,
      p_job_posting_id: job.id,
      p_candidate_name: form.name,
      p_candidate_email: form.email,
      p_candidate_phone: form.phone,
      p_candidate_location: form.location,
      p_cover_note: form.coverNote,
      p_cv_file_name: file.name,
      p_cv_file_path: filePath,
    });
    if (insertError) {
      await supabase.storage.from("cvs").remove([filePath]);
      setSubmitting(false);
      setError(`Application could not be submitted: ${insertError.message}`);
      return;
    }

    const scoreResult = await supabase.functions.invoke("score-application", { body: { applicationId } });
    if (scoreResult?.error || scoreResult?.data?.error) {
      console.error("CV scoring failed:", scoreResult.error || scoreResult.data.error);
    }

    const emailResult = await supabase.functions.invoke("send-application-email", { body: { applicationId, event: "submitted" } });
    if (emailResult?.error) {
      console.error("Confirmation email failed:", emailResult.error);
    }
    navigate(`/confirmation/${job.id}?reference=${encodeURIComponent(application?.[0]?.reference_code ?? "")}`);
  }

  return (
    <>
      <Link to="/" className="text-ink-2 text-sm inline-block my-5">← Back to open roles</Link>

      <h1 className="text-2xl font-semibold tracking-tight mb-2">{job.title}</h1>
      <p className="text-ink-2 text-sm mb-1">
        <span className="mr-3">{job.department}</span>
        <span className="mr-3">{job.location}</span>
        <span>{job.employment_type}</span>
      </p>
      <p className="text-teal text-sm mb-7">{job.deadline}</p>

      <div className="panel">
        <h2 className="font-semibold text-sm mb-2">About the role</h2>
        <p className="text-ink-1 text-sm leading-relaxed">{job.description}</p>
      </div>

      <div className="panel">
        <h2 className="font-semibold text-sm mb-2">Requirements</h2>
        <p className="text-ink-1 text-sm leading-relaxed">{job.requirements}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="panel flex flex-col gap-4">
          <h2 className="font-semibold text-sm">Apply for this role</h2>

          <div className="grid grid-cols-2 gap-4 max-[520px]:grid-cols-1">
            <Field label="Full name"><input name="name" value={form.name} onChange={updateField} type="text" placeholder="e.g. Ada Okonkwo" required className="field-input" /></Field>
            <Field label="Phone number"><input name="phone" value={form.phone} onChange={updateField} type="tel" placeholder="e.g. 080..." required className="field-input" /></Field>
          </div>
          <Field label="Email address"><input name="email" value={form.email} onChange={updateField} type="email" placeholder="you@example.com" required className="field-input" /></Field>
          <Field label="Current location"><input name="location" value={form.location} onChange={updateField} type="text" placeholder="e.g. Ikeja, Lagos" required className="field-input" /></Field>
          <Field label="Cover note (optional)"><textarea name="coverNote" value={form.coverNote} onChange={updateField} placeholder="Anything you'd like us to know" className="field-input min-h-[80px]" /></Field>

          <div>
            <label className="block text-sm text-ink-2 mb-1.5">CV</label>
            {!file ? (
              <label
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                                onDrop={(e) => { e.preventDefault(); setDragActive(false); selectFile(e.dataTransfer.files[0]); }}
                className={`block border-2 border-dashed rounded-xl text-center p-7 cursor-pointer ${
                  dragActive ? "border-teal bg-teal/10" : "border-[var(--card-border)]"
                }`}
              >
                <div className="text-sm text-ink-1 mb-1">Drag your CV here, or click to browse</div>
                <div className="text-xs text-ink-2">PDF or DOCX, up to 5MB</div>
                <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => selectFile(e.target.files[0])} />
              </label>
            ) : (
              <div className="flex items-center justify-between bg-[var(--field-bg)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm">
                <span>{file.name} — {(file.size / 1024 / 1024).toFixed(2)} MB</span>
                <button type="button" onClick={() => setFile(null)} className="text-ink-2 text-xs">Remove</button>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-bad" role="alert">{error}</p>}

          <button type="submit" disabled={submitting} className="self-start bg-amber text-[#1a1204] font-semibold text-sm px-5 py-3 rounded-lg disabled:opacity-60">
            {submitting ? "Submitting..." : "Submit application"}
          </button>
          <p className="text-xs text-ink-2">You'll get a confirmation email with a reference number. Your CV is reviewed against the role requirements after submission.</p>
        </div>
      </form>
    </>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm text-ink-2 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
