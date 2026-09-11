import { TACTICS } from "@/content/tactics";
import { encounterBrief } from "@/lib/gemini/encounters";
import { CHAINS } from "@/lib/gemini/models";
import { generateJson, hasGemini } from "@/lib/gemini/server";
import { rateLimit, tooMany } from "@/lib/rate-limit";
import { ChatPlanSchema, ChatRequestSchema, ChatTurnSchema, type ChatPlan } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

const PLAN_SYSTEM = `You design one text-message conversation for the Messages mode of SCAM CITY, a scam-awareness training game. Pick a realistic pattern people meet day to day: "Hi Mum/Dad, new number", a fake recruiter or job offer, a friend whose account was "hacked" asking for an OTP, a marketplace buyer with a fake payment link, a crypto "mentor", a wrong-number romance opener, a delivery driver needing a code — or, when genuine, an ordinary contact with an ordinary request. Choose a platform that fits. Write the contact's opening message in authentic texting style.`;

function turnSystem(plan: ChatPlan, difficulty: number) {
  const tactics = Object.entries(TACTICS)
    .map(([id, t]) => `- ${id}: ${t.description}`)
    .join("\n");
  const who = plan.scam
    ? `You are ${plan.contactName} (${plan.contactLabel}) on ${plan.platform}, secretly a social engineer. Pattern: ${plan.pattern}. Objective: ${plan.objective}
Reach for tactics roughly in this order: ${plan.tacticPlan.join(" → ")}. When the player complies, escalate. When challenged, don't repeat the same tactic — pivot. Difficulty ${difficulty} of 3.
Tactics:
${tactics}`
    : `You are ${plan.contactName} (${plan.contactLabel}) on ${plan.platform}, a GENUINE contact. ${plan.objective} You never ask for codes, passwords or money, and you're happy to be verified another way.`;

  return `SCAM CITY is a scam-awareness training game; the player knows it is a game. You play one side of a text conversation.
${who}
Facts you can use:
${plan.facts.map((f) => `- ${f}`).join("\n")}

Write "reply" as your next message in natural texting style — short, casual, sometimes two short lines. Stay in character; never mention AI or games unless the player is distressed or says "stop" (then say it's a training game and set end to "hung-up").
Also report, as the game's analyst: tactics used in your reply; tactics the player has explicitly recognised or resisted so far; kinds of sensitive detail the player has given (never the values); how guarded the player is (suspicion 0–1).
Set "end" when the conversation reaches an outcome — scam: "scammed" if they handed over what you wanted, "exposed" if they refused and said they'd verify/block/report; genuine: "verified-legit" or "rejected-legit". Otherwise "none".`;
}

/** Messages mode: plans a fresh conversation, then plays and analyses it turn by turn. */
export async function POST(req: Request) {
  if (!hasGemini()) return Response.json({ error: "AI unavailable." }, { status: 503 });
  if (!rateLimit(req, "chat", 120)) return tooMany();
  const parsed = ChatRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const body = parsed.data;

  try {
    if (body.action === "start") {
      const plan = await generateJson(ChatPlanSchema, {
        model: CHAINS.director,
        system: PLAN_SYSTEM,
        prompt: encounterBrief(body),
        temperature: 1.1,
        timeoutMs: 7000,
      });
      return Response.json({ plan: { ...plan, scam: !body.wantLegit } });
    }

    const turn = await generateJson(ChatTurnSchema, {
      model: CHAINS.analyst,
      system: turnSystem(body.plan, body.difficulty),
      prompt: `Conversation so far (you are CONTACT):\n${body.history
        .map((m) => `${m.speaker === "scammer" ? "CONTACT" : "PLAYER"}: ${m.text}`)
        .join("\n")}\n\nWrite CONTACT's next message.`,
      temperature: 0.9,
      timeoutMs: 6000,
    });
    return Response.json(turn);
  } catch (err) {
    console.error("[chat]", err);
    return Response.json({ error: "The contact went quiet." }, { status: 502 });
  }
}
