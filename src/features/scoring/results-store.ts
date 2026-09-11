import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CallScore } from "@/lib/live/types";

interface ResultsState {
  scores: Record<string, CallScore>;
  save: (score: CallScore) => void;
}

/**
 * Scorecards for this browser session. Stands in for the `scorecards` table
 * until Supabase is connected. Rehydrated by <StoreHydrator />.
 */
export const useResultsStore = create<ResultsState>()(
  persist(
    (set) => ({
      scores: {},
      save: (score) => set((s) => ({ scores: { ...s.scores, [score.sessionId]: score } })),
    }),
    {
      name: "scam-city:results",
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
    },
  ),
);
