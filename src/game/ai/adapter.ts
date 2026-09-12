/**
 * The AI boundary.
 *
 * Every AI call in the detective track goes through this. No exceptions.
 * The adapter exists so that a missing `GEMINI_API_KEY`, an outage, a
 * moderation refusal or a slow response is indistinguishable from a fast one
 * at the call site: something renderable always comes back, inside the
 * deadline.
 *
 * AI varies phrasing, hints and NPC flavour only. Success, failure, evidence
 * and case outcome stay deterministic and are computed in code.
 *
 * Shared contract owned by `chore/game-contracts`. Import it; do not edit it.
 * Types and interfaces only — `withFallback`'s implementation and the concrete
 * adapters live beside this file (D3, feat/simulation-recovery).
 *
 * Spec: docs/DETECTIVE-TRACK-24H.md section 4 (D3).
 */

/**
 * One AI-backed capability: the live call, the deadline it must respect, and
 * the authored content that stands in for it when it cannot deliver.
 *
 * @typeParam TIn  - the prompt input, fully formed by the caller.
 * @typeParam TOut - the renderable result. Must be usable as-is by the UI.
 */
export interface AiAdapter<TIn, TOut> {
  /** Authored content used on timeout, outage, moderation failure, or missing key. */
  fallback: (input: TIn) => TOut;
  deadlineMs: number;
  run: (input: TIn) => Promise<TOut>;
}

/**
 * The runner, exactly as specified.
 *
 * The spec writes it as a bare signature:
 *
 * ```ts
 * export function withFallback<TIn, TOut>(a: AiAdapter<TIn, TOut>, input: TIn): Promise<TOut>;
 * ```
 *
 * It is published here as a function *type* so this contract file carries no
 * runtime binding. The implementing module must satisfy `WithFallbackFn`.
 *
 * Contract on any implementation: **never throws, never exceeds
 * `deadlineMs`, always returns something renderable.** A rejected or late
 * `run()` resolves to `fallback(input)` instead.
 */
export type WithFallbackFn = <TIn, TOut>(
  a: AiAdapter<TIn, TOut>,
  input: TIn,
) => Promise<TOut>;
