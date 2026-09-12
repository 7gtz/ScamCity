/**
 * Detective hints.
 *
 * The rule from the plan (§11) is narrow and absolute: **AI varies phrasing
 * only.** A hint may never decide an outcome, invent evidence, name a suspect,
 * or change what is true in the case. So the authored hint is the source of
 * truth and is chosen deterministically; the model is only ever asked to
 * rewrite that one sentence in the detective's voice.
 *
 * The safety property is structural, not a matter of prompt wording: `hintFor`
 * already returns the hint the player gets. `phraseHint` can only replace its
 * prose, and if the rewrite fails validation the authored line renders. Delete
 * every AI path from this file and the game plays identically.
 */

import type { AiAdapter } from "@/game/ai/adapter";
import { withFallback } from "@/game/ai/with-fallback";

/**
 * What the player is stuck on. Deliberately coarse — a hint is a nudge toward
 * the next *kind* of action, never a step-by-step solution.
 */
export type HintSituation =
  | "no-evidence"
  | "evidence-uncombined"
  | "false-lead-held"
  | "dialogue-exhausted"
  | "window-closing"
  | "after-mistake";

export interface Hint {
  situation: HintSituation;
  /** One sentence, shown as-is. */
  text: string;
}

/**
 * The authored hint for every situation. This table is the hint system; the
 * model is a cosmetic layer over it.
 *
 * Each one points at a *method* — read it again, compare two things, verify
 * through a channel you chose — never at the answer.
 */
export const AUTHORED_HINTS: Record<HintSituation, string> = {
  "no-evidence": "Nothing in the file yet. Go somewhere, and take a proper look at what people leave lying about.",
  "evidence-uncombined": "You are holding more than you think. Two of those documents disagree — put them side by side.",
  "false-lead-held": "Something in the file does not fit the timeline. A lead that goes nowhere is still worth ruling out in writing.",
  "dialogue-exhausted": "You have had everything out of them for now. Someone else will have the other half of it.",
  "window-closing": "The transfer clears soon. Act on what you can prove, not on what you suspect.",
  "after-mistake": "It went wrong; that is recoverable. Work the proper channels in order and preserve what you have.",
};

/** The authored hint. Deterministic, always available, never a network call. */
export const hintFor = (situation: HintSituation): Hint => ({
  situation,
  text: AUTHORED_HINTS[situation],
});

/**
 * Accept a rewrite only if it is still a *hint*: one or two sentences of plain
 * prose. Anything that has grown into instructions, a list, or a lecture is
 * rejected and the authored line stands.
 */
export function isUsablePhrasing(text: string): boolean {
  const t = text.trim();
  if (t.length < 12 || t.length > 240) return false;
  if (/[\n\r]/.test(t)) return false;
  if (/^[-*\d]\s|^\d+[.)]/.test(t)) return false;
  return true;
}

/**
 * Rephrase one authored hint. `run` is injected — this module never reaches
 * for a client itself, which is what keeps it testable and keeps the browser
 * away from the key.
 *
 * @param rewrite - calls the model. Omit it entirely and the authored hint is returned.
 */
export function hintAdapter(
  rewrite?: (input: Hint) => Promise<string>,
  deadlineMs = 1200,
): AiAdapter<Hint, Hint> {
  return {
    deadlineMs,
    fallback: (input) => input,
    run: async (input) => {
      if (!rewrite) return input;
      const text = await rewrite(input);
      // A rejected rewrite is not an error — it is the authored hint winning.
      return isUsablePhrasing(text) ? { ...input, text: text.trim() } : input;
    },
  };
}

/**
 * The hint the player sees. Resolves inside the deadline, with or without a
 * key, online or off, and `situation` is unchanged by anything the model says.
 */
export async function phraseHint(
  situation: HintSituation,
  rewrite?: (input: Hint) => Promise<string>,
): Promise<Hint> {
  const authored = hintFor(situation);
  const out = await withFallback(hintAdapter(rewrite), authored);
  // Belt and braces: the model cannot change which situation this was.
  return { situation, text: out.situation === situation ? out.text : authored.text };
}

/**
 * System instruction for the rewrite. States the game frame and the fictional
 * rule, in line with `src/lib/gemini/persona.ts`, which it does not modify.
 */
export const HINT_SYSTEM_INSTRUCTION = `SCAM CITY is a scam-awareness training game. The player has consented to it and knows it is a game. Every organisation, number, name and account detail in this case is fictional.

You are rewriting one hint line for a detective character. Rules:
- Return ONE sentence, at most two. Plain prose. No lists, no headings, no quotes.
- Keep the meaning EXACTLY. Do not add a fact, a name, a number, or a conclusion.
- Do not name a suspect, and do not say what the answer is.
- Never describe how to commit fraud, move money, or bypass a security control.
- Dry, plain, a little tired. British English.`;
