/**
 * Dialogue engine — a pure reducer.
 *
 * `(node, state, choice) → { nextNodeId, effects }`
 *
 * No React, no store access, no side effects, no I/O.
 * Purity is what makes it testable and deterministic.
 *
 * Spec: docs/DETECTIVE-TRACK-24H.md §4 (D2).
 * Brief: ops/prompts/antigravity-dialogue-case.md §4.1.
 */

import type { Choice, Condition, DialogueNode, Effect } from "@/game/dialogue/types";
import type { GameState } from "@/game/state/types";
import { evaluateCondition } from "@/game/state/conditions";

/** The minimal state slice the engine needs to evaluate conditions. */
export type DialogueState = Pick<GameState, "flags" | "evidence">;

/** Result of advancing the dialogue by one step. */
export interface DialogueStep {
  /** The next node id to render, or `"END"` to close the conversation. */
  nextNodeId: string | "END";
  /** Effects the caller must apply (via `applyEffects`). The engine never mutates state. */
  effects: readonly Effect[];
}

/**
 * Return only the choices the player can currently see.
 *
 * A choice with a `requires` condition is hidden until that condition
 * evaluates to true against the current state. This is the mechanic that
 * makes the investigation gated on discovered facts.
 */
export function getVisibleChoices(
  node: DialogueNode,
  state: DialogueState,
): readonly Choice[] {
  return node.choices.filter(
    (choice) => !choice.requires || evaluateCondition(choice.requires, state),
  );
}

/**
 * Advance the dialogue by one step.
 *
 * If `choiceId` is provided, the engine looks up that choice (must be visible)
 * and returns the next node and any effects. If no `choiceId` is given and the
 * node has exactly one visible choice, it auto-selects it (for linear beats).
 *
 * @throws {Error} if the choiceId is not found or not visible.
 */
export function advanceDialogue(
  dialogue: Record<string, DialogueNode>,
  currentNodeId: string,
  state: DialogueState,
  choiceId: string,
): DialogueStep {
  const node = dialogue[currentNodeId];
  if (!node) {
    return { nextNodeId: "END", effects: [] };
  }

  const visible = getVisibleChoices(node, state);
  const chosen = visible.find((c) => c.id === choiceId);

  if (!chosen) {
    throw new Error(
      `Choice "${choiceId}" is not available on node "${currentNodeId}". ` +
        `Visible choices: [${visible.map((c) => c.id).join(", ")}]`,
    );
  }

  return {
    nextNodeId: chosen.next,
    effects: chosen.effects ?? [],
  };
}

/**
 * Check whether a specific choice is visible given the current state.
 * Convenience for UI code that needs to gate individual choice rendering.
 */
export function isChoiceAvailable(
  choice: Choice,
  state: DialogueState,
): boolean {
  return !choice.requires || evaluateCondition(choice.requires, state);
}
