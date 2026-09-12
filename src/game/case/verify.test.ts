/**
 * Unit tests for case verification — deterministic, never AI-decided.
 *
 * Tests:
 * - hasEvidence: single evidence check
 * - isDeductionReady: deduction requirement check
 * - checkDeductions: newly-unlockable deductions
 * - verifyClaim: claim validation against held evidence
 * - getHeldEvidenceItems: filtering evidence items
 * - hasFalseLeads: identifying false leads
 */

import { describe, expect, it } from "vitest";
import type { Deduction, EvidenceItem } from "@/game/case/types";
import {
  checkDeductions,
  getHeldEvidenceItems,
  hasEvidence,
  hasFalseLeads,
  isDeductionReady,
  verifyClaim,
} from "@/game/case/verify";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const testEvidence: EvidenceItem[] = [
  {
    id: "bank-statement",
    title: "Bank Statement",
    kind: "ledger",
    lines: [{ text: "Transfer", value: "£4,850" }],
  },
  {
    id: "call-log",
    title: "Call Log",
    kind: "log",
    lines: [{ text: "Inbound call", flag: true }],
  },
  {
    id: "otp-message",
    title: "OTP Message",
    kind: "chat",
    lines: [{ text: "One-time code" }],
  },
  {
    id: "repair-receipt",
    title: "Repair Receipt",
    kind: "notice",
    lines: [{ text: "Screen replacement" }],
    falseLead: true,
  },
  {
    id: "delivery-notice",
    title: "Delivery Notice",
    kind: "tracking",
    lines: [{ text: "Parcel" }],
    falseLead: true,
  },
];

const testDeductions: Deduction[] = [
  {
    id: "d-otp-theft",
    from: ["call-log", "otp-message"],
    conclusion: "OTP theft established.",
    unlocksFlag: "deduction.otp-theft",
  },
  {
    id: "d-freeze-ready",
    from: ["bank-statement", "call-log", "otp-message"],
    conclusion: "Emergency freeze authorized.",
    unlocksFlag: "deduction.freeze-ready",
  },
  {
    id: "d-clear-repair",
    from: ["repair-receipt", "sim-swap-record"],
    conclusion: "Repair shop cleared.",
    unlocksFlag: "deduction.repair-cleared",
  },
];

// ---------------------------------------------------------------------------
// hasEvidence
// ---------------------------------------------------------------------------

describe("hasEvidence", () => {
  it("returns true when evidence is held", () => {
    expect(hasEvidence("call-log", ["call-log", "bank-statement"])).toBe(true);
  });

  it("returns false when evidence is not held", () => {
    expect(hasEvidence("otp-message", ["call-log"])).toBe(false);
  });

  it("returns false for empty held list", () => {
    expect(hasEvidence("call-log", [])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isDeductionReady
// ---------------------------------------------------------------------------

describe("isDeductionReady", () => {
  it("returns true when all required evidence is held", () => {
    expect(isDeductionReady(testDeductions[0]!, ["call-log", "otp-message"])).toBe(true);
  });

  it("returns true with extra evidence held", () => {
    expect(
      isDeductionReady(testDeductions[0]!, ["call-log", "otp-message", "bank-statement"]),
    ).toBe(true);
  });

  it("returns false when some evidence is missing", () => {
    expect(isDeductionReady(testDeductions[0]!, ["call-log"])).toBe(false);
  });

  it("returns false for empty held evidence", () => {
    expect(isDeductionReady(testDeductions[0]!, [])).toBe(false);
  });

  it("handles three-evidence deduction", () => {
    expect(
      isDeductionReady(testDeductions[1]!, ["bank-statement", "call-log", "otp-message"]),
    ).toBe(true);
    expect(
      isDeductionReady(testDeductions[1]!, ["bank-statement", "call-log"]),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkDeductions
// ---------------------------------------------------------------------------

describe("checkDeductions", () => {
  it("returns newly unlockable deductions", () => {
    const result = checkDeductions(
      testDeductions,
      ["call-log", "otp-message"],
      {},
    );
    expect(result.map((d) => d.id)).toEqual(["d-otp-theft"]);
  });

  it("returns multiple when multiple are ready", () => {
    const result = checkDeductions(
      testDeductions,
      ["bank-statement", "call-log", "otp-message"],
      {},
    );
    expect(result.map((d) => d.id)).toEqual(["d-otp-theft", "d-freeze-ready"]);
  });

  it("excludes already-unlocked deductions", () => {
    const result = checkDeductions(
      testDeductions,
      ["call-log", "otp-message"],
      { "deduction.otp-theft": true },
    );
    expect(result).toEqual([]);
  });

  it("returns empty when no deductions are ready", () => {
    const result = checkDeductions(testDeductions, ["bank-statement"], {});
    expect(result).toEqual([]);
  });

  it("returns empty for empty evidence", () => {
    const result = checkDeductions(testDeductions, [], {});
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// verifyClaim
// ---------------------------------------------------------------------------

describe("verifyClaim", () => {
  it("returns true when claim matches deduction requirements", () => {
    expect(
      verifyClaim(
        ["call-log", "otp-message"],
        testDeductions[0]!,
        ["call-log", "otp-message", "bank-statement"],
      ),
    ).toBe(true);
  });

  it("rejects unrelated evidence in a proposed connection", () => {
    expect(
      verifyClaim(
        ["call-log", "otp-message", "bank-statement"],
        testDeductions[0]!,
        ["call-log", "otp-message", "bank-statement"],
      ),
    ).toBe(false);
  });

  it("returns false when claimed evidence is not held", () => {
    expect(
      verifyClaim(
        ["call-log", "otp-message"],
        testDeductions[0]!,
        ["call-log"], // otp-message not held
      ),
    ).toBe(false);
  });

  it("returns false when claim is missing required evidence", () => {
    expect(
      verifyClaim(
        ["call-log"], // missing otp-message
        testDeductions[0]!,
        ["call-log", "otp-message"],
      ),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getHeldEvidenceItems
// ---------------------------------------------------------------------------

describe("getHeldEvidenceItems", () => {
  it("returns only held items", () => {
    const result = getHeldEvidenceItems(testEvidence, ["call-log", "bank-statement"]);
    expect(result.map((i) => i.id)).toEqual(["bank-statement", "call-log"]);
  });

  it("returns empty for no held evidence", () => {
    expect(getHeldEvidenceItems(testEvidence, [])).toEqual([]);
  });

  it("preserves order from allEvidence", () => {
    const result = getHeldEvidenceItems(testEvidence, ["otp-message", "bank-statement"]);
    expect(result.map((i) => i.id)).toEqual(["bank-statement", "otp-message"]);
  });
});

// ---------------------------------------------------------------------------
// hasFalseLeads
// ---------------------------------------------------------------------------

describe("hasFalseLeads", () => {
  it("returns false-lead evidence items", () => {
    const result = hasFalseLeads(testEvidence, [
      "bank-statement",
      "repair-receipt",
      "delivery-notice",
    ]);
    expect(result.map((i) => i.id)).toEqual(["repair-receipt", "delivery-notice"]);
  });

  it("returns empty when no false leads are held", () => {
    const result = hasFalseLeads(testEvidence, ["bank-statement", "call-log"]);
    expect(result).toEqual([]);
  });

  it("returns empty for empty held evidence", () => {
    expect(hasFalseLeads(testEvidence, [])).toEqual([]);
  });
});
