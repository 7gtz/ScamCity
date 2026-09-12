/**
 * Lawful recovery workflows — the path after the player gets it wrong.
 *
 * **Failure must never dead-end.** That is a brief requirement, not a nicety:
 * every losing outcome in `CaseOutcome` maps to a workflow here, and the
 * mapping is total, enforced by `Record<CaseOutcome, …>`.
 *
 * Everything here is authored, deterministic and **lawful only**. The six
 * behaviours the game teaches (`docs/DETECTIVE-TRACK-24H.md` §11):
 * verify through independently trusted channels · use official numbers and
 * apps · preserve evidence · secure accounts · report through proper routes ·
 * ask for help early.
 *
 * Deliberately absent, per §11: anything operational. No scripts, no security
 * bypasses, no evasion, no money-movement instructions, and nothing about
 * confronting or tracing whoever did it. Those are not slow paths in this
 * game — they are not paths.
 */

import type { CaseOutcome } from "@/game/case/types";

/** The six lawful behaviours. A step belongs to exactly one. */
export type RecoveryKind = "verify" | "official-channel" | "preserve" | "secure" | "report" | "ask-for-help";

export interface RecoveryStep {
  id: string;
  kind: RecoveryKind;
  /** Imperative, one line. What the player does next. */
  title: string;
  /** Why it matters. This is the teaching, so it says the reason, not the mechanics. */
  detail: string;
}

export interface RecoveryWorkflow {
  id: string;
  /** The outcome that routes here. */
  outcome: CaseOutcome;
  title: string;
  /** Said before the steps. Never blames the player. */
  opening: string;
  steps: RecoveryStep[];
  /** Said after the last step. Always leaves a next action. */
  closing: string;
}

/**
 * Order matters and is the same everywhere: stop the bleeding, keep the proof,
 * then tell the people whose job it is. Reporting last is deliberate — a report
 * made before the evidence is preserved is worth much less.
 */
const SECURE_AND_REPORT: RecoveryStep[] = [
  {
    id: "secure-accounts",
    kind: "secure",
    title: "Secure the affected accounts.",
    detail: "Change the credentials, and turn on the second factor where it is offered. Do it from a device you trust, not the one that was handed to you.",
  },
  {
    id: "preserve-evidence",
    kind: "preserve",
    title: "Preserve everything before it is tidied away.",
    detail: "Screenshots, timestamps, reference numbers, the number that called. Keep the originals — a summary you typed up later is worth much less than the message itself.",
  },
  {
    id: "official-number",
    kind: "official-channel",
    title: "Call the bank on a number you looked up yourself.",
    detail: "From the card, the statement, or the app. Never the number the caller gave you, and never by pressing redial on their call.",
  },
  {
    id: "report-route",
    kind: "report",
    title: "Report it through the proper route.",
    detail: "The bank's fraud line and the official reporting service. A report creates a reference, and the reference is what makes everything after it possible.",
  },
  {
    id: "ask-early",
    kind: "ask-for-help",
    title: "Tell someone. Now, not once it is tidy.",
    detail: "People wait because they are embarrassed, and the waiting is what costs them. Early beats complete.",
  },
];

const VERIFY_FIRST: RecoveryStep = {
  id: "verify-independently",
  kind: "verify",
  title: "Check the claim through a channel you chose.",
  detail: "Hang up, then reach the organisation the way you would have reached them yesterday. If the story is real it survives being checked; nothing genuine is ruined by a five-minute pause.",
};

/**
 * Every outcome has a workflow, including the ones the player won — after a
 * good result there is still an account to secure and a report to file, and
 * saying so is the point of the game.
 */
export const RECOVERY_WORKFLOWS: Record<CaseOutcome, RecoveryWorkflow> = {
  "funds-recovered": {
    id: "after-success",
    outcome: "funds-recovered",
    title: "Close it out properly",
    opening: "The transfer was stopped inside the window. That is the good version, and it still leaves a tail to tidy up.",
    steps: [SECURE_AND_REPORT[0]!, SECURE_AND_REPORT[1]!, SECURE_AND_REPORT[3]!],
    closing: "Filed, secured, and on the record. The reference number is what protects the account next month.",
  },
  "partial-recovery": {
    id: "after-partial",
    outcome: "partial-recovery",
    title: "Recover what is still recoverable",
    opening: "Part of it moved before anyone could stop it. The rest is still in reach, and the next hour matters more than the last one did.",
    steps: SECURE_AND_REPORT,
    closing: "Some of it comes back. Not all of it. That is an ordinary outcome, and it is still worth every step you just took.",
  },
  "case-unsolved": {
    id: "after-unsolved",
    outcome: "case-unsolved",
    title: "The window closed. Work it anyway.",
    opening: "You did not get there in time. The case does not stop being workable — it stops being urgent, which is a different thing.",
    steps: SECURE_AND_REPORT,
    closing: "Unresolved is not closed. The file is preserved, the report is in, and this is where most real cases actually sit.",
  },
  "wrong-suspect": {
    id: "after-wrong-suspect",
    outcome: "wrong-suspect",
    title: "Unpick it, then start again from the evidence",
    opening: "The lead was plausible and it was wrong. Say so plainly and in writing — an accusation left standing does its own damage.",
    steps: [
      {
        id: "withdraw-claim",
        kind: "report",
        title: "Correct the record in writing.",
        detail: "Tell whoever you told. A wrong name in a fraud report follows someone around long after you have moved on.",
      },
      VERIFY_FIRST,
      ...SECURE_AND_REPORT.slice(1),
    ],
    closing: "The real transfer completed while you were looking the wrong way. The file is still good — the evidence did not change, only what you concluded from it.",
  },
  "genuine-turned-away": {
    id: "after-false-alarm",
    outcome: "genuine-turned-away",
    title: "It was real, and you sent it away",
    opening: "That call was genuine. Turning away something real is a mistake in this game, and it is one with a cost — the thing they were calling about is still true.",
    steps: [
      VERIFY_FIRST,
      {
        id: "reconnect-official",
        kind: "official-channel",
        title: "Go back to them on a number you looked up.",
        detail: "You do not have to trust the call to deal with what it was about. Reaching them yourself gets you both things.",
      },
      SECURE_AND_REPORT[0]!,
      SECURE_AND_REPORT[4]!,
    ],
    closing: "Refusing everything is not safety — it is just a different way of getting it wrong. Verification is what you were reaching for.",
  },
};

export const workflowFor = (outcome: CaseOutcome): RecoveryWorkflow => RECOVERY_WORKFLOWS[outcome];

/** A losing outcome still leaves the player somewhere to go. Never `false`. */
export const hasRecoveryPath = (outcome: CaseOutcome): boolean => workflowFor(outcome).steps.length > 0;

/** The lawful behaviours this workflow actually exercises, for the debrief. */
export const kindsCovered = (outcome: CaseOutcome): RecoveryKind[] => [
  ...new Set(workflowFor(outcome).steps.map((s) => s.kind)),
];
