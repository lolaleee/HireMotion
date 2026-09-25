const STYLES = {
  submitted: "bg-ink-2/15 text-ink-2",
  screening: "bg-warn/15 text-warn",
  shortlisted: "bg-ok/15 text-ok",
  interview: "bg-[#5a8cdc]/15 text-[#7fa6e8]",
  rejected: "bg-bad/15 text-bad",
  reengaged: "bg-teal/15 text-teal",
};

export default function StatusPill({ status }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-md ${STYLES[status] || STYLES.submitted}`}>
      {label}
    </span>
  );
}
