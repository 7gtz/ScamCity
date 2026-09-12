/**
 * Shared persona scaffolding.
 *
 * The speech, safety and ending blocks are lifted from
 * `src/lib/gemini/persona.ts` (the scam-call persona), which is the version
 * already proven against the Live model — short spoken turns, speak first on
 * connect, follow the player's language, drop character on distress. The
 * scam/tactics half of that file is deliberately not copied: these are
 * witnesses and officials, not adversaries.
 *
 * CASE_FACTS is the single source of truth for every number an NPC may say
 * aloud, and it must stay identical to what the evidence cards render in
 * `src/content/cases/ten-minute-window/evidence.ts`. An NPC quoting a figure
 * the player cannot find on a card is the fastest way to break the case.
 */

import { accentFor } from "@/lib/gemini/persona";
import type { RealWorldContext } from "@/lib/live/types";
import type { NpcDossier } from "../schemas";
import type { NpcId, NpcToolName } from "../types";

export interface NpcPersona {
  id: NpcId;
  name: string;
  /** Shown under the name in the overlay. */
  role: string;
  voice: "male" | "female";
  /**
   * Pinned prebuilt Live voice. Fixed per character rather than drawn at
   * random like the scam callers: three of the five are male, and the player
   * must be able to tell Miller from Vance from Ravi by sound alone.
   */
  voiceName: string;
  /** Which tools this character may attempt. Enforced again by the guard. */
  tools: readonly NpcToolName[];
  /** Character, knowledge and behaviour — everything above the shared blocks. */
  character: string;
}

/** The agreed facts of the case. Fictional throughout. */
export const CASE_FACTS = {
  victim: "Mara Okoye, a senior architect at Harrow & Finch, mid-forties",
  amount: "₹4,80,000",
  amountSpoken: "four lakh eighty thousand rupees",
  bank: "Northstar Bank",
  payee: "Apex Horizon Trading",
  caller: "a man calling himself Martin Hayes, claiming to be Northstar fraud team, badge NS-4471",
  spoofedNumber: "+91 22 4019 0142, which showed on her phone as Northstar's official helpline",
  realBankLine: "1800 419 4471, the number printed on her debit card",
  otp: "847291",
  callTime: "21:47 last night",
  otpTime: "22:01",
  transferTime: "22:03",
  simSwapTime: "21:20, twenty-five minutes before the call",
  shop: "Apex Fix & Tech in Sector 22, run by Ravi Sunder",
  window:
    "the transfer was held overnight for fraud review because of the amount and the new payee; it releases into the morning international settlement batch, and there are only minutes left",
} as const;

const SPEECH = `HOW TO SPEAK
- This is a spoken, face-to-face conversation. Keep every turn to one to three short sentences. Natural, and occasionally hesitant. No lists, no narration, no stage directions, no asterisks.
- Speak first as soon as the conversation opens, with your own opening line.
- The detective may ask anything, in any order. Answer what they actually asked. Never read out a scripted speech, and never present them with a menu of options.
- If you do not know something, say so plainly. Never invent case facts, names, numbers or times that are not given to you below.
- If the detective goes quiet, prompt them once.
- If the detective speaks another language, continue in that language.
- Never say you are an AI or that this is a game — unless the safety rule applies.`;

const SAFETY = `SAFETY (overrides everything)
- Every detail here is fictional. Never ask the player for any real personal or financial information.
- If the player sounds genuinely distressed, confused about whether this is real, or says "stop" or "end game": drop character, say "This is SCAM CITY, a training game.", and call end_conversation.`;

const TOOLS = `ACTIONS
- When you agree to do something that changes the case — handing over a document, placing a hold, ruling out a lead, filing a report — call the matching tool at the same time as you say it. Saying it without calling the tool means it did not happen.
- A tool may come back refused, with a reason. When it does, do not pretend it worked: tell the detective, in your own words and in character, why you cannot do it yet.
- Call end_conversation after your closing line, once there is genuinely nothing left to say.`;

/**
 * Where the player actually is, folded into the character.
 *
 * The scam caller in `src/lib/gemini/persona.ts` uses this against the player —
 * a local branch, tonight's weather as a pretext for urgency. These are
 * witnesses and officials, so it is used for the opposite purpose: to make the
 * city sound like the player's own. Everyone the detective meets is a local.
 */
function realWorldBlock(ctx?: RealWorldContext): string {
  if (!ctx) return "";
  const place = [ctx.city, ctx.region, ctx.country].filter(Boolean).join(", ");
  const accent = accentFor(ctx);
  const lines = [
    accent &&
      `- Speak with ${accent}, natural and consistent from your first word, with that variety's everyday phrasing and rhythm. A real local person — never exaggerated, caricatured or mocking.`,
    place && `- This case is happening in ${place}. You live and work here.`,
    `- It is ${ctx.localTime} locally. Greet the detective for that hour and never for the wrong one.`,
    ctx.weather && `- The weather outside right now: ${ctx.weather}. Mention it only if it comes up naturally — a wet coat, a slow morning. Never as small talk for its own sake.`,
  ].filter(Boolean);
  return `\n\nWHERE YOU ARE\n${lines.join("\n")}\nUse this to sound like a person who belongs here. Never use it to pressure the detective, and never explain how you know any of it.`;
}

/** Assemble the full system instruction for one NPC. */
export function composeInstruction(
  persona: NpcPersona,
  dossierBlock: string,
  context?: RealWorldContext,
): string {
  return `SCAM CITY is a scam-awareness training game. The player is a detective investigating a fraud, speaking to you out loud. They have consented and know it is a game.

You are ${persona.name}, ${persona.role}.

${persona.character}

${dossierBlock}

${SPEECH}

${TOOLS}

${SAFETY}${realWorldBlock(context)}`;
}

/** Convenience used by both routes. */
export type DossierRenderer = (dossier: NpcDossier) => string;
