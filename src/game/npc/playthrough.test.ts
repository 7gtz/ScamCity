/**
 * Full voice-track playthrough of "The Ten-Minute Window".
 *
 * The existing `integration/review/playthrough.test.ts` walks the authored
 * dialogue tree. This walks the other path — the one the player actually takes
 * now — where every case-advancing move is a tool an NPC attempted and the
 * guard allowed.
 *
 * Deterministic and offline: it drives `executeNpcTool` and the real store, so
 * it proves the chain from "Vance agreed" to "Grade A" without a network, a
 * microphone, or a model.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { tenMinuteWindowCase } from "@/content/cases/ten-minute-window";
import { checkDeductions } from "@/game/case/verify";
import { TEN_MINUTE_DEDUCTIONS } from "@/content/cases/ten-minute-window/deductions";
import { gradeCase, type CaseRun } from "@/game/debrief/grade-case";
import { resolveCase } from "@/game/integration/panel-actions";
import {
  applyEffects,
  getGameState,
  giveEvidence,
  resetGame,
  setFlag,
} from "@/game/integration/game";
import { clearSave } from "@/game/state/save";
import { executeNpcTool } from "./tools";
import type { CaseOutcome } from "@/game/case/types";
import type { NpcId, NpcToolName } from "./types";

/** Play one NPC tool call and commit whatever the guard allowed. */
function speak(npc: NpcId, name: NpcToolName, args: Record<string, unknown> = {}) {
  const state = getGameState();
  const result = executeNpcTool({ id: `t-${name}`, npc, name, args }, state);
  if (result.effects.length) applyEffects(result.effects);
  return result;
}

/** The case board is where combining evidence unlocks a deduction. */
function openCaseBoard() {
  const state = getGameState();
  for (const deduction of checkDeductions(TEN_MINUTE_DEDUCTIONS, state.evidence, state.flags)) {
    setFlag(deduction.unlocksFlag, true);
  }
}

function buildRun(): CaseRun {
  const state = getGameState();
  const flagged = (flag: string) => Boolean(state.flags[flag]);
  return {
    caseId: "ten-minute-window",
    outcome: (state.flags["case.outcome"] as CaseOutcome) ?? "case-unsolved",
    evidence: state.evidence,
    deductions: TEN_MINUTE_DEDUCTIONS.filter((d) => flagged(d.unlocksFlag)).map((d) => d.id),
    dismissedFalseLeads: [
      flagged("deduction.delivery-bait-cleared") && "delivery-notice",
      flagged("deduction.repair-shop-cleared") && "repair-receipt",
    ].filter(Boolean) as string[],
    pursuedFalseLeads: [flagged("case.accused-repair-shop") && "repair-receipt"].filter(
      Boolean,
    ) as string[],
    verifiedIndependently: flagged("police.has-carrier-log") || flagged("branch.has-statement"),
    recoverySteps: flagged("police.formal-report-lodged") ? ["police-report"] : [],
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  clearSave();
  resetGame("ten-minute-window");
});

