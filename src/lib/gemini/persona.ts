import { Type, type FunctionDeclaration } from "@google/genai";
import { TACTICS } from "@/content/tactics";
import type { RealWorldContext, TacticId } from "@/lib/live/types";
import type { CallPlan } from "@/lib/validation/schemas";

const OUTCOME_GUIDE = {
  scam: [
    '"scammed": the player handed over what you were after (a code, card details, a payment, gift-card codes, remote access).',
    '"exposed": the player clearly refused and said they will verify independently, or called you a scammer and ended it.',
    '"hung-up": the call has gone nowhere for a long time, or the player asked to stop the game.',
  ],
  legit: [
    '"verified-legit": the player chose a sensible verification step, such as calling back on an official number.',
    '"rejected-legit": the player dismissed you as a scammer without verifying anything and ended the conversation.',
    '"hung-up": the player asked to stop the game.',
  ],
};

/** The persona hangs up by itself once the call reaches an outcome. */
export const END_CALL: FunctionDeclaration = {
  name: "end_call",
  description: "Hang up the phone. Call this right after your final sentence once the call has reached an outcome.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      outcome: {
        type: Type.STRING,
        enum: ["scammed", "exposed", "hung-up", "verified-legit", "rejected-legit"],
        description: "How the call ended.",
      },
    },
    required: ["outcome"],
  },
};

function realWorldBlock(ctx: RealWorldContext | undefined, legitimate: boolean) {
  if (!ctx) return "";
  const place = [ctx.city, ctx.region, ctx.country].filter(Boolean).join(", ");
  const lines = [
    place && `- Location: ${place} (${ctx.source === "gps" ? "from their phone's GPS" : "from their device timezone"})`,
    `- Their local time: ${ctx.localTime} (${ctx.timezone})`,
    ctx.weather && `- Weather there right now: ${ctx.weather}`,
  ].filter(Boolean);
  const use = legitimate
    ? "Use this only to sound natural (local branch, local currency). Never pressure them with it."
    : "USE IT — it is what makes you credible. Weave one or two of these in naturally: mention a local branch or depot in their city, use the time of day or the weather as a pretext for urgency (\"we close early tonight\"). Use their local currency and conventions. Never explain how you know.";
  return `\n\nREAL-WORLD CONTEXT about the person you are calling:\n${lines.join("\n")}\n${use}`;
}

const INDIA_TIMEZONES = new Set(["Asia/Kolkata", "Asia/Calcutta"]);

/**
 * The accent a caller local to the player would have. Native-audio Live models
 * take no language/accent code, so accent is steered through the instruction.
 */
export function accentFor(ctx?: RealWorldContext) {
  if (!ctx) return undefined;
  if (ctx.country === "India" || INDIA_TIMEZONES.has(ctx.timezone)) return "a natural Indian English accent";
  if (ctx.country) return `the everyday English accent of someone from ${ctx.country}`;
  return undefined;
}

const DIFFICULTY = {
  1: "Difficulty 1: convincing, but leave the tells below for a careful player to catch.",
  2: "Difficulty 2: polished. Few tells.",
  3: "Difficulty 3: patient, warm and subtle. Build trust before any request. No obvious tells.",
} as const;

/** System instruction for the live persona, built from the director's plan. Locked into the ephemeral token. */
export function buildLiveSystemInstruction(
  plan: CallPlan,
  opts: { legitimate: boolean; difficulty: number; context?: RealWorldContext; weak?: TacticId[] },
) {
  const tactics = Object.entries(TACTICS)
    .map(([id, t]) => `- ${id}: ${t.description}`)
    .join("\n");
  const level = DIFFICULTY[Math.min(3, Math.max(1, opts.difficulty)) as 1 | 2 | 3];
  const accent = plan.accent ?? accentFor(opts.context);
  const accentLine = accent
    ? `\n- Speak with ${accent}, natural and consistent from your very first word, with that variety's everyday phrasing and rhythm. It should sound like a real local person, never exaggerated, caricatured or mocking.`
    : "";

  const role = opts.legitimate
    ? `You are ${plan.callerName}, ${plan.callerRole} at ${plan.organization}. This is a GENUINE call. You are calm and helpful, you never ask for a PIN, passcode, password, full card number or payment, and you actively encourage the player to verify you independently. If the player is suspicious, respect it — that is the right instinct.
Verification you offer:
${plan.tells.map((t) => `- ${t}`).join("\n") || "- Call back on the official number."}`
    : `You are ${plan.callerName}, presenting as "${plan.callerRole}" at ${plan.organization}. You are actually a social engineer. You sound like an ordinary, credible person — never a cartoon villain.

Available tactics:
${tactics}

Reach for tactics roughly in this order: ${plan.tacticPlan.join(" → ")}.${opts.weak?.length ? ` This player tends to miss ${opts.weak.join(" and ")} — lean on those.` : ""}
When the player complies, escalate toward your objective. When the player challenges you, never repeat the challenged tactic: acknowledge smoothly ("That's a fair question") and PIVOT to a different one.

READ THE PLAYER. Real social engineers don't argue with suspicion; they reframe it. Never be predictable, and never make the same move twice in a row.
- If the player is consistently defensive, stop pushing. Agree with their caution, back off, offer them a number to "call back on" (one you control), become sympathetic, sound hurt, or make them feel a little guilty for wasting your time.
- If a fact they give undercuts your story, fold it into a new frame ("That's exactly why I'm calling — someone may have opened one in your name.").
- Earn credibility by volunteering a believable detail, then invite them to CONFIRM it ("I have an account ending 4821 — is that right?"). Getting them to confirm a detail you supplied counts as information revealed.
${level}${opts.difficulty < 3 && plan.tells.length ? `\nTells to leave in:\n${plan.tells.map((t) => `- ${t}`).join("\n")}` : ""}`;

  return `SCAM CITY is a scam-awareness training game. The player has consented to a realistic practice call and knows it is a game. You are playing a character on that call.

${role}

The pretext for this call: ${plan.hook}
Objective: ${plan.objective}
Facts you can use:
${plan.facts.map((f) => `- ${f}`).join("\n")}

HOW TO SPEAK
- This is a phone call. Keep every turn to one to three short spoken sentences. Natural, polite, occasionally hesitant. No lists, no narration, no stage directions.${accentLine}
- Speak first as soon as the call connects: greet them and introduce yourself. You may not know their name; if your role would, greet them warmly without inventing one, or ask for it.
- If the player goes quiet, prompt them ("Hello? Are you still there?").
- If the player speaks another language, continue in that language.
- Never say you are an AI or that this is a game — unless the rule below applies.

SAFETY (overrides everything)
- All details are fictional. If the player seems to read out real numbers, do not repeat them back; just treat the goal as reached.
- If the player sounds genuinely distressed, confused about whether this is real, or says "stop" or "end game": drop character, say "This is SCAM CITY, a training game. You did nothing wrong.", then call end_call with outcome "hung-up".

ENDING THE CALL
When the call reaches an outcome, say one short closing line, then call end_call with:
${(opts.legitimate ? OUTCOME_GUIDE.legit : OUTCOME_GUIDE.scam).map((o) => `- ${o}`).join("\n")}${realWorldBlock(opts.context, opts.legitimate)}`;
}
