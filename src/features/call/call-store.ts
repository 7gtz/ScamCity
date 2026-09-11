import { create } from "zustand";
import type {
  CallBrief,
  CallerIdentity,
  CallStatus,
  PlayerAction,
  RealWorldContext,
  ScammerState,
  Speaker,
  TacticId,
  TranscriptMessage,
} from "@/lib/live/types";
import type { ProviderKind } from "@/lib/live/provider";
import { transition } from "./call-machine";

interface CallState {
  status: CallStatus;
  scenarioId: string | null;
  mode: ProviderKind | null;
  context: RealWorldContext | null;
  /** The director's caller for this call; overrides the district's default persona. */
  caller: CallerIdentity | null;
  brief: CallBrief | null;
  planner: "director" | "static" | null;
  transcript: TranscriptMessage[];
  agent: ScammerState | null;
  options: PlayerAction[];
  speaking: Speaker | null;
  /** performance.now() when the call went live */
  liveAt: number | null;
  detected: { tactic: TacticId; at: number }[];
  muted: boolean;
  /** Playing on speakers, not headphones: the mic is held while the caller speaks. A remembered preference. */
  speakerMode: boolean;
  error: { code: string; message: string } | null;

  reset: (scenarioId: string) => void;
  setSpeakerMode: (on: boolean) => void;
  /** Reads the remembered preference (after mount, so server and client render alike). */
  loadSpeakerMode: () => void;
  setStatus: (status: CallStatus) => void;
  setMode: (mode: ProviderKind) => void;
  setContext: (context: RealWorldContext) => void;
  setCaller: (caller: CallerIdentity, brief: CallBrief, planner: "director" | "static") => void;
  /** Insert, or replace a message with the same id (live transcription grows in place). */
  push: (message: TranscriptMessage) => void;
  setAgent: (agent: ScammerState) => void;
  setOptions: (options: PlayerAction[]) => void;
  setSpeaking: (speaker: Speaker | null) => void;
  addDetected: (tactic: TacticId, at: number) => void;
  setMuted: (muted: boolean) => void;
  fail: (code: string, message: string) => void;
}

const initial = {
  status: "idle" as CallStatus,
  scenarioId: null,
  mode: null,
  context: null,
  caller: null,
  brief: null,
  planner: null,
  transcript: [],
  agent: null,
  options: [],
  speaking: null,
  liveAt: null,
  detected: [],
  muted: false,
  error: null,
};

const SPEAKER_KEY = "scam-city:speaker-mode";

/** Live-call state: one active call at a time. Not persisted (except the speakers preference). */
export const useCallStore = create<CallState>()((set) => ({
  ...initial,
  speakerMode: false,
  // A new call starts clean, but keeps the player's speakers/headphones choice.
  reset: (scenarioId) => set((s) => ({ ...initial, scenarioId, speakerMode: s.speakerMode })),
  setSpeakerMode: (speakerMode) => {
    set({ speakerMode });
    try {
      localStorage.setItem(SPEAKER_KEY, speakerMode ? "1" : "0");
    } catch {
      // storage blocked: the choice lasts for this page only
    }
  },
  loadSpeakerMode: () => {
    try {
      set({ speakerMode: localStorage.getItem(SPEAKER_KEY) === "1" });
    } catch {
      // storage blocked
    }
  },
  setStatus: (status) =>
    set((s) => {
      const next = transition(s.status, status);
      return { status: next, liveAt: next === "live" && s.status !== "live" ? performance.now() : s.liveAt };
    }),
  setMode: (mode) => set({ mode }),
  setContext: (context) => set({ context }),
  setCaller: (caller, brief, planner) => set({ caller, brief, planner }),
  push: (message) =>
    set((s) => {
      const i = s.transcript.findIndex((m) => m.id === message.id);
      if (i < 0) return { transcript: [...s.transcript, message] };
      const transcript = s.transcript.slice();
      transcript[i] = message;
      return { transcript };
    }),
  setAgent: (agent) => set({ agent }),
  setOptions: (options) => set({ options }),
  setSpeaking: (speaking) => set({ speaking }),
  addDetected: (tactic, at) => set((s) => ({ detected: [...s.detected, { tactic, at }] })),
  setMuted: (muted) => set({ muted }),
  fail: (code, message) => set((s) => ({ status: transition(s.status, "error"), error: { code, message } })),
}));
