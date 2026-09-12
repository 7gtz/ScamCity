/**
 * Dialogue condition helpers.
 *
 * Re-exports the foundation's `evaluateCondition` and provides convenience
 * wrappers for the dialogue and case layers. This module delegates to
 * `@/game/state/conditions` — it never duplicates the evaluator.
 *
 * Spec: ops/prompts/antigravity-dialogue-case.md §4.3.
 */

import type { Choice, Condition } from "@/game/dialogue/types";
import type { GameState } from "@/game/state/types";
import { evaluateCondition } from "@/game/state/conditions";

/** The minimal state slice needed for condition evaluation. */
export type ConditionState = Pick<GameState, "flags" | "evidence">;

/** Re-export for convenience — consumers stay on a single import path. */
export { evaluateCondition };

/**
 * Whether a choice should be visible to the player.
 *
 * Choices without a `requires` condition are always visible. Those with
 * one are hidden until the condition passes. This is the mechanic that
 * gates dialogue options on discovered evidence.
 */
export function isChoiceVisible(
  choice: Choice,
  state: ConditionState,
): boolean {
  return !choice.requires || evaluateCondition(choice.requires, state);
}

/**
 * Whether a condition (possibly undefined) passes.
 * Undefined conditions are always true — no gate means open.
 */
export function meetsCondition(
  condition: Condition | undefined,
  state: ConditionState,
): boolean {
  return condition === undefined || evaluateCondition(condition, state);
}
