"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { BONUS, DISTRICTS } from "@/content/districts";
import { RIDDLES_TO_UNLOCK, useProgressStore } from "@/features/progress/progress-store";
import { cn } from "@/lib/cn";
import type { DistrictId } from "@/lib/live/types";

/** Route segments between consecutive districts (viewBox 800×500), transit-map style. */
const ROUTE = ["130,120 130,280 230,380", "230,380 430,380", "430,380 560,250", "560,250 560,100", "560,100 690,100 690,300"];
/** The bonus call sits on a spur off the Bank. */
const SPUR = "130,120 300,120";

export type NodeStatus = "cleared" | "current" | "open" | "locked";
export const STATUS_WORD: Record<NodeStatus, string> = { cleared: "Cleared", current: "Play next", open: "Open", locked: "Locked" };

/** A place on the map: one of the six districts, or the bonus call. */
export type MapKey = DistrictId | "bonus";

export interface MapNode {
  key: MapKey;
  number: string;
  href?: string;
  tag: string;
  title: string;
  hue: string;
  status: NodeStatus;
  map: { x: number; y: number; label: "above" | "below" | "left" };
}

/** Label placement around a node (full map, md and up). */
const PLACE = {
  below: "md:-translate-x-1/2 md:-translate-y-[10px] md:flex-col md:items-center md:text-center",
  above: "md:-translate-x-1/2 md:-translate-y-[calc(100%-10px)] md:flex-col-reverse md:items-center md:text-center",
  left: "md:-translate-x-[calc(100%-10px)] md:-translate-y-1/2 md:flex-row-reverse md:text-right",
} as const;

/**
 * The player's progress through the city: one rule for every map. Clearing a
 * district opens the next; the bonus call opens with the Bank or with riddles.
 */
export function useCityProgress() {
  const cleared = useProgressStore((s) => s.cleared);
  const riddle = useProgressStore((s) => s.riddle);

  const isCleared = (id?: string) => id !== undefined && cleared.includes(id);
  const unlocked = (i: number) => i === 0 || isCleared(DISTRICTS[i - 1]?.scenarioId);
  const current = DISTRICTS.findIndex((d, i) => unlocked(i) && !isCleared(d.scenarioId));
  const statusOf = (i: number): NodeStatus =>
    isCleared(DISTRICTS[i]?.scenarioId) ? "cleared" : i === current ? "current" : unlocked(i) ? "open" : "locked";
  const bonusStatus: NodeStatus = isCleared(BONUS.scenarioId)
    ? "cleared"
    : isCleared(DISTRICTS[0]?.scenarioId) || riddle.correct >= RIDDLES_TO_UNLOCK
      ? "open"
      : "locked";

  const nodes: MapNode[] = [
    ...DISTRICTS.map((d, i) => ({
      key: d.id,
      number: d.number,
      href: d.scenarioId ? `/play/${d.scenarioId}` : undefined,
      tag: `District ${d.number}`,
      title: d.title,
      hue: d.hueText,
      status: statusOf(i),
      map: d.map,
    })),
    {
      key: "bonus" as const,
      number: "B",
      href: `/play/${BONUS.scenarioId}`,
      tag: "Bonus call",
      title: BONUS.title,
      hue: "var(--color-safe)",
      status: bonusStatus,
      map: BONUS.map,
    },
  ];

  return {
    isCleared,
    statusOf,
    bonusStatus,
    clearedCount: DISTRICTS.filter((d) => isCleared(d.scenarioId)).length,
    riddle,
    nodes,
  };
}

type Props = {
  /**
   * full: the labelled map (a vertical line below md).
   * compact: an unlabelled thumbnail that only names the focused place.
   */
  variant?: "full" | "compact";
  /** The place this map points at: ringed in its district's light. */
  focus?: MapKey;
  /** When set, nodes pick a place instead of linking to its call (the overlay). */
  onSelect?: (key: MapKey) => void;
  className?: string;
};

/**
 * The city as a transit map: six districts on one line, the bonus call on a
 * spur. One component for "Your city", the district plates' thumbnails and the
 * full-screen overlay, so every view shows the same city and the same progress.
 */
