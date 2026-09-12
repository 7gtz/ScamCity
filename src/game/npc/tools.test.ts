import { describe, expect, it } from "vitest";
import { executeNpcTool } from "./tools";
import type { NpcId, NpcToolCall, NpcToolName } from "./types";

type State = { flags: Record<string, boolean | number | string>; evidence: string[] };

const state = (over: Partial<State> = {}): State => ({ flags: {}, evidence: [], ...over });

const call = (npc: NpcId, name: NpcToolName, args: Record<string, unknown> = {}): NpcToolCall => ({
  id: "t-1",
  npc,
  name,
  args,
});

const FREEZE_CHAIN = ["bank-statement", "call-log", "otp-message"];

describe("tool permissions", () => {
  it("refuses a tool the character does not have", () => {
    const result = executeNpcTool(call("miller", "authorize_freeze"), state());
    expect(result.ok).toBe(false);
  });

  it("lets every character close the conversation", () => {
    for (const npc of ["miller", "mara", "vance", "ravi", "brennan"] as NpcId[]) {
      const result = executeNpcTool(call(npc, "end_conversation"), state());
      expect(result.ok).toBe(true);
      expect(result.ends).toBe(true);
    }
  });
});

describe("give_evidence", () => {
  it("hands over an item the character actually holds", () => {
    const result = executeNpcTool(call("mara", "give_evidence", { evidence: "otp-message" }), state());
    expect(result.ok).toBe(true);
    expect(result.effects).toEqual([{ giveEvidence: "otp-message" }]);
  });

  it("refuses an item belonging to someone else", () => {
    const result = executeNpcTool(call("mara", "give_evidence", { evidence: "sim-swap-record" }), state());
    expect(result.ok).toBe(false);
    expect(result.effects).toEqual([]);
  });

  it("is idempotent once the detective already holds it", () => {
    const result = executeNpcTool(
      call("mara", "give_evidence", { evidence: "call-log" }),
      state({ evidence: ["call-log"] }),
    );
    expect(result.ok).toBe(true);
    expect(result.effects).toEqual([]);
  });
});

describe("authorize_freeze", () => {
  it("refuses without the full evidence chain", () => {
    const result = executeNpcTool(call("vance", "authorize_freeze", { grounds: "OTP issued 22:01, used 22:03, obtained on a spoofed call at 21:47." }), state({ evidence: ["bank-statement"] }));
    expect(result.ok).toBe(false);
    expect(result.effects).toEqual([]);
  });

  it("applies with the full chain, and readies the outcome flags", () => {
    const result = executeNpcTool(call("vance", "authorize_freeze", { grounds: "OTP issued 22:01, used 22:03, obtained on a spoofed call at 21:47." }), state({ evidence: FREEZE_CHAIN }));
    expect(result.ok).toBe(true);
    expect(result.effects).toContainEqual({ setFlag: "branch.emergency-freeze-applied", to: true });
    expect(result.effects).toContainEqual({ setFlag: "deduction.freeze-authorization-ready", to: true });
  });

  it("refuses once the settlement window has expired", () => {
    const result = executeNpcTool(
      call("vance", "authorize_freeze", { grounds: "OTP issued 22:01, used 22:03, obtained on a spoofed call at 21:47." }),
      state({ evidence: FREEZE_CHAIN, flags: { "branch.window-expired": true } }),
    );
    expect(result.ok).toBe(false);
  });

  it("refuses a detective who accused the bank", () => {
    const result = executeNpcTool(
      call("vance", "authorize_freeze", { grounds: "OTP issued 22:01, used 22:03, obtained on a spoofed call at 21:47." }),
      state({ evidence: FREEZE_CHAIN, flags: { "case.alienated-bank-staff": true } }),
    );
    expect(result.ok).toBe(false);
  });

  it("does not double-apply an existing hold", () => {
    const result = executeNpcTool(
      call("vance", "authorize_freeze", { grounds: "OTP issued 22:01, used 22:03, obtained on a spoofed call at 21:47." }),
      state({ evidence: FREEZE_CHAIN, flags: { "branch.emergency-freeze-applied": true } }),
    );
    expect(result.ok).toBe(true);
    expect(result.effects).toEqual([]);
  });
});

