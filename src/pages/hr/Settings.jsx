import { useEffect, useState } from "react";
import ThemeToggle from "../../components/ThemeToggle";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";

const DEFAULT_SETTINGS = {
  shortlist_threshold: 75,
  pool_match_threshold: 60,
  auto_email_shortlisted: true,
  auto_notify_hr: true,
  send_rejection_emails: false,
};

export default function Settings() {
  const { profile } = useAuth();
  const [company, setCompany] = useState({ name: "", default_location: "", contact_email: "" });
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [scoreRows, setScoreRows] = useState([]);
  const [agreementRate, setAgreementRate] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase || !profile?.company_id) return undefined;

    let mounted = true;

    async function loadData() {
      const [companyRes, settingsRes, distRes, summaryRes] = await Promise.all([
        supabase.from("companies").select("name, default_location, contact_email").eq("id", profile.company_id).maybeSingle(),
        supabase.from("company_settings").select("*").eq("company_id", profile.company_id).maybeSingle(),
        supabase.from("score_distribution_by_department").select("company_id, department, avg_score, total_scored").eq("company_id", profile.company_id),
        supabase.from("scoring_accuracy_summary").select("company_id, total_reviews, score_too_high, score_too_low, reasoning_off").eq("company_id", profile.company_id),
      ]);

      if (!mounted) return;

      if (companyRes.data) {
        setCompany({
          name: companyRes.data.name ?? "",
          default_location: companyRes.data.default_location ?? "",
          contact_email: companyRes.data.contact_email ?? "",
        });
      }

      if (settingsRes.data) {
        setSettings({ ...DEFAULT_SETTINGS, ...settingsRes.data });
      }

      const distribution = (distRes.data ?? []).map((row) => ({
        department: row.department,
        avg: Number(row.avg_score ?? 0),
        total: Number(row.total_scored ?? 0),
      }));
      setScoreRows(distribution);

      const summary = summaryRes.data?.[0] ?? null;
      const totalReviews = Number(summary?.total_reviews ?? 0);
      const totalScored = distribution.reduce((sum, row) => sum + Number(row.total ?? 0), 0);
      const rate = totalScored > 0 ? ((totalScored - totalReviews) / totalScored) * 100 : 0;
      setAgreementRate(Number(rate.toFixed(1)));
      setLoading(false);
    }

    loadData();
    return () => { mounted = false; };
  }, [profile?.company_id]);

  async function handleSave() {
    if (!supabase || !profile?.company_id) {
      setMessage("Settings are unavailable until Supabase is configured.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error: companyError } = await supabase.from("companies").update({
      name: company.name.trim(),
      default_location: company.default_location.trim() || null,
      contact_email: company.contact_email.trim() || null,
    }).eq("id", profile.company_id);

    if (companyError) {
      setSaving(false);
      setMessage(companyError.message);
      return;
    }

    const { error } = await supabase.from("company_settings").upsert({
      company_id: profile.company_id,
      ...settings,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);
    setMessage(error ? error.message : "Settings saved.");
  }

  const maxAvg = Math.max(...scoreRows.map((d) => d.avg), 1);

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold">Settings</h1>
        <ThemeToggle />
      </div>

      {loading ? <p className="text-ink-2 text-sm mb-4">Loading settings...</p> : null}

      <Panel title="Company details">
        <Field label="Company name"><input type="text" value={company.name} onChange={(event) => setCompany({ ...company, name: event.target.value })} className="field-input" /></Field>
        <div className="grid grid-cols-2 gap-3.5 max-[520px]:grid-cols-1 mt-3.5">
          <Field label="Default location"><input type="text" value={company.default_location} onChange={(event) => setCompany({ ...company, default_location: event.target.value })} className="field-input" /></Field>
          <Field label="HR contact email"><input type="text" value={company.contact_email} onChange={(event) => setCompany({ ...company, contact_email: event.target.value })} className="field-input" /></Field>
        </div>
      </Panel>

      <Panel title="Screening">
        <Field label="Shortlist threshold"><input type="number" min="0" max="100" value={settings.shortlist_threshold} onChange={(event) => setSettings({ ...settings, shortlist_threshold: Number(event.target.value) })} className="field-input" /></Field>
        <Toggle label="Auto-email shortlisted candidates" desc="Send interview scheduling email automatically" checked={settings.auto_email_shortlisted} onChange={(checked) => setSettings({ ...settings, auto_email_shortlisted: checked })} />
        <Toggle label="Auto-notify HR on shortlist" desc="Forward CV and score to HR inbox" checked={settings.auto_notify_hr} onChange={(checked) => setSettings({ ...settings, auto_notify_hr: checked })} />
        <Toggle label="Send rejection emails" desc="Notify candidates who don't meet the threshold" checked={settings.send_rejection_emails} onChange={(checked) => setSettings({ ...settings, send_rejection_emails: checked })} />
      </Panel>

      <Panel title="Talent pool">
        <Field label="Pool match threshold"><input type="number" min="0" max="100" value={settings.pool_match_threshold} onChange={(event) => setSettings({ ...settings, pool_match_threshold: Number(event.target.value) })} className="field-input" /></Field>
        <p className="text-xs text-ink-2 mt-2.5">Rejected candidates scoring above this against another open role are surfaced in Talent pool.</p>
      </Panel>

      <Panel title="Scoring trust">
        <div className="flex justify-between items-baseline mb-0.5">
          <span className="text-sm">HR agreement rate</span>
          <span className="text-xl font-bold text-ok">{agreementRate}%</span>
        </div>
        <p className="text-xs text-ink-2 mb-4">Share of scored applications HR has not flagged as wrong.</p>
        <p className="text-sm font-semibold mb-2">Score distribution by department</p>
        {scoreRows.length === 0 ? <p className="text-xs text-ink-2">No scored applications yet.</p> : scoreRows.map((d) => (
          <div key={d.department} className="flex items-center gap-2.5 mb-2 text-sm">
            <span className="w-[110px] flex-shrink-0 text-ink-2 text-xs">{d.department}</span>
            <div className="flex-1 h-1.5 bg-navy-3 rounded-full overflow-hidden">
              <div className="h-full bg-teal rounded-full" style={{ width: `${(d.avg / maxAvg) * 100}%` }} />
            </div>
            <span className="w-12 flex-shrink-0 text-right text-ink-2 text-xs">{d.avg}</span>
          </div>
        ))}
      </Panel>

      <button onClick={handleSave} disabled={saving} className="bg-amber text-[#1a1204] font-semibold text-sm px-5 py-2.5 rounded-lg disabled:opacity-60">
        {saving ? "Saving..." : "Save changes"}
      </button>
      {message && <p className="text-sm text-ink-2 mt-3" role="status">{message}</p>}
    </>
  );
}

function Panel({ title, children }) {
  return (
    <div className="panel max-w-xl">
      <h2 className="font-semibold text-sm mb-3">{title}</h2>
      {children}
    </div>
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

function Toggle({ label, desc, checked, onChange }) {
  return (
    <label className="flex items-center justify-between py-3 border-b border-[var(--card-border)] last:border-0 cursor-pointer">
      <div>
        <div className="text-sm">{label}</div>
        <div className="text-xs text-ink-2 mt-0.5">{desc}</div>
      </div>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="accent-teal w-4 h-4 flex-shrink-0" />
    </label>
  );
}
