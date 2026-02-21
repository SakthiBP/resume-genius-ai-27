import { useEffect, useState } from "react";

interface OverallScoreBadgeProps {
  score: number;
}

function getScoreColor(score: number) {
  // Using HSL values from CSS vars: --score-green, --score-yellow, --score-red
  if (score >= 75) return { bg: "hsla(142,71%,45%,0.15)", border: "hsla(142,71%,45%,0.4)", text: "hsl(142,71%,55%)", stroke: "hsl(142,71%,45%)" };
  if (score >= 50) return { bg: "hsla(38,92%,50%,0.15)", border: "hsla(38,92%,50%,0.4)", text: "hsl(38,92%,60%)", stroke: "hsl(38,92%,50%)" };
  if (score >= 25) return { bg: "hsla(38,92%,50%,0.12)", border: "hsla(38,92%,50%,0.4)", text: "hsl(38,92%,60%)", stroke: "hsl(38,92%,50%)" };
  return { bg: "hsla(0,84%,60%,0.15)", border: "hsla(0,84%,60%,0.4)", text: "hsl(0,84%,65%)", stroke: "hsl(0,84%,60%)" };
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
      className="inline-flex items-center gap-2.5 px-4 py-1.5 text-sm font-semibold transition-colors duration-300"
      style={{ backgroundColor: colors.bg, borderWidth: 1, borderStyle: "solid", borderColor: colors.border }}
    >
      <svg width="28" height="28" viewBox="0 0 28 28" className="-ml-0.5">
        <circle cx="14" cy="14" r={radius} fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-10" />
        <circle
          cx="14" cy="14" r={radius} fill="none"
          stroke={colors.stroke} strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          transform="rotate(-90 14 14)"
          className="transition-all duration-300"
        />
      </svg>
      <span className="text-lg tabular-nums transition-colors duration-300" style={{ color: colors.text }}>{displayScore}</span>
      <span className="opacity-70 font-medium text-foreground">Overall score</span>
    </div>
  );
};

export default OverallScoreBadge;
