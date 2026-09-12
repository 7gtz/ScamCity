/**
 * Trust and stress curves.
 *
 * Pure functions over the two numbers `GameState` already carries
 * (`trust: Record<string, number>` at -100..100, `stress: number` at 0..100).
 * The store owns the values; this module owns the shape of the curves.
 *
 * Design rule, from §11: pressure must never make the *right* answer harder to
 * reach. Stress changes tone and the hint threshold. It never gates a choice,
 * never hides evidence, and never changes a case outcome — `gradeCase` in
 * `src/game/debrief/grade-case.ts` does not read it.
 */

export const TRUST_MIN = -100;
export const TRUST_MAX = 100;
export const STRESS_MIN = 0;
export const STRESS_MAX = 100;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

export const clampTrust = (n: number) => clamp(n, TRUST_MIN, TRUST_MAX);
export const clampStress = (n: number) => clamp(n, STRESS_MIN, STRESS_MAX);

/**
 * Apply a trust delta.
 *
 * Asymmetric on purpose: trust is lost faster than it is won, which is how
 * people work. A gain is damped as it approaches the ceiling, so nobody is
 * ever fully trusted by an NPC they have met twice; a loss lands in full.
 */
export function applyTrust(current: number, delta: number): number {
  const from = clampTrust(current);
  if (delta <= 0) return clampTrust(from + delta);
  const headroom = (TRUST_MAX - from) / (TRUST_MAX - TRUST_MIN);
  return clampTrust(from + delta * (0.35 + 0.65 * headroom));
}

/**
 * Apply a stress delta.
 *
 * Rising stress is damped so the bar cannot be slammed to 100 by one bad line:
 * the factor peaks at 0.9 and falls as the bar fills, so reaching the ceiling
 * always takes more than one beat. Relief lands in full — the player can
 * always calm a situation down faster than it escalated.
 */
export function applyStress(current: number, delta: number): number {
  const from = clampStress(current);
  if (delta <= 0) return clampStress(from + delta);
  const headroom = (STRESS_MAX - from) / STRESS_MAX;
  return clampStress(from + delta * (0.35 + 0.55 * headroom));
}

/** Stress decays while the player is doing something calm, e.g. reading the case board. */
export const decayStress = (current: number, elapsedMs: number, perMinute = 8): number =>
  clampStress(clampStress(current) - (perMinute * elapsedMs) / 60_000);

export type StressBand = "calm" | "pressed" | "rattled";
export type TrustBand = "hostile" | "wary" | "cooperative";

export const stressBand = (n: number): StressBand =>
  clampStress(n) >= 70 ? "rattled" : clampStress(n) >= 35 ? "pressed" : "calm";

export const trustBand = (n: number): TrustBand =>
  clampTrust(n) >= 30 ? "cooperative" : clampTrust(n) <= -30 ? "hostile" : "wary";

/**
 * Whether to offer a hint unprompted.
 *
 * A rattled player who has been stuck a while gets offered help — "ask for
 * help early" is one of the lawful behaviours this game teaches, so the game
 * models it rather than waiting to be asked.
 */
export const shouldOfferHint = (stress: number, msSinceProgress: number): boolean =>
  stressBand(stress) === "rattled" ? msSinceProgress >= 45_000 : msSinceProgress >= 120_000;

/**
 * How the narration reads. Tone only — the same facts are available in every
 * band, which is the property that keeps pressure fair.
 */
export const NARRATION_TONE: Record<StressBand, string> = {
  calm: "measured",
  pressed: "clipped",
  rattled: "terse, and a half-step behind",
};
