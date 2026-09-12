/**
 * Case settlement — the one place a run ends.
 *
 * Two defects this replaces:
 *
 * 1. `case-unsolved` was never in the resolution list, and the authored
 *    conditions do not cover every reachable state. A window that expired with
 *    a freeze applied but no deduction flag matched nothing at all, so the run
 *    never terminated and no debrief appeared.
 * 2. Outcomes were tried in list order with no stated precedence, so which one
 *    won when several held was an accident of array position.
 *
 * Settlement is deterministic: no clock, no randomness, no model. Given the
 * same state it always produces the same outcome, and once written the outcome
 * is immutable for the life of the run.
 */

import type { CaseDefinition, CaseOutcome } from "@/game/case/types";
import { getGameState, setFlag } from "./game";
import { resolveCase } from "./panel-actions";

/**
 * Which outcome wins when more than one authored condition holds.
 *
 * The order encodes what the debrief should lead with, most significant first:
 *
 * - `funds-recovered` — the money was saved inside the window. The strongest
 *   fact available about a run, and it supersedes everything else. A player who
 *   also accused the wrong person still recovered the money; the accusation is
 *   scored separately as a pursued false lead rather than erasing the save.
 * - `wrong-suspect` — an innocent person was accused and the money was lost.
 * - `genuine-turned-away` — legitimate staff were treated as complicit, which
 *   is what made the freeze impossible.
 * - `partial-recovery` — too late for the window, but the chain was proved and
 *   the report filed.
 * - `case-unsolved` — the window closed with nothing secured.
 */
export const OUTCOME_PRECEDENCE: readonly CaseOutcome[] = [
  "funds-recovered",
  "wrong-suspect",
  "genuine-turned-away",
  "partial-recovery",
  "case-unsolved",
];

/**
 * Outcomes reachable while the run is still in play.
 *
 * `case-unsolved` is deliberately excluded. Its authored condition is "none of
 * the decisive things have happened", which is *true of every fresh run* — so
 * testing it before the window closes would resolve the case, and show the
 * debrief, on the first move the player made.
 */
const IN_PLAY_OUTCOMES = OUTCOME_PRECEDENCE.filter((outcome) => outcome !== "case-unsolved");

/** The outcome already written for this run, if any. */
export function currentOutcome(): CaseOutcome | null {
  const flag = getGameState().flags["case.outcome"];
  return typeof flag === "string" ? (flag as CaseOutcome) : null;
}

export const isResolved = (): boolean => currentOutcome() !== null;

/**
 * Settle the case if it can be settled.
 *
 * `expired` means the clearing window has closed, which makes the run terminal:
 * something must be written, because there is no future action that could still
 * change it. If no authored condition matches in that state the run falls
 * through to `case-unsolved` — the documented exception to condition-gated
 * resolution, and the guarantee that every run reaches exactly one debrief.
 *
 * Returns the outcome in force after the call, or `null` while the run is still
 * genuinely in play.
 */
export function settleCase(
  caseDefinition: CaseDefinition,
  options: { expired?: boolean } = {},
): CaseOutcome | null {
  const existing = currentOutcome();
  if (existing) return existing;

  for (const outcome of IN_PLAY_OUTCOMES) {
    if (resolveCase(caseDefinition, outcome)) return outcome;
  }

  if (!options.expired) return null;

  // The window has closed: the run is terminal and something must be written.
  if (resolveCase(caseDefinition, "case-unsolved")) return "case-unsolved";

  // Terminal, and no authored condition fits either — for example a freeze that
  // was applied but never substantiated. Write the honest result rather than
  // leaving the player on a screen that can no longer progress. This is the
  // documented exception to condition-gated resolution, and the guarantee that
  // every run reaches exactly one debrief.
  setFlag("case.outcome", "case-unsolved");
  return "case-unsolved";
}
