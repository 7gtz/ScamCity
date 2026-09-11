import { cn } from "@/lib/cn";

type Props = {
  /** 0–1 */
  value: number;
  label?: string;
  segments?: number;
  /** Segments at or past this fraction render in signal. */
  threshold?: number;
  className?: string;
};

const describe = (v: number) => (v >= 0.7 ? "high" : v >= 0.3 ? "rising" : "low");

/** Segmented suspicion meter `███████░░░░` (MASTER §6). */
export function Meter({ value, label = "Suspicion", segments = 11, threshold = 0.7, className }: Props) {
  const clamped = Math.max(0, Math.min(1, value));
  const filled = Math.round(clamped * segments);

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuetext={`${label} ${describe(clamped)}`}
      className={cn("flex items-center gap-4", className)}
    >
      <span className="meta text-smoke">{label}</span>
      <span aria-hidden className="flex gap-0.5">
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-4 w-2 transition-colors duration-[320ms] ease-out",
              i >= filled ? "bg-line" : i / segments >= threshold ? "bg-signal" : "bg-bone",
            )}
          />
        ))}
      </span>
    </div>
  );
}
