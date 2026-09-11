/**
 * Live-call contracts. UI depends only on these — never on a vendor SDK
 * (ScamCity-stack.md "Provider abstraction").
 */

export type Speaker = "player" | "scammer";

export type TacticId =
  | "authority"
  | "urgency"
  | "verification-request"
  | "social-pressure"
  | "fear"
  | "secrecy";

export type DistrictId = "bank" | "delivery" | "desk" | "prize" | "impostor" | "romance";

export interface ScammerPersona {
  id: string;
  name: string;
  role: string;
  organization: string;
  /** Path under /public. Omitted until real photography exists. */
  portrait?: string;
  /** Legitimate control calls teach "verify", not "distrust everyone". */
  legitimate: boolean;
  district: DistrictId;
  level: number;
}

export interface TranscriptMessage {
  id: string;
  speaker: Speaker;
  text: string;
  /** ms since the call went live */
  at: number;
  tactics?: TacticId[];
}

export interface ScammerState {
  persona: string;
  currentTactic: TacticId | null;
  tacticsUsed: TacticId[];
  /** 0–3 */
  escalationLevel: number;
  /** 0–1, the agent's estimate of how suspicious the player is */
  suspicionEstimate: number;
  /** The analyst's read of what the caller is attempting right now. */
  intent?: string;
}

/**
 * The player's real surroundings. The live caller weaves these into the con,
 * so where and when you play changes what you hear.
 */
export interface RealWorldContext {
  timezone: string;
  /** e.g. "Thursday 14:05" */
  localTime: string;
  locale?: string;
  city?: string;
  region?: string;
  country?: string;
  /** e.g. "light rain, 11°C" */
  weather?: string;
  source: "gps" | "timezone";
}

export type CallStatus =
  | "idle"
  | "permission-requested"
  | "connecting"
  | "ringing"
  | "live"
  | "ending"
  | "scoring"
  | "results"
  | "error";

/** Scripted replies. Only the mock provider offers these; live voice does not. */
export interface PlayerAction {
  id: string;
  text: string;
}

export type CallOutcome = "hung-up" | "scammed" | "exposed" | "verified-legit" | "rejected-legit";

export interface CompletedCall {
  sessionId: string;
  scenarioId: string;
  legitimate: boolean;
  durationMs: number;
  transcript: TranscriptMessage[];
  outcome: CallOutcome;
  /** Fictional sensitive details the player gave away. */
  revealed: string[];
  tacticsDetected: { tactic: TacticId; at: number }[];
  suspicion: { at: number; value: number }[];
  /** Score bonus a scripted ending grants for a well-judged decision. */
  decisionQuality?: number;
  context?: RealWorldContext;
}

export interface LiveCallConfig {
  scenarioId: string;
}

export type LiveCallEvent =
  | { type: "status"; status: CallStatus }
  | { type: "transcript"; message: TranscriptMessage }
  | { type: "state"; state: ScammerState }
  | { type: "speaking"; speaker: Speaker | null }
  | { type: "options"; options: PlayerAction[] }
  | { type: "tactic-detected"; tactic: TacticId; at: number }
  | { type: "ended"; call: CompletedCall }
  | { type: "error"; code: string; message: string };

export type LiveCallEventType = LiveCallEvent["type"];
export type LiveCallListener<T extends LiveCallEventType> = (event: Extract<LiveCallEvent, { type: T }>) => void;

export interface LiveCallProvider {
  connect(config: LiveCallConfig): Promise<void>;
  startMicrophone(stream: MediaStream): Promise<void>;
  sendText(message: string): void;
  /** Mock-only: pick a scripted reply. */
  choose?(actionId: string): void;
  setMuted?(muted: boolean): void;
  endCall(): Promise<CompletedCall>;
  disconnect(): void;
  on<T extends LiveCallEventType>(type: T, listener: LiveCallListener<T>): () => void;
}

export interface CallScore {
  sessionId: string;
  scenarioId: string;
  legitimate: boolean;
  outcome: CallOutcome;
  score: number;
  threshold: number;
  passed: boolean;
  caught: { tactic: TacticId; at: number }[];
  missed: TacticId[];
  events: { at: number; label: string }[];
  suspicion: { at: number; value: number }[];
  durationMs: number;
  notes: string[];
  /** Who scored it: the Gemini judge, or the deterministic fallback. */
  judge?: "gemini" | "rules";
}
