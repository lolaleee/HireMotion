function colorFor(score) {
  if (score >= 75) return "bg-ok";
  if (score >= 50) return "bg-warn";
  return "bg-bad";
}

export default function ScoreBar({ score }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-[5px] bg-navy-3 rounded-full overflow-hidden">
        <div className={`h-full ${colorFor(score)}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-medium w-7">{score}</span>
    </div>
  );
}
