/**
 * The case debrief.
 *
 * Deliberately thin: every number and every sentence comes from
 * `gradeCase()`, which is pure and unit-tested. This file only lays it out, so
 * there is no way for the rendered debrief to disagree with the grade.
 *
 * The recovery block is not conditional. It renders after every outcome,
 * winning or losing — failure never dead-ends, and success still leaves an
 * account to secure.
 */

import { Meter } from "@/components/ui/Meter";
import { cn } from "@/lib/cn";
import type { CaseGrade } from "@/game/debrief/grade-case";

/**
 * @param grade - from `gradeCase()`. Nothing is recomputed here.
 * @param onRecover - opens the recovery workflow. Omit it and the steps
 *   render read-only, which is the hour-15 cut-down.
 */
export function Debrief({
  grade,
  onRecover,
  className,
}: {
  grade: CaseGrade;
  onRecover?: () => void;
  className?: string;
}) {
  const { breakdown, recovery } = grade;

  return (
    <article className={cn("gutter-x flex flex-col gap-8 py-10", className)} aria-label="Case debrief">
      <header className="flex flex-col gap-3">
        <p className="meta text-smoke">Case debrief · {grade.caseId}</p>
        <h1 className="text-bone">{grade.headline}</h1>
        <div className="flex items-baseline gap-3">
          <span className="text-bone text-4xl tabular-nums">{grade.score}</span>
          <span className="meta text-smoke">
            / 100 · pass {grade.threshold} · {grade.passed ? "passed" : "not passed"}
          </span>
        </div>
        <Meter value={grade.score / 100} label="Case score" threshold={grade.threshold / 100} />
      </header>

      {/* "Why this score?" — base plus line items, so the total always adds up. */}
      <section className="flex flex-col gap-2" aria-label="Why this score">
        <h2 className="meta text-smoke">Why {grade.score}?</h2>
        <dl className="flex flex-col gap-1">
          <div className="flex justify-between gap-4">
            <dt className="text-smoke">Starting from</dt>
            <dd className="tabular-nums text-smoke">{breakdown.base}</dd>
          </div>
          {breakdown.items.map((item, i) => (
            <div key={`${item.label}-${i}`} className="flex justify-between gap-4">
              <dt className="text-bone">{item.label}</dt>
              <dd className={cn("tabular-nums", item.points < 0 ? "text-signal" : "text-bone")}>
                {item.points > 0 ? `+${item.points}` : item.points}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {grade.notes.length > 0 && (
        <section className="flex flex-col gap-2" aria-label="Notes">
          <h2 className="meta text-smoke">Notes</h2>
          <ul className="flex flex-col gap-2">
            {grade.notes.map((note, i) => (
              <li key={i} className="text-bone">
                {note}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Always rendered. Failure never dead-ends; success still has a tail. */}
      <section className="flex flex-col gap-3" aria-label="Recovery">
        <h2 className="meta text-smoke">{recovery.title}</h2>
        <p className="text-bone">{recovery.opening}</p>
        <ol className="flex flex-col gap-3">
          {recovery.steps.map((step, i) => (
            <li key={step.id} className="flex gap-3">
              <span className="meta shrink-0 tabular-nums text-smoke">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex flex-col gap-1">
                <span className="text-bone">{step.title}</span>
                <span className="text-smoke">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="text-smoke">{recovery.closing}</p>
        {onRecover && (
          <button type="button" onClick={onRecover} className="meta self-start text-bone underline underline-offset-4">
            Work through it
          </button>
        )}
      </section>
    </article>
  );
}
