import { getScenario } from "@/content/scenarios";
import { TACTICS } from "@/content/tactics";
import { CHAINS } from "@/lib/gemini/models";
import { formatTranscript, generateJson, hasGemini } from "@/lib/gemini/server";
import { rateLimit, tooMany } from "@/lib/rate-limit";
import { AnalysisSchema, AnalyzeRequestSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

const SYSTEM = `You are the analyst in SCAM CITY, a scam-awareness training game. You watch a live phone call between a CALLER and the PLAYER and report structured state for the game's HUD after every turn. Be precise and conservative: only count a tactic as detected when the player's own words show they noticed or resisted it.

Tactics:
${Object.entries(TACTICS)
  .map(([id, t]) => `- ${id}: ${t.description}`)
  .join("\n")}

How players detect tactics:
- authority: asks for an employee ID, questions who they are, says they'll verify with the organisation
- urgency: questions or refuses the deadline, slows the call down
- verification-request: refuses to read out codes, card numbers or personal details
- social-pressure: resists guilt, flattery or "other customers" stories
- fear: stays calm under threats of loss or a frozen account
- secrecy: insists on calling the bank or someone else themselves`;

/** Second model on the call: turns each exchange into HUD state. */
export async function POST(req: Request) {
  if (!hasGemini()) return Response.json({ error: "AI unavailable." }, { status: 503 });
  if (!rateLimit(req, "analyze", 90)) return tooMany();

  const parsed = AnalyzeRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const scenario = getScenario(parsed.data.scenarioId);
  if (!scenario) return Response.json({ error: "Unknown scenario." }, { status: 404 });

  const legitimate = parsed.data.legitimate ?? scenario.persona.legitimate;
  const prompt = `The caller is ${legitimate ? "GENUINE: report pressure tactics only if they truly appear" : "a SCAMMER"}.
${parsed.data.objective ? `The caller's objective: ${parsed.data.objective}` : ""}
Tactics the player has already detected: ${parsed.data.detected.join(", ") || "none"}.

Transcript so far:
${formatTranscript(parsed.data.transcript)}`;

  try {
    const analysis = await generateJson(AnalysisSchema, {
      model: CHAINS.analyst,
      system: SYSTEM,
      prompt,
      temperature: 0.1,
      timeoutMs: 3500,
    });
    return Response.json(analysis);
  } catch (err) {
    console.error("[analyze]", err);
    return Response.json({ error: "Analysis failed." }, { status: 502 });
  }
}
