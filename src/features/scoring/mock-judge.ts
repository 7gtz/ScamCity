import { tacticLabel } from "@/content/tactics";
import type { CallScore, CompletedCall, TacticId } from "@/lib/live/types";

export const PASS_THRESHOLD = 65;
/** Where a safe decision always lands, at least. */
export const SAFE_FLOOR = 75;

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const secs = (ms: number) => Math.round(ms / 1000);

type Item = { label: string; points: number };

/**
 * The behaviour the game teaches always passes: ending or blocking a scam, or
 * verifying a genuine contact, without giving anything away. Exactly when the
 * player did it is for the notes to discuss, never a reason to fail them.
 */
export function safetyFloor(call: CompletedCall): { to: number; reason: string } | null {
  if (call.revealed.length) return null;
  const chat = call.scenarioId === "messages";
  if (!call.legitimate && call.outcome === "exposed") {
    return {
      to: SAFE_FLOOR,
      reason: chat ? "You blocked a scam without giving anything away" : "You ended a scam call without giving anything away",
    };
  }
  if (call.legitimate && call.outcome === "verified-legit") {
    return { to: SAFE_FLOOR, reason: "You verified a genuine contact without giving anything away" };
  }
  return null;
}

/**
 * Deterministic stand-in for the AI judge (spec Phase 3). Same output shape the
 * server-side Gemini scorer must return — breakdown included — so the results
 * UI never changes.
 */
export function judgeCall(call: CompletedCall): CallScore {
  const used = new Set<TacticId>(call.transcript.flatMap((m) => m.tactics ?? []));
  const caught = dedupe(call.tacticsDetected).filter((d) => used.has(d.tactic));
  const caughtIds = new Set(caught.map((c) => c.tactic));
  const missed = [...used].filter((t) => !caughtIds.has(t));

  const events = timeline(call);
  const notes: string[] = [];
  const items: Item[] = [];
  let base: number;
  // Messages are judged here too when the AI judge is unavailable: speak their language.
  const chat = call.scenarioId === "messages";
  const who = chat ? "contact" : "caller";

  if (call.legitimate) {
    base = 50;
    if (call.outcome === "rejected-legit") {
      items.push({ label: `Dismissed a genuine ${who} without checking`, points: -20 });
      notes.push(`This ${who} was genuine. They asked for nothing sensitive${chat ? "." : " and offered you a way to check."}`);
      notes.push(
        chat
          ? "Blocking them was safe, but they were real. Verify another way — don't dismiss."
          : "Hanging up was safe, but you left a real fraud alert unanswered. Verify, don't dismiss.",
      );
    } else {
      items.push({ label: `Recognised a genuine ${chat ? "contact" : "call"}, gave nothing away`, points: 10 });
      if (call.decisionQuality) items.push({ label: "Verified through a number you trust", points: call.decisionQuality });
      notes.push(`You recognised a legitimate ${chat ? "contact" : "call"} without giving anything away.`);
      if ((call.decisionQuality ?? 0) >= 25) notes.push("Calling back on the number you already trust is exactly right.");
      else notes.push(`Next time, confirm through a channel you already trust before acting on the ${chat ? "message" : "call"}.`);
    }
  } else {
    base = 35;
    if (caught.length) items.push({ label: `Caught ${caught.length} tactic${caught.length === 1 ? "" : "s"}`, points: caught.length * 10 });
    const first = caught[0];
    if (first && first.at <= 45_000) items.push({ label: `Suspicious early, by ${fmt(first.at)}`, points: 15 });
    else if (first && first.at <= 90_000) items.push({ label: `Suspicious by ${fmt(first.at)}`, points: 8 });
    for (const r of call.revealed) items.push({ label: `Gave away: ${r.toLowerCase()}`, points: -20 });
    if (call.outcome === "exposed") items.push({ label: chat ? "Blocked it and checked independently" : "Ended it and checked independently", points: 20 });
    if (call.outcome === "scammed") items.push({ label: `The ${who} got what they came for`, points: -15 });

    if (first) notes.push(`Your suspicion surfaced at ${fmt(first.at)} — when you challenged the ${tacticLabel(first.tactic).toLowerCase()}.`);
    else notes.push(`You never challenged the ${who} directly. Every claim went unverified.`);
    if (call.revealed.length) notes.push(`You gave away: ${call.revealed.join(", ").toLowerCase()}. That alone would have been enough.`);
    if (missed.length) notes.push(`The ${who} also used ${missed.map((t) => tacticLabel(t).toLowerCase()).join(" and ")} without being called out.`);
    if (call.outcome === "exposed")
      notes.push(
        chat
          ? "Blocking them and checking through a channel you already trust is the strongest move available."
          : "Ending the call and using a number you already trust is the strongest move available.",
      );
  }

  const total = clamp(base + items.reduce((sum, i) => sum + i.points, 0));
  const floor = safetyFloor(call);
  const lifted = floor !== null && total < floor.to;
  const final = lifted ? floor.to : total;
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
    breakdown: { base, items, floor: lifted ? floor : undefined },
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
