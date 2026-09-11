"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { readLevel } from "@/lib/live/audio";

const POINTS = 72;

/**
 * 1px speech line (pages/call-room.md). In a live call it follows the real
 * mic and caller levels (AnalyserNode / worklet RMS); the mock synthesises it.
 */
export function Waveform({ active, className }: { active: boolean; className?: string }) {
  const path = useRef<SVGPathElement>(null);
  const amp = useRef(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const draw = (t: number) => {
      // Real audio level when a live call is connected; synthesised otherwise.
      const live = readLevel();
      const target = live === null ? (active ? 1 : 0) : Math.min(1, live * 7);
      amp.current += (target - amp.current) * (live === null ? 0.08 : 0.3);
      let d = "";
      for (let i = 0; i <= POINTS; i++) {
        const x = (i / POINTS) * 100;
        const envelope = Math.sin((Math.PI * i) / POINTS);
        const y = 10 + Math.sin(i * 0.55 + t * 0.012) * Math.sin(i * 0.19 - t * 0.006) * 8 * amp.current * envelope;
        d += `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
      }
      path.current?.setAttribute("d", d);
      if (active || live !== null || amp.current > 0.005) raf = requestAnimationFrame(draw);
      else path.current?.setAttribute("d", "M0 10L100 10");
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active, reduced]);

  if (reduced) {
    return <span className={cn("meta text-smoke", className)}>{active ? "Speaking" : "Listening"}</span>;
  }

  return (
    <svg viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden className={cn("h-8 w-full text-bone", className)}>
      <path ref={path} d="M0 10L100 10" fill="none" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
