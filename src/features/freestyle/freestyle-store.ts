import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { EmailEncounter, SiteEncounter } from "@/lib/encounters";
import type { RealWorldContext } from "@/lib/live/types";
import type { ChatPlan } from "@/lib/validation/schemas";
import type { Channel, EncounterSpec, Pace } from "./schedule";

/** Falling for a scam costs a life. Lose them all and the day is over. */
export const LIVES = 3;
/** Encounters to survive to win the day. */
export const GOAL = 8;

export interface Encounter {
  id: string;
  spec: EncounterSpec;
  title: string;
  body: string;
  email?: EmailEncounter;
  site?: SiteEncounter;
  chat?: { plan: ChatPlan; difficulty: number };
}

export interface LogEntry {
  id: string;
  channel: Channel;
  title: string;
  legit: boolean;
  correct: boolean;
  caught: boolean;
  /** Ignored or let ring out. */
  missed?: boolean;
  at: number;
}

export type FreestyleStatus = "idle" | "active" | "won" | "lost";

interface FreestyleState {
  status: FreestyleStatus;
  pace: Pace;
  lives: number;
  handled: number;
  /** The session's real-world context: every encounter is written for it. */
  context: RealWorldContext | null;
  /** Arrived, waiting for the player to answer or ignore. */
  incoming: Encounter | null;
  /** Accepted, being played right now. */
  current: Encounter | null;
  log: LogEntry[];
  /** When the next encounter lands (epoch ms). */
  nextAt: number | null;

  wake: (pace: Pace, context: RealWorldContext | null) => void;
  stop: () => void;
  setNextAt: (at: number | null) => void;
  ring: (encounter: Encounter) => void;
  accept: () => Encounter | null;
  ignore: () => void;
  resolve: (result: { correct: boolean; caught: boolean; title?: string; legit?: boolean }) => void;
}

const fresh = { lives: LIVES, handled: 0, incoming: null, current: null, log: [] as LogEntry[], nextAt: null };

function settle(s: FreestyleState, entry: LogEntry): Partial<FreestyleState> {
  const lives = s.lives - (entry.caught ? 1 : 0);
  const handled = s.handled + 1;
  return {
    log: [entry, ...s.log],
    lives,
    handled,
    incoming: null,
    current: null,
    nextAt: null,
    status: lives <= 0 ? "lost" : handled >= GOAL ? "won" : "active",
  };
}

/** Freestyle session state. Per browser tab (sessionStorage), survives in-site navigation and reloads. */
export const useFreestyle = create<FreestyleState>()(
  persist(
    (set, get) => ({
      status: "idle",
      pace: "normal",
      context: null,
      ...fresh,

      wake: (pace, context) => set({ ...fresh, status: "active", pace, context }),
      stop: () => set({ ...fresh, status: "idle" }),
      setNextAt: (nextAt) => set({ nextAt }),
      ring: (incoming) => set({ incoming }),
      accept: () => {
        const { incoming } = get();
        if (!incoming) return null;
        set({ incoming: null, current: incoming });
        return incoming;
      },
      ignore: () => {
        const s = get();
        if (!s.incoming) return;
        const e = s.incoming;
        // Ignoring a scam is safe; ignoring something genuine is a miss. Neither costs a life.
        set(settle(s, { id: e.id, channel: e.spec.channel, title: e.title, legit: e.spec.legit, correct: !e.spec.legit, caught: false, missed: true, at: Date.now() }));
      },
      resolve: ({ correct, caught, title, legit }) => {
        const s = get();
        const e = s.current;
        if (!e || s.status !== "active") return;
        set(settle(s, { id: e.id, channel: e.spec.channel, title: title ?? e.title, legit: legit ?? e.spec.legit, correct, caught, at: Date.now() }));
      },
    }),
    {
      name: "scam-city:freestyle",
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
    },
  ),
);

/** Where an accepted encounter is played. */
export function routeFor(e: Encounter) {
  switch (e.spec.channel) {
    case "call":
      return `/play/${e.spec.scenarioId ?? "bank-security"}?auto=1`;
    case "email":
      return "/inbox?fs=1";
    case "sms":
      return "/messages?fs=1";
    case "web":
      return "/web?fs=1";
  }
}

/** True when the page was opened by Freestyle for the current encounter. */
export function freestyleEncounter(channel: Channel) {
  if (typeof window === "undefined" || new URLSearchParams(window.location.search).get("fs") !== "1") return null;
  const current = useFreestyle.getState().current;
  return current?.spec.channel === channel ? current : null;
}
