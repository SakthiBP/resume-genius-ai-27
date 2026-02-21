import { useRef, useEffect, useCallback } from "react";

interface SwimLogoProps {
  className?: string;
  size?: number;
  animate?: boolean;
}

const NUM_POINTS = 40;
const VIEW_W = 22;
const BASE_YS = [3.5, 8.5, 13.5];
const A_MAX = 1.2;
const WAVE_K = 0.9;
const OMEGA = 4.5;
const PHASE_OFFSETS = [0, 0.7, 1.4];
const RAMP_MS = 250;

const STATIC_PATHS = [
  "M1 3.5C3.5 1 5.5 1.5 7.5 3.5C9.5 5.5 11.5 5 14 3C16.5 1 18.5 1.5 21 3.5",
  "M1 8.5C4 6 6 7 8 8.5C10 10 12 9.5 14.5 7.5C17 5.5 19 6.5 21 8.5",
  "M1 13.5C3 11 5.5 11.5 7 13C8.5 14.5 11 14 13.5 12C16 10 18.5 11 21 13.5",
];

type State = "idle" | "ramp_up" | "running" | "ramp_down";

function buildPath(baseY: number, t: number, phase: number, amp: number): string {
  const pts: string[] = [];
  for (let i = 0; i <= NUM_POINTS; i++) {
    const x = (i / NUM_POINTS) * VIEW_W;
    const edge = Math.sin((i / NUM_POINTS) * Math.PI);
    const y = baseY + amp * edge * Math.sin(WAVE_K * x - OMEGA * t + phase);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return "M" + pts[0] + pts.slice(1).map((p) => "L" + p).join("");
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

const SwimLogo = ({ className = "", size = 28, animate = false }: SwimLogoProps) => {
  const pathRefs = [useRef<SVGPathElement>(null), useRef<SVGPathElement>(null), useRef<SVGPathElement>(null)];
  const rafRef = useRef<number>(0);
  // Continuous time origin — never reset during transitions
  const t0Ref = useRef<number>(0);
  // Current amplitude (continuous, never jumps)
  const ampRef = useRef<number>(0);
  // State machine
  const stateRef = useRef<State>("idle");
  // Ramp tracking
  const rampStartTimeRef = useRef<number>(0);
  const rampStartAmpRef = useRef<number>(0);
  const rampTargetAmpRef = useRef<number>(0);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const tick = useCallback((now: number) => {
    const state = stateRef.current;
    if (state === "idle") {
      rafRef.current = 0;
      return;
    }

    // Update amplitude based on ramp
    if (state === "ramp_up" || state === "ramp_down") {
      const elapsed = now - rampStartTimeRef.current;
      const progress = Math.min(elapsed / RAMP_MS, 1);
      const eased = easeOut(progress);
      ampRef.current = rampStartAmpRef.current + (rampTargetAmpRef.current - rampStartAmpRef.current) * eased;

      if (progress >= 1) {
        ampRef.current = rampTargetAmpRef.current;
        if (state === "ramp_up") {
          stateRef.current = "running";
        } else {
          // ramp_down complete — go idle, reset to static
          stateRef.current = "idle";
          ampRef.current = 0;
          for (let i = 0; i < 3; i++) {
            pathRefs[i].current?.setAttribute("d", STATIC_PATHS[i]);
          }
          rafRef.current = 0;
          return; // stop loop
        }
      }
    }

    // Compute wave time (continuous, never reset)
    const t = (now - t0Ref.current) / 1000;
    const amp = ampRef.current;

    for (let i = 0; i < 3; i++) {
      const el = pathRefs[i].current;
      if (el) el.setAttribute("d", buildPath(BASE_YS[i], t, PHASE_OFFSETS[i], amp));
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (reducedMotionRef.current) return;

    const now = performance.now();

    if (animate) {
      // mouseenter → ramp up (or re-ramp from current amp if already decaying)
      if (!t0Ref.current) t0Ref.current = now;
      // DO NOT reset t0 — keep phase continuous
      rampStartTimeRef.current = now;
      rampStartAmpRef.current = ampRef.current; // start from current (could be mid-decay)
      rampTargetAmpRef.current = A_MAX;
      stateRef.current = "ramp_up";

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      }
    } else {
      // mouseleave → ramp down from current amplitude
      // DO NOT reset t0, DO NOT cancel rAF, DO NOT set static paths
      if (stateRef.current !== "idle") {
        rampStartTimeRef.current = now;
        rampStartAmpRef.current = ampRef.current; // continue from exact current frame
        rampTargetAmpRef.current = 0;
        stateRef.current = "ramp_down";

        // Ensure loop is running for the decay
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(tick);
        }
      }
    }
  }, [animate, tick]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

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
        <path ref={pathRefs[0]} d={STATIC_PATHS[0]} stroke="#000000" strokeWidth="2" strokeLinecap="round" />
        <path ref={pathRefs[1]} d={STATIC_PATHS[1]} stroke="#000000" strokeWidth="2" strokeLinecap="round" />
        <path ref={pathRefs[2]} d={STATIC_PATHS[2]} stroke="#000000" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
};

export default SwimLogo;
