"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const STAGES = [
  { at: 0, label: "Reading the transcript" },
  { at: 1500, label: "Identifying tactics" },
  { at: 3500, label: "Building your profile" },
];
/** Past this, say so: the client falls back to the rules judge at 10.5 s. */
const SLOW_MS = 7000;

/**
 * Staged feedback while the judge works, so a few seconds of waiting reads as
 * work being done. The stages are paced by time, not reported by the server.
 */
export function JudgingProgress({ className }: { className?: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => setElapsed(performance.now() - start), 250);
    return () => clearInterval(id);
  }, []);

  let current = 0;
  STAGES.forEach((s, i) => {
    if (elapsed >= s.at) current = i;
  });

  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col gap-3", className)}>
      <ol className="flex flex-col gap-1.5">
        {STAGES.map((s, i) => (
          <li
            key={s.label}
            className={cn(
              "meta flex items-center gap-3 transition-colors duration-[320ms]",
              i < current ? "text-smoke" : i === current ? "text-bone" : "text-dim",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                i < current ? "bg-safe" : i === current ? "animate-pulse bg-bone" : "bg-line",
              )}
            />
            {s.label}
            {i < current && <span className="sr-only">, done</span>}
          </li>
        ))}
      </ol>
      {elapsed > SLOW_MS && <p className="meta text-amber">Taking longer than usual — a faster judge is stepping in.</p>}
    </div>
  );
}
