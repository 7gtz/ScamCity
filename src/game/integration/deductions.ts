import type { CaseDefinition } from "@/game/case/types";
import { verifyClaim } from "@/game/case/verify";
import { applyEffects, getGameState } from "./game";

export type ClaimResult = { status: "verified" | "invalid" | "already-verified" | "resolved"; message: string };

/** The explicit board action is the only board mutation. Re-read persisted facts on every submit. */
export function submitDeduction(caseDef: CaseDefinition, conclusionId: string, selected: readonly string[]): ClaimResult {
  const state = getGameState();
  if (state.flags["case.outcome"]) return { status: "resolved", message: "This investigation is closed. You can review its evidence without changing the result." };
  const deduction = caseDef.deductions.find((item) => item.id === conclusionId);
  if (state.caseId !== caseDef.id || !deduction || !verifyClaim(selected, deduction, state.evidence)) return { status: "invalid", message: "Those documents do not establish that conclusion. Re-read their dates, sources and claims, then revise the connection." };
  if (state.flags[deduction.unlocksFlag] === true) return { status: "already-verified", message: "That connection is already recorded." };
  applyEffects([{ setFlag: deduction.unlocksFlag, to: true }]);
  return { status: "verified", message: "Connection verified and recorded in the Case Board." };
}
