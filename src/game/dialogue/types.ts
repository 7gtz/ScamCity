/**
 * Dialogue contracts — the conditional grammar the whole game is gated on, and
 * the shape of an authored conversation.
 *
 * `Condition` and `Effect` are the two most widely imported types in the
 * detective track: panels, hotspots, choices and case outcomes are all gated
 * with `Condition`, and every state mutation authored in content is an `Effect`.
 *
 * Shared contract owned by `chore/game-contracts`. Import it; do not edit it.
 * Types and interfaces only — the pure dialogue reducer lives beside this file
 * (D2, feat/detective-ui).
 *
 * Spec: docs/DETECTIVE-TRACK-24H.md section 4 (D2).
 */

import type { FlagId } from "@/game/state/types";

/**
 * A declarative predicate over game state, evaluated by `evaluate()`.
 * Recursive, so content can express "has the ledger and has not yet accused
 * anyone" without any code.
 *
 * `{ flag }` with no `is` means "flag is truthy".
 */
export type Condition =
  | { flag: FlagId; is?: boolean | number | string }
  | { hasEvidence: string }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

/**
 * A declarative state mutation attached to a choice. Content authors never
 * call the store directly; they emit effects and the engine applies them.
 *
 * `trust.by` and `stress` are deltas, clamped by the implementation
 * (trust to -100..100, stress to 0..100).
 */
export type Effect =
  | { setFlag: FlagId; to: boolean | number | string }
  | { giveEvidence: string }
  | { trust: string; by: number }
  | { stress: number };

/** One selectable reply. `next: "END"` closes the conversation. */
export interface Choice {
  id: string;
  text: string;
  /** Hidden unless the player has discovered the relevant fact. */
  requires?: Condition;
  effects?: Effect[];
  next: string | "END";
}

/**
 * One beat of conversation: who is speaking, what they say, and what the
 * player may say back. Nodes are addressed by `id` within a
 * `CaseDefinition.dialogue` map.
 */
export interface DialogueNode {
  id: string;
  speaker: string;
  lines: string[];
  choices: Choice[];
}
