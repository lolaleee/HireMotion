import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { talentPoolMatches } from "../../lib/mockData";
import ThemeToggle from "../../components/ThemeToggle";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";

export default function TalentPool() {
  const { profile } = useAuth();
  const [rows, setRows] = useState(() => (supabase ? [] : talentPoolMatches));
  const [error, setError] = useState("");
  const [selectedProfile, setSelectedProfile] = useState(null);

  useEffect(() => {
    if (!supabase || !profile?.company_id) return undefined;
    let mounted = true;
    supabase.from("talent_pool_matches").select("*, applications(id, candidate_name, job_postings!inner(title, company_id)), job_postings!inner(title, company_id)").eq("dismissed", false).eq("job_postings.company_id", profile.company_id).then(({ data, error: queryError }) => {
      if (!mounted) return;
      if (queryError) setError("Talent pool is temporarily unavailable.");
      else setRows((data ?? []).map((row) => ({ ...row, applicationId: row.applications?.id, candidate: row.applications?.candidate_name, rejectedFrom: row.applications?.job_postings?.title, matchedRole: row.job_postings?.title })));
    });
    return () => { mounted = false; };
  }, [profile?.company_id]);

  async function dismiss(match) {
    setError("");
    if (supabase) {
      const { error: updateError } = await supabase.from("talent_pool_matches").update({ dismissed: true }).eq("id", match.id);
      if (updateError) return setError(updateError.message);
    }
    setRows((current) => current.filter((row) => match.id ? row.id !== match.id : row !== match));
    setSelectedProfile((current) => current === match || (match.id && current?.id === match.id) ? null : current);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold">Talent pool</h1>
        <ThemeToggle />
      </div>
      {error && <p className="text-bad text-sm mb-3" role="alert">{error}</p>}
      <p className="text-sm text-ink-2 mb-4 max-w-[56ch]">
        Candidates rejected from one role who score well for another open role appear here.
      </p>
      <div className="flex flex-col gap-2.5">
        {rows.map((m, i) => (
          <div key={m.id ?? `${m.candidate}-${m.matchedRole}-${i}`} className="flex flex-wrap items-center justify-between gap-3.5 bg-navy-1 border border-[var(--card-border)] rounded-xl px-4 py-4">
            <div>
              <p className="font-semibold text-sm mb-0.5">{m.candidate}</p>
              <p className="text-xs text-ink-2">
                <span className="mr-3">Rejected from {m.rejectedFrom}</span>
                <span>Matches {m.matchedRole} ({m.score}%)</span>
              </p>
            </div>
            <div className="flex items-center gap-3.5">
              <button type="button" onClick={() => setSelectedProfile(m)} className="text-teal text-xs hover:underline">View profile</button>
              <button type="button" onClick={() => dismiss(m)} className="text-ink-2 text-xs hover:text-ink-0">Dismiss</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-ink-2">No matches yet.</p>}
      </div>
      {selectedProfile && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-5" onClick={() => setSelectedProfile(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="talent-profile-title" className="w-full max-w-md rounded-xl border border-[var(--card-border)] bg-navy-1 p-5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="talent-profile-title" className="text-base font-semibold">{selectedProfile.candidate}</h2>
                <p className="mt-1 text-sm text-ink-2">Strong match for {selectedProfile.matchedRole}</p>
              </div>
              <button type="button" onClick={() => setSelectedProfile(null)} aria-label="Close profile" className="text-ink-2 hover:text-ink-0">Close</button>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-ink-2">Previously considered for</dt><dd className="text-right">{selectedProfile.rejectedFrom}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-2">Match score</dt><dd>{selectedProfile.score}%</dd></div>
            </dl>
            {selectedProfile.match_summary && <p className="mt-3 text-sm text-ink-2">{selectedProfile.match_summary}</p>}
            {selectedProfile.applicationId && <Link to={`/hr/applications/${selectedProfile.applicationId}`} className="mt-4 inline-block text-sm text-teal hover:underline">Open full application</Link>}
          </section>
        </div>
      )}
    </>
  );
}
