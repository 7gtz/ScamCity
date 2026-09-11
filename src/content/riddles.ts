import type { TacticId } from "@/lib/live/types";

export type RiddleCategory = "phishing" | "impersonation" | "delivery" | "tech-support" | "other";

export const RIDDLE_CATEGORIES: { id: RiddleCategory; label: string }[] = [
  { id: "phishing", label: "Phishing" },
  { id: "impersonation", label: "Impersonation" },
  { id: "delivery", label: "Delivery" },
  { id: "tech-support", label: "Tech support" },
  { id: "other", label: "Other" },
];

export interface RiddleScenario {
  id: string;
  channel: "SMS" | "Call" | "Email";
  time: string;
  from?: string;
  subject?: string;
  body: string;
  scam: boolean;
  category?: RiddleCategory;
  /** The detail that gives it away — quoted and underlined in the verdict. */
  tell: string;
  explanation: string;
  /** Tactics this scenario trains (AI-generated riddles aim at the player's weak ones). */
  targets?: TacticId[];
  source?: "ai" | "static";
}

/**
 * Written scenarios modelled on documented patterns. The AI generator replaces
 * this list (spec Phase 4); the shape stays the same.
 */
export const RIDDLES: RiddleScenario[] = [
  {
    id: "parcel-fee",
    channel: "SMS",
    time: "09:42 AM",
    from: "+44 7700 900418",
    body: "Your package could not be delivered. Confirm your address within 30 minutes to avoid return charges.",
    scam: true,
    category: "delivery",
    tell: "within 30 minutes",
    explanation:
      "A deadline on a parcel you never tracked, from a personal mobile number. Couriers don't charge return fees by text — the link collects your card details.",
  },
  {
    id: "real-2fa",
    channel: "SMS",
    time: "07:15 PM",
    from: "Northstar",
    body: "Your Northstar code is 482913. We will never call you to ask for this code. Don't share it with anyone.",
    scam: false,
    tell: "never call you to ask for this code",
    explanation:
      "You just signed in, the message asks nothing of you, and it warns you against the exact trick scammers use. This one is real — the danger would be someone calling to ask for it.",
  },
  {
    id: "ceo-gift-cards",
    channel: "Email",
    time: "04:51 PM",
    from: "Dana Whitfield <dana.whitfield.ceo@gmail.com>",
    subject: "Quick favour",
    body: "Are you at your desk? I need six gift cards for a client before 6pm. Keep this between us for now — I'll explain tomorrow.",
    scam: true,
    category: "impersonation",
    tell: "Keep this between us",
    explanation:
      "A senior name, a personal address, a deadline, and a request for secrecy. Real executives don't buy gift cards through their staff — verify on a channel you already trust.",
  },
  {
    id: "desk-popup",
    channel: "Call",
    time: "11:03 AM",
    from: "Unknown number",
    body: "Hello, this is Windows Technical Department. Your computer is sending us error reports. I need you to install a small program so I can see your screen.",
    scam: true,
    category: "tech-support",
    tell: "install a small program",
    explanation:
      "Software companies don't monitor your errors and phone you. Remote-access software hands a stranger control of your machine and your banking sessions.",
  },
  {
    id: "dentist",
    channel: "SMS",
    time: "10:20 AM",
    from: "Harbour Dental",
    body: "Reminder: your appointment is tomorrow at 2:30 PM. Reply C to confirm or call the practice to reschedule.",
    scam: false,
    tell: "call the practice",
    explanation:
      "An appointment you booked, no link, no payment, and it points you to a number you already know. Verification is built in — that is what legitimate looks like.",
  },
];
