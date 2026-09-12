import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Condition, Effect } from "@/game/dialogue/types";
import type { LocationId } from "@/game/world/types";
import type { FlagId, GameState } from "./types";
import { evaluateCondition } from "./conditions";
import { emit } from "./event-bus";
import { connectSaveSource, SAVE_KEY, SAVE_VERSION, saveStorage } from "./save";

export function initialGameState(): GameState {
  return { location: "office", flags: {}, evidence: [], inventory: [], trust: {}, stress: 0, caseId: "ten-minute-window", version: SAVE_VERSION };
}

interface GameActions {
  setFlag: (id: FlagId, value: boolean | number | string) => void;
  hasFlag: (id: FlagId) => boolean;
  evaluate: (condition: Condition) => boolean;
  enterPanel: (id: LocationId) => void;
  giveEvidence: (id: string) => void;
  giveItem: (id: string) => void;
  removeItem: (id: string) => void;
  changeTrust: (npc: string, delta: number) => void;
  changeStress: (delta: number) => void;
  applyEffects: (effects: readonly Effect[]) => void;
  resetGame: (caseId?: string | null) => void;
}

export function snapshot(state: GameState): GameState {
  return { location: state.location, flags: { ...state.flags }, evidence: [...state.evidence], inventory: [...state.inventory], trust: { ...state.trust }, stress: state.stress, caseId: state.caseId, version: state.version };
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** UI outside foundation consumes integration/game.ts, not this store. */
export const useGameStore = create<GameState & GameActions>()(
  persist<GameState & GameActions, [], [], GameState>(
    (set, get) => ({
      ...initialGameState(),
      setFlag: (id, value) => {
        if (typeof value === "number" && !Number.isFinite(value)) return;
        if (Object.hasOwn(get().flags, id) && get().flags[id] === value) return;
        set((state) => ({ flags: { ...state.flags, [id]: value } }));
        emit({ type: "flag-set", id });
      },
      hasFlag: (id) => Object.hasOwn(get().flags, id) && Boolean(get().flags[id]),
      evaluate: (condition) => evaluateCondition(condition, get()),
      enterPanel: (id) => {
        if (get().location === id) return;
        set({ location: id });
        emit({ type: "panel-entered", id });
      },
      giveEvidence: (id) => {
        if (get().evidence.includes(id)) return;
        set((state) => ({ evidence: [...state.evidence, id] }));
        emit({ type: "evidence-found", id });
      },
      giveItem: (id) => { if (!get().inventory.includes(id)) set((state) => ({ inventory: [...state.inventory, id] })); },
      removeItem: (id) => { if (get().inventory.includes(id)) set((state) => ({ inventory: state.inventory.filter((item) => item !== id) })); },
      changeTrust: (npc, delta) => {
        if (!Number.isFinite(delta)) return;
        set((state) => ({ trust: { ...state.trust, [npc]: clamp((Object.hasOwn(state.trust, npc) ? state.trust[npc]! : 0) + delta, -100, 100) } }));
      },
      changeStress: (delta) => { if (Number.isFinite(delta)) set((state) => ({ stress: clamp(state.stress + delta, 0, 100) })); },
      applyEffects: (effects) => {
        for (const effect of effects) {
          if ("setFlag" in effect) get().setFlag(effect.setFlag, effect.to);
          else if ("giveEvidence" in effect) get().giveEvidence(effect.giveEvidence);
          else if ("trust" in effect) get().changeTrust(effect.trust, effect.by);
          else get().changeStress(effect.stress);
        }
      },
      resetGame: (caseId = "ten-minute-window") => set({ ...initialGameState(), caseId }),
    }),
    { name: SAVE_KEY, version: SAVE_VERSION, storage: createJSONStorage(() => saveStorage), skipHydration: true, partialize: snapshot },
  ),
);

connectSaveSource(() => snapshot(useGameStore.getState()));

export const setFlag = (id: FlagId, value: boolean | number | string) => useGameStore.getState().setFlag(id, value);
export const hasFlag = (id: FlagId) => useGameStore.getState().hasFlag(id);
export const evaluate = (condition: Condition) => useGameStore.getState().evaluate(condition);
