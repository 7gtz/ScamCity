import type { Scenario } from "@/content/scenarios";
import { TACTICS } from "@/content/tactics";
import type { RealWorldContext } from "@/lib/live/types";
import { CallPlanSchema, type CallPlan, type PlayerProfile } from "@/lib/validation/schemas";
import { BRIEFS } from "./briefs";
import { CHAINS } from "./models";
import { generateJson } from "./server";

const SYSTEM = `You are the director of SCAM CITY, a scam-awareness training game. Before every practice phone call you write a fresh, unique plan for the caller. A separate voice actor performs it live and improvises within your plan.

Rules:
- Every plan must feel different from the last: new name, new organisation, new pretext, new specific details. Vary cultures, genders, ages and speaking styles.
- Organisations must be plausible but FICTIONAL. Never use a real brand, bank, courier or company name.
- Ground scam plans in documented real-world patterns for the district. Make them specific and believable, never cartoonish.
- Localise to the player's country when it is known: currency, local conventions, a local-sounding organisation. Keep it loose — cities are diverse, and the caller need not share one background with the player.
- Follow the casting line exactly (gender and first-name initial).
- Facts are short, concrete, fictional details the caller can use (IDs, amounts, deadlines, reference numbers).`;

const INITIALS = "ABCDEFGHIJKLMNOPRSTVWYZ";

/** 1 (clear tells) → 3 (patient, subtle). Rises with the district and with the player's record. */
export function difficultyFor(scenario: Scenario, profile?: PlayerProfile) {
  const base = scenario.persona.level <= 2 ? 1 : 2;
  const earned = 1 + Math.floor((profile?.cleared ?? 0) / 2);
  return Math.min(3, Math.max(base, earned));
}

/** Asks the director for a unique plan for this call, aimed at this player. */
export async function planCall({
  scenario,
  legitimate,
  context,
  profile,
}: {
  scenario: Scenario;
  legitimate: boolean;
  context?: RealWorldContext;
  profile?: PlayerProfile;
}): Promise<CallPlan> {
  const brief = BRIEFS[scenario.id]!;
  const difficulty = difficultyFor(scenario, profile);
  const place = context ? [context.city, context.country].filter(Boolean).join(", ") : "";
  // A random casting seed forces variety: left to itself the model converges on
  // the same few names for a given city.
  const gender = Math.random() < 0.5 ? "male" : "female";
  const initial = INITIALS[Math.floor(Math.random() * INITIALS.length)];

  const prompt = `District: ${scenario.persona.district}
Casting: a ${gender} caller (voice "${gender}") whose first name starts with "${initial}".`;
  const rest = `
${legitimate ? `This call is GENUINE. ${brief.legitGuide ?? brief.guide}` : `This call is a SCAM. Pattern: ${brief.guide}`}
Difficulty ${difficulty} of 3 (${difficulty === 1 ? "clear tells a careful person can catch" : difficulty === 2 ? "polished, few tells" : "patient, warm and subtle"}).
${place ? `The player is in ${place}; it is ${context?.localTime} there.` : ""}
${
  !legitimate && profile?.weak.length
    ? `This player keeps missing: ${profile.weak.map((t) => `${t} (${TACTICS[t].description})`).join("; ")}. Build the tactic plan around those.`
    : ""
}
Do NOT reuse any of these recent callers or pretexts:
${profile?.recentHooks.map((h) => `- ${h}`).join("\n") || "- (none)"}

For reference only, a plan in this district once looked like this — write something clearly different:
${JSON.stringify({ hook: brief.plan.hook, organization: brief.plan.organization })}`;

  return generateJson(CallPlanSchema, {
    model: CHAINS.director,
    system: SYSTEM,
    prompt: `${prompt}\n${rest}`,
    temperature: 1.1,
    timeoutMs: 6000,
  });
}
