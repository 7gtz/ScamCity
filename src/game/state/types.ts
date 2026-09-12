/**
 * Game state contracts — the single serialisable snapshot of a playthrough,
 * and the signatures of the store functions every other system calls.
 *
 * Shared contract owned by `chore/game-contracts`. Import it; do not edit it.
 * Types and interfaces only — no runtime logic lives in this file. The store
 * that implements these signatures lives beside this file (D1, feat/foundation-state).
 *
 * Spec: docs/DETECTIVE-TRACK-24H.md section 4 (D1).
 */

import type { Condition } from "@/game/dialogue/types";
import type { LocationId } from "@/game/world/types";

/**
 * A named piece of world truth, e.g. `"victim.called-bank"`. Deliberately a
 * plain string so case content can introduce flags without a code change.
 */
export type FlagId = string;

/**
 * Everything that must survive a page reload. Anything not in here is derived
 * and must be recomputable from what is.
 */
export interface GameState {
  location: LocationId;
  flags: Record<FlagId, boolean | number | string>;
  evidence: string[];              // EvidenceItem ids, in the order found
  inventory: string[];
  trust: Record<string, number>;   // npc id -> -100..100
  stress: number;                  // 0..100
  caseId: string | null;
  version: number;
}

/**
 * The store API, exactly as specified.
 *
 * The spec writes these as bare signatures:
 *
 * ```ts
 * export function setFlag(id: FlagId, value: boolean | number | string): void;
 * export function hasFlag(id: FlagId): boolean;
 * export function evaluate(c: Condition): boolean;
 * export function save(): void;                // autosave, debounced
 * export function load(): GameState | null;    // Zod-validated; null on any failure
 * ```
 *
 * They are published here as function *types* rather than ambient declarations
 * so that this contract file stays free of runtime bindings that nothing
 * implements. The implementing module must satisfy `GameStateApi`.
 */

/** Write a flag. Emits a `flag-set` event. */
export type SetFlagFn = (id: FlagId, value: boolean | number | string) => void;

/** True when the flag is present and truthy. Missing flags are never an error. */
export type HasFlagFn = (id: FlagId) => boolean;

/** Resolve a `Condition` against current state. Pure with respect to state. */
export type EvaluateFn = (c: Condition) => boolean;

/** Autosave, debounced. Never blocks the frame. */
export type SaveFn = () => void;

/**
 * Read the save. Zod-validated.
 *
 * **`load()` never throws.** A corrupt or old save returns `null` and the
 * player starts fresh. No migration code.
 */
export type LoadFn = () => GameState | null;

/** The complete store surface other systems are allowed to depend on. */
export interface GameStateApi {
  setFlag: SetFlagFn;
  hasFlag: HasFlagFn;
  evaluate: EvaluateFn;
  save: SaveFn;
  load: LoadFn;
}
