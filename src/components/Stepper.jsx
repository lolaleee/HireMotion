const STAGES = ["Applied", "Screening", "Shortlisted", "Interview"];
const STATUS_INDEX = {
  submitted: 0,
  screening: 1,
  shortlisted: 2,
  interview: 3,
  reengaged: 2,
};

export default function Stepper({ currentIndex, status }) {
  const resolvedIndex = status ? STATUS_INDEX[status] ?? 0 : currentIndex ?? 0;
  return (
    <div className="relative flex justify-between mb-6">
      <div className="absolute top-[9px] left-[18px] right-[18px] h-0.5 bg-[var(--card-border)] z-0" />
      {STAGES.map((label, i) => {
        const done = i <= resolvedIndex;
        return (
          <div key={label} className="relative z-10 flex-1 text-center">
            <div
              className={`w-[18px] h-[18px] rounded-full mx-auto mb-2 border-2 ${
                done ? "bg-teal border-teal" : "bg-navy-2 border-[var(--card-border)]"
              }`}
            />
            <div className={`text-xs ${done ? "text-ink-1" : "text-ink-2"}`}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}
