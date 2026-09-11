"use client";

import { useId } from "react";
import { tacticLabel } from "@/content/tactics";
import { useProgressStore } from "@/features/progress/progress-store";
import { cn } from "@/lib/cn";
import { defenseProfile, type Lesson, type SessionFindings } from "./defense";

const RULE = { danger: "border-signal", uncertain: "border-amber", safe: "border-safe" } as const;
const TEXT = { danger: "text-signal", uncertain: "text-amber", safe: "text-safe" } as const;

/** "The city noticed": one line of evidence that the AI learned from this encounter. */
export function LessonNote({ lesson, className }: { lesson: Lesson; className?: string }) {
  return (
    <div className={cn("flex max-w-[52ch] flex-col gap-1.5 border-l-2 pl-4", RULE[lesson.tone], className)}>
      <p className={cn("meta", TEXT[lesson.tone])}>The city noticed</p>
      <p className="text-lg leading-snug text-bone">{lesson.noticed}</p>
      <p className="text-ash">{lesson.next}</p>
    </div>
  );
}

/**
 * How this player gets manipulated, across every channel they've played. The
 * weak tactic is the one every generator is now aiming at.
 */
export function DefenseCard({
  falseAlarms,
  trusted,
  session,
  className,
}: {
  falseAlarms?: number;
  trusted?: number;
  /** The report on the same page: its findings outrank history. */
  session?: SessionFindings;
  className?: string;
}) {
  const weak = useProgressStore((s) => s.weak);
  const strong = useProgressStore((s) => s.strong);
  const id = useId();
  const p = defenseProfile({ weak, strong, falseAlarms, trusted, session });
  if (!p) return null;

  return (
    <section aria-labelledby={id} className={cn("flex flex-col gap-6 border-t border-line pt-8", className)}>
      <p className="meta text-smoke">Your defense profile · across everything you&rsquo;ve played</p>
      <div className="flex flex-col gap-3">
        <h2 id={id} className="display-m uppercase">
          {p.archetype}
        </h2>
        <p className="lead max-w-[44ch] text-ash">{p.line}</p>
      </div>
      <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5 border-t border-line pt-3">
          <dt className="meta text-smoke">Strong against</dt>
          <dd className={cn("text-lg", p.strong ? "text-safe" : "text-ash")}>{p.strong ? tacticLabel(p.strong) : "Nothing yet"}</dd>
        </div>
        <div className="flex flex-col gap-1.5 border-t border-line pt-3">
          <dt className="meta text-smoke">Works on you</dt>
          <dd className={cn("text-lg", p.weak ? "text-signal" : "text-ash")}>{p.weak ? tacticLabel(p.weak) : "Nothing, so far"}</dd>
        </div>
        <div className="flex flex-col gap-1.5 border-t border-line pt-3">
          <dt className="meta text-smoke">Next likely threat</dt>
          <dd className="text-lg text-bone">{p.nextThreat ? `${p.nextThreat.title} · ${p.nextThreat.lever}` : "Anything"}</dd>
        </div>
      </dl>
    </section>
  );
}
