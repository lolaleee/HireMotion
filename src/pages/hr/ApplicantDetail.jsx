import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { applications } from "../../lib/mockData";
import { supabase } from "../../lib/supabaseClient";
import ThemeToggle from "../../components/ThemeToggle";
import StatusPill from "../../components/StatusPill";

export default function ApplicantDetail() {
  const { applicationId } = useParams();
  const [modal, setModal] = useState(null); // 'accept' | 'reject' | null
  const [showFlag, setShowFlag] = useState(false);
  const [flagVerdict, setFlagVerdict] = useState("");
  const [flagNote, setFlagNote] = useState("");
  const [flagSubmitted, setFlagSubmitted] = useState(false);
  const [inviteSubject, setInviteSubject] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteDate, setInviteDate] = useState("");
  const [inviteTime, setInviteTime] = useState("10:00");
  const [inviteMode, setInviteMode] = useState("Video call");
  const [inviteLink, setInviteLink] = useState("");
  const [app, setApp] = useState(() => (supabase ? null : applications.find((a) => a.id === applicationId)));
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [retryingScore, setRetryingScore] = useState(false);

  useEffect(() => {
    if (!supabase) return undefined;
    let mounted = true;
    supabase.from("applications").select("*, job_postings(title)").eq("id", applicationId).maybeSingle().then(async ({ data, error: queryError }) => {
      if (!mounted) return;
      if (queryError) setError("Application details are temporarily unavailable.");
      setApp(data ? { ...data, job_title: data.job_postings?.title } : null);
      if (data?.cv_file_path) {
        const { data: signed } = await supabase.storage.from("cvs").createSignedUrl(data.cv_file_path, 300);
        if (mounted) setCvUrl(signed?.signedUrl ?? "");
      }
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [applicationId]);

  if (loading) return <p className="pt-10 text-ink-2">Loading application...</p>;

  if (!app) {
    return (
      <div className="pt-10">
        <p className="text-ink-2">Couldn't find that application.</p>
        <Link to="/hr/applications" className="text-teal text-sm">← Back to applications</Link>
      </div>
    );
  }

  async function handleConfirm(action) {
    if (!supabase) {
      setModal(null);
      alert("Application actions are unavailable until Supabase is configured.");
      return;
    }

    const nextStatus = action === "shortlist" ? "interview" : "rejected";
    if (action === "shortlist") {
      if (!inviteDate || !inviteTime) {
        setError("Choose a date and time for the interview invite.");
        return;
      }
      const scheduledAt = new Date(`${inviteDate}T${inviteTime}:00`);
      if (Number.isNaN(scheduledAt.getTime())) {
        setError("The interview schedule is invalid.");
        return;
      }

      const interviewPayload = {
        application_id: app.id,
        scheduled_at: scheduledAt.toISOString(),
        mode: inviteMode,
        scheduling_link: inviteLink.trim() || null,
        notes: inviteMessage.trim() || null,
      };

      const { error: interviewError } = await supabase.from("interviews").insert(interviewPayload);
      if (interviewError) {
        setError(interviewError.message);
        return;
      }
    }

    const { error: updateError } = await supabase.from("applications").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", app.id);
    if (updateError) {
      setError(updateError.message);
      setModal(null);
      return;
    }

    if (action === "reject") {
      const { data: poolResult, error: poolError } = await supabase.functions.invoke("refresh-talent-pool", { body: { applicationId: app.id } });
      if (poolError || poolResult?.error) {
        setError(`Application rejected, but Talent Pool matching failed: ${poolError?.message || poolResult?.error || "unknown error"}`);
      }
    }

    const emailBody = {
      applicationId: app.id,
      event: action === "shortlist" ? "interview_scheduled" : nextStatus,
      recipient: app.candidate_email,
      subject: action === "shortlist" ? (inviteSubject || `Interview invite for ${app.job_title}`) : undefined,
      text: action === "shortlist" ? (inviteMessage || `Hi ${app.candidate_name.split(" ")[0]},\n\nWe would like to invite you for an interview for ${app.job_title}.\n\nDate: ${inviteDate}\nTime: ${inviteTime}\nMode: ${inviteMode}\n${inviteLink ? `Link: ${inviteLink}\n` : ""}`) : undefined,
    };

    const { data: emailResult, error: emailError } = await supabase.functions.invoke("send-application-email", { body: emailBody });
    if (emailError || emailResult?.error) {
      let emailFailure = emailResult?.error || emailError?.message || "unknown error";
      if (emailError?.context) {
        try {
          const responseBody = await emailError.context.json();
          emailFailure = responseBody?.error || emailFailure;
        } catch {
          // Keep the generic function error when the response has no JSON body.
        }
      }
      setError(`Status updated, but the email could not be sent: ${emailFailure}`);
    }

    setApp((current) => ({ ...current, status: nextStatus }));
    setModal(null);
    setInviteDate("");
    setInviteTime("10:00");
    setInviteSubject("");
    setInviteMessage("");
    setInviteLink("");
    setInviteMode("Video call");
  }

  async function submitFlag() {
    if (!flagVerdict) return alert("Pick a reason first.");
    if (!supabase) return alert("Score feedback is unavailable until Supabase is configured.");
    const { data: userData } = await supabase.auth.getUser();
    const { error: feedbackError } = await supabase.from("score_feedback").insert({
      application_id: app.id,
      reviewer_id: userData.user?.id,
      verdict: flagVerdict,
      note: flagNote.trim() || null,
    });
    if (feedbackError) return setError(feedbackError.message);
    setShowFlag(false);
    setFlagSubmitted(true);
    setFlagVerdict("");
    setFlagNote("");
  }

  async function retryScoring() {
    if (!supabase) return;
    setRetryingScore(true);
    setError("");
    const { data: scoreResult, error: scoreError } = await supabase.functions.invoke("score-application", { body: { applicationId: app.id } });
    setRetryingScore(false);
    if (scoreError || scoreResult?.error) {
      setError(`CV scoring failed: ${scoreError?.message || scoreResult?.error || "unknown error"}`);
      return;
    }
    setApp((current) => ({
      ...current,
      fit_score: scoreResult.score,
      fit_matches: scoreResult.matched ?? [],
      fit_gaps: scoreResult.missing ?? [],
      scoring_status: "scored",
      scoring_error: null,
    }));
  }

  return (
    <>
      <Link to="/hr/applications" className="text-ink-2 text-sm inline-block mb-4">← Back to applications</Link>

      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <p className="text-xl font-semibold mb-1">{app.candidate_name}</p>
          <p className="text-sm text-ink-2 mb-2">
            <span className="mr-3">{app.job_title}</span>
            <span className="mr-3">{app.candidate_location}</span>
            <span>Applied {app.created_at}</span>
          </p>
          <StatusPill status={app.status} />
        </div>
        <ThemeToggle />
      </div>

      <div className="grid md:grid-cols-[1.4fr_1fr] gap-4">
        <div>
          <div className="panel">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Fit score</h2>
              <button
                onClick={() => { setShowFlag((s) => !s); setFlagSubmitted(false); }}
                className="text-xs text-ink-2 border border-[var(--card-border)] rounded-md px-2.5 py-1"
              >
                Flag this score
              </button>
            </div>

            <div className="flex items-center gap-4 mb-3.5">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg relative"
                style={{ background: `conic-gradient(#4caf82 0% ${app.fit_score}%, #1c2c4a ${app.fit_score}% 100%)` }}
              >
                <div className="absolute inset-1.5 rounded-full bg-navy-1" />
                <span className="relative">{app.fit_score}</span>
              </div>
              <div className="text-sm text-ink-2">{app.fit_summary || "Strong match against role requirements"}</div>
            </div>

            {app.fit_decision && app.fit_decision !== "pending" && (
              <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${app.fit_decision === "strong_match" ? "text-ok" : app.fit_decision === "not_a_match" ? "text-bad" : "text-warn"}`}>
                AI screening: {app.fit_decision.replaceAll("_", " ")}
              </p>
            )}

            {app.scoring_status === "processing" && <p className="text-xs text-warn mb-3">CV scoring is still in progress.</p>}
            {app.scoring_status === "failed" && (
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-xs text-bad">CV scoring failed: {app.scoring_error || "The CV could not be read."}</p>
                <button onClick={retryScoring} disabled={retryingScore} className="text-xs text-teal border border-teal/40 rounded-md px-2.5 py-1 whitespace-nowrap disabled:opacity-60">
                  {retryingScore ? "Retrying..." : "Retry scoring"}
                </button>
              </div>
            )}

            {app.fit_matches && (
              <ul className="flex flex-col gap-2 text-sm text-ink-1">
                {app.fit_matches.map((m, i) => <li key={i} className="flex gap-2"><span className="text-ok">•</span>{m}</li>)}
                {app.fit_gaps?.map((g, i) => <li key={`g${i}`} className="flex gap-2"><span className="text-bad">•</span>{g}</li>)}
              </ul>
            )}

            {showFlag && (
              <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
                <p className="text-sm text-ink-2 mb-2.5">What's off about this score?</p>
                <div className="flex flex-col gap-1.5 mb-2.5 text-sm">
                  {[
                    ["score_too_high", "Score too high"],
                    ["score_too_low", "Score too low"],
                    ["reasoning_off", "Reasoning is off"],
                  ].map(([val, label]) => (
                    <label key={val} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="verdict" value={val} checked={flagVerdict === val} onChange={(e) => setFlagVerdict(e.target.value)} />
                      {label}
                    </label>
                  ))}
                </div>
                <textarea
                  value={flagNote}
                  onChange={(e) => setFlagNote(e.target.value)}
                  placeholder="Optional note — e.g. actually has the cert, just didn't list it clearly"
                  className="field-input min-h-[50px] text-sm"
                />
                <div className="flex gap-2.5 mt-2.5">
                  <button onClick={() => setShowFlag(false)} className="text-sm border border-[var(--card-border)] rounded-lg px-4 py-2">Cancel</button>
                  <button onClick={submitFlag} className="text-sm bg-ok text-[#0c2118] font-semibold rounded-lg px-4 py-2">Submit feedback</button>
                </div>
              </div>
            )}
            {flagSubmitted && <p className="text-sm text-ok mt-3">Thanks — logged for scoring review.</p>}
          </div>

          {app.cover_note && (
            <div className="panel">
              <h2 className="font-semibold text-sm mb-2">Cover note</h2>
              <p className="text-sm text-ink-1 leading-relaxed">"{app.cover_note}"</p>
            </div>
          )}
        </div>

        <div>
          <div className="panel">
            <h2 className="font-semibold text-sm mb-2">Candidate</h2>
            <p className="text-sm mb-2.5">{app.candidate_email}<br />{app.candidate_phone}</p>
            <div className="flex items-center justify-between bg-navy-2 border border-[var(--card-border)] rounded-lg px-3.5 py-2.5 text-sm">
              <span>{app.cv_file_name || "CV.pdf"}</span>
              {cvUrl ? <a href={cvUrl} target="_blank" rel="noreferrer" className="text-teal text-sm">View</a> : <span className="text-ink-2 text-sm">Unavailable</span>}
            </div>
          </div>
          <div className="panel">
            <h2 className="font-semibold text-sm mb-2">Actions</h2>
            <div className="flex flex-wrap gap-2.5">
              <button onClick={() => setModal("accept")} className="bg-ok text-[#0c2118] font-semibold text-sm px-4 py-2.5 rounded-lg">
                Shortlist &amp; invite
              </button>
              <button onClick={() => setModal("reject")} className="bg-bad/15 text-bad border border-bad/35 font-semibold text-sm px-4 py-2.5 rounded-lg">
                Reject
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-bad text-sm mb-4" role="alert">{error}</p>}

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-5 z-40" onClick={() => setModal(null)}>
          <div className="bg-navy-1 border border-[var(--card-border)] rounded-xl max-w-xl w-full p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-1">{modal === "accept" ? "Send interview invite" : "Send rejection email"}</h3>
            <p className="text-sm text-ink-2 mb-3.5">
              {modal === "accept"
                ? `Set the interview timing and write the message you want to send to ${app.candidate_name.split(" ")[0]}.`
                : `This emails ${app.candidate_name.split(" ")[0]} and moves them to Rejected.`}
            </p>

            {modal === "accept" && (
              <div className="space-y-3.5 mb-4">
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs text-ink-2 mb-1">Date</label>
                    <input type="date" value={inviteDate} onChange={(e) => setInviteDate(e.target.value)} className="field-input" />
                  </div>
                  <div>
                    <label className="block text-xs text-ink-2 mb-1">Time</label>
                    <input type="time" value={inviteTime} onChange={(e) => setInviteTime(e.target.value)} className="field-input" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-ink-2 mb-1">Mode</label>
                  <select value={inviteMode} onChange={(e) => setInviteMode(e.target.value)} className="field-input">
                    <option>Video call</option>
                    <option>In person</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-ink-2 mb-1">Meeting link (optional)</label>
                  <input value={inviteLink} onChange={(e) => setInviteLink(e.target.value)} placeholder="https://meet.google.com/..." className="field-input" />
                </div>

                <div>
                  <label className="block text-xs text-ink-2 mb-1">Subject</label>
                  <input value={inviteSubject} onChange={(e) => setInviteSubject(e.target.value)} placeholder={`Interview invite - ${app.job_title}`} className="field-input" />
                </div>

                <div>
                  <label className="block text-xs text-ink-2 mb-1">Message</label>
                  <textarea value={inviteMessage} onChange={(e) => setInviteMessage(e.target.value)} rows={6} className="field-input min-h-[130px]" placeholder={`Hi ${app.candidate_name.split(" ")[0]},\n\nWe would like to invite you for an interview for ${app.job_title}.\n\nDate: ${inviteDate || "YYYY-MM-DD"}\nTime: ${inviteTime || "10:00"}\nMode: ${inviteMode}\n${inviteLink ? `Link: ${inviteLink}` : ""}`} />
                </div>
              </div>
            )}

            {modal === "reject" && (
              <div className="bg-navy-2 border border-[var(--card-border)] rounded-lg p-3.5 text-sm text-ink-1 whitespace-pre-line mb-4">
                <div className="font-semibold text-ink-0 mb-1.5">Subject: Update on your application — {app.job_title}</div>
                {`Hi ${app.candidate_name.split(" ")[0]},\n\nThank you for applying for ${app.job_title}. We've decided to move forward with other candidates at this time.`}
              </div>
            )}

            <div className="flex gap-2.5 justify-end">
              <button onClick={() => setModal(null)} className="text-sm border border-[var(--card-border)] rounded-lg px-4 py-2">Cancel</button>
              <button
                onClick={() => handleConfirm(modal === "accept" ? "shortlist" : "reject")}
                className={`text-sm font-semibold rounded-lg px-4 py-2 ${modal === "accept" ? "bg-ok text-[#0c2118]" : "bg-bad/15 text-bad border border-bad/35"}`}
              >
                {modal === "accept" ? "Send & shortlist" : "Send & reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
