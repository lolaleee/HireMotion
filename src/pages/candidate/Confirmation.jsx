import { Link, useLocation, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { jobPostings } from "../../lib/mockData";
import { supabase } from "../../lib/supabaseClient";
import Stepper from "../../components/Stepper";

export default function Confirmation() {
  const { jobId } = useParams();
  const location = useLocation();
  const [job, setJob] = useState(() => (supabase ? null : jobPostings.find((j) => j.id === jobId)));
  const referenceCode = new URLSearchParams(location.search).get("reference") || "—";

  useEffect(() => {
    if (!supabase) return undefined;
    let mounted = true;
    supabase.from("job_postings").select("title").eq("id", jobId).maybeSingle().then(({ data }) => {
      if (mounted) setJob(data);
    });
    return () => { mounted = false; };
  }, [jobId]);

  return (
    <div className="text-center pt-10">
      <div className="w-14 h-14 rounded-full bg-teal/15 border border-teal/40 flex items-center justify-center mx-auto mb-6">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#2a6f6f" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Application received</h1>
      <p className="text-ink-2 max-w-[40ch] mx-auto mb-8 leading-relaxed">
        We've got your application for {job?.title ?? "this role"}. We'll review your CV and reach out if it's a fit.
      </p>

      <Stepper currentIndex={0} />

      <div className="panel text-left">
        <Row k="Reference number" v={<span className="text-teal font-mono">{referenceCode}</span>} />
        <Row k="Role" v={job?.title ?? "—"} />
        <Row k="Submitted" v="Just now" last />
      </div>

      <div className="flex gap-2.5 justify-center mt-3">
        <Link to="/status" className="px-4 py-2.5 rounded-lg text-sm border border-[var(--card-border)] text-ink-1">
          Check status
        </Link>
        <Link to="/" className="px-4 py-2.5 rounded-lg text-sm bg-amber text-[#1a1204] font-semibold">
          Browse more roles
        </Link>
      </div>
    </div>
  );
}

function Row({ k, v, last }) {
  return (
    <div className={`flex justify-between text-sm py-2 ${last ? "" : "border-b border-[var(--card-border)]"}`}>
      <span className="text-ink-2">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
