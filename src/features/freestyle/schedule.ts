import { SCENARIO_ORDER } from "@/content/scenarios";

export type Pace = "relaxed" | "normal" | "intense";
export type Channel = "call" | "email" | "sms" | "web";

/** Gap between encounters, in ms, after the first one. */
export const PACES: Record<Pace, { label: string; range: [number, number] }> = {
  intense: { label: "Intense · every 15–40 s", range: [15_000, 40_000] },
  normal: { label: "Normal · every 45 s–2 min", range: [45_000, 120_000] },
  relaxed: { label: "Relaxed · every 2–5 min", range: [120_000, 300_000] },
};

/** The first encounter always lands within 20 seconds of waking up. */
export const FIRST_RANGE: [number, number] = [6_000, 18_000];

const between = ([min, max]: [number, number], r: () => number) => Math.round(min + r() * (max - min));

export const firstDelay = (r: () => number = Math.random) => between(FIRST_RANGE, r);
export const nextDelay = (pace: Pace, r: () => number = Math.random) => between(PACES[pace].range, r);

export interface EncounterSpec {
  channel: Channel;
  legit: boolean;
  difficulty: 1 | 2 | 3;
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
 * What arrives next. A mix of channels; about 30% genuine; difficulty ramps
 * with how many encounters the player has already handled this session.
 */
export function pickEncounter(handled: number, r: () => number = Math.random): EncounterSpec {
  let roll = r();
  let channel: Channel = "call";
  for (const [c, w] of CHANNEL_WEIGHTS) {
    if (roll < w) {
      channel = c;
      break;
    }
    roll -= w;
  }
  const legit = r() < 0.3;
  const ceiling = Math.min(3, 1 + Math.floor(handled / 3));
  const difficulty = Math.min(3, 1 + Math.floor(r() * ceiling)) as 1 | 2 | 3;

  if (channel !== "call") return { channel, legit, difficulty };
  const scams = SCENARIO_ORDER.filter((id) => id !== "card-alert");
  // Genuine calls: the dedicated fraud-alert call; scam districts may also twist genuine on the server.
  const scenarioId = legit ? "card-alert" : scams[Math.floor(r() * scams.length)]!;
  return { channel, legit, difficulty, scenarioId };
}
