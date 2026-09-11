import { TACTICS } from "@/content/tactics";
import { composeScore } from "@/features/scoring/compose";
import { CHAINS } from "@/lib/gemini/models";
import { formatTranscript, generateJson, hasGemini } from "@/lib/gemini/server";
import { rateLimit, tooMany } from "@/lib/rate-limit";
import { CompletedCallSchema, JudgeSchema } from "@/lib/validation/schemas";
import type { CompletedCall } from "@/lib/live/types";

export const dynamic = "force-dynamic";

const SYSTEM = `You are the judge in SCAM CITY, a scam-awareness training game. You review the transcript of a finished phone call and score how well the PLAYER handled it. You evaluate decision-making, not just win or lose.

Rubric for a SCAM call (pass mark 65):
- Verifying questions asked (employee ID, callback on a trusted number): strong positive.
- How early suspicion appeared: earlier is better.
- Each tactic recognised or resisted: positive.
- Any sensitive detail revealed (passcode, card number, personal data): major negative; revealing a passcode should keep the score below the pass mark.
- The final decision: ending the call and contacting the organisation independently is best.

Rubric for a GENUINE call (pass mark 65):
- Verifying appropriately (calling back on the number on the card, asking for a reference) scores high.
- Sharing sensitive details still scores low, even with a real caller.
- Dismissing a real caller without any verification scores low: the goal is verification, not paranoia.

Tactics: ${Object.keys(TACTICS).join(", ")}.
Notes must be specific, in second person, and refer to what was actually said.`;

/** The AI judge. Falls back to nothing here: the client uses the rules judge if this fails. */
export async function POST(req: Request) {
  if (!hasGemini()) return Response.json({ error: "AI unavailable." }, { status: 503 });
  if (!rateLimit(req, "score", 12)) return tooMany();

  const parsed = CompletedCallSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const call = parsed.data as CompletedCall;

  const prompt = `Caller type: ${call.legitimate ? "GENUINE" : "SCAMMER"}
${call.brief ? `The caller: ${call.brief.caller}. Pretext: ${call.brief.hook} Objective: ${call.brief.objective}` : ""}
Outcome: ${call.outcome}
Call length: ${Math.round(call.durationMs / 1000)} seconds
Sensitive details the player revealed: ${call.revealed.join(", ") || "none"}
Tactics the live analyst saw the player detect: ${call.tacticsDetected.map((d) => `${d.tactic} at ${Math.round(d.at / 1000)}s`).join(", ") || "none"}
${call.context ? `The caller exploited the player's real context: ${[call.context.city, call.context.localTime, call.context.weather].filter(Boolean).join(", ")}.` : ""}

Transcript:
${formatTranscript(call.transcript)}`;

  try {
    const verdict = await generateJson(JudgeSchema, {
      model: CHAINS.judge,
      system: SYSTEM,
      prompt,
      temperature: 0.2,
      // Short first attempt: under load the flagship stalls, and the fallback is fast.
      timeoutMs: 8000,
    });
    return Response.json(composeScore(call, verdict));
  } catch (err) {
    console.error("[score]", err);
    return Response.json({ error: "Judging failed." }, { status: 502 });
  }
}
