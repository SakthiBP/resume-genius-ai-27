import { useEffect, useState } from "react";

interface OverallScoreBadgeProps {
  score: number;
}

function getScoreColor(score: number) {
  if (score >= 75) return { bg: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.4)", text: "#4ade80", stroke: "#22c55e" };
  if (score >= 50) return { bg: "rgba(234,179,8,0.15)", border: "rgba(234,179,8,0.4)", text: "#facc15", stroke: "#eab308" };
  if (score >= 25) return { bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.4)", text: "#fb923c", stroke: "#f97316" };
  return { bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.4)", text: "#f87171", stroke: "#ef4444" };
}

const OverallScoreBadge = ({ score }: OverallScoreBadgeProps) => {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let frame: number;
    const duration = 800;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const colors = getScoreColor(displayScore);
  const radius = 11;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (circumference * displayScore) / 100;

  return (
    <div
      className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors duration-500"
      style={{ backgroundColor: colors.bg, borderWidth: 1, borderStyle: "solid", borderColor: colors.border }}
    >
      <svg width="28" height="28" viewBox="0 0 28 28" className="-ml-0.5">
        <circle cx="14" cy="14" r={radius} fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-10" />
        <circle
          cx="14" cy="14" r={radius} fill="none"
          stroke={colors.stroke} strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          transform="rotate(-90 14 14)"
          className="transition-all duration-500"
        />
      </svg>
      <span className="text-lg tabular-nums transition-colors duration-500" style={{ color: colors.text }}>{displayScore}</span>
      <span className="opacity-70 font-medium text-foreground">Overall score</span>
    </div>
  );
};

export default OverallScoreBadge;
