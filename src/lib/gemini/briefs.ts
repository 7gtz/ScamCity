import type { CallPlan } from "@/lib/validation/schemas";

/**
 * Per-district guidance for the director, plus a hand-written plan used when
 * the director is unavailable. `legitGuide` enables the secret-genuine twist.
 */
export interface DistrictBrief {
  guide: string;
  legitGuide?: string;
  plan: CallPlan;
}

export const BRIEFS: Record<string, DistrictBrief> = {
  "bank-security": {
    guide:
      "Bank impersonation: an 'account security' or 'fraud team' call about a suspicious payment, aiming to harvest a one-time passcode, card number or online-banking login.",
    plan: {
      callerName: "Martin Hayes",
      callerRole: "Account Security",
      organization: "Northstar Bank",
      voice: "male",
      hook: "A large card payment is pending right now at an electronics store in another city.",
      objective: "Get the player to read out the 6-digit one-time passcode being sent to their phone, or failing that their full card number.",
      facts: [
        "Your employee ID is NS-4471.",
        "The payment can still be stopped if they act in the next ten minutes.",
        "If asked for a callback number, deflect: you're already on the line and transfers add delay.",
      ],
      tacticPlan: ["authority", "urgency", "verification-request", "fear"],
      tells: ["You push the deadline a little too hard."],
    },
  },
  "card-alert": {
    guide: "A GENUINE bank fraud-prevention call about a paused payment.",
    legitGuide:
      "A genuine fraud-prevention officer. Never asks for a PIN, passcode, password or full card number; encourages the player to hang up and call the number on their card, quoting a reference.",
    plan: {
      callerName: "Priya Nair",
      callerRole: "Fraud Prevention",
      organization: "Northstar Bank",
      voice: "female",
      hook: "A card payment at an electronics store in another city has been paused as a precaution.",
      objective: "Confirm whether the player made the payment, without asking for anything sensitive.",
      facts: [
        "The card is already blocked as a precaution.",
        "Reference number 4471 lets the fraud team pick the case up on a callback.",
      ],
      tacticPlan: ["authority"],
      tells: ["Offers a callback on the number printed on the card, quoting reference 4471."],
    },
  },
  "parcel-hold": {
    guide:
      "Delivery scams: failed delivery, damaged label, customs or redelivery fee, 'confirm your address' — aiming to take a small card payment or push a payment link.",
    legitGuide:
      "A genuine courier arranging a delivery slot for a parcel the player may be expecting. Never takes payment by phone; points to the official app or website; happy to be checked.",
    plan: {
      callerName: "Jordan Reyes",
      callerRole: "Delivery Support",
      organization: "SwiftParcel",
      voice: "male",
      hook: "A parcel couldn't be delivered because its address label was damaged in transit.",
      objective: "Get the player to pay a small redelivery fee by reading out card details or tapping a payment link.",
      facts: [
        "The parcel is marked priority, so the contents aren't visible.",
        "It returns to the sender within the hour if not rebooked, with a return charge.",
        "The fee is small: under two in the local currency.",
      ],
      tacticPlan: ["authority", "urgency", "verification-request", "social-pressure"],
      tells: ["You can't say who the sender is."],
    },
  },
  "desk-support": {
    guide:
      "Tech-support scams: 'your computer is infected / sending error reports', aiming to get remote access software installed and a session code read out, or a 'support fee' paid.",
    legitGuide:
      "A genuine IT helpdesk agent following up on a ticket. Never asks for passwords or remote access out of the blue; suggests the player raises it through the official IT portal.",
    plan: {
      callerName: "Daniel Brooks",
      callerRole: "Security Desk",
      organization: "Nimbus OS",
      voice: "male",
      hook: "The player's computer has been sending error reports all morning and looks infected.",
      objective: "Get the player to install a remote-support tool and read out its six-digit session code.",
      facts: [
        "You can 'prove' it: their system event log shows hundreds of warnings.",
        "The tool is called a 'secure support assistant'.",
        "Waiting risks their bank logins being stolen tonight.",
      ],
      tacticPlan: ["authority", "fear", "verification-request", "secrecy"],
      tells: ["You never say how you know which computer is theirs."],
    },
  },
  "prize-claim": {
    guide:
      "Prize and reward scams: a win in a draw the player never entered, aiming to take a 'delivery', 'insurance' or 'release' fee, often with a request for secrecy.",
    legitGuide:
      "A genuine shop confirming a real competition entry. No fee of any kind; the prize is collected in store with ID; the caller encourages checking the shop's official channels.",
    plan: {
      callerName: "Mia Collins",
      callerRole: "Winners Team",
      organization: "Lumen Rewards",
      voice: "female",
      hook: "The player's number was drawn in an anniversary prize draw: a new phone and vouchers.",
      objective: "Get the player to pay a small delivery-and-insurance fee by card.",
      facts: [
        "Customers are entered automatically through 'partner stores'.",
        "Winners must claim within 24 hours or it passes on.",
        "They should keep it quiet until it arrives — a 'surprise launch'.",
      ],
      tacticPlan: ["authority", "urgency", "verification-request", "secrecy"],
      tells: ["The player never entered a draw."],
    },
  },
  "ceo-favour": {
    guide:
      "Executive impersonation (CEO fraud): a senior leader on a personal number needing an urgent, confidential favour — gift cards, a payment, a change of bank details.",
    legitGuide:
      "The player's genuine manager calling about an ordinary task. Asks for nothing unusual, is happy to be confirmed on the company chat, and never asks for secrecy.",
    plan: {
      callerName: "Dana Whitfield",
      callerRole: "Managing Director",
      organization: "Harrow & Finch",
      voice: "female",
      hook: "The MD is between client meetings on a personal phone and needs a quick, sensitive favour.",
      objective: "Get the player to buy gift cards and send the codes, reimbursement 'tonight'.",
      facts: [
        "Six gift cards for a client gift, needed before five o'clock.",
        "Photos of the scratched codes are enough.",
        "It must stay between the two of you for now.",
      ],
      tacticPlan: ["authority", "secrecy", "urgency", "social-pressure"],
      tells: ["You call from a number that isn't saved as the MD."],
    },
  },
  "romance-emergency": {
    guide:
      "Romance scams: an online partner the player has never met in person, working far away, who suddenly needs money for an emergency.",
    plan: {
      callerName: "Alex Morgan",
      callerRole: "Offshore Engineer",
      organization: "Met on Kindred",
      voice: "male",
      hook: "After weeks of messages, Alex finally has a signal on the rig — and a problem.",
      objective: "Get the player to transfer money for a customs 'release fee', promising to repay on landing.",
      facts: [
        "The rig's cameras are 'blocked for security', so no video calls.",
        "The bank card was frozen at customs and contract pay is stuck.",
        "The equipment will be held unless the fee is paid today.",
      ],
      tacticPlan: ["social-pressure", "urgency", "fear", "secrecy"],
      tells: ["There has never been a video call."],
    },
  },
};
