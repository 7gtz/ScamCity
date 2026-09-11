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

const top = (counts: Counts) =>
  (Object.entries(counts) as [TacticId, number][]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])[0]?.[0];
const total = (counts: Counts) => Object.values(counts).reduce((a, n) => a + (n ?? 0), 0);

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
 */
export function defenseProfile({
  weak,
  strong,
  falseAlarms = 0,
  trusted = 0,
}: {
  weak: Counts;
  strong: Counts;
  falseAlarms?: number;
  trusted?: number;
}): DefenseProfile | null {
  const w = total(weak);
  const s = total(strong);
  if (w + s + falseAlarms + trusted === 0) return null;

  const weakest = top(weak);
  const strongest = top(strong);
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
