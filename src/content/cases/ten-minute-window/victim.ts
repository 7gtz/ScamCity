/**
 * Victim perspective — live call encounter for "The Ten-Minute Window".
 *
 * Designed as an isolated module for the Hour-15 scope cut:
 * - Kept strictly separate from detective dialogue trees.
 * - Detective content reads flags that default to "the victim complied".
 * - If cut, deleting this file leaves the detective investigation fully intact.
 */

import type { DialogueNode } from "@/game/dialogue/types";

/**
 * Baseline world truth flags when playing in detective-only mode or if
 * the live call perspective is cut.
 */
export const VICTIM_DEFAULT_FLAGS: Record<string, boolean | number | string> = {
  "victim.complied": true,
  "victim.revealed-otp": true,
  "victim.called-bank-back": false,
  "victim.froze-card": false,
  "victim.reported-promptly": false,
};

/**
 * Victim live call dialogue nodes.
 * Reuses the "Martin Hayes" / Northstar Bank Account Security persona
 * from briefs.ts (ID NS-4471).
 */
export const VICTIM_CALL_DIALOGUE: Record<string, DialogueNode> = {
  "victim-call-open": {
    id: "victim-call-open",
    speaker: "Martin Hayes (Northstar Security)",
    lines: [
      "Good afternoon, is this Ms. Mara Okoye?",
      "This is Martin Hayes from Northstar Bank Account Security. We are tracking an urgent, unauthorized payment attempt of ₹4,80,000.00 to Apex Horizon Trading.",
      "The transfer is currently queued in our pending hold, but it will settle in less than ten minutes unless we apply an administrative stop right now.",
    ],
    choices: [
      {
        id: "vc-verify",
        text: "How do I know this is really Northstar? Can I call you back on the number on my card?",
        effects: [
          { trust: "caller", by: -10 },
          { stress: 15 },
        ],
        next: "victim-call-deflect",
      },
      {
        id: "vc-panic",
        text: "₹4,80,000?! No, I never authorized that! Please stop it immediately!",
        effects: [
          { setFlag: "victim.panicked", to: true },
          { stress: 30 },
        ],
        next: "victim-call-request-otp",
      },
    ],
  },

  "victim-call-deflect": {
    id: "victim-call-deflect",
    speaker: "Martin Hayes (Northstar Security)",
    lines: [
      "I understand your caution, Ms. Okoye. My staff identifier is NS-4471.",
      "However, our switchboard transfer queue currently has an estimated wait of fourteen minutes. If you hang up to dial back, the pending clearing window will expire and the funds will leave your account irreversibly.",
      "I have just dispatched a high-priority cancellation passcode to your registered handset. Read me the six digits to lock the transfer.",
    ],
    choices: [
      {
        id: "vc-read-code",
        text: "The text just arrived: 847291. Please stop the transfer!",
        effects: [
          { setFlag: "victim.complied", to: true },
          { setFlag: "victim.revealed-otp", to: true },
          { stress: 40 },
        ],
        next: "victim-call-compromised",
      },
      {
        id: "vc-hang-up",
        text: "No. The text specifically says Northstar will never ask for this code. I am hanging up and visiting my branch.",
        effects: [
          { setFlag: "victim.complied", to: false },
          { setFlag: "victim.called-bank-back", to: true },
          { setFlag: "victim.froze-card", to: true },
        ],
        next: "victim-call-resisted",
      },
    ],
  },

  "victim-call-request-otp": {
    id: "victim-call-request-otp",
    speaker: "Martin Hayes (Northstar Security)",
    lines: [
      "We are holding the transfer at the gateway. A six-digit cancellation passcode has just been transmitted to your mobile.",
      "Read me that security code now so our fraud team can cancel the batch transfer.",
    ],
    choices: [
      {
        id: "vc-give-code",
        text: "It says 847291. Take it and stop the payment!",
        effects: [
          { setFlag: "victim.complied", to: true },
          { setFlag: "victim.revealed-otp", to: true },
          { stress: 50 },
        ],
        next: "victim-call-compromised",
      },
      {
        id: "vc-pause-warning",
        text: "Wait... the message warns 'NEVER share this code with anyone, including Northstar staff'. Why are you asking for it?",
        effects: [
          { trust: "caller", by: -25 },
        ],
        next: "victim-call-deflect",
      },
    ],
  },

  "victim-call-compromised": {
    id: "victim-call-compromised",
    speaker: "Martin Hayes (Northstar Security)",
    lines: [
      "Thank you, Ms. Okoye. The code has been processed through the gateway.",
      "A confirmation reference will arrive within twenty-four hours. Please do not log into online banking while our security team completes the audit.",
    ],
    choices: [
      {
        id: "vc-finish-call",
        text: "Thank goodness... wait, the call disconnected.",
        effects: [
          { setFlag: "victim.transfer-initiated", to: true },
        ],
        next: "END",
      },
    ],
  },

  "victim-call-resisted": {
    id: "victim-call-resisted",
    speaker: "Martin Hayes (Northstar Security)",
    lines: [
      "Ms. Okoye, if you terminate this line, Northstar accepts no liability for—",
    ],
    choices: [
      {
        id: "vc-ended-call",
        text: "[Disconnect call immediately and prepare to report to the bank branch]",
        effects: [
          { setFlag: "victim.reported-promptly", to: true },
        ],
        next: "END",
      },
    ],
  },
};
