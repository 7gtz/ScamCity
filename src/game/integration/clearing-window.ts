/**
 * The clearing window — the ten minutes the case is played against.
 *
 * All of this used to live in `CityScreens.tsx` as component state seeded from
 * a single start timestamp, which produced three defects:
 *
 * - pauses were refunded on every navigation and reload, because `pausedAt` and
 *   `pausedTotalMs` were rebuilt as zero;
 * - a case with no clock yet rendered a frozen `10:00`, which reads as a
 *   stopped timer rather than one that has not started;
 * - the clock kept running after the case had already been decided.
 *
 * The timer module stays pure and owns every transition. This module owns where
 * the authoritative `TimerState` lives (persisted game state) and what the rest
 * of the game is allowed to ask about it.
 */

import {
  configFor,
  elapsedMs,
  isExpired,
  pause,
  remainingMs,
  resume,
  secondsLeft,
  start,
  type TimerConfig,
  type TimerState,
} from "@/game/pressure/timer";
import type { GameState } from "@/game/state/types";
import { getGameState, setTimer } from "./game";
import { currentOutcome } from "./outcome";

/** Ten minutes, with a three-second settle so it never expires on arrival. */
export const CLEARING_WINDOW: TimerConfig = {
  durationMs: 600_000,
  graceMs: 3_000,
  untimed: false,
};

export type WindowPhase = "not-started" | "running" | "paused" | "expired" | "resolved";

export interface WindowStatus {
  phase: WindowPhase;
  /** Whole seconds left, or null before the case opens. */
  secondsLeft: number | null;
  /** `MM:SS`, or null before the case opens. */
  display: string | null;
  /** True once the window has closed and the money is gone. */
  expired: boolean;
  /** True while the clock is deliberately stopped (AI connecting, or resolved). */
  paused: boolean;
  untimed: boolean;
}

const pad = (value: number) => String(Math.max(0, value)).padStart(2, "0");

/** `MM:SS` for a whole-second count. */
export function formatWindow(totalSeconds: number): string {
  return `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`;
}

/**
 * Read the window.
 *
 * Deliberately takes both state and `now` so it is pure and can be driven by a
 * fake clock in tests.
 */
export function windowStatus(state: Pick<GameState, "timer" | "flags">, now: number): WindowStatus {
  const timer = state.timer;
  if (!timer) {
    return {
      phase: "not-started",
      secondsLeft: null,
      display: null,
      expired: false,
      paused: false,
      untimed: false,
    };
  }

  const resolved = typeof state.flags["case.outcome"] === "string";
  const expired = Boolean(state.flags["branch.window-expired"]) || isExpired(timer, now);
  const left = secondsLeft(timer, now);

  const phase: WindowPhase = resolved
    ? "resolved"
    : expired
      ? "expired"
      : timer.pausedAt !== null
        ? "paused"
        : "running";

  return {
    phase,
    secondsLeft: left,
    display: formatWindow(left),
    expired,
    paused: timer.pausedAt !== null,
    untimed: timer.config.untimed,
  };
}

/**
 * Start the window. No-op if it is already running, so a double-fired open
 * cannot hand the player a fresh ten minutes.
 */
export function openClearingWindow(now: number, prefersReducedMotion = false): TimerState {
  const existing = getGameState().timer;
  if (existing) return existing;
  const timer = start(configFor(CLEARING_WINDOW, prefersReducedMotion), now);
  setTimer(timer);
  return timer;
}

/**
 * Stop the clock while the game is not really being played — an NPC line
 * connecting, a resolved case. Persisted, so it survives a remount; the pause
 * used to be held in component state and was silently refunded by navigation.
 */
export function pauseClearingWindow(now: number): void {
  const timer = getGameState().timer;
  if (!timer || timer.pausedAt !== null) return;
  setTimer(pause(timer, now));
}

/** Resume, unless the case is already decided — a settled case never restarts. */
export function resumeClearingWindow(now: number): void {
  const timer = getGameState().timer;
  if (!timer || timer.pausedAt === null) return;
  if (currentOutcome()) return;
  setTimer(resume(timer, now));
}

/** Freeze the clock permanently once the case is decided. */
export function freezeClearingWindow(now: number): void {
  const timer = getGameState().timer;
  if (!timer || timer.pausedAt !== null) return;
  setTimer(pause(timer, now));
}

/** Convenience for hint urgency: the last two minutes. */
export function isWindowClosing(state: Pick<GameState, "timer">, now: number): boolean {
  return state.timer ? remainingMs(state.timer, now) <= 120_000 : false;
}

/** Exposed for tests and diagnostics. */
export const windowElapsedMs = (state: Pick<GameState, "timer">, now: number): number =>
  state.timer ? elapsedMs(state.timer, now) : 0;

/**
 * The shape `InvestigationHUD` (owned by Agent 2) consumes.
 *
 * Kept as an adapter rather than changing `WindowStatus` so the gameplay model
 * and the render contract can move independently.
 *
 * NOTE FOR AGENT 2: this union has no variant for a window that has closed or a
 * case that has been decided, so both currently render through `paused`, which
 * reads as "temporarily stopped" rather than "over". Requested addition:
 * `{ status: "expired" | "resolved"; label: string }`. Until then `hudTimer`
 * maps them to `paused` and the panel HUD renders expiry itself.
 */
export type HudTimer =
  | { status: "not-started" | "untimed" }
  | { status: "running" | "paused"; label: string };

export function hudTimer(state: Pick<GameState, "timer" | "flags">, now: number): HudTimer {
  const status = windowStatus(state, now);
  if (status.phase === "not-started") return { status: "not-started" };
  if (status.untimed) return { status: "untimed" };
  return {
    status: status.phase === "running" ? "running" : "paused",
    label: status.display ?? "--:--",
  };
}
