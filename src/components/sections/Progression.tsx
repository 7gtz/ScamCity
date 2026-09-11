"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { BONUS, DISTRICTS } from "@/content/districts";
import { RIDDLES_TO_UNLOCK, useProgressStore } from "@/features/progress/progress-store";
import { cn } from "@/lib/cn";
import { gsap, MQ, useGSAP } from "@/lib/motion/gsap";
import { Section, SectionMeta } from "./Section";

/** Route segments between consecutive districts (viewBox 800×500), transit-map style. */
const ROUTE = ["130,120 130,280 230,380", "230,380 430,380", "430,380 560,250", "560,250 560,100", "560,100 690,100 690,300"];
/** The bonus call sits on a spur off the Bank. */
const SPUR = "130,120 300,120";

type NodeStatus = "cleared" | "current" | "open" | "locked";
const STATUS_WORD: Record<NodeStatus, string> = { cleared: "Cleared", current: "Play next", open: "Open", locked: "Locked" };

/** Label placement around a node (desktop map only). */
const PLACE = {
  below: "md:-translate-x-1/2 md:-translate-y-[10px] md:flex-col md:items-center md:text-center",
  above: "md:-translate-x-1/2 md:-translate-y-[calc(100%-10px)] md:flex-col-reverse md:items-center md:text-center",
  left: "md:-translate-x-[calc(100%-10px)] md:-translate-y-1/2 md:flex-row-reverse md:text-right",
} as const;

/**
 * Your city: progression as a transit map, not a list (brief §18). Six
 * districts on one line; clearing one opens the next. The legitimate call is a
 * bonus on a spur — riddles open it early. Below md the same nodes run down a
 * vertical line.
 */
export function Progression() {
  const cleared = useProgressStore((s) => s.cleared);
  const riddle = useProgressStore((s) => s.riddle);
  const resetProgress = useProgressStore((s) => s.resetProgress);
  const root = useRef<HTMLDivElement>(null);

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
  const clearedCount = DISTRICTS.filter((d) => isCleared(d.scenarioId)).length;

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        const st = { trigger: el, start: "top 70%", once: true };
        gsap.fromTo("[data-route]", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7, stagger: 0.35, ease: "none", scrollTrigger: st });
        gsap.fromTo("[data-node]", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, scrollTrigger: st });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const nodes = [
    ...DISTRICTS.map((d, i) => ({
      key: d.id,
      href: d.scenarioId ? `/play/${d.scenarioId}` : undefined,
      tag: `District ${d.number}`,
      title: d.title,
      hue: d.hueText,
      status: statusOf(i),
      map: d.map,
    })),
    {
      key: "bonus",
      href: `/play/${BONUS.scenarioId}`,
      tag: "Bonus call",
      title: BONUS.title,
      hue: "var(--color-safe)",
      status: bonusStatus,
      map: BONUS.map,
    },
  ];

  return (
    <Section id="progression" className="gutter-x py-[var(--section)]">
      <div className="grid gap-16 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-10 lg:col-span-4">
          <SectionMeta id="progression" />
          <SplitReveal id="progression-title" className="display-l" lines={["Your", "city."]} />
          <p className="max-w-[34ch] text-ash">
            Six districts on one line. Clear a district to open the next. The bonus call off the line tests the opposite
            instinct — {RIDDLES_TO_UNLOCK} solved riddles open it early.
          </p>
        </div>

        <div ref={root} className="lg:col-span-8">
          <div className="relative md:aspect-[8/5]">
            {/* Streets, the river, the route. Decorative: the nodes below carry the meaning. */}
            <svg aria-hidden viewBox="0 0 800 500" className="absolute inset-0 hidden size-full md:block">
              <defs>
                <pattern id="streets" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M40 0H0V40" fill="none" stroke="var(--color-line)" strokeWidth="1" opacity="0.55" />
                </pattern>
              </defs>
              <rect width="800" height="500" fill="url(#streets)" />
              <path
                d="M-20 470 C 180 430, 260 470, 380 440 S 620 330, 820 360"
                fill="none"
                stroke="var(--color-raised)"
                strokeWidth="22"
                strokeLinecap="round"
              />
              <polyline points={SPUR} fill="none" stroke="var(--color-dim)" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" />
              {ROUTE.map((points, i) => {
                const done = isCleared(DISTRICTS[i]?.scenarioId);
                return done ? (
                  <polyline
                    key={points}
                    data-route
                    points={points}
                    pathLength={1}
                    fill="none"
                    stroke="var(--color-bone)"
                    strokeWidth="3"
                    strokeDasharray="1"
                    strokeLinejoin="round"
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
                  />
                );
              })}
            </svg>

            <span aria-hidden className="absolute top-4 bottom-4 left-[9px] w-px bg-line md:hidden" />

            <ol aria-label="City map" className="relative flex flex-col gap-1 md:absolute md:inset-0">
              {nodes.map((n) => {
                const locked = n.status === "locked";
                const body = (
                  <>
                    <span className="relative grid size-5 shrink-0 place-items-center">
                      {n.status === "current" && (
                        <span aria-hidden className="ring-wave !top-1/2 !w-12 [--hue-text:var(--color-signal)]" />
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
                          locked ? "text-smoke" : "text-bone",
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
                return (
                  <li
                    key={n.key}
                    data-node
                    style={{ "--x": `${n.map.x / 8}%`, "--y": `${n.map.y / 5}%` } as React.CSSProperties}
                    className="md:absolute md:top-[var(--y)] md:left-[var(--x)]"
                  >
                    {n.href && !locked ? (
                      <Link
                        href={n.href}
                        data-cursor="enter"
                        className={cn("group flex items-start gap-4 transition-opacity hover:opacity-80 md:gap-2", PLACE[n.map.label])}
                      >
                        {body}
                      </Link>
                    ) : (
                      <div aria-disabled className={cn("flex items-start gap-4 md:gap-2", PLACE[n.map.label])}>
                        {body}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="meta mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4 text-smoke">
            <span className="flex flex-wrap gap-x-6 gap-y-1">
              <span>
                Districts cleared <span className="tabular text-bone">{clearedCount} / {DISTRICTS.length}</span>
              </span>
              <span>
                {riddle.correct >= RIDDLES_TO_UNLOCK ? (
                  <>Bonus call unlocked by riddles</>
                ) : (
                  <>
                    Riddles solved <span className="tabular text-bone">{riddle.correct} / {RIDDLES_TO_UNLOCK}</span>
                  </>
                )}
              </span>
            </span>
            <button type="button" onClick={resetProgress} className="meta min-h-11 px-2 text-smoke hover:text-bone">
              Reset progress
            </button>
          </div>
        </div>
      </div>
    </Section>
  );
}
