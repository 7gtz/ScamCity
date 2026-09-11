import { encounterBrief } from "@/lib/gemini/encounters";
import { CHAINS } from "@/lib/gemini/models";
import { generateJson, hasGemini } from "@/lib/gemini/server";
import { rateLimit, tooMany } from "@/lib/rate-limit";
import { EncounterRequestSchema, GeneratedSiteSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

const SYSTEM = `You design single web pages for the Web mode of SCAM CITY, a scam-awareness training game. The page is rendered inside a simulated browser, so describe it as content: the domain in the address bar, whether it has https, how old the domain is, the headline, copy, form fields, products and contact details.

Scam pages copy real patterns: lookalike or subdomain-trick domains (brand.account-verify.io), very young domains, a padlock that proves nothing, forms asking for too much at once (card number + OTP), impossible prices or returns, fake trust badges, countdowns, contact only via chat apps.
Genuine pages have an established domain, believable prices, a real address and policies, and ask only for what the task needs.`;

/** Generates one fresh website (scam or genuine) aimed at this player. */
export async function POST(req: Request) {
  if (!hasGemini()) return Response.json({ error: "AI unavailable." }, { status: 503 });
  if (!rateLimit(req, "site", 30)) return tooMany();
  const parsed = EncounterRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });

  try {
    const site = await generateJson(GeneratedSiteSchema, {
      model: CHAINS.riddle,
      system: SYSTEM,
      prompt: encounterBrief(parsed.data),
      temperature: 1,
      timeoutMs: 9000,
    });
    return Response.json({
      ...site,
      domain: site.domain.replace(/^https?:\/\//, ""),
      scam: !parsed.data.wantLegit,
      id: `ai-${crypto.randomUUID()}`,
      source: "ai",
    });
  } catch (err) {
    console.error("[site]", err);
    return Response.json({ error: "Generation failed." }, { status: 502 });
  }
}
