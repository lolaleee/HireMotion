import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { applications } from "../../lib/mockData";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";
import ThemeToggle from "../../components/ThemeToggle";
import ScoreBar from "../../components/ScoreBar";
import StatusPill from "../../components/StatusPill";

export default function Applications() {
  const { profile } = useAuth();
  const [rows, setRows] = useState(() => (supabase ? [] : applications));
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase || !profile?.company_id) return undefined;
    let mounted = true;
    Promise.all([
      supabase.from("applications").select("*, job_postings!inner(title, company_id)").eq("job_postings.company_id", profile.company_id).order("created_at", { ascending: false }),
      supabase.from("interviews").select("application_id, status, applications!inner(job_postings!inner(company_id))").eq("applications.job_postings.company_id", profile.company_id).neq("status", "cancelled"),
    ]).then(([applicationsResult, interviewsResult]) => {
      if (!mounted) return;
      if (applicationsResult.error || interviewsResult.error) {
        setError("Applications are temporarily unavailable.");
      } else {
        const scheduledIds = new Set((interviewsResult.data ?? []).map((interview) => interview.application_id));
        setRows((applicationsResult.data ?? []).map((row) => ({
          ...row,
          job_title: row.job_postings?.title,
          is_interview_scheduled: scheduledIds.has(row.id),
        })));
      }
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [profile?.company_id]);

  const total = rows.length;
  const shortlisted = rows.filter((a) => a.status === "shortlisted").length;
  const interviews = rows.filter((a) => a.status === "interview" || a.is_interview_scheduled).length;
  const scored = rows.filter((a) => a.fit_score != null);
  const avgScore = scored.length ? Math.round(scored.reduce((s, a) => s + a.fit_score, 0) / scored.length) : 0;

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold">Applications</h1>
        <ThemeToggle />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Stat num={total} label="Total applications" />
        <Stat num={shortlisted} label="Shortlisted" />
        <Stat num={interviews} label="Interviews scheduled" />
        <Stat num={`${avgScore}%`} label="Avg. fit score" />
      </div>

      {loading && <p className="text-ink-2 text-sm mb-4">Loading applications...</p>}
      {error && <p className="text-bad text-sm mb-4" role="alert">{error}</p>}

      {!loading && <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
        <table className="w-full border-collapse bg-navy-1">
          <thead>
            <tr>
              <Th>Candidate</Th><Th>Fit score</Th><Th>Status</Th><Th>Applied</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-t border-[var(--card-border)] hover:bg-navy-2 cursor-pointer">
                <td className="px-3.5 py-3">
                  <Link to={`/hr/applications/${a.id}`} className="block">
                    <div className="font-medium text-sm">{a.candidate_name}</div>
                    <div className="text-xs text-ink-2">{a.job_title}</div>
                  </Link>
                </td>
                <td className="px-3.5 py-3"><ScoreBar score={a.fit_score} /></td>
                <td className="px-3.5 py-3"><StatusPill status={a.is_interview_scheduled ? "interview" : a.status} /></td>
                <td className="px-3.5 py-3 text-sm">{a.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </>
  );
}

function Stat({ num, label }) {
  return (
    <div className="bg-navy-1 border border-[var(--card-border)] rounded-xl px-4 py-3.5">
      <div className="text-2xl font-semibold">{num}</div>
      <div className="text-xs text-ink-2 mt-0.5">{label}</div>
    </div>
  );
}

function Th({ children }) {
  return <th className="text-left text-xs font-medium text-ink-2 px-3.5 py-2.5">{children}</th>;
}
