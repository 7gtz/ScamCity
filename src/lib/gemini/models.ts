/**
 * One server-controlled place for model ids (ScamCity-stack.md): the Live
 * family moves quickly, so each can be swapped by env at demo time.
 */
export const MODELS = {
  /** Real-time native-audio persona. */
  live: process.env.GEMINI_LIVE_MODEL ?? "gemini-3.1-flash-live-preview",
  /** Writes a unique plan for every call. */
  director: process.env.GEMINI_DIRECTOR_MODEL ?? "gemini-3.5-flash-lite",
  /** Per-turn call analyst: must be fast. */
  analyst: process.env.GEMINI_ANALYST_MODEL ?? "gemini-3.5-flash-lite",
  /** Post-call judge: quality over speed. */
  judge: process.env.GEMINI_JUDGE_MODEL ?? "gemini-3.8-flash",
  /** Adaptive riddle generator. */
  riddle: process.env.GEMINI_RIDDLE_MODEL ?? "gemini-3.5-flash-lite",
};

/** Prebuilt Live voices, drawn at random so the same district never sounds the same twice. */
const VOICE_POOLS = {
  male: ["Charon", "Fenrir", "Orus", "Puck"],
  female: ["Kore", "Aoede", "Leda", "Zephyr"],
} as const;

export function pickVoice(gender: "male" | "female") {
  const pool = VOICE_POOLS[gender];
  return pool[Math.floor(Math.random() * pool.length)]!;
}
