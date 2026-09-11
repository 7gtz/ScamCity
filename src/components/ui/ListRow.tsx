import { Lock } from "lucide-react";
import { cn } from "@/lib/cn";

export type RowStatus = "cleared" | "current" | "locked";

type Props = {
  index: string;
  title: string;
  status?: RowStatus;
  /** Overrides the default status word. */
  statusLabel?: string;
  className?: string;
  active?: boolean;
};

const STATUS_WORD: Record<RowStatus, string> = { cleared: "Cleared", current: "Current", locked: "Locked" };

/** `01  THE BANK ─────── CLEARED` (MASTER §6). */
export function ListRow({ index, title, status, statusLabel, className, active }: Props) {
  const locked = status === "locked";

  return (
    <div className={cn("flex items-baseline gap-4 border-t border-line py-4 md:gap-6 md:py-5", className)}>
      <span className="meta w-7 shrink-0 text-smoke">{index}</span>
      <span
        className={cn(
          "font-display text-[clamp(1.25rem,2.4vw,2rem)] leading-none tracking-[-0.015em] uppercase transition-colors duration-[320ms] ease-out",
          locked ? "text-smoke" : active === false ? "text-ash" : "text-bone",
        )}
      >
        {title}
      </span>
      <span aria-hidden className="h-px min-w-6 flex-1 -translate-y-[0.35em] bg-line" />
      {status && (
        <span
          className={cn(
            "meta flex shrink-0 items-center gap-2",
            status === "current" ? "text-signal" : status === "cleared" ? "text-bone" : "text-smoke",
          )}
        >
          {status === "current" && <span aria-hidden className="live-dot" />}
          {locked && <Lock aria-hidden strokeWidth={1.25} className="size-3.5 text-dim" />}
          {statusLabel ?? STATUS_WORD[status]}
        </span>
      )}
    </div>
  );
}
