import { useEffect, useState } from "react";

interface OverallScoreBadgeProps {
  score: number;
}

const getScoreColor = (score: number) => {
  if (score >= 70) return "bg-score-green";
  if (score >= 40) return "bg-score-yellow";
  return "bg-score-red";
};

const getScoreTextColor = (score: number) => {
  if (score >= 70) return "text-score-green";
  if (score >= 40) return "text-score-yellow";
  return "text-score-red";
};

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

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${getScoreColor(score)} text-sm font-semibold text-white`}>
      <span className="text-lg tabular-nums">{displayScore}</span>
      <span className="opacity-90 font-medium">Overall score</span>
    </div>
  );
};

export default OverallScoreBadge;
