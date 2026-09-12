import { z } from "zod";
import type { StateStorage } from "zustand/middleware";
import type { GameState } from "./types";

export const SAVE_KEY = "scam-city:detective";
export const SAVE_VERSION = 1;
export const AUTOSAVE_DELAY_MS = 300;

/**
 * Persisted shape of `TimerState`. Optional and nullable: a save written before
 * the clock was persisted still loads, and simply starts with no clock.
 */
const timerStateSchema = z
  .object({
    config: z.object({
      durationMs: z.number().finite().nonnegative(),
      graceMs: z.number().finite().nonnegative(),
      untimed: z.boolean(),
    }),
    startedAt: z.number().finite(),
    pausedAt: z.number().finite().nullable(),
    pausedTotalMs: z.number().finite().nonnegative(),
  })
  .nullable();

export const gameStateSchema = z.object({
  location: z.enum(["office", "victim-flat", "bank-branch", "repair-shop", "police-station"]),
  flags: z.record(z.string(), z.union([z.boolean(), z.number().finite(), z.string()])),
  evidence: z.array(z.string()).refine((ids) => new Set(ids).size === ids.length),
  inventory: z.array(z.string()).refine((ids) => new Set(ids).size === ids.length),
  trust: z.record(z.string(), z.number().min(-100).max(100)),
  stress: z.number().min(0).max(100),
  caseId: z.string().nullable(),
  timer: timerStateSchema.optional().default(null),
  version: z.literal(SAVE_VERSION),
});

const envelopeSchema = z.object({ state: gameStateSchema, version: z.literal(SAVE_VERSION) });
let pending: string | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let readState: (() => GameState) | undefined;

/** Called once by the store; keeps persistence independent of Zustand actions. */
export function connectSaveSource(source: () => GameState) { readState = source; }

/** Invalid JSON, stale versions, denied storage and SSR all start fresh. */
export function load(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw === null) return null;
    const result = envelopeSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data.state : null;
  } catch { return null; }
}

export function flushSave(): void {
  clearTimeout(timer);
  timer = undefined;
  if (pending === null) return;
  const value = pending;
  pending = null;
  try { localStorage.setItem(SAVE_KEY, value); } catch { /* Private/quota-limited storage is optional. */ }
}

function schedule(value: string): void {
  pending = value;
  clearTimeout(timer);
  timer = setTimeout(flushSave, AUTOSAVE_DELAY_MS);
}

/** Explicit save shares the same key and debounce as Zustand persistence. */
export function save(): void {
  if (!readState) return;
  try {
    const state = gameStateSchema.safeParse(readState());
    if (state.success) schedule(JSON.stringify({ state: state.data, version: SAVE_VERSION }));
  } catch { /* Saving must not interrupt a choice. */ }
}

export function clearSave(): void {
  clearTimeout(timer);
  timer = undefined;
  pending = null;
  try { localStorage.removeItem(SAVE_KEY); } catch { /* Storage may be disabled. */ }
}

/** createJSONStorage uses the usual persist envelope; only validated data returns. */
export const saveStorage: StateStorage = {
  getItem: () => {
    const state = load();
    return state ? JSON.stringify({ state, version: SAVE_VERSION }) : null;
  },
  setItem: (_name, value) => {
    try {
      const parsed = envelopeSchema.safeParse(JSON.parse(value));
      if (parsed.success) schedule(JSON.stringify(parsed.data));
    } catch { /* Never persist an invalid snapshot. */ }
  },
  removeItem: () => clearSave(),
};