describe("the winning playthrough", () => {
  it("runs office to debrief and earns the top outcome", () => {
    // Scene 1 — the office. Mara phones in; nothing changes hands on a call.
    expect(speak("mara-call", "give_evidence", { evidence: "otp-message" }).ok).toBe(false);
    setFlag("case.opened", true);
    expect(getGameState().evidence).toHaveLength(0);

    // Scene 2 — the flat. Two documents are picked up by hand, two are handed
    // over by Mara once the detective earns them.
    giveEvidence("bank-statement");
    giveEvidence("delivery-notice");
    expect(speak("mara", "give_evidence", { evidence: "call-log" }).ok).toBe(true);
    expect(speak("mara", "give_evidence", { evidence: "otp-message" }).ok).toBe(true);
    expect(getGameState().evidence).toHaveLength(4);

    // Scene 3 — the bank. A vague demand is refused; the money is still moving.
    const vague = speak("vance", "authorize_freeze");
    expect(vague.ok).toBe(false);
    expect(getGameState().flags["branch.emergency-freeze-applied"]).toBeUndefined();

    // The detective states the chain. Now it lands.
    const freeze = speak("vance", "authorize_freeze", {
      grounds: "OTP issued 22:01, used 22:03, obtained on a spoofed call at 21:47.",
    });
    expect(freeze.ok).toBe(true);
    expect(getGameState().flags["branch.emergency-freeze-applied"]).toBe(true);
    setFlag("branch.has-statement", true);

    // Scene 4 — the repair shop. Ravi is cleared, not accused.
    expect(speak("ravi", "give_evidence", { evidence: "repair-receipt" }).ok).toBe(true);
    expect(speak("ravi", "clear_lead", { lead: "repair-shop" }).ok).toBe(true);
    expect(speak("mara", "clear_lead", { lead: "delivery" }).ok).toBe(true);
    expect(getGameState().flags["case.accused-repair-shop"]).toBeUndefined();

    // Scene 5 — the station. The carrier log arrives, the report is filed.
    expect(speak("brennan", "give_evidence", { evidence: "sim-swap-record" }).ok).toBe(true);
    const report = speak("brennan", "lodge_report", { summary: "Spoofed call, OTP, transfer, hold." });
    expect(report.ok).toBe(true);
    expect(report.ends).toBe(true);

    // The board connects what was collected.
    openCaseBoard();

    // Act 3 — the debrief.
    expect(resolveCase(tenMinuteWindowCase, "funds-recovered")).toBe(true);
    const grade = gradeCase(buildRun());

    expect(grade.outcome).toBe("funds-recovered");
    expect(grade.headline).toBe("Stopped it inside the window.");
    expect(grade.passed).toBe(true);
    expect(grade.score).toBeGreaterThanOrEqual(90);
    expect(getGameState().evidence).toHaveLength(6);
    expect(buildRun().dismissedFalseLeads).toHaveLength(2);
    expect(buildRun().pursuedFalseLeads).toHaveLength(0);
  });
});

describe("the losing playthroughs", () => {
  it("accusing Ravi ends the case as the wrong suspect", () => {
    giveEvidence("repair-receipt");
    expect(speak("ravi", "accuse_suspect", { suspect: "ravi" }).ok).toBe(true);
    expect(resolveCase(tenMinuteWindowCase, "wrong-suspect")).toBe(true);

    const grade = gradeCase(buildRun());
    expect(grade.outcome).toBe("wrong-suspect");
    expect(grade.passed).toBe(false);
  });

  it("turning on the bank costs the freeze entirely", () => {
    for (const id of ["bank-statement", "call-log", "otp-message"]) giveEvidence(id);
    expect(speak("mara", "accuse_suspect", { suspect: "vance" }).ok).toBe(true);
    expect(
      speak("vance", "authorize_freeze", {
        grounds: "OTP issued 22:01 and used 22:03 after a spoofed call at 21:47.",
      }).ok,
    ).toBe(false);
    expect(resolveCase(tenMinuteWindowCase, "genuine-turned-away")).toBe(true);
    expect(gradeCase(buildRun()).outcome).toBe("genuine-turned-away");
  });

  it("running out of clock refuses the freeze but still allows a report", () => {
    for (const id of ["bank-statement", "call-log", "otp-message"]) giveEvidence(id);
    setFlag("branch.window-expired", true);

    expect(
      speak("vance", "authorize_freeze", {
        grounds: "OTP issued 22:01 and used 22:03 after a spoofed call at 21:47.",
      }).ok,
    ).toBe(false);
    expect(
      speak("brennan", "lodge_report", {
        summary: "Spoofed call at 21:47, OTP at 22:01, transfer of 4,80,000 at 22:03.",
      }).ok,
    ).toBe(true);

    openCaseBoard();
    expect(resolveCase(tenMinuteWindowCase, "partial-recovery")).toBe(true);
    const grade = gradeCase(buildRun());
    expect(grade.outcome).toBe("partial-recovery");
    expect(grade.score).toBeGreaterThan(50);
  });
});