describe("accuse_suspect", () => {
  it("records a wrong accusation against Ravi", () => {
    const result = executeNpcTool(call("ravi", "accuse_suspect", { suspect: "ravi" }), state());
    expect(result.ok).toBe(true);
    expect(result.effects).toContainEqual({ setFlag: "case.accused-repair-shop", to: true });
  });

  it("records alienating the bank", () => {
    const result = executeNpcTool(call("mara", "accuse_suspect", { suspect: "vance" }), state());
    expect(result.effects).toContainEqual({ setFlag: "case.alienated-bank-staff", to: true });
  });
});

describe("clear_lead", () => {
  it("refuses to clear the repair shop before the receipt is seen", () => {
    const result = executeNpcTool(call("ravi", "clear_lead", { lead: "repair-shop" }), state());
    expect(result.ok).toBe(false);
  });

  it("clears the repair shop once the receipt is held", () => {
    const result = executeNpcTool(
      call("ravi", "clear_lead", { lead: "repair-shop" }),
      state({ evidence: ["repair-receipt"] }),
    );
    expect(result.ok).toBe(true);
    expect(result.effects).toContainEqual({ setFlag: "deduction.repair-shop-cleared", to: true });
  });

  it("clears the delivery card once it is held", () => {
    const result = executeNpcTool(
      call("mara", "clear_lead", { lead: "delivery" }),
      state({ evidence: ["delivery-notice"] }),
    );
    expect(result.effects).toContainEqual({ setFlag: "deduction.delivery-bait-cleared", to: true });
  });

  it("refuses an unknown lead", () => {
    const result = executeNpcTool(call("mara", "clear_lead", { lead: "the-butler" }), state());
    expect(result.ok).toBe(false);
  });
});

describe("lodge_report", () => {
  it("refuses a chain with holes", () => {
    const result = executeNpcTool(call("brennan", "lodge_report", { summary: "Spoofed call at 21:47, OTP at 22:01, transfer at 22:03, bank hold placed." }), state({ evidence: ["call-log"] }));
    expect(result.ok).toBe(false);
  });

  it("files once the call and passcode are evidenced", () => {
    const result = executeNpcTool(
      call("brennan", "lodge_report", { summary: "Spoofed call at 21:47, OTP at 22:01, transfer at 22:03, bank hold placed." }),
      state({ evidence: ["call-log", "otp-message"] }),
    );
    expect(result.ok).toBe(true);
    expect(result.effects).toContainEqual({ setFlag: "police.formal-report-lodged", to: true });
    expect(result.ends).toBe(true);
  });
});

describe("the articulation floor", () => {
  it("refuses a freeze when the detective stated no grounds", () => {
    const result = executeNpcTool(call("vance", "authorize_freeze"), state({ evidence: FREEZE_CHAIN }));
    expect(result.ok).toBe(false);
    expect(result.effects).toEqual([]);
  });

  it("refuses a freeze on a token argument", () => {
    const result = executeNpcTool(
      call("vance", "authorize_freeze", { grounds: "fraud" }),
      state({ evidence: FREEZE_CHAIN }),
    );
    expect(result.ok).toBe(false);
  });

  it("refuses a report with no summary", () => {
    const result = executeNpcTool(
      call("brennan", "lodge_report"),
      state({ evidence: ["call-log", "otp-message"] }),
    );
    expect(result.ok).toBe(false);
  });
});

describe("refusals", () => {
  it("always carry a reason the NPC can speak, and never mutate state", () => {
    const refusals = [
      executeNpcTool(call("vance", "authorize_freeze", { grounds: "OTP issued 22:01, used 22:03, obtained on a spoofed call at 21:47." }), state()),
      executeNpcTool(call("brennan", "lodge_report", { summary: "Spoofed call at 21:47, OTP at 22:01, transfer at 22:03, bank hold placed." }), state()),
      executeNpcTool(call("ravi", "clear_lead", { lead: "repair-shop" }), state()),
      executeNpcTool(call("mara", "give_evidence", { evidence: "bank-statement" }), state()),
      executeNpcTool(call("miller", "lodge_report"), state()),
    ];
    for (const result of refusals) {
      expect(result.ok).toBe(false);
      expect(result.effects).toEqual([]);
      expect(result.reason.length).toBeGreaterThan(10);
    }
  });
});
