import { TACTICS } from "@/content/tactics";
import { CHAINS } from "@/lib/gemini/models";
import { generateJson, hasGemini } from "@/lib/gemini/server";
import { rateLimit, tooMany } from "@/lib/rate-limit";
import { GeneratedRiddleSchema, RiddleRequestSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

const SYSTEM = `You write scenarios for Riddle Mode in SCAM CITY, a scam-awareness training game. Each scenario is a single message or call excerpt modelled on documented real-world scam patterns (or, when asked, a legitimate message that a nervous person might wrongly distrust). Use plausible but FICTIONAL organisation names — never real brands. Make it realistic and specific, never cartoonish. No links or real phone numbers; write placeholders like "tap the link" instead.`;

/**
 * Adaptive game master: generates the next riddle aimed at the tactics this
 * player keeps missing, localised to where they are playing.
 */
export async function POST(req: Request) {
  if (!hasGemini()) return Response.json({ error: "AI unavailable." }, { status: 503 });
  if (!rateLimit(req, "riddle", 20)) return tooMany();

  const parsed = RiddleRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const { weak, avoid, wantLegit, context } = parsed.data;

  const focus = weak.length
    ? `The player keeps missing these tactics — build the scenario around them: ${weak.map((t) => `${t} (${TACTICS[t].description})`).join("; ")}.`
    : "Pick any common tactic.";
  const place = context ? [context.city, context.country].filter(Boolean).join(", ") : "";

  const prompt = `${wantLegit ? "Write a LEGITIMATE message (scam: false) that looks slightly alarming but has verifiable, honest signs. Set targets to the tactics a nervous reader might wrongly suspect." : `Write a SCAM (scam: true). ${focus}`}
${place ? `Localise it for a player in ${place}: local currency, local conventions, a fictional local organisation.` : ""}
The tell must be copied exactly from the body.
Do not reuse these earlier scenarios:
${avoid.map((a) => `- ${a}`).join("\n") || "- (none)"}`;

  try {
    const riddle = await generateJson(GeneratedRiddleSchema, {
      model: CHAINS.riddle,
      system: SYSTEM,
      prompt,
      temperature: 0.9,
      timeoutMs: 6500,
    });
    // The underline needs an exact match; drop a tell the model paraphrased.
    const tell = riddle.body.includes(riddle.tell) ? riddle.tell : "";
    return Response.json({
      ...riddle,
      tell,
      category: riddle.scam ? (riddle.category ?? "other") : undefined,
      id: `ai-${crypto.randomUUID()}`,
      source: "ai",
    });
  } catch (err) {
    console.error("[riddle]", err);
    return Response.json({ error: "Generation failed." }, { status: 502 });
  }
}