export function CityMap({ variant = "full", focus, onSelect, className }: Props) {
  const { isCleared, nodes } = useCityProgress();
  const compact = variant === "compact";
  const pattern = `streets-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  // Thin lines stay thin when the map is shrunk to a thumbnail.
  const stroke = compact ? { vectorEffect: "non-scaling-stroke" as const } : {};

  return (
    <div className={cn("relative", compact ? "aspect-[8/5]" : "md:aspect-[8/5]", className)}>
      {/* Streets, the river, the route. Decorative: the nodes carry the meaning. */}
      <svg aria-hidden viewBox="0 0 800 500" className={cn("absolute inset-0 size-full", !compact && "hidden md:block")}>
        <defs>
          <pattern id={pattern} width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="var(--color-line)" strokeWidth="1" opacity={compact ? 0.35 : 0.55} />
          </pattern>
        </defs>
        <rect width="800" height="500" fill={`url(#${pattern})`} />
        <path
          d="M-20 470 C 180 430, 260 470, 380 440 S 620 330, 820 360"
          fill="none"
          stroke="var(--color-raised)"
          strokeWidth="22"
          strokeLinecap="round"
        />
        <polyline points={SPUR} fill="none" stroke="var(--color-dim)" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" {...stroke} />
        {ROUTE.map((points, i) =>
          isCleared(DISTRICTS[i]?.scenarioId) ? (
            <polyline
              key={points}
              data-route={compact ? undefined : true}
              points={points}
              pathLength={1}
              fill="none"
              stroke="var(--color-bone)"
              strokeWidth="3"
              strokeDasharray={compact ? undefined : "1"}
              strokeLinejoin="round"
              {...stroke}
            />
          ) : (
            <polyline
              key={points}
              points={points}
              fill="none"
              stroke="var(--color-dim)"
              strokeWidth="2"
              strokeDasharray="6 6"
              strokeLinejoin="round"
              {...stroke}
            />
          ),
        )}
      </svg>

      {compact ? (
        <ol aria-hidden className="absolute inset-0">
          {nodes.map((n) => {
            const focused = n.key === focus;
            return (
              <li
                key={n.key}
                style={{ "--x": `${n.map.x / 8}%`, "--y": `${n.map.y / 5}%` } as React.CSSProperties}
                className="absolute top-[var(--y)] left-[var(--x)] grid -translate-x-1/2 -translate-y-1/2 place-items-center"
              >
                {focused && <span className="ring-wave !top-1/2 !w-9" style={{ "--hue-text": n.hue } as React.CSSProperties} />}
                <span
                  className={cn(
                    "rounded-full",
                    focused ? "size-3" : "size-2",
                    !focused && n.status === "cleared" && "bg-bone",
                    !focused && n.status === "current" && "bg-signal",
                    !focused && n.status === "open" && "border border-bone bg-ink",
                    !focused && n.status === "locked" && "bg-dim",
                  )}
                  style={focused ? { background: n.hue, boxShadow: `0 0 0 3px var(--color-ink), 0 0 0 4px ${n.hue}` } : undefined}
                />
                {focused && (
                  <span className="meta absolute bottom-full mb-2 text-[0.6875rem] whitespace-nowrap" style={{ color: n.hue }}>
                    {n.number}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <>
          {/* Phones: a vertical line, inset so the focus ring around a node is never clipped. */}
          <span aria-hidden className="absolute top-4 bottom-4 left-[17px] w-px bg-line md:hidden" />
          <ol aria-label="City map" className="relative flex flex-col gap-1 pl-2 md:absolute md:inset-0 md:pl-0">
            {nodes.map((n) => {
              const locked = n.status === "locked";
              const focused = n.key === focus;
              const body = (
                <>
                  <span className="relative grid size-5 shrink-0 place-items-center">
                    {focused && <span aria-hidden className="absolute size-9 rounded-full border-2" style={{ borderColor: n.hue }} />}
                    {(n.status === "current" || focused) && (
                      <span
                        aria-hidden
                        className="ring-wave !top-1/2 !w-12"
                        style={{ "--hue-text": focused ? n.hue : "var(--color-signal)" } as React.CSSProperties}
                      />
                    )}
                    <span
                      aria-hidden
                      className={cn(
                        "size-5 rounded-full border-2 transition-colors duration-[320ms]",
                        n.status === "cleared" && "border-bone bg-bone",
                        n.status === "current" && "border-signal bg-signal",
                        n.status === "open" && "border-bone bg-ink",
                        locked && "border-dim bg-ink",
                      )}
                    />
                  </span>
                  <span className="flex flex-col gap-1 py-1">
                    <span className="meta flex items-center gap-2 text-smoke md:justify-center">
                      <span aria-hidden className="inline-block h-0.5 w-3" style={{ background: n.hue }} />
                      {n.tag}
                    </span>
                    <span
                      className={cn(
                        "font-display text-[clamp(1.25rem,2vw,1.625rem)] leading-none tracking-[-0.015em] whitespace-nowrap uppercase",
                        focused || !locked ? "text-bone" : "text-smoke",
                      )}
                    >
                      {n.title}
                    </span>
                    <span
                      className={cn(
                        "meta flex items-center gap-1.5 md:justify-center",
                        n.status === "current" ? "text-signal" : n.status === "cleared" ? "text-safe" : "text-smoke",
                      )}
                    >
                      {locked && <Lock aria-hidden strokeWidth={1.25} className="size-3 text-dim" />}
                      {STATUS_WORD[n.status]}
                    </span>
                  </span>
                </>
              );
              const row = cn("group flex items-start gap-4 text-left md:gap-2", PLACE[n.map.label]);
              return (
                <li
                  key={n.key}
                  data-node
                  aria-current={focused ? "location" : undefined}
                  style={{ "--x": `${n.map.x / 8}%`, "--y": `${n.map.y / 5}%` } as React.CSSProperties}
                  className="md:absolute md:top-[var(--y)] md:left-[var(--x)]"
                >
                  {onSelect ? (
                    <button type="button" onClick={() => onSelect(n.key)} aria-pressed={focused} className={cn(row, "transition-opacity hover:opacity-80")}>
                      {body}
                    </button>
                  ) : n.href && !locked ? (
                    <Link href={n.href} data-cursor="enter" className={cn(row, "transition-opacity hover:opacity-80")}>
                      {body}
                    </Link>
                  ) : (
                    <div aria-disabled className={row}>
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
