import { useRef, useEffect, useCallback } from "react";

interface SwimLogoProps {
  className?: string;
  size?: number;
  animate?: boolean;
}

const NUM_POINTS = 40;
const VIEW_W = 22;
const BASE_YS = [3.5, 8.5, 13.5];
const AMPLITUDE = 1.2;
const WAVE_K = 0.9;   // spatial frequency
const OMEGA = 4.5;    // angular velocity
const PHASE_OFFSETS = [0, 0.7, 1.4];

function buildPath(baseY: number, t: number, phase: number): string {
  const pts: string[] = [];
  for (let i = 0; i <= NUM_POINTS; i++) {
    const x = (i / NUM_POINTS) * VIEW_W;
    // Taper amplitude at edges so endpoints stay anchored
    const edge = Math.sin((i / NUM_POINTS) * Math.PI);
    const y = baseY + AMPLITUDE * edge * Math.sin(WAVE_K * x - OMEGA * t + phase);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return "M" + pts[0] + pts.slice(1).map((p) => "L" + p).join("");
}

const SwimLogo = ({ className = "", size = 28, animate = false }: SwimLogoProps) => {
  const pathRefs = [useRef<SVGPathElement>(null), useRef<SVGPathElement>(null), useRef<SVGPathElement>(null)];
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  const tick = useCallback((now: number) => {
    if (!startRef.current) startRef.current = now;
    const t = (now - startRef.current) / 1000;
    for (let i = 0; i < 3; i++) {
      const el = pathRefs[i].current;
      if (el) el.setAttribute("d", buildPath(BASE_YS[i], t, PHASE_OFFSETS[i]));
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    if (animate) {
      startRef.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // Reset to static paths
      const staticPaths = [
        "M1 3.5C3.5 1 5.5 1.5 7.5 3.5C9.5 5.5 11.5 5 14 3C16.5 1 18.5 1.5 21 3.5",
        "M1 8.5C4 6 6 7 8 8.5C10 10 12 9.5 14.5 7.5C17 5.5 19 6.5 21 8.5",
        "M1 13.5C3 11 5.5 11.5 7 13C8.5 14.5 11 14 13.5 12C16 10 18.5 11 21 13.5",
      ];
      for (let i = 0; i < 3; i++) {
        pathRefs[i].current?.setAttribute("d", staticPaths[i]);
      }
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animate, tick]);

  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-white ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.65}
        height={size * 0.55}
        viewBox="0 0 22 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          ref={pathRefs[0]}
          d="M1 3.5C3.5 1 5.5 1.5 7.5 3.5C9.5 5.5 11.5 5 14 3C16.5 1 18.5 1.5 21 3.5"
          stroke="#000000"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          ref={pathRefs[1]}
          d="M1 8.5C4 6 6 7 8 8.5C10 10 12 9.5 14.5 7.5C17 5.5 19 6.5 21 8.5"
          stroke="#000000"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          ref={pathRefs[2]}
          d="M1 13.5C3 11 5.5 11.5 7 13C8.5 14.5 11 14 13.5 12C16 10 18.5 11 21 13.5"
          stroke="#000000"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export default SwimLogo;
