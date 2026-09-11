import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { TacticId } from "@/lib/live/types";

/** Correct riddles needed before the legitimate-call level unlocks. */
export const RIDDLES_TO_UNLOCK = 3;

interface ProgressState {
  /** Scenario IDs passed at or above the threshold. */
  cleared: string[];
  /**
   * Tactics the player has been taught. The red-flag tracker only shows these,
   * so the HUD teaches without spoiling (spec "Gamification Layer").
   */
  learned: TacticId[];
  /** How often each tactic has slipped past this player. Steers every generator and the director. */
  weak: Partial<Record<TacticId, number>>;
  /** How often the player has caught each tactic. With `weak`, it draws the defense profile. */
  strong: Partial<Record<TacticId, number>>;
  /** Recent call pretexts, so the director never repeats itself. */
  recentHooks: string[];
  riddle: { answered: number; correct: number; seen: string[] };

  clear: (scenarioId: string) => void;
  rememberHook: (hook: string) => void;
  learn: (tactics: TacticId[]) => void;
  recordTactics: (missed: TacticId[], caught: TacticId[]) => void;
  answerRiddle: (id: string, correct: boolean) => void;
  resetProgress: () => void;
}

const initial = {
  cleared: [] as string[],
  learned: ["authority", "urgency"] as TacticId[],
  weak: {} as Partial<Record<TacticId, number>>,
  strong: {} as Partial<Record<TacticId, number>>,
  recentHooks: [] as string[],
  riddle: { answered: 0, correct: 0, seen: [] as string[] },
};

/** The tactics this player misses most — the AI game master's targets. */
export const weakest = (weak: Partial<Record<TacticId, number>>, n = 2) =>
  (Object.entries(weak) as [TacticId, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([t]) => t);

/** Stands in for `player_progress` until Supabase is connected. */
export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      ...initial,
      clear: (id) => set((s) => (s.cleared.includes(id) ? s : { cleared: [...s.cleared, id] })),
      rememberHook: (hook) => set((s) => ({ recentHooks: [...s.recentHooks.filter((h) => h !== hook), hook].slice(-6) })),
      learn: (tactics) => set((s) => ({ learned: [...new Set([...s.learned, ...tactics])] })),
      recordTactics: (missed, caught) =>
        set((s) => {
          const weak = { ...s.weak };
          const strong = { ...s.strong };
          for (const t of missed) weak[t] = (weak[t] ?? 0) + 1;
          for (const t of caught) {
            weak[t] = Math.max(0, (weak[t] ?? 0) - 1);
            strong[t] = (strong[t] ?? 0) + 1;
          }
          return { weak, strong };
        }),
      answerRiddle: (id, correct) =>
        set((s) =>
          s.riddle.seen.includes(id)
            ? s
            : {
                riddle: {
                  answered: s.riddle.answered + 1,
                  correct: s.riddle.correct + (correct ? 1 : 0),
                  seen: [...s.riddle.seen, id],
                },
              },
        ),
      resetProgress: () => set(initial),
    }),
    {
      name: "scam-city:progress",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
