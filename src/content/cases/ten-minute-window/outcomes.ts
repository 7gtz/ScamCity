import type { CaseOutcome } from "@/game/case/types";
import type { Condition } from "@/game/dialogue/types";

export interface OutcomeDefinition {
  requires: Condition;
  debrief: string;
}

/**
 * Deterministic case outcomes for "The Ten-Minute Window".
 *
 * Every outcome evaluates purely on game flags set during dialogue and deductions.
 * Outcomes are strictly non-AI and deterministic, ensuring zero dead ends.
 */
export const TEN_MINUTE_OUTCOMES: Record<CaseOutcome, OutcomeDefinition> = {
  "funds-recovered": {
    requires: {
      all: [
        { flag: "branch.emergency-freeze-applied" },
        { flag: "deduction.freeze-authorization-ready" },
        { not: { flag: "branch.window-expired" } },
      ],
    },
    debrief:
      "Full recovery achieved. By combining Meera's call log with the urgent OTP and interim statement, you proved that the fraudulent £4,850 transfer was actively pending within Northstar Bank's 10-minute clearing window. Presenting verified evidence at the branch enabled Teller Varun Vance and the fraud desk to intervene immediately before settlement. Meera's funds were safely recovered, and the spoofed caller's footprint has been forwarded to the cyber fraud task force.",
  },

  "partial-recovery": {
    requires: {
      all: [
        { flag: "police.formal-report-lodged" },
        { flag: "deduction.otp-theft-established" },
        { flag: "branch.window-expired" },
      ],
    },
    debrief:
      "Partial recovery through lawful statutory procedure. Although the initial ten-minute instant hold window lapsed while assembling evidence, you accurately diagnosed the scam mechanism: spoofed Northstar Bank security extracting an OTP under false urgency. Lodging a formal crime report with Sgt. Balan Brennan and notifying Northstar's fraud unit triggered an inter-bank recovery order, freezing a portion of the receiving account under banking indemnity rules.",
  },

  "wrong-suspect": {
    requires: {
      all: [{ flag: "case.accused-repair-shop" }],
    },
    debrief:
      "Investigation derailed by a false lead. Fixating on Ravi Sunder at Apex Fix & Tech based solely on a recent screen replacement receipt wasted vital minutes. Ravi's service was strictly physical glass adhesive, while the breach was executed upstream at the cellular carrier level. The delay allowed the ten-minute window to close and the fraudulent payment to settle irreversibly.",
  },

  "genuine-turned-away": {
    requires: {
      all: [{ flag: "case.alienated-bank-staff" }],
    },
    debrief:
      "Misdirected hostility compromised the response. In an overzealous reaction to the scam, legitimate Northstar Bank security personnel and branch staff were treated as co-conspirators. Rejecting standard identification procedures and alienating Teller Varun Vance prevented the branch from applying an emergency hold. Refusing to cooperate with verified official channels cost Meera the opportunity to halt the transfer.",
  },

  "case-unsolved": {
    requires: {
      not: {
        any: [
          { flag: "branch.emergency-freeze-applied" },
          { flag: "police.formal-report-lodged" },
          { flag: "case.accused-repair-shop" },
          { flag: "case.alienated-bank-staff" },
        ],
      },
    },
    debrief:
      "The ten-minute clearing window closed before the attack vector could be established. Although the immediate transfer settled, the case does not dead-end: Sgt. Balan Brennan has logged an administrative incident report, and Meera has been connected with statutory victim support and credit protection services. The inquiry transitions into long-term financial arbitration.",
  },
};
