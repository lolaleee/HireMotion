import { useState } from "react";
import Stepper from "../../components/Stepper";
import StatusPill from "../../components/StatusPill";
import { supabase } from "../../lib/supabaseClient";

export default function StatusCheck() {
  const [ref, setRef] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLookup() {
    if (!ref.trim() || !email.trim()) {
      setResult(null);
      setError(true);
      return;
    }
    if (!supabase) {
      setResult(null);
      setError("status-unavailable");
      return;
    }
    setLoading(true);
    setResult(null);
    const { data, error: queryError } = await supabase.rpc("lookup_application_status", {
      p_reference_code: ref,
      p_email: email,
    });
    setLoading(false);
    if (queryError) {
      setError("status-unavailable");
      return;
    }
    const application = data?.[0];
    if (!application) {
      setError(true);
      return;
    }
    setResult({ role: application.role, status: application.status, refCode: application.reference_code });
    setError(false);
  }

  return (
    <>
      <h1 className="text-[1.6rem] font-semibold mt-10 mb-2">Check your application status</h1>
      <p className="text-ink-2 max-w-[44ch] mb-7 leading-relaxed">
        Enter your reference number and the email you applied with to see where things stand.
      </p>

      <div className="panel">
        <div className="mb-3.5">
          <label className="block text-sm text-ink-2 mb-1.5">Reference number</label>
          <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. HM-8841-QC" className="field-input" />
        </div>
        <div className="mb-3.5">
          <label className="block text-sm text-ink-2 mb-1.5">Email address</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" className="field-input" />
        </div>
        <button onClick={handleLookup} disabled={loading} className="w-full bg-amber text-[#1a1204] font-semibold text-sm py-3 rounded-lg mt-1.5 disabled:opacity-60">
          {loading ? "Checking..." : "Check status"}
        </button>
        {error === true && (
          <p className="text-bad text-sm mt-2.5">
            We couldn't find an application with that reference and email. Double-check both and try again.
          </p>
        )}
        {error === "status-unavailable" && (
          <p className="text-bad text-sm mt-2.5" role="alert">
            Status lookup is temporarily unavailable while the application service is being connected.
          </p>
        )}
      </div>

      {result && (
        <div className="panel text-left">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold">{result.role}</span>
            <StatusPill status={result.status} />
          </div>
          <div className="text-teal font-mono text-sm mb-4">{result.refCode}</div>
          <Stepper status={result.status} />
          <p className="text-sm text-ink-2 mt-4 leading-relaxed">
            {statusMessage(result.status)}
          </p>
        </div>
      )}
    </>
  );
}

function statusMessage(status) {
  if (status === "submitted") return "Your application has been received and is waiting for review.";
  if (status === "screening") return "Your application is currently being screened by the hiring team.";
  if (status === "shortlisted") return "Your application has been shortlisted. The hiring team will contact you about next steps.";
  if (status === "interview") return "Your interview has been scheduled. Check your email for the date, time, and meeting details.";
  if (status === "reengaged") return "We found a strong match for a related role and have re-opened your application for consideration.";
  if (status === "rejected") return "The hiring team has completed its review. Thank you for your interest in this role.";
  return "Your application status has been updated. We'll email you as soon as there is another update.";
}
