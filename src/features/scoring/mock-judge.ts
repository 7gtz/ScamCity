import { tacticLabel } from "@/content/tactics";
import type { CallScore, CompletedCall, TacticId } from "@/lib/live/types";

export const PASS_THRESHOLD = 65;

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const secs = (ms: number) => Math.round(ms / 1000);

/**
 * Deterministic stand-in for the AI judge (spec Phase 3). Same output shape the
 * server-side Gemini scorer must return, so the results UI never changes.
 */
export function judgeCall(call: CompletedCall): CallScore {
  const used = new Set<TacticId>(call.transcript.flatMap((m) => m.tactics ?? []));
  const caught = dedupe(call.tacticsDetected).filter((d) => used.has(d.tactic));
  const caughtIds = new Set(caught.map((c) => c.tactic));
  const missed = [...used].filter((t) => !caughtIds.has(t));

  const events = timeline(call);
  const notes: string[] = [];
  let score: number;

  if (call.legitimate) {
    if (call.outcome === "rejected-legit") {
      score = 30;
      notes.push("This caller was genuine. They asked for nothing sensitive and offered you a way to check.");
      notes.push("Hanging up was safe, but you left a real fraud alert unanswered. Verify, don't dismiss.");
    } else {
      score = 60 + (call.decisionQuality ?? 0);
      notes.push("You recognised a legitimate call without giving anything away.");
      if ((call.decisionQuality ?? 0) >= 25) notes.push("Calling back on the number you already trust is exactly right.");
      else notes.push("Next time, confirm through the number on your card before acting on the call.");
    }
  } else {
    score = 35 + caught.length * 10;
    const first = caught[0];
    if (first && first.at <= 45_000) score += 15;
    else if (first && first.at <= 90_000) score += 8;

    score -= call.revealed.length * 20;
    if (call.outcome === "exposed") score += 20;
    if (call.outcome === "scammed") score -= 15;

    if (first) notes.push(`Your suspicion surfaced at ${fmt(first.at)} — when you challenged the ${tacticLabel(first.tactic).toLowerCase()}.`);
    else notes.push("You never challenged the caller directly. Every claim went unverified.");
    if (call.revealed.length) notes.push(`You gave away: ${call.revealed.join(", ").toLowerCase()}. That alone would have been enough.`);
    if (missed.length) notes.push(`The caller also used ${missed.map((t) => tacticLabel(t).toLowerCase()).join(" and ")} without being called out.`);
    if (call.outcome === "exposed") notes.push("Ending the call and using a number you already trust is the strongest move available.");
  }

  const final = clamp(score);
  return {
    sessionId: call.sessionId,
    scenarioId: call.scenarioId,
    legitimate: call.legitimate,
    outcome: call.outcome,
    score: final,
    threshold: PASS_THRESHOLD,
    passed: final >= PASS_THRESHOLD,
    caught,
    missed,
    events,
    suspicion: call.suspicion,
    durationMs: call.durationMs,
    notes: notes.slice(0, 4),
    judge: "rules",
    brief: call.brief,
  };
}

function dedupe(list: { tactic: TacticId; at: number }[]) {
  const seen = new Set<TacticId>();
  return [...list]
    .sort((a, b) => a.at - b.at)
    .filter((d) => (seen.has(d.tactic) ? false : (seen.add(d.tactic), true)));
}

function timeline(call: CompletedCall) {
  const events: { at: number; label: string }[] = [];
  const firstQuestion = call.transcript.find((m) => m.speaker === "player" && m.text.includes("?"));
  if (firstQuestion) events.push({ at: firstQuestion.at, label: "questioned" });

  const pressure = call.transcript.find(
    (m) => m.speaker === "scammer" && m.tactics?.some((t) => t === "urgency" || t === "social-pressure" || t === "fear"),
  );
  if (pressure) events.push({ at: pressure.at, label: "pressure" });

  if (call.revealed.length) {
    const reveal = [...call.transcript].reverse().find((m) => m.speaker === "player");
    if (reveal) events.push({ at: reveal.at, label: "reveal" });
  }
  events.push({ at: call.durationMs, label: call.outcome === "scammed" ? "scammed" : "ended" });
  return events.sort((a, b) => a.at - b.at);
}

export const fmt = (ms: number) => {
  const s = secs(ms);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
