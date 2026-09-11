import { DISTRICTS, type District } from "@/content/districts";
import { tacticLabel } from "@/content/tactics";
import type { DistrictId, TacticId } from "@/lib/live/types";

type Counts = Partial<Record<TacticId, number>>;

/** The district whose con is built on each tactic: where a weakness is most likely to be tested next. */
const TACTIC_DISTRICT: Record<TacticId, DistrictId> = {
  authority: "bank",
  "verification-request": "bank",
  urgency: "delivery",
  fear: "desk",
  secrecy: "impostor",
  "social-pressure": "romance",
};

/** The district whose con is built on an encounter's lead tactic. */
export const districtFor = (targets: readonly TacticId[]) => {
  const lead = targets[0];
  return lead ? DISTRICTS.find((d) => d.id === TACTIC_DISTRICT[lead]) : undefined;
};

/**
 * Where an encounter sits in the city: `District 02 · The Delivery · Channel · Web`.
 * Only shown once the player has decided — the district names the tactic.
 */
export const placeLabel = (channel: string, targets: readonly TacticId[]) => {
  const d = districtFor(targets);
  return d ? `District ${d.number} · ${d.title} · Channel · ${channel}` : `Channel · ${channel}`;
};

const total = (counts: Counts) => Object.values(counts).reduce((a, n) => a + (n ?? 0), 0);

/** The latest report's own findings. They outrank history, so the page never contradicts itself. */
export interface SessionFindings {
  missed: TacticId[];
  caught: TacticId[];
}

export interface DefenseProfile {
  archetype: string;
  line: string;
  /** The tactic this player shuts down most often. */
  strong?: TacticId;
  /** The tactic that gets past them most often — the one the AI is now aiming at. */
  weak?: TacticId;
  /** The district that con belongs to. */
  nextThreat?: District;
}

/**
 * How this player gets manipulated, read from every channel they've played.
 * `falseAlarms` / `trusted` are genuine encounters turned away / handled well.
 *
 * Each tactic gets one verdict from its balance (caught minus missed), so a
 * tactic can never be both a strength and a weakness. `session` — the report
 * on screen — outranks history.
 */
export function defenseProfile({
  weak,
  strong,
  falseAlarms = 0,
  trusted = 0,
  session,
}: {
  weak: Counts;
  strong: Counts;
  falseAlarms?: number;
  trusted?: number;
  session?: SessionFindings;
}): DefenseProfile | null {
  const w = total(weak);
  const s = total(strong);
  if (w + s + falseAlarms + trusted === 0 && !session?.missed.length && !session?.caught.length) return null;

  const balance = (t: TacticId) =>
    (strong[t] ?? 0) -
    (weak[t] ?? 0) +
    (session?.caught.includes(t) ? 1000 : 0) -
    (session?.missed.includes(t) ? 1000 : 0);
  const tactics = [
    ...new Set([...Object.keys(weak), ...Object.keys(strong), ...(session?.missed ?? []), ...(session?.caught ?? [])]),
  ] as TacticId[];
  const ranked = tactics.map((t) => [t, balance(t)] as const).sort((a, b) => b[1] - a[1]);
  const strongest = ranked.find(([, b]) => b > 0)?.[0];
  const weakest = ranked.findLast(([, b]) => b < 0)?.[0];
  const base = {
    strong: strongest,
    weak: weakest,
    nextThreat: weakest ? DISTRICTS.find((d) => d.id === TACTIC_DISTRICT[weakest]) : undefined,
  };

  if (falseAlarms >= 2 && falseAlarms > trusted)
    return { ...base, archetype: "The Skeptic", line: "Nobody gets past you — including the people genuinely trying to help." };
  if (w > s * 1.5 && w >= 2)
    return { ...base, archetype: "The Accommodator", line: "You want to be helpful, and they know it. Pressure works on you." };
  if (s >= 3 && s >= w * 2)
    return { ...base, archetype: "The Verifier", line: "You check before you act. They have to work much harder for you." };
  return { ...base, archetype: "The Realist", line: "You catch the obvious. The patient, polite ones still get a foothold." };
}

export interface Lesson {
  /** What the city saw you do. */
  noticed: string;
  /** What it will do about it. */
  next: string;
  tone: "danger" | "uncertain" | "safe";
}

/**
 * Evidence that the AI is learning, after one encounter — without exposing
 * the whole player model. Mirrors what `recordTactics` feeds every generator.
 */
export function lessonFrom({
  missed,
  caught,
  legit,
  rejectedGenuine,
}: {
  missed: TacticId[];
  caught: TacticId[];
  legit: boolean;
  rejectedGenuine: boolean;
}): Lesson | null {
  if (legit) {
    return rejectedGenuine
      ? {
          noticed: "You turned away someone genuine.",
          next: "Distrusting everyone costs you too. The goal is to verify, not to refuse.",
          tone: "uncertain",
        }
      : {
          noticed: "You trusted the right one.",
          next: "Genuine contact is part of the city. Knowing when to trust is half the game.",
          tone: "safe",
        };
  }
  const miss = missed[0];
  if (miss) {
    const t = tacticLabel(miss).toLowerCase();
    return {
      noticed: `${tacticLabel(miss)} got past you.`,
      next: `The next encounter — in any channel — may lean on ${t}.`,
      tone: "danger",
    };
  }
  const hit = caught[0];
  if (hit) {
    return {
      noticed: `You shut down ${tacticLabel(hit).toLowerCase()}.`,
      next: "It won't try that on you the same way again. Expect a different angle.",
      tone: "safe",
    };
  }
  return null;
}
