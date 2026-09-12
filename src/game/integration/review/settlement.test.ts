/**
 * Phase 1 — every run terminates exactly once, with a stated precedence.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { tenMinuteWindowCase } from "@/content/cases/ten-minute-window";
import { clearSave } from "@/game/state/save";
import { getGameState, giveEvidence, resetGame, setFlag } from "../game";
import { currentOutcome, isResolved, settleCase, OUTCOME_PRECEDENCE } from "../outcome";

const settle = (expired = false) => settleCase(tenMinuteWindowCase, { expired });

beforeEach(() => {
  vi.useFakeTimers();
  clearSave();
  resetGame("ten-minute-window");
});

describe("settlement", () => {
  it("reaches full recovery", () => {
    setFlag("branch.emergency-freeze-applied", true);
    setFlag("deduction.freeze-authorization-ready", true);
    expect(settle()).toBe("funds-recovered");
  });

  it("reaches partial recovery once the window has gone", () => {
    setFlag("police.formal-report-lodged", true);
    setFlag("deduction.otp-theft-established", true);
    setFlag("branch.window-expired", true);
    expect(settle(true)).toBe("partial-recovery");
  });

  it("reaches wrong suspect", () => {
    setFlag("case.accused-repair-shop", true);
    expect(settle()).toBe("wrong-suspect");
  });

  it("reaches genuine-turned-away when legitimate staff were alienated", () => {
    setFlag("case.alienated-bank-staff", true);
    expect(settle()).toBe("genuine-turned-away");
  });

  it("reaches case-unsolved when the window closes with nothing secured", () => {
    setFlag("branch.window-expired", true);
    expect(settle(true)).toBe("case-unsolved");
  });

  it("still terminates when no authored condition fits", () => {
    // Freeze applied but never substantiated, then the window closed. This
    // combination matched no outcome at all before, and the run never ended.
    setFlag("branch.emergency-freeze-applied", true);
    setFlag("branch.window-expired", true);
    expect(settle(true)).toBe("case-unsolved");
    expect(isResolved()).toBe(true);
  });

  it("never settles a run that is still genuinely in play", () => {
    giveEvidence("bank-statement");
    expect(settle()).toBeNull();
    expect(isResolved()).toBe(false);
  });
});

describe("precedence", () => {
  it("puts recovering the money above an accusation made along the way", () => {
    setFlag("branch.emergency-freeze-applied", true);
    setFlag("deduction.freeze-authorization-ready", true);
    setFlag("case.accused-repair-shop", true);
    expect(settle()).toBe("funds-recovered");
  });

  it("puts a wrong accusation above an expired window", () => {
    setFlag("case.accused-repair-shop", true);
    setFlag("branch.window-expired", true);
    expect(settle(true)).toBe("wrong-suspect");
  });

  it("lists every outcome exactly once", () => {
    expect(new Set(OUTCOME_PRECEDENCE).size).toBe(OUTCOME_PRECEDENCE.length);
    expect(OUTCOME_PRECEDENCE).toHaveLength(5);
  });
});

describe("immutability", () => {
  it("does not change an outcome once written", () => {
    setFlag("case.accused-repair-shop", true);
    expect(settle()).toBe("wrong-suspect");

    // A later freeze cannot rewrite history.
    setFlag("branch.emergency-freeze-applied", true);
    setFlag("deduction.freeze-authorization-ready", true);
    expect(settle()).toBe("wrong-suspect");
    expect(currentOutcome()).toBe("wrong-suspect");
  });

  it("is idempotent, so a debrief is produced once", () => {
    setFlag("branch.window-expired", true);
    const first = settle(true);
    const second = settle(true);
    const third = settle(true);
    expect([first, second, third]).toEqual(["case-unsolved", "case-unsolved", "case-unsolved"]);
    expect(getGameState().flags["case.outcome"]).toBe("case-unsolved");
  });
});
