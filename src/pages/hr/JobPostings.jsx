import { useEffect, useState } from "react";
import { jobPostings, applications, talentPoolMatches } from "../../lib/mockData";
import ThemeToggle from "../../components/ThemeToggle";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";
import { buildTalentReuseRecommendations } from "../../lib/hiringLogic";

const DEPARTMENTS = ["Quality Control", "Store", "HR and Admin", "HSE", "Sales", "Operations"];

export default function JobPostings() {
  const { profile } = useAuth();
  const [rows, setRows] = useState(() => (supabase ? [] : jobPostings));
  const [form, setForm] = useState({ title: "", department: DEPARTMENTS[0], location: "", employmentType: "Full-time", deadline: "", description: "", requirements: "" });
  const [loading, setLoading] = useState(Boolean(supabase));
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase || !profile?.company_id) return undefined;
    let mounted = true;
    supabase.from("job_postings").select("*, applications(count)").eq("company_id", profile.company_id).order("created_at", { ascending: false }).then(({ data, error: queryError }) => {
      if (!mounted) return;
      if (queryError) setError("Job postings are temporarily unavailable.");
      else setRows(data ?? []);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [profile?.company_id]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!supabase || !profile?.company_id) return setError("Supabase is not configured for publishing.");
    setSubmitting(true);
    setError("");
    const { data, error: insertError } = await supabase.from("job_postings").insert({ company_id: profile.company_id, title: form.title.trim(), department: form.department, location: form.location.trim(), employment_type: form.employmentType, deadline: form.deadline || null, description: form.description.trim(), requirements: form.requirements.trim() }).select("*, applications(count)").single();
    setSubmitting(false);
    if (insertError) return setError(insertError.message);
    setRows((current) => [data, ...current]);
    setForm({ title: "", department: DEPARTMENTS[0], location: "", employmentType: "Full-time", deadline: "", description: "", requirements: "" });
  }

  async function updateJobStatus(jobId, nextOpen) {
    if (!supabase) return setError("Supabase is not configured for job updates.");
    setActionLoadingId(jobId);
    setError("");
    const { error: updateError } = await supabase.from("job_postings").update({ is_open: nextOpen, updated_at: new Date().toISOString() }).eq("id", jobId);
    setActionLoadingId(null);
    if (updateError) return setError(updateError.message);
    setRows((current) => current.map((job) => job.id === jobId ? { ...job, is_open: nextOpen } : job));
  }

  async function deleteJob(job) {
    if (!supabase) return setError("Supabase is not configured for job removal.");
    const applicationCount = Number(job.applications?.[0]?.count ?? job.application_count ?? 0);
    setActionLoadingId(job.id);
    setError("");

    if (applicationCount > 0) {
      const { error: closeError } = await supabase.from("job_postings").update({ is_open: false, updated_at: new Date().toISOString() }).eq("id", job.id);
      setActionLoadingId(null);
      if (closeError) return setError(closeError.message);
      setRows((current) => current.map((item) => item.id === job.id ? { ...item, is_open: false } : item));
      return;
    }

    const { error: deleteError } = await supabase.from("job_postings").delete().eq("id", job.id);
    setActionLoadingId(null);
    if (deleteError) return setError(deleteError.message);
    setRows((current) => current.filter((item) => item.id !== job.id));
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold">Job postings</h1>
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <a href="#new-posting" className="bg-amber text-[#1a1204] text-sm font-semibold px-4 py-2 rounded-lg">
            New posting
          </a>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-[var(--card-border)] bg-navy-1 p-4">
        <p className="text-xs uppercase tracking-[0.12em] text-ink-2 mb-2">Talent reuse</p>
        <div className="flex flex-wrap gap-2.5">
          {(() => {
            const reuse = buildTalentReuseRecommendations({
              job: rows[0] || { title: "Current role", description: "", requirements: "" },
              candidates: applications,
              talentPoolMatches,
            });
            return reuse.slice(0, 3).map((candidate) => (
              <span key={candidate.id} className="rounded-full bg-teal/10 px-2.5 py-1 text-[11px] text-teal">
                {candidate.candidate} · {candidate.score}%
              </span>
            ));
          })()}
          <span className="rounded-full bg-amber/10 px-2.5 py-1 text-[11px] text-amber">Reopen role → review top-fit candidates</span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 mb-8">
        {!loading && rows.map((job) => {
          const reuseCandidates = buildTalentReuseRecommendations({
            job,
            candidates: applications,
            talentPoolMatches,
          });

          return (
            <div key={job.id} className="flex flex-wrap items-center justify-between gap-3.5 bg-navy-1 border border-[var(--card-border)] rounded-xl px-4 py-4 hover:border-teal/50 transition-colors">
              <a href={`/hr/applications?job=${encodeURIComponent(job.id)}`} className="flex-1 min-w-[250px]">
                <div>
                  <p className="font-semibold text-sm mb-0.5">{job.title}</p>
                  <p className="text-xs text-ink-2">
                    <span className="mr-3">{job.department}</span>
                    <span className="mr-3">{job.location}</span>
                    <span className="mr-3">{job.employment_type}</span>
                    <span>{job.deadline}</span>
                  </p>
                  {reuseCandidates.length > 0 && (
                    <p className="text-[11px] text-teal mt-1.5">
                      Reuse talent: {reuseCandidates.length} strong candidate{reuseCandidates.length > 1 ? "s" : ""} ready to revisit.
                    </p>
                  )}
                </div>
              </a>
              <div className="flex items-center gap-3.5 flex-wrap">
                <span className="text-xs text-ink-2">{job.applications?.[0]?.count ?? job.application_count ?? 0} applications</span>
                <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${job.is_open ? "bg-ok/15 text-ok" : "bg-ink-2/15 text-ink-2"}`}>
                  {job.is_open ? "Open" : "Closed"}
                </span>
                <button
                  type="button"
                  onClick={() => updateJobStatus(job.id, !job.is_open)}
                  disabled={actionLoadingId === job.id}
                  className="text-teal text-xs cursor-pointer disabled:opacity-60"
                >
                  {actionLoadingId === job.id ? "Updating..." : job.is_open ? "Close" : "Reopen"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteJob(job)}
                  disabled={actionLoadingId === job.id}
                  className="text-bad text-xs cursor-pointer disabled:opacity-60"
                >
                  {actionLoadingId === job.id ? "Working..." : Number(job.applications?.[0]?.count ?? job.application_count ?? 0) > 0 ? "Archive" : "Delete"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {loading && <p className="text-ink-2 text-sm mb-4">Loading job postings...</p>}
      {error && <p className="text-bad text-sm mb-4" role="alert">{error}</p>}

      <h2 id="new-posting" className="text-base font-semibold mb-3.5">New posting</h2>
      <form onSubmit={handleSubmit} className="max-w-xl flex flex-col gap-4 bg-navy-1 border border-[var(--card-border)] rounded-xl p-5">
        <div className="grid grid-cols-2 gap-3.5 max-[520px]:grid-cols-1">
          <Field label="Job title"><input name="title" value={form.title} onChange={updateField} type="text" placeholder="e.g. Warehouse Supervisor" required className="field-input" /></Field>
          <Field label="Department">
            <select name="department" value={form.department} onChange={updateField} className="field-input">
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3.5 max-[520px]:grid-cols-1">
          <Field label="Location"><input name="location" value={form.location} onChange={updateField} type="text" placeholder="e.g. Lagos, NG" required className="field-input" /></Field>
          <Field label="Employment type">
            <select name="employmentType" value={form.employmentType} onChange={updateField} className="field-input"><option>Full-time</option><option>Contract</option><option>Part-time</option></select>
          </Field>
          <Field label="Deadline"><input type="date" className="field-input" /></Field>
        </div>
          <Field label="Job description"><textarea name="description" value={form.description} onChange={updateField} placeholder="What the role involves day to day" required className="field-input min-h-[70px]" /></Field>
        <Field label="Requirements"><textarea name="requirements" value={form.requirements} onChange={updateField} placeholder="e.g. 3+ years in HR, degree in any field" required className="field-input min-h-[70px]" /></Field>
        <button type="submit" disabled={submitting} className="self-start bg-amber text-[#1a1204] font-semibold text-sm px-5 py-2.5 rounded-lg disabled:opacity-60">
          {submitting ? "Publishing..." : "Publish posting"}
        </button>
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
