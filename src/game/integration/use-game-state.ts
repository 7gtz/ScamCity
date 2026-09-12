"use client";

import type { GameState } from "@/game/state/types";
import { useGameStore } from "@/game/state/game-store";

/** Select primitives or existing references, as with Zustand selectors. */
export function useGameState<T>(selector: (state: Readonly<GameState>) => T): T {
  return useGameStore(selector);
}
