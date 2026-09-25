import { useEffect, useState } from "react";
import { interviews } from "../../lib/mockData";
import ThemeToggle from "../../components/ThemeToggle";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";

export default function Interviews() {
  const { profile } = useAuth();
  const [rows, setRows] = useState(() => (supabase ? [] : interviews));
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase || !profile?.company_id) return undefined;
    let mounted = true;
    supabase.from("interviews").select("*, applications!inner(id, candidate_name, job_posting_id, job_postings!inner(title, company_id))").eq("applications.job_postings.company_id", profile.company_id).order("scheduled_at", { ascending: true }).then(({ data, error: queryError }) => {
      if (!mounted) return;
      if (queryError) setError("Interviews are temporarily unavailable.");
      else setRows((data ?? []).map((row) => ({ ...row, candidate: row.applications?.candidate_name, role: row.applications?.job_postings?.title, day: new Date(row.scheduled_at).toLocaleDateString(), time: new Date(row.scheduled_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) })));
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [profile?.company_id]);

  async function updateInterview(id, field, value) {
    if (!supabase) return;
    const { error: updateError } = await supabase.from("interviews").update({ [field]: value }).eq("id", id);
    if (updateError) setError(updateError.message);
    else setRows((current) => current.map((row) => row.id === id ? { ...row, [field]: value } : row));
  }

  const byDay = rows.reduce((acc, i) => {
    (acc[i.day] ||= []).push(i);
    return acc;
  }, {});

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold">Interviews</h1>
        <ThemeToggle />
      </div>

      {loading && <p className="text-ink-2 text-sm">Loading interviews...</p>}
      {error && <p className="text-bad text-sm" role="alert">{error}</p>}

      {Object.entries(byDay).map(([day, items]) => (
        <div key={day} className="mb-6">
          <p className="text-xs text-ink-2 mb-2.5">{day}</p>
          <div className="flex flex-col gap-2.5">
            {items.map((i, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-3.5 bg-navy-1 border border-[var(--card-border)] rounded-xl px-4 py-3.5">
                <div className="flex-shrink-0 text-center px-2.5 py-1.5 bg-navy-2 rounded-md text-xs">{i.time}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold mb-0.5">{i.candidate}</p>
                  <p className="text-xs text-ink-2">{i.role}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-md whitespace-nowrap ${i.mode === "In person" ? "bg-ok/15 text-ok" : "bg-[#5a8cdc]/15 text-[#7fa6e8]"}`}>
                  {i.mode}
                </span>
                <select value={i.status ?? "scheduled"} onChange={(event) => updateInterview(i.id, "status", event.target.value)} className="field-input w-auto py-1.5 text-xs">
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select value={i.outcome ?? "pending"} onChange={(event) => updateInterview(i.id, "outcome", event.target.value)} className="field-input w-auto py-1.5 text-xs">
                  <option value="pending">Outcome pending</option>
                  <option value="passed">Passed</option>
                  <option value="failed">Failed</option>
                  <option value="no_show">No show</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
