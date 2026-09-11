import type { CallScore, CompletedCall, TacticId } from "@/lib/live/types";
import type { JudgeOutput } from "@/lib/validation/schemas";
import { PASS_THRESHOLD } from "./mock-judge";

/**
 * Turns the judge model's structured verdict into the CallScore the UI renders.
 * Times are clamped to the call, duplicates dropped, and the pass mark applied
 * here — never trusted to the model.
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
    .map((e) => ({ at: ms(e.atSeconds), label: e.label.toLowerCase().trim().slice(0, 16) }))
    .filter((e) => e.label)
    .sort((a, b) => a.at - b.at);
  if (!events.some((e) => e.at >= call.durationMs - 1500)) events.push({ at: call.durationMs, label: "ended" });

  const score = Math.max(0, Math.min(100, Math.round(out.score)));
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
    notes: out.notes.slice(0, 4),
    judge: "gemini",
  };
}
