import { useEffect, useState } from "react";
import { talentPoolMatches } from "../../lib/mockData";
import ThemeToggle from "../../components/ThemeToggle";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";

export default function TalentPool() {
  const { profile } = useAuth();
  const [rows, setRows] = useState(() => (supabase ? [] : talentPoolMatches));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase || !profile?.company_id) return undefined;
    let mounted = true;
    supabase.from("talent_pool_matches").select("*, applications(candidate_name, job_postings!inner(title, company_id)), job_postings!inner(title, company_id)").eq("dismissed", false).eq("job_postings.company_id", profile.company_id).then(({ data, error: queryError }) => {
      if (!mounted) return;
      if (queryError) setError("Talent pool is temporarily unavailable.");
      else setRows((data ?? []).map((row) => ({ ...row, candidate: row.applications?.candidate_name, rejectedFrom: row.applications?.job_postings?.title, matchedRole: row.job_postings?.title })));
    });
    return () => { mounted = false; };
  }, [profile?.company_id]);

  async function dismiss(id) {
    if (!supabase) return;
    const { error: updateError } = await supabase.from("talent_pool_matches").update({ dismissed: true }).eq("id", id);
    if (updateError) setError(updateError.message);
    else setRows((current) => current.filter((row) => row.id !== id));
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold">Talent pool</h1>
        <ThemeToggle />
      </div>
      {error && <p className="text-bad text-sm mb-3" role="alert">{error}</p>}
      <p className="text-sm text-ink-2 mb-4 max-w-[56ch]">
        Candidates rejected from one role but scored well against another open one — surfaced automatically instead
        of disappearing.
      </p>
      <div className="flex flex-col gap-2.5">
        {rows.map((m, i) => (
          <div key={m.id ?? i} className="flex flex-wrap items-center justify-between gap-3.5 bg-navy-1 border border-[var(--card-border)] rounded-xl px-4 py-4">
            <div>
              <p className="font-semibold text-sm mb-0.5">{m.candidate}</p>
              <p className="text-xs text-ink-2">
                <span className="mr-3">Rejected from {m.rejectedFrom}</span>
                <span>Matches {m.matchedRole} — {m.score}%</span>
              </p>
            </div>
            <div className="flex items-center gap-3.5">
              <span className="text-teal text-xs cursor-pointer">View profile</span>
              <button type="button" onClick={() => dismiss(m.id)} className="text-ink-2 text-xs">Dismiss</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-ink-2">No matches yet.</p>}
      </div>
    </>
  );
}
