/**
 * The one timed decision.
 *
 * Pure, like `src/features/freestyle/schedule.ts`: no `Date.now()`, no
 * `setInterval`, no store. The caller supplies the clock, so every property
 * below is unit-testable and the timed decision can be replayed exactly.
 *
 * "Fair" is a design constraint with teeth here:
 * - it is **pausable**, and paused time is not counted;
 * - it never expires on the same tick it becomes visible (`graceMs`);
 * - it can be **disabled entirely** and the case still completes.
 */

/** Configuration for one timed decision. */
export interface TimerConfig {
  /** Thinking time, excluding grace and any pauses. */
  durationMs: number;
  /** Settling time before the clock starts. The player reads the question first. */
  graceMs: number;
  /**
   * Untimed mode. The hour-15 scope cut turns the timed decision off
   * (`docs/DETECTIVE-TRACK-24H.md` §8) and it is also what
   * `prefers-reduced-motion` maps to, so a countdown never animates at
   * someone who asked for stillness.
   */
  untimed: boolean;
}

/** A timer's position in time. Serialisable, so it survives an autosave. */
export interface TimerState {
  config: TimerConfig;
  /** Clock reading when the decision was presented. */
  startedAt: number;
  /** Clock reading when it was paused, or null while running. */
  pausedAt: number | null;
  /** Total time already spent paused. */
  pausedTotalMs: number;
}

export const DEFAULT_TIMER: TimerConfig = { durationMs: 60_000, graceMs: 3_000, untimed: false };

/**
 * The untimed variant of any config. Used by the reduced-motion path and by
 * the hour-15 cut — the same decision, with the clock removed.
 */
export const untimed = (config: TimerConfig = DEFAULT_TIMER): TimerConfig => ({ ...config, untimed: true });

/**
 * The config to actually use. `prefers-reduced-motion` is honoured here rather
 * than in the component, so the rule cannot be forgotten at one call site.
 */
export const configFor = (config: TimerConfig, prefersReducedMotion: boolean): TimerConfig =>
  prefersReducedMotion ? untimed(config) : config;

export const start = (config: TimerConfig, now: number): TimerState => ({
  config,
  startedAt: now,
  pausedAt: null,
  pausedTotalMs: 0,
});

/** Pausing twice is a no-op, so a double keypress cannot bank free time. */
export const pause = (t: TimerState, now: number): TimerState =>
  t.pausedAt === null ? { ...t, pausedAt: now } : t;

export const resume = (t: TimerState, now: number): TimerState =>
  t.pausedAt === null ? t : { ...t, pausedAt: null, pausedTotalMs: t.pausedTotalMs + Math.max(0, now - t.pausedAt) };

/** Time the clock has actually been running: wall time, less grace, less pauses. */
export function elapsedMs(t: TimerState, now: number): number {
  const frozen = t.pausedAt ?? now;
  const wall = Math.max(0, frozen - t.startedAt) - t.pausedTotalMs;
  return Math.max(0, wall - t.config.graceMs);
}

/**
 * Milliseconds left. An untimed decision always reads as its full duration, so
 * a progress ring renders full and still rather than needing a second branch.
 */
export function remainingMs(t: TimerState, now: number): number {
  if (t.config.untimed) return t.config.durationMs;
  return Math.max(0, t.config.durationMs - elapsedMs(t, now));
}

/** 0 at the start, 1 at expiry. Clamped, so it is safe to drive a ring with. */
export const progress = (t: TimerState, now: number): number =>
  t.config.untimed ? 0 : 1 - remainingMs(t, now) / Math.max(1, t.config.durationMs);

/** An untimed or paused decision never expires. */
export const isExpired = (t: TimerState, now: number): boolean =>
  !t.config.untimed && t.pausedAt === null && remainingMs(t, now) <= 0;

/**
 * Whole seconds left, for the readout and the screen-reader announcement.
 * Rounded up, so it shows "1" for the whole final second and never flashes a
 * "0" the player had no chance to act on.
 */
export const secondsLeft = (t: TimerState, now: number): number => Math.ceil(remainingMs(t, now) / 1000);

/**
 * When to start warning. Late enough to create pressure, early enough to be
 * fair — and never in the grace window.
 */
export const isUrgent = (t: TimerState, now: number): boolean =>
  !t.config.untimed && !isExpired(t, now) && remainingMs(t, now) <= Math.min(10_000, t.config.durationMs / 3);
