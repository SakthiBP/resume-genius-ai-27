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

  return (
    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-sm font-semibold text-primary">
      <span className="text-lg tabular-nums">{displayScore}</span>
      <span className="opacity-80 font-medium">Overall score</span>
    </div>
  );
};

export default OverallScoreBadge;
