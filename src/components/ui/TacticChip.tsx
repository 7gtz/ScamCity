import { tacticLabel } from "@/content/tactics";
import { cn } from "@/lib/cn";
import type { TacticId } from "@/lib/live/types";

/**
 * A learned red flag in the HUD, in three states: not seen yet → suspected
 * (the other side is using it: amber, uncertain) → called out (you named or
 * resisted it: safe). Colour changes are animated so the shift is noticed.
 */
export function TacticChip({ tactic, hit, inPlay }: { tactic: TacticId; hit: boolean; inPlay: boolean }) {
  const suspected = inPlay && !hit;
  return (
    <li
      className={cn(
        "meta flex items-center gap-2 border px-2 py-1 transition-[color,border-color,background-color] duration-[600ms] ease-out",
        hit ? "border-safe text-safe" : suspected ? "border-amber bg-amber/10 text-amber" : "border-line text-smoke",
      )}
    >
      {tacticLabel(tactic)}
      {(hit || suspected) && <span className="opacity-80">· {hit ? "called out" : "suspected"}</span>}
      <span className="sr-only">{hit ? ", you called it out" : suspected ? ", in play" : ", not seen yet"}</span>
    </li>
  );
}
