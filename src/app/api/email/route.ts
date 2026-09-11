import { encounterBrief } from "@/lib/gemini/encounters";
import { CHAINS } from "@/lib/gemini/models";
import { generateJson, hasGemini } from "@/lib/gemini/server";
import { rateLimit, tooMany } from "@/lib/rate-limit";
import { EncounterRequestSchema, GeneratedEmailSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

const SYSTEM = `You write single emails for the Inbox mode of SCAM CITY, a scam-awareness training game. Each email must look exactly like something that lands in a real inbox: a realistic sender name and address, subject, greeting, body and sign-off.

For scams, the clues live where they do in real life: a lookalike sender domain (extra words, swapped letters, wrong TLD), a mismatched reply-to, link text that claims one address while actualUrl goes elsewhere, dangerous attachments (.docm, .html, .zip, .exe), pressure and deadlines. Subtler at higher difficulty.
For genuine emails, the sender domain matches, links go where they say, nothing sensitive is requested, and they point to channels the reader can verify.

Place links in the body with [link:N] markers matching the links array.`;

/** Generates one fresh email (phishing or genuine) aimed at this player. */
export async function POST(req: Request) {
  if (!hasGemini()) return Response.json({ error: "AI unavailable." }, { status: 503 });
  if (!rateLimit(req, "email", 30)) return tooMany();
  const parsed = EncounterRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });

  try {
    const email = await generateJson(GeneratedEmailSchema, {
      model: CHAINS.riddle,
      system: SYSTEM,
      prompt: encounterBrief(parsed.data),
      temperature: 1,
      timeoutMs: 9000,
    });
    // The verdict must match what was asked for, whatever the model decided.
    return Response.json({ ...email, scam: !parsed.data.wantLegit, id: `ai-${crypto.randomUUID()}`, source: "ai" });
  } catch (err) {
    console.error("[email]", err);
    return Response.json({ error: "Generation failed." }, { status: 502 });
  }
}
