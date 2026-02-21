import { useEffect, useState } from "react";

interface ScoreBarProps {
  label: string;
  score: number;
  delay?: number;
  notApplicable?: boolean;
  weightLabel?: string;
}

const getBarColor = (score: number) => {
  if (score >= 70) return "bg-score-green";
  if (score >= 40) return "bg-score-yellow";
  return "bg-score-red";
};

const ScoreBar = ({ label, score, delay = 0, notApplicable = false, weightLabel }: ScoreBarProps) => {
  const [width, setWidth] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (notApplicable) {
      setWidth(0);
      setDisplayScore(0);
      return;
    }
    const timeout = setTimeout(() => {
      setWidth(score);
      const duration = 800;
      const start = performance.now();
      let frame: number;

      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayScore(Math.round(eased * score));
        if (progress < 1) frame = requestAnimationFrame(animate);
      };

      frame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(frame);
    }, delay);

    return () => clearTimeout(timeout);
  }, [score, delay, notApplicable]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
          {label}
          {weightLabel && (
            <span className="text-[10px] text-muted-foreground font-normal">{weightLabel}</span>
          )}
        </span>
        {notApplicable ? (
          <span className="text-xs text-muted-foreground italic">N/A</span>
        ) : (
          <span className="text-xs font-semibold tabular-nums text-foreground">{displayScore}</span>
        )}
      </div>
      <div className="h-1.5 bg-muted overflow-hidden">
        {notApplicable ? (
          <div className="h-full w-full bg-muted" />
        ) : (
          <div
            className={`h-full transition-all duration-700 ease-out ${getBarColor(score)}`}
            style={{ width: `${width}%` }}
          />
        )}
      </div>
    </div>
  );
};

export default ScoreBar;
