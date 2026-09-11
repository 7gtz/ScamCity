import { create } from "zustand";
import type {
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
  transcript: TranscriptMessage[];
  agent: ScammerState | null;
  options: PlayerAction[];
  speaking: Speaker | null;
  /** performance.now() when the call went live */
  liveAt: number | null;
  detected: { tactic: TacticId; at: number }[];
  muted: boolean;
  error: { code: string; message: string } | null;

  reset: (scenarioId: string) => void;
  setStatus: (status: CallStatus) => void;
  setMode: (mode: ProviderKind) => void;
  setContext: (context: RealWorldContext) => void;
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
  transcript: [],
  agent: null,
  options: [],
  speaking: null,
  liveAt: null,
  detected: [],
  muted: false,
  error: null,
};

/** Live-call state: one active call at a time. Not persisted. */
export const useCallStore = create<CallState>()((set) => ({
  ...initial,
  reset: (scenarioId) => set({ ...initial, scenarioId }),
  setStatus: (status) =>
    set((s) => {
      const next = transition(s.status, status);
      return { status: next, liveAt: next === "live" && s.status !== "live" ? performance.now() : s.liveAt };
    }),
  setMode: (mode) => set({ mode }),
  setContext: (context) => set({ context }),
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
