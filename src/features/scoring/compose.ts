import type { CallScore, CompletedCall, TacticId } from "@/lib/live/types";
import type { JudgeOutput } from "@/lib/validation/schemas";
import { PASS_THRESHOLD, safetyFloor } from "./mock-judge";

/** The AI judge explains its score as line items from this base. */
export const JUDGE_BASE = 50;

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Timeline labels are one or two whole words — never cut mid-word ("threatened to ha"). */
function shortLabel(label: string) {
  const words = label.toLowerCase().trim().split(/\s+/).slice(0, 2);
  const two = words.join(" ");
  return two.length <= 18 ? two : (words[0] ?? "").slice(0, 18);
}

/**
 * Turns the judge model's structured verdict into the CallScore the UI renders.
 * The score is the base plus the judge's line items, so "Why 55?" always adds
 * up; a safe decision is lifted to the floor. Times are clamped to the call,
 * duplicates dropped, and the pass mark applied here — never trusted to the model.
 */
export function composeScore(call: CompletedCall, out: JudgeOutput): CallScore {
  const ms = (s: number) => Math.min(call.durationMs, Math.max(0, Math.round(s * 1000)));

  const seen = new Set<TacticId>();
  const caught = [...out.caught]
    .sort((a, b) => a.atSeconds - b.atSeconds)
    .filter((c) => (seen.has(c.tactic) ? false : (seen.add(c.tactic), true)))
    .map((c) => ({ tactic: c.tactic, at: ms(c.atSeconds) }));
  const missed = [...new Set(out.missed)].filter((t) => !seen.has(t));

  const events = out.events
    .map((e) => ({ at: ms(e.atSeconds), label: shortLabel(e.label) }))
    .filter((e) => e.label)
    .sort((a, b) => a.at - b.at);
  if (!events.some((e) => e.at >= call.durationMs - 1500)) events.push({ at: call.durationMs, label: "ended" });

  const items = out.breakdown.slice(0, 6).map((i) => ({
    label: i.label.length > 90 ? `${i.label.slice(0, 87).trimEnd()}…` : i.label,
    points: Math.round(Math.max(-60, Math.min(60, i.points))),
  }));
  const total = clamp(JUDGE_BASE + items.reduce((sum, i) => sum + i.points, 0));
  const floor = safetyFloor(call);
  const lifted = floor !== null && total < floor.to;
  const score = lifted ? floor.to : total;

  return {
    sessionId: call.sessionId,
    scenarioId: call.scenarioId,
    legitimate: call.legitimate,
    outcome: call.outcome,
    score,
    threshold: PASS_THRESHOLD,
    passed: score >= PASS_THRESHOLD,
    caught,
    missed,
    events: events.slice(-6),
    suspicion: call.suspicion,
    durationMs: call.durationMs,
    notes: out.notes.slice(0, 4).map((n) => (n.length > 320 ? `${n.slice(0, 317).trimEnd()}…` : n)),
    judge: "gemini",
    brief: call.brief,
    breakdown: { base: JUDGE_BASE, items, floor: lifted ? floor : undefined },
  };
}
