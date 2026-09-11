import type { TacticId } from "@/lib/live/types";

export const TACTICS: Record<TacticId, { label: string; description: string }> = {
  authority: { label: "Authority claim", description: "Borrows the credibility of a bank, a company, or an official role." },
  urgency: { label: "Urgency", description: "A deadline designed to stop you checking." },
  "verification-request": {
    label: "Request for verification",
    description: "Asks you to prove who you are — to them.",
  },
  "social-pressure": { label: "Social pressure", description: "Makes caution feel rude, foolish, or selfish." },
  fear: { label: "Threat of consequence", description: "Loss, arrest, a frozen account." },
  secrecy: { label: "Isolation", description: "Discourages you from calling anyone else." },
};

export const tacticLabel = (id: TacticId) => TACTICS[id].label;
