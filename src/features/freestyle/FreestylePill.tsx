"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lives } from "./DayHud";
import { useFreestyle } from "./freestyle-store";
import { ceilingFor, goalFor } from "./schedule";

/** Always-visible reminder that the city is awake. The call room carries its own chip. */
export function FreestylePill() {
  const status = useFreestyle((s) => s.status);
  const lives = useFreestyle((s) => s.lives);
  const handled = useFreestyle((s) => s.handled);
  const pace = useFreestyle((s) => s.pace);
  const pathname = usePathname();

  if (status === "idle" || pathname.startsWith("/play") || pathname === "/freestyle") return null;

  return (
    <Link
      href="/freestyle"
      className="meta fixed bottom-4 left-4 z-[75] flex min-h-11 items-center gap-3 border border-line bg-ink/90 px-4 text-bone backdrop-blur-[2px] sm:bottom-6 sm:left-6"
    >
      {status === "active" ? (
        <>
          <span aria-hidden className="live-dot" />
          Active
          <Lives lives={lives} />
          <span className="tabular text-smoke">
            {handled}/{goalFor(pace)}
          </span>
          <span className="text-smoke">Lv {ceilingFor(handled, pace)}</span>
        </>
      ) : (
        <>Freestyle over · {status === "won" ? "you made it" : "they got you"} →</>
      )}
    </Link>
  );
}
