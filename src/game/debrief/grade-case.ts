/**
 * Deterministic case grading.
 *
 * Built on the existing scoring vocabulary rather than a new one: the base +
 * line-items + clamp shape is `src/features/scoring/compose.ts`, the pass mark
 * is `PASS_THRESHOLD` from `mock-judge.ts`, and the "don't punish the genuine
 * one" rule is `gradeDecision` in `src/features/encounters/grade.ts`. None of
 * those files is modified.
 *
 * **Never AI-decided.** `gradeCase` takes no model, no clock and no randomness.
 * The same `CaseRun` always produces the same `CaseGrade` — which is what makes
 * "the outcome is identical with AI on and AI off" a property of the code
 * rather than a thing we tested once.
 */

import type { CaseOutcome } from "@/game/case/types";
import { kindsCovered, workflowFor, type RecoveryWorkflow } from "@/game/recovery/workflows";
import { PASS_THRESHOLD } from "@/features/scoring/mock-judge";

/** The base every case is scored from, matching `JUDGE_BASE` in compose.ts. */
export const CASE_BASE = 50;

/** What the player actually did. Everything the grade reads. */
export interface CaseRun {
  caseId: string;
  outcome: CaseOutcome;
  /** Evidence ids held at the end. */
  evidence: string[];
  /** Deduction ids the player actually made. */
  deductions: string[];
  /** Evidence ids marked `falseLead` that the player explicitly dismissed. */
  dismissedFalseLeads: string[];
  /** False leads the player acted on. */
  pursuedFalseLeads: string[];
  /** True when the player verified through a channel they chose. */
  verifiedIndependently: boolean;
  /** Recovery steps completed, by step id. */
  recoverySteps: string[];
}

export interface CaseGrade {
  caseId: string;
  outcome: CaseOutcome;
  score: number;
  threshold: number;
  passed: boolean;
  /** "Why 62?" — the base plus these adds up, exactly as the call scorecard does. */
  breakdown: { base: number; items: { label: string; points: number }[] };
  headline: string;
  notes: string[];
  /** Always present. Failure never dead-ends. */
  recovery: RecoveryWorkflow;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * The outcome is worth the most, but never everything — a player who reasoned
 * well and ran out of clock still scores above one who guessed correctly.
 */
const OUTCOME_POINTS: Record<CaseOutcome, number> = {
  "funds-recovered": 30,
  "partial-recovery": 18,
  "case-unsolved": -6,
  "wrong-suspect": -18,
  "genuine-turned-away": -22,
};

const HEADLINES: Record<CaseOutcome, string> = {
  "funds-recovered": "Stopped it inside the window.",
  "partial-recovery": "Late, but not too late.",
  "case-unsolved": "The window closed.",
  "wrong-suspect": "Wrong name, right evidence.",
  "genuine-turned-away": "That one was real.",
};

/**
 * Grade a completed case.
 *
 * Two rules from §11 are load-bearing here and are asserted by the tests:
 *
 * 1. **Paranoia is not rewarded.** `genuine-turned-away` is the heaviest
 *    penalty of any outcome — heavier than being scammed — and holding
 *    evidence cannot offset it. This agrees with `freestyle-store.ts`, where
 *    turning away something genuine costs a life exactly as being scammed does.
 * 2. **Reasoning is rewarded over luck.** Deductions and dismissed false leads
 *    score; merely holding evidence scores far less.
 */
export function gradeCase(run: CaseRun): CaseGrade {
  const items: { label: string; points: number }[] = [];

  items.push({ label: HEADLINES[run.outcome], points: OUTCOME_POINTS[run.outcome] });

  if (run.deductions.length) {
    items.push({ label: `Connected ${run.deductions.length} piece(s) of evidence`, points: Math.min(24, run.deductions.length * 8) });
  }
  if (run.evidence.length) {
    items.push({ label: `Collected ${run.evidence.length} document(s)`, points: Math.min(8, run.evidence.length * 2) });
  }
  if (run.dismissedFalseLeads.length) {
    items.push({ label: "Ruled out a lead that went nowhere", points: Math.min(10, run.dismissedFalseLeads.length * 5) });
  }
  if (run.pursuedFalseLeads.length) {
    items.push({ label: "Acted on a lead that did not hold up", points: Math.max(-16, run.pursuedFalseLeads.length * -8) });
  }
  if (run.verifiedIndependently) {
    items.push({ label: "Verified through a channel you chose", points: 12 });
  }
  if (run.recoverySteps.length) {
    items.push({ label: "Worked the recovery steps", points: Math.min(12, run.recoverySteps.length * 3) });
  }

  const score = clamp(CASE_BASE + items.reduce((sum, i) => sum + i.points, 0));

  return {
    caseId: run.caseId,
    outcome: run.outcome,
    score,
    threshold: PASS_THRESHOLD,
    passed: score >= PASS_THRESHOLD,
    breakdown: { base: CASE_BASE, items },
    headline: HEADLINES[run.outcome],
    notes: notesFor(run),
    recovery: workflowFor(run.outcome),
  };
}

/**
 * What to say about it. One note per thing that actually happened — no filler,
 * and no scolding.
 */
function notesFor(run: CaseRun): string[] {
  const notes: string[] = [];

  if (run.outcome === "genuine-turned-away") {
    notes.push(
      "Turning away something genuine is a mistake here, and it is scored like one. The goal is not to refuse everything — it is to verify before you decide.",
    );
  }
  if (run.outcome === "wrong-suspect") {
    notes.push("The evidence was sound; the conclusion drawn from it was not. A plausible lead is still a lead that has to be tested.");
  }
  if (!run.verifiedIndependently) {
    notes.push("You never checked a claim through a channel you picked yourself. That single habit is what most of this case turned on.");
  }
  if (run.pursuedFalseLeads.length && !run.dismissedFalseLeads.length) {
    notes.push("A false lead is only a mistake if it stays in the file. Ruling one out in writing counts for as much as finding a real one.");
  }
  if (run.deductions.length === 0 && run.evidence.length > 1) {
    notes.push("You were carrying enough to get there. Documents do not add up on their own — the case board is where they meet.");
  }
  notes.push(`Recovery: ${kindsCovered(run.outcome).length} lawful step type(s) available from here. Nothing about this ends in a dead end.`);

  return notes.slice(0, 4);
}
