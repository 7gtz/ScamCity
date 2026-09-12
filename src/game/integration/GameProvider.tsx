"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useGameStore } from "@/game/state/game-store";
import { flushSave } from "@/game/state/save";

const ReadyContext = createContext(false);
export const useGameReady = () => useContext(ReadyContext);

/** Hydrate once above both city routes, before any panel can mutate state. */
export function GameProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      if (!useGameStore.persist.hasHydrated()) await useGameStore.persist.rehydrate();
      if (active) setReady(true);
    };
    void hydrate();
    const visibility = () => { if (document.visibilityState === "hidden") flushSave(); };
    window.addEventListener("pagehide", flushSave);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      active = false;
      flushSave();
      window.removeEventListener("pagehide", flushSave);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  return <ReadyContext.Provider value={ready}>{children}</ReadyContext.Provider>;
}
