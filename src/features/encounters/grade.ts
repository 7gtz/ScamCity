/**
 * How the player responded to a message or website:
 * - report:  flagged it as a scam / left / blocked
 * - trust:   marked it safe without acting on it
 * - engaged: clicked the link, opened the attachment, entered details
 */
export type Decision = "report" | "trust" | "engaged";

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
    return { correct: false, headline: "That one was a scam.", caught: false };
  }
  if (decision === "report") return { correct: false, headline: "This one was real.", caught: false };
  return { correct: true, headline: "Right — it was genuine.", caught: false };
}
