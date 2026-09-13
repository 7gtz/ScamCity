/**
 * NPC layer contracts — free-form voice conversations with the five people in
 * "The Ten-Minute Window".
 *
 * This is the seam between the two workstreams building Act 2:
 * - the AI side (personas, dossier, guarded tool executor, server routes)
 *   produces `NpcToolResult`s and never imports React;
 * - the client side (overlay, mic/audio hook) consumes `NpcSession` and is the
 *   only place `applyEffects` is called.
 *
 * Frozen once landed. Types, ids and pure lookup tables only — no runtime logic
 * beyond the constant maps, and no imports outside contract modules.
 *
 * Spec: docs/implementation_plan.md.
 */

import type { Effect } from "@/game/dialogue/types";
import type { LocationId } from "@/game/world/types";

/**
 * The five speakable NPCs. A closed union, like `LocationId`, so a typo in a
 * persona table or a hotspot fails typecheck instead of opening an empty
 * conversation at runtime.
 */
/**
 * `mara-call` is Mara on the telephone in the cold open, before the detective
 * has met her. Deliberately a separate speaker from `mara` at the flat: she
 * knows less, volunteers less, and can hand over nothing down a phone line.
 */
export type NpcId = "miller" | "mara" | "mara-call" | "vance" | "ravi" | "brennan";

export const NPC_IDS: readonly NpcId[] = ["miller", "mara", "mara-call", "vance", "ravi", "brennan"];

/**
 * The authored dialogue trees and `Hotspot.action.npc` predate this layer and
 * use longer keys. This bridges them, so hotspots need no rewrite and the
 * authored tree stays reachable as the offline fallback.
 */
export const NPC_BY_DIALOGUE_KEY: Record<string, NpcId> = {
  detective: "miller",
  "mara-okoye": "mara",
  "teller-vance": "vance",
  "ravi-sunder": "ravi",
  "sgt-brennan": "brennan",
};

/** The inverse: the trust id and dialogue entry key each NPC owns. */
export const DIALOGUE_KEY_BY_NPC: Record<NpcId, string> = {
  miller: "detective",
  mara: "mara-okoye",
  "mara-call": "mara-okoye",
  vance: "teller-vance",
  ravi: "ravi-sunder",
  brennan: "sgt-brennan",
};

/** Where each NPC stands. Used to reject tool calls from the wrong scene. */
export const NPC_LOCATION: Record<NpcId, LocationId> = {
  miller: "office",
  mara: "victim-flat",
  // She is on the phone; the detective is at their desk.
  "mara-call": "office",
  vance: "bank-branch",
  ravi: "repair-shop",
  brennan: "police-station",
};

/* -------------------------------------------------------------------------- */
/* Tools                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * What an NPC may attempt. The model chooses freely; `executeNpcTool` decides
 * whether the attempt actually lands (docs/DETECTIVE-TRACK-24H.md section 11 —
 * AI drives performance, never outcomes).
 */
export type NpcToolName =
  | "give_evidence"
  | "authorize_freeze"
  | "accuse_suspect"
  | "clear_lead"
  | "lodge_report"
  | "end_conversation";

export interface NpcToolCall {
  /** Gemini's call id, echoed back in the mandatory tool response. */
  id: string;
  name: NpcToolName;
  args: Record<string, unknown>;
  /** Who tried to call it — guards are per-NPC. */
  npc: NpcId;
}

/**
 * The guard's verdict. `reason` is sent back to the model as the function
 * response, so a refusal becomes something the NPC says out loud in character
 * rather than a silent no-op.
 */
export interface NpcToolResult {
  ok: boolean;
  reason: string;
  /** The only mutation channel. Applied by the client via `applyEffects`. */
  effects: readonly Effect[];
  /** True when the NPC should close the conversation after speaking. */
  ends?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Session                                                                    */
/* -------------------------------------------------------------------------- */

export type NpcSessionStatus =
  | "idle"
  | "connecting"
  | "live"
  | "ending"
  | "ended"
  | "error"
  /** No key, no mic, or the socket failed — the caller falls back to the authored tree. */
  | "unavailable";

/** One line of the streaming subtitle reel. `final` marks the turn closed. */
export interface NpcSubtitle {
  id: string;
  speaker: "player" | "npc";
  text: string;
  final: boolean;
}

export type NpcSessionEvent =
  | { type: "status"; status: NpcSessionStatus }
  | { type: "subtitle"; subtitle: NpcSubtitle }
  | { type: "speaking"; who: "player" | "npc"; on: boolean }
  | { type: "tool"; call: NpcToolCall; result: NpcToolResult }
  | { type: "error"; message: string }
  | { type: "ended"; reason: "player" | "npc" | "error" };

/**
 * One conversation with one NPC. Implemented twice: `createMockNpcSession` for
 * offline work and demos, and the live Gemini session behind `useNpcVoice`.
 */
export interface NpcSession {
  readonly npc: NpcId;
  connect(): Promise<void>;
  startMicrophone(stream: MediaStream): Promise<void>;
  /** No-mic path: typed player turns. */
  sendText(text: string): void;
  setMuted(muted: boolean): void;
  end(): Promise<void>;
  on(listener: (event: NpcSessionEvent) => void): () => void;
}

export type NpcSessionFactory = (npc: NpcId) => NpcSession;

/** Props for the bottom-sheet interrogation overlay. */
export interface VoiceInterrogationOverlayProps {
  npc: NpcId;
  /** Where the guarded effects land — the client calls `applyEffects` here. */
  onEffects: (effects: readonly Effect[]) => void;
  onClose: () => void;
  /** Deterministic, button-led path used for the short judge presentation. */
  demoMode?: boolean;
  /** Authored-tree entry node, shown when the session reports `unavailable`. */
  fallbackDialogueNodeId?: string;
}
