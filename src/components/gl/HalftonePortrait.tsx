"use client";

import { useMemo, useRef } from "react";
import { cn } from "@/lib/cn";
import { readLevel } from "@/lib/live/audio";
import { ShaderCanvas } from "./ShaderCanvas";
import { HALFTONE_PORTRAIT } from "./shaders";

/**
 * A generative stand-in for a caller photo. The silhouette is seeded from the
 * caller's name, so each caller looks different; with `reactive`, the halo
 * pulses with the caller's real voice level during a live call.
 */
export function HalftonePortrait({ seed, reactive = false, className }: { seed: string; reactive?: boolean; className?: string }) {
  const seedValue = useMemo(() => ([...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 99991, 7) / 99991) * 100, [seed]);
  const level = useRef(0);

  return (
    <div className={cn("absolute inset-0 bg-ember", className)}>
      <ShaderCanvas
        fragment={HALFTONE_PORTRAIT}
        resolution={1}
        uniforms={() => {
          if (reactive) level.current += ((readLevel() ?? 0) - level.current) * 0.25;
          return { uSeed: seedValue, uLevel: reactive ? level.current : 0 };
        }}
      />
    </div>
  );
}
