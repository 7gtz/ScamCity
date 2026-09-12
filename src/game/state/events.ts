/**
 * The event bus contract.
 *
 * Systems talk through this. **Do not import another developer's store
 * directly.** World, dialogue, case, pressure and debrief all observe the same
 * four events and never reach across module boundaries for state.
 *
 * Shared contract owned by `chore/game-contracts`. Import it; do not edit it.
 * Types and interfaces only — the bus implementation lives beside this file
 * (D1, feat/foundation-state).
 *
 * Spec: docs/DETECTIVE-TRACK-24H.md section 4 (D1).
 */

import type { CaseOutcome } from "@/game/case/types";
import type { LocationId } from "@/game/world/types";
import type { FlagId } from "@/game/state/types";

/**
 * Everything one system may tell the others. Discriminated on `type`, so
 * `Extract<GameEvent, { type: T }>` narrows a handler to its own payload.
 */
export type GameEvent =
  | { type: "flag-set"; id: FlagId }
  | { type: "evidence-found"; id: string }
  | { type: "panel-entered"; id: LocationId }
  | { type: "case-resolved"; outcome: CaseOutcome };

/**
 * The bus API, exactly as specified.
 *
 * The spec writes these as bare signatures:
 *
 * ```ts
 * export function emit(e: GameEvent): void;
 * export function on<T extends GameEvent["type"]>(
 *   type: T,
 *   fn: (e: Extract<GameEvent, { type: T }>) => void,
 * ): () => void;
 * ```
 *
 * They are published here as function *types* so this contract file carries no
 * runtime binding. The implementing module must satisfy `GameEventBus`.
 */

/** Publish an event to every current subscriber. Synchronous, never throws. */
export type EmitFn = (e: GameEvent) => void;

/** Subscribe to one event type. Returns the unsubscribe function. */
export type OnFn = <T extends GameEvent["type"]>(
  type: T,
  fn: (e: Extract<GameEvent, { type: T }>) => void,
) => () => void;

/** The complete bus surface other systems are allowed to depend on. */
export interface GameEventBus {
  emit: EmitFn;
  on: OnFn;
}
