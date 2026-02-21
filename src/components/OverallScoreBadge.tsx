import { useEffect, useState } from "react";

interface OverallScoreBadgeProps {
  score: number;
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

  const getColor = () => {
    if (displayScore >= 80) return "text-score-green border-score-green/30 bg-score-green/10";
    if (displayScore >= 60) return "text-score-yellow border-score-yellow/30 bg-score-yellow/10";
    return "text-score-red border-score-red/30 bg-score-red/10";
  };

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-semibold ${getColor()}`}>
      <span className="text-lg tabular-nums">{displayScore}</span>
      <span className="opacity-80 font-medium">Overall score</span>
    </div>
  );
};

export default OverallScoreBadge;
