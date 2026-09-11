"use client";

import { cn } from "@/lib/cn";
import { costsLife, isFalseAlarm, LIVES, tally, useFreestyle, type LogEntry } from "./freestyle-store";
import { ceilingFor, DIFFICULTY_LABEL, goalFor } from "./schedule";

/** What happened, in one or two words. */
export function outcomeWord(e: LogEntry) {
  if (e.caught) return "Scammed";
  if (isFalseAlarm(e)) return e.missed ? (e.channel === "call" ? "Declined genuine" : "Ignored genuine") : "False alarm";
  if (e.legit) return "Trusted";
  if (!e.correct) return "Slipped past";
  return e.missed ? "Ignored" : "Stopped";
}

export const outcomeTone = (e: LogEntry) => (costsLife(e) ? "text-signal" : e.correct ? "text-safe" : "text-amber");

export function Lives({ lives, className }: { lives: number; className?: string }) {
  const left = Math.max(0, lives);
  return (
    <span className={className} role="img" aria-label={`${left} of ${LIVES} lives`}>
      <span className="text-bone">{"♥".repeat(left)}</span>
      <span className="text-dim">{"♥".repeat(LIVES - left)}</span>
    </span>
  );
}

/** One segment per encounter of the day, oldest first: green handled, amber slipped, red cost a life. */
export function EncounterTrack({ log, goal, active, className }: { log: LogEntry[]; goal: number; active: boolean; className?: string }) {
  const done = [...log].reverse();
  return (
    <ol aria-label={`${done.length} of ${goal} encounters`} className={cn("flex gap-1", className)}>
      {Array.from({ length: goal }, (_, i) => {
        const e = done[i];
        return (
          <li
            key={i}
            className={cn(
              "h-1.5 flex-1 transition-colors duration-[900ms]",
              e ? (costsLife(e) ? "bg-signal" : e.correct ? "bg-safe" : "bg-amber") : "bg-line",
              !e && active && i === done.length && "animate-pulse bg-dim",
            )}
          >
            <span className="sr-only">{e ? `${i + 1}: ${outcomeWord(e)}` : `${i + 1}: to come`}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** The day at a glance: lives, progress, difficulty, and how you've been judging. */
export function DayHud({ className }: { className?: string }) {
  const status = useFreestyle((s) => s.status);
  const lives = useFreestyle((s) => s.lives);
  const handled = useFreestyle((s) => s.handled);
  const log = useFreestyle((s) => s.log);
  const pace = useFreestyle((s) => s.pace);
  const goal = goalFor(pace);
  const level = ceilingFor(handled, pace);
  const t = tally(log);

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-wrap items-end gap-x-12 gap-y-6">
        <div className="flex flex-col gap-2">
          <p className="meta text-smoke">Lives</p>
          <Lives lives={lives} className="text-[2rem] leading-none tracking-[0.1em]" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="meta text-smoke">Survived</p>
          <p className="font-display text-[2.5rem] leading-none tabular">
            {handled}
            <span className="text-smoke"> / {goal}</span>
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="meta text-smoke">{status === "active" ? "Next up" : "Reached"}</p>
          <p className="text-lg leading-none text-bone">
            Level {level} <span className="text-ash">· {DIFFICULTY_LABEL[level]}</span>
          </p>
        </div>
      </div>

      <EncounterTrack log={log} goal={goal} active={status === "active"} />

      <dl className="meta grid grid-cols-3 gap-4 text-smoke">
        <div>
          <dt>Scams stopped</dt>
          <dd className="mt-1 text-base text-bone tabular">{t.scamsStopped}</dd>
        </div>
        <div>
          <dt>Genuine trusted</dt>
          <dd className="mt-1 text-base text-bone tabular">{t.genuineTrusted}</dd>
        </div>
        <div>
          <dt>False alarms</dt>
          <dd className={cn("mt-1 text-base tabular", t.falseAlarms ? "text-amber" : "text-bone")}>{t.falseAlarms}</dd>
        </div>
      </dl>
    </div>
  );
}
