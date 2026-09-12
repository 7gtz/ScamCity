import type { Condition } from "@/game/dialogue/types";
import type { GameState } from "./types";

/** Pure predicate; also usable by reducers without importing the store. */
export function evaluateCondition(condition: Condition, state: Pick<GameState, "flags" | "evidence">): boolean {
  if ("flag" in condition) {
    if (!Object.hasOwn(state.flags, condition.flag)) return false;
    const value = state.flags[condition.flag];
    return condition.is === undefined ? Boolean(value) : value === condition.is;
  }
  if ("hasEvidence" in condition) return state.evidence.includes(condition.hasEvidence);
  if ("all" in condition) return condition.all.every((c) => evaluateCondition(c, state));
  if ("any" in condition) return condition.any.some((c) => evaluateCondition(c, state));
  return !evaluateCondition(condition.not, state);
}
