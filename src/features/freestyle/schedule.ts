import { SCENARIO_ORDER } from "@/content/scenarios";

export type Pace = "demo" | "intense" | "normal" | "relaxed";
export type Channel = "call" | "email" | "sms" | "web";

/** Gap between encounters, in ms, after the first one. */
export const PACES: Record<Pace, { label: string; range: [number, number] }> = {
  demo: { label: "Demo · 3 encounters, back to back", range: [6_000, 10_000] },
  intense: { label: "Intense · every 15–40 s", range: [15_000, 40_000] },
  normal: { label: "Normal · every 45 s–2 min", range: [45_000, 120_000] },
  relaxed: { label: "Relaxed · every 2–5 min", range: [120_000, 300_000] },
};

/** Encounters to survive to win the day. */
export const GOAL = 8;
/** The demo: the whole idea in three encounters and a few minutes. */
export const DEMO_GOAL = 3;
export const goalFor = (pace: Pace) => (pace === "demo" ? DEMO_GOAL : GOAL);

/** A full day always has at least this many genuine encounters, so distrusting everything never wins. */
export const MIN_GENUINE = 2;

/** The first encounter always lands within 20 seconds of waking up (5 in the demo). */
export const FIRST_RANGE: [number, number] = [6_000, 18_000];
const DEMO_FIRST: [number, number] = [2_500, 4_500];

const between = ([min, max]: [number, number], r: () => number) => Math.round(min + r() * (max - min));

export const firstDelay = (r: () => number = Math.random, pace: Pace = "normal") =>
  between(pace === "demo" ? DEMO_FIRST : FIRST_RANGE, r);
export const nextDelay = (pace: Pace, r: () => number = Math.random) => between(PACES[pace].range, r);

export type Difficulty = 1 | 2 | 3;
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { 1: "Approachable", 2: "Polished", 3: "Subtle" };

/** The hardest encounter that can arrive next. Climbs every three encounters (every one in the demo). */
export const ceilingFor = (handled: number, pace: Pace = "normal"): Difficulty =>
  Math.min(3, 1 + (pace === "demo" ? handled : Math.floor(handled / 3))) as Difficulty;

export interface EncounterSpec {
  channel: Channel;
  legit: boolean;
  difficulty: Difficulty;
  /** Calls only: which district rings. */
  scenarioId?: string;
}

const CHANNEL_WEIGHTS: [Channel, number][] = [
  ["call", 0.35],
  ["email", 0.25],
  ["sms", 0.2],
  ["web", 0.2],
];

/**
 * The demo arc: a scam email, then a text in a different channel aimed at
 * whatever the email exposed, then a live call (sometimes genuine) and the verdict.
 */
const DEMO: Channel[] = ["email", "sms", "call"];

const SCAM_CALLS = SCENARIO_ORDER;
const GENUINE_CALL = "card-alert";

/**
 * What arrives next. A mix of channels; about 30% genuine, never fewer than
 * {@link MIN_GENUINE} in a full day; difficulty ramps with how many encounters
 * the player has already handled this session.
 */
export function pickEncounter(
  handled: number,
  r: () => number = Math.random,
  { pace = "normal", genuineSeen = 0 }: { pace?: Pace; genuineSeen?: number } = {},
): EncounterSpec {
  const demo = pace === "demo";
  let channel: Channel = "call";
  if (demo) {
    channel = DEMO[Math.min(handled, DEMO.length - 1)]!;
  } else {
    let roll = r();
    for (const [c, w] of CHANNEL_WEIGHTS) {
      if (roll < w) {
        channel = c;
        break;
      }
      roll -= w;
    }
  }

  const owed = MIN_GENUINE - genuineSeen;
  const legit = demo
    ? channel === "call" && r() < 0.35
    : (owed > 0 && handled < GOAL && GOAL - handled <= owed) || r() < 0.3;

  const ceiling = ceilingFor(handled, pace);
  const difficulty = (demo ? ceiling : Math.min(3, 1 + Math.floor(r() * ceiling))) as Difficulty;

  if (channel !== "call") return { channel, legit, difficulty };
  // Genuine calls: the dedicated fraud-alert call; scam districts may also twist genuine on the server.
  const scenarioId = legit ? GENUINE_CALL : SCAM_CALLS[Math.floor(r() * SCAM_CALLS.length)]!;
  return { channel, legit, difficulty, scenarioId };
}
