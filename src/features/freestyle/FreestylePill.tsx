"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Lives } from "./DayHud";
import { useFreestyle } from "./freestyle-store";
import { ceilingFor, goalFor } from "./schedule";

/**
 * Always-visible reminder that the city is awake. The call room carries its
 * own chip. On phones it shrinks to lives and progress, and the page keeps
 * room for it (`html[data-fs-pill]`) so it never covers a call to action.
 */
export function FreestylePill() {
  const status = useFreestyle((s) => s.status);
  const lives = useFreestyle((s) => s.lives);
  const handled = useFreestyle((s) => s.handled);
  const pace = useFreestyle((s) => s.pace);
  const pathname = usePathname();
  const visible = status !== "idle" && !pathname.startsWith("/play") && pathname !== "/freestyle";

  useEffect(() => {
    const root = document.documentElement;
    if (visible) root.dataset.fsPill = "";
    else delete root.dataset.fsPill;
    return () => {
      delete root.dataset.fsPill;
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Link
      href="/freestyle"
      aria-label={status === "active" ? `Freestyle active: ${lives} lives, ${handled} of ${goalFor(pace)} survived` : undefined}
      className="meta fixed bottom-3 left-3 z-[75] flex min-h-10 items-center gap-2.5 border border-line bg-ink/90 px-3 text-bone backdrop-blur-[2px] sm:bottom-6 sm:left-6 sm:min-h-11 sm:gap-3 sm:px-4"
    >
      {status === "active" ? (
        <>
          <span aria-hidden className="live-dot" />
          <span className="hidden sm:inline">Active</span>
          <Lives lives={lives} />
          <span className="tabular text-smoke">
            {handled}/{goalFor(pace)}
          </span>
          <span className="hidden text-smoke sm:inline">Lv {ceilingFor(handled, pace)}</span>
        </>
      ) : (
        <>Freestyle over · {status === "won" ? "you made it" : "they got you"} →</>
      )}
    </Link>
  );
}
