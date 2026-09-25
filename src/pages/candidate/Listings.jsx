import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { jobPostings } from "../../lib/mockData";
import { supabase } from "../../lib/supabaseClient";

const DEPARTMENTS = ["All departments", "Quality Control", "Store", "HR and Admin", "HSE", "Sales", "Operations"];

export default function Listings() {
  const [activeDept, setActiveDept] = useState("All departments");
  const [jobs, setJobs] = useState(() => (supabase ? [] : jobPostings.filter((j) => j.is_open)));
  const [companyName, setCompanyName] = useState(() => (supabase ? "" : "Mirelle"));
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return undefined;
    let mounted = true;
    Promise.all([
      supabase.from("job_postings").select("*").eq("is_open", true).order("created_at", { ascending: false }),
      supabase.rpc("get_public_company_name"),
    ]).then(([jobsResult, companyResult]) => {
      if (!mounted) return;
      if (jobsResult.error) setError("Open roles are temporarily unavailable.");
      else setJobs(jobsResult.data ?? []);
      if (!companyResult.error && companyResult.data) setCompanyName(companyResult.data);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const filtered = activeDept === "All departments" ? jobs : jobs.filter((j) => j.department === activeDept);

  return (
    <>
      <div className="pt-10 pb-7">
        <h1 className="text-3xl font-semibold tracking-tight max-w-[18ch] mb-3">Hiring that keeps moving</h1>
        <p className="text-ink-2 max-w-[52ch] leading-relaxed">
          Browse open roles at {companyName || "our team"}. Apply directly, no account needed — we'll review your CV and
          reach out if it's a fit.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {DEPARTMENTS.map((d) => (
          <button
            key={d}
            onClick={() => setActiveDept(d)}
            className={`text-sm px-3.5 py-1.5 rounded-lg border ${
              activeDept === d
                ? "bg-ink-0 text-navy-0 border-ink-0"
                : "bg-[var(--field-bg)] border-[var(--card-border)] text-ink-1"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {loading && <p className="text-ink-2 text-sm">Loading open roles...</p>}
      {error && <p className="text-bad text-sm" role="alert">{error}</p>}

      {!loading && <div className="flex flex-col gap-3">
        {filtered.map((job) => (
          <Link
            key={job.id}
            to={`/jobs/${job.id}`}
            className="flex items-center justify-between gap-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg-soft)] backdrop-blur px-5 py-4 hover:border-teal/50"
          >
            <div>
              <p className="font-semibold mb-1">{job.title}</p>
              <p className="text-sm text-ink-2">
                <span className="mr-3">{job.department}</span>
                <span className="mr-3">{job.location}</span>
                <span>{job.employment_type}</span>
              </p>
              <span className="text-xs text-ink-2 mt-1 inline-block">{job.deadline}</span>
            </div>
            <span className="flex-shrink-0 border border-amber/50 text-amber text-sm px-4 py-2 rounded-lg">
              Apply
            </span>
          </Link>
        ))}
        {filtered.length === 0 && <p className="text-ink-2 text-sm">No open roles in this department right now.</p>}
      </div>}
    </>
  );
}
