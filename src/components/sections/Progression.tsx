"use client";

import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { ListRow, type RowStatus } from "@/components/ui/ListRow";
import { RIDDLES_TO_UNLOCK, useProgressStore } from "@/features/progress/progress-store";
import { Section, SectionMeta } from "./Section";

const LEVELS: { title: string; scenarioId?: string }[] = [
  { title: "Bank security", scenarioId: "bank-security" },
  { title: "The legitimate call", scenarioId: "card-alert" },
  { title: "Delivery", scenarioId: "parcel-hold" },
  { title: "Tech support", scenarioId: "desk-support" },
  { title: "Prize & reward", scenarioId: "prize-claim" },
  { title: "Executive impersonation", scenarioId: "ceo-favour" },
  { title: "Romance", scenarioId: "romance-emergency" },
];

/** 09 — Progression as mastery, not XP (brief §18). Riddle accuracy unlocks level 02. */
export function Progression() {
  const cleared = useProgressStore((s) => s.cleared);
  const riddle = useProgressStore((s) => s.riddle);
  const resetProgress = useProgressStore((s) => s.resetProgress);

  const unlocked = (i: number) => {
    const level = LEVELS[i];
    if (!level?.scenarioId) return false;
    if (i === 0) return true;
    const prev = LEVELS[i - 1]?.scenarioId;
    return (prev !== undefined && cleared.includes(prev)) || riddle.correct >= RIDDLES_TO_UNLOCK;
  };

  const isCleared = (i: number) => {
    const id = LEVELS[i]?.scenarioId;
    return id !== undefined && cleared.includes(id);
  };
  // The first unlocked level not yet cleared is the one to play next.
  const current = LEVELS.findIndex((_, i) => !isCleared(i) && unlocked(i));

  const rows = LEVELS.map((level, i) => {
    const status: RowStatus = isCleared(i) ? "cleared" : i === current ? "current" : "locked";
    return { ...level, status, index: String(i + 1).padStart(2, "0") };
  });

  return (
    <Section id="progression" className="gutter-x py-[var(--section)]">
      <div className="grid gap-16 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-10 lg:col-span-4">
          <SectionMeta id="progression" />
          <SplitReveal id="progression-title" className="display-l" lines={["Your", "city."]} />
          <p className="max-w-[34ch] text-ash">
            Each level is a call. Clear it to move on. Riddles train the eye — {RIDDLES_TO_UNLOCK} correct answers open
            the legitimate call early.
          </p>
        </div>

        <div className="lg:col-span-7 lg:col-start-6">
          <Reveal as="ol" stagger={0.08}>
            {rows.map((row) => {
              const playable = row.scenarioId && row.status !== "locked";
              const content = (
                <ListRow
                  index={row.index}
                  title={row.title}
                  status={row.status}
                  statusLabel={row.status === "locked" && !row.scenarioId ? "In development" : undefined}
                />
              );
              return (
                <li key={row.index} data-reveal>
                  {playable ? (
                    <Link href={`/play/${row.scenarioId}`} className="block transition-opacity hover:opacity-80" data-cursor="enter">
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </Reveal>

          <div className="meta mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4 text-smoke">
            <span>
              Riddle accuracy {riddle.correct}/{riddle.answered}
              {riddle.correct >= RIDDLES_TO_UNLOCK && " · Level 02 unlocked"}
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
