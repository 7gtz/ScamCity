import type { ChatPlan } from "@/lib/validation/schemas";

/**
 * Built-in openings for Messages, used when the AI's own plan is slow to
 * arrive, so the phone never sits empty. The replies are still live AI: a plan
 * is only the contact's brief. Fictional people and organisations; UK drama
 * numbers (07700 900xxx). About a third are genuine, as with every channel.
 */
export const FALLBACK_CHATS: ChatPlan[] = [
  {
    contactName: "Priya",
    contactLabel: "Unknown number",
    platform: "WhatsApp",
    scam: true,
    pattern: "Hi Mum, new number",
    objective: "Get the player to pay an urgent bill into a new account before they check with their real child.",
    facts: [
      "Their phone fell in the sink; this is a 'temporary' number",
      "A bill is due today and their banking app is locked on the new phone",
      "Asks the player not to call the old number because it's broken",
    ],
    tacticPlan: ["social-pressure", "urgency", "secrecy"],
    opening: "Hi Mum it's me 🙈 dropped my phone in the sink, this is my new number. Can you save it? Need to ask you something x",
  },
  {
    contactName: "Karan Mehta",
    contactLabel: "+44 7700 900312",
    platform: "LinkedIn",
    scam: true,
    pattern: "Fake recruiter",
    objective: "Get a 'registration fee' or bank details for a remote job that doesn't exist.",
    facts: [
      "Offers remote work reviewing product listings, two hours a day",
      "Recruits for 'Brightline Talent Partners'",
      "Onboarding closes tonight; a small refundable fee secures the place",
    ],
    tacticPlan: ["authority", "urgency", "verification-request"],
    opening: "Hi! I came across your profile and think you'd be a great fit for a flexible remote role with one of our clients. Open to hearing more? 🙂",
  },
  {
    contactName: "Sam",
    contactLabel: "Sam · Marketplace",
    platform: "Marketplace",
    scam: true,
    pattern: "Buyer with a fake payment link",
    objective: "Get the player to 'confirm' a payment on a lookalike link and enter their card details.",
    facts: [
      "Wants to buy the player's listed bike without seeing it",
      "Says they've paid through 'secure checkout' and the player must click a link to receive it",
      "Offers extra for a courier to collect today",
    ],
    tacticPlan: ["urgency", "authority", "social-pressure"],
    opening: "Hi, is the bike still available? I'll take it at your asking price, can pay right now",
  },
  {
    contactName: "Leah",
    contactLabel: "Leah · Book club",
    platform: "WhatsApp",
    scam: false,
    pattern: "Friend confirming plans",
    objective: "Confirm Thursday's book club and ask the player to bring something sweet. Happy to call if the player wants to check it's her.",
    facts: ["Book club is Thursday at 7 at her place", "They're reading a mystery novel this month", "She can call if the player is unsure"],
    tacticPlan: ["social-pressure"],
    opening: "Hey! Still on for Thursday? I'm doing the tea, could you bring something sweet? 🍰",
  },
  {
    contactName: "Riverside Clinic",
    contactLabel: "Riverside Clinic",
    platform: "SMS",
    scam: false,
    pattern: "Appointment reminder",
    objective: "Remind the player of an appointment and ask them to reply YES or call reception to rebook. Never asks for personal or payment details.",
    facts: [
      "Appointment on Tuesday at 10:40 with Dr Patel",
      "Rebooking is by calling the number on the practice website",
      "Replying YES confirms the slot",
    ],
    tacticPlan: ["authority"],
    opening: "Riverside Clinic: reminder of your appointment on Tue at 10:40. Reply YES to confirm, or call reception to rebook.",
  },
];

/** About 30% genuine, like every generated channel. */
export function pickFallbackChat(r: () => number = Math.random) {
  const genuine = r() < 0.3;
  const pool = FALLBACK_CHATS.filter((c) => c.scam === !genuine);
  return pool[Math.floor(r() * pool.length)]!;
}
