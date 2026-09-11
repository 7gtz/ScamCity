import { Type, type FunctionDeclaration } from "@google/genai";
import type { Scenario } from "@/content/scenarios";
import { TACTICS } from "@/content/tactics";
import type { RealWorldContext } from "@/lib/live/types";

/** Per-scenario cover story: the persona improvises inside these facts. */
const BRIEFS: Record<string, { objective: string; facts: string[] }> = {
  "bank-security": {
    objective:
      "Get the player to read out the 6-digit one-time passcode that is 'being sent to their phone right now', or failing that their full card number.",
    facts: [
      "Your employee ID is NS-4471.",
      "The 'suspicious activity' is a large card payment at an electronics store in another city, pending right now.",
      "If they ask for a callback number, deflect: you're 'already on the line' and transfers 'add delay'.",
    ],
  },
  "card-alert": {
    objective:
      "Confirm whether the player made a paused card payment. You are GENUINE: you never ask for a PIN, passcode, password or full card number.",
    facts: [
      "The paused payment is at an electronics store in another city.",
      "You have already blocked the card as a precaution.",
      "Encourage them to hang up and call the number on the back of their card, quoting reference 4471.",
    ],
  },
};

const OUTCOME_GUIDE = {
  scam: [
    '"scammed": the player read out a passcode, card number or other sensitive detail.',
    '"exposed": the player clearly refused and said they will contact the bank themselves, or called you a scammer and ended it.',
    '"hung-up": the call has gone nowhere for a long time, or the player asked to stop the game.',
  ],
  legit: [
    '"verified-legit": the player chose a sensible verification step, such as calling back on the number on their card.',
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
    ? "Use this only to sound natural (their local branch, local currency). Never pressure them with it."
    : "USE IT — it is what makes you credible. Weave one or two of these in naturally: mention their local branch in their city, use the time of day or the weather as a pretext for urgency (\"branches close early tonight\"). Use their local currency and conventions. Never explain how you know.";
  return `\n\nREAL-WORLD CONTEXT about the person you are calling:\n${lines.join("\n")}\n${use}`;
}

/** System instruction for the live persona. Locked into the ephemeral token server-side. */
export function buildLiveSystemInstruction(scenario: Scenario, ctx?: RealWorldContext) {
  const { persona } = scenario;
  const brief = BRIEFS[scenario.id];
  const tactics = Object.entries(TACTICS)
    .map(([id, t]) => `- ${id}: ${t.description}`)
    .join("\n");
  const subtlety =
    persona.level <= 1
      ? "Difficulty 1: be convincing but leave one or two tells a careful person could catch (pushing a deadline a little too hard, a generic greeting)."
      : persona.level === 2
        ? "Difficulty 2: be polished. Few tells."
        : "Difficulty 3: be patient, warm and subtle. Build trust before any request.";

  const role = persona.legitimate
    ? `You are ${persona.name}, ${persona.role} at ${persona.organization}. This is a GENUINE fraud-prevention call. You are calm and helpful, you never ask for a PIN, passcode, password or full card number, and you actively encourage the player to verify you independently. If the player is suspicious, respect it — that is the right instinct.`
    : `You are ${persona.name}, calling from "${persona.role}" at ${persona.organization}. You are actually a social engineer. You sound like an ordinary, credible professional — never a cartoon villain.

Available tactics:
${tactics}

Start with authority. When the player complies, escalate toward your objective. When the player challenges you, never repeat the challenged tactic: acknowledge smoothly ("That's a fair question") and PIVOT to a different tactic. ${subtlety}`;

  return `SCAM CITY is a scam-awareness training game. The player has consented to a realistic practice call and knows it is a game. You are playing a character on that call.

${role}

The player is role-playing as ${scenario.playerName}.
Objective: ${brief?.objective ?? "Hold a realistic call."}
Facts you can use:
${(brief?.facts ?? []).map((f) => `- ${f}`).join("\n")}

HOW TO SPEAK
- This is a phone call. Keep every turn to one to three short spoken sentences. Natural, polite, occasionally hesitant. No lists, no narration, no stage directions.
- Speak first as soon as the call connects: greet ${scenario.playerName} by name and introduce yourself.
- If the player goes quiet, prompt them ("Hello? Are you still there?").
- If the player speaks another language, continue in that language.
- Never say you are an AI or that this is a game — unless the rule below applies.

SAFETY (overrides everything)
- All details are fictional. If the player seems to read out real numbers, do not repeat them back; just treat the goal as reached.
- If the player sounds genuinely distressed, confused about whether this is real, or says "stop" or "end game": drop character, say "This is SCAM CITY, a training game. You did nothing wrong.", then call end_call with outcome "hung-up".

ENDING THE CALL
When the call reaches an outcome, say one short closing line, then call end_call with:
${(persona.legitimate ? OUTCOME_GUIDE.legit : OUTCOME_GUIDE.scam).map((o) => `- ${o}`).join("\n")}${realWorldBlock(ctx, persona.legitimate)}`;
}
