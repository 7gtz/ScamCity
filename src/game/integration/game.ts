import type { Condition, Effect } from "@/game/dialogue/types";
import type { LocationId } from "@/game/world/types";
import type { TimerState } from "@/game/pressure/timer";
import type { GameState, GameStateApi } from "@/game/state/types";
import { useGameStore, snapshot, setFlag, hasFlag, evaluate } from "@/game/state/game-store";
import { save, load } from "@/game/state/save";

/** Public boundary: consumers need no knowledge of Zustand or its actions. */
export { setFlag, hasFlag, evaluate, save, load };
export { emit, on } from "@/game/state/event-bus";
export { evaluateCondition } from "@/game/state/conditions";
export const game: GameStateApi = { setFlag, hasFlag, evaluate, save, load };
export const getGameState = (): GameState => snapshot(useGameStore.getState());
export const subscribeGameState = (listener: () => void) => useGameStore.subscribe(listener);
export const enterPanel = (id: LocationId) => useGameStore.getState().enterPanel(id);
export const giveEvidence = (id: string) => useGameStore.getState().giveEvidence(id);
export const giveItem = (id: string) => useGameStore.getState().giveItem(id);
export const removeItem = (id: string) => useGameStore.getState().removeItem(id);
export const changeTrust = (npc: string, delta: number) => useGameStore.getState().changeTrust(npc, delta);
export const changeStress = (delta: number) => useGameStore.getState().changeStress(delta);
export const applyEffects = (effects: readonly Effect[]) => useGameStore.getState().applyEffects(effects);
export const setTimer = (timer: TimerState | null) => useGameStore.getState().setTimer(timer);
export const resetGame = (caseId?: string | null) => useGameStore.getState().resetGame(caseId);
export const canAccess = (condition?: Condition) => condition === undefined || evaluate(condition);
