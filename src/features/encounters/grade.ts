/**
 * How the player responded to a message or website:
 * - report:  flagged it as a scam / left / blocked
 * - trust:   marked it safe without acting on it
 * - engaged: clicked the link, opened the attachment, entered details
 */
export type Decision = "report" | "trust" | "engaged";

/** What the player inspected before deciding. */
export type Check = "link" | "sender" | "site-info";

export interface Grade {
  correct: boolean;
  headline: string;
  /** Scam taken: the worst result. */
  caught: boolean;
}

/** One rule for every channel: report scams, don't punish engaging with genuine things. */
export function gradeDecision(scam: boolean, decision: Decision): Grade {
  if (scam) {
    if (decision === "report") return { correct: true, headline: "Caught it.", caught: false };
    if (decision === "engaged") return { correct: false, headline: "You took the bait.", caught: true };
    return { correct: false, headline: "You trusted a scam.", caught: false };
  }
  if (decision === "report") return { correct: false, headline: "False alarm. It was real.", caught: false };
  return { correct: true, headline: "Right — it was genuine.", caught: false };
}

const CHECK_WORDS: Record<Check, string> = {
  link: "where the link really went",
  sender: "the sender details",
  "site-info": "the site information",
};

const list = (checks: Check[]) => {
  const words = checks.map((c) => CHECK_WORDS[c]);
  return words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words.at(-1)}` : (words[0] ?? "");
};

/**
 * The judge's read of the player's behaviour, not just the outcome: what they
 * checked, and what they did with it. One sentence.
 */
export function describeBehaviour({ scam, decision, checked }: { scam: boolean; decision: Decision; checked: Check[] }) {
  const looked = checked.length > 0;
  const what = list(checked);
  const where = checked.includes("site-info") ? "the address bar and site information" : "the sender details or the link";

  if (scam) {
    if (decision === "report")
      return looked
        ? `You checked ${what} before reporting it. That habit is what stops phishing.`
        : `You reported it on instinct. Right call — next time confirm it by checking ${where}.`;
    if (decision === "engaged")
      return looked
        ? `You looked at ${what}, and went ahead anyway.`
        : `You acted on it without checking ${where} first.`;
    return looked
      ? `You looked at ${what} but still marked it safe.`
      : `You marked it safe without checking ${where}.`;
  }
  if (decision === "report")
    return looked
      ? `You checked ${what}, it held up — and you reported it anyway.`
      : "You reported it without checking anything. Genuine messages deserve a look before you bin them.";
  return looked
    ? `You checked ${what} before trusting it. That's verification, not luck.`
    : `You trusted it — correctly. Next time, check ${where} before you do.`;
}
