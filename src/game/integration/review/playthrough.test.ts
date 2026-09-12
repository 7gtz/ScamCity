import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getGameState, resetGame, setFlag, giveEvidence, applyEffects } from "../game";
import { panels, getPanel } from "../panel-registry";
import { activateHotspot, collectEvidence, resolveCase, createCallCompletion } from "../panel-actions";
import {
  tenMinuteWindowCase,
  TEN_MINUTE_DIALOGUE,
  NPC_DIALOGUE_ENTRY,
} from "@/content/cases/ten-minute-window";
import { advanceDialogue, getVisibleChoices } from "@/game/dialogue/engine";
import { checkDeductions } from "@/game/case/verify";
import { gradeCase, type CaseRun } from "@/game/debrief/grade-case";
import { phraseHint } from "@/game/ai/hints";
import { clearSave, save, load, flushSave } from "@/game/state/save";

describe("Playthrough verification — 5 required acceptance criteria", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
      removeItem: vi.fn((key: string) => { values.delete(key); }),
    });
    resetGame("ten-minute-window");
  });

  afterEach(() => {
    clearSave();
    vi.unstubAllGlobals();
  });

  it("1. End-to-end: map -> panel -> talk -> evidence -> board -> deduction -> resolve -> debrief", () => {
    const handlers = {
      talk: vi.fn(),
      inspect: vi.fn(),
      travel: vi.fn(),
    };

    // Step A: Start at Office
    expect(getGameState().location).toBe("office");
    const officePanel = getPanel("office")!;
    const deskHotspot = officePanel.hotspots.find((h) => h.id === "office-desk")!;
    activateHotspot(deskHotspot, panels, handlers);
    expect(handlers.talk).toHaveBeenCalledWith("detective");

    // Start dialogue at mapped node
    const startNode = NPC_DIALOGUE_ENTRY["detective"]!;
    expect(startNode).toBe("office-start");
    let stateSlice = { flags: getGameState().flags, evidence: getGameState().evidence };
    let choices = getVisibleChoices(TEN_MINUTE_DIALOGUE[startNode]!, stateSlice);
    expect(choices.length).toBeGreaterThan(0);

    // Step B: Travel to Victim Flat
    const doorHotspot = officePanel.hotspots.find((h) => h.id === "office-door")!;
    activateHotspot(doorHotspot, panels, handlers);
    expect(getGameState().location).toBe("victim-flat");

    // Step C: Interview Mara Okoye
    const flatPanel = getPanel("victim-flat")!;
    const maraHotspot = flatPanel.hotspots.find((h) => h.id === "flat-mara")!;
    activateHotspot(maraHotspot, panels, handlers);
    expect(handlers.talk).toHaveBeenCalledWith("mara-okoye");

    const maraEntry = NPC_DIALOGUE_ENTRY["mara-okoye"]!;
    expect(maraEntry).toBe("victim-interview-start");
    stateSlice = { flags: getGameState().flags, evidence: getGameState().evidence };
    choices = getVisibleChoices(TEN_MINUTE_DIALOGUE[maraEntry]!, stateSlice);
    expect(choices.some((c) => c.next === "victim-check-phone")).toBe(true);

    // Mara hands over phone & OTP
    const phoneNode = TEN_MINUTE_DIALOGUE["victim-check-phone"]!;
    choices = getVisibleChoices(phoneNode, stateSlice);
    const takeLogChoice = choices.find((c) => c.id === "c-vic-take-call-log")!;
    applyEffects(takeLogChoice.effects!);
    expect(getGameState().evidence).toContain("call-log");

    const smsNode = TEN_MINUTE_DIALOGUE["victim-check-sms"]!;
    choices = getVisibleChoices(smsNode, stateSlice);
    const takeOtpChoice = choices.find((c) => c.id === "c-vic-take-otp")!;
    applyEffects(takeOtpChoice.effects!);
    expect(getGameState().evidence).toContain("otp-message");

    // Inspect items in flat: bank-statement and delivery-notice
    const statementHotspot = flatPanel.hotspots.find((h) => h.id === "flat-kitchen-table")!;
    activateHotspot(statementHotspot, panels, handlers);
    collectEvidence(tenMinuteWindowCase, statementHotspot.action.kind === "inspect" ? statementHotspot.action.evidence : "");
    expect(getGameState().evidence).toContain("bank-statement");

    const mailHotspot = flatPanel.hotspots.find((h) => h.id === "flat-mail-slot")!;
    activateHotspot(mailHotspot, panels, handlers);
    collectEvidence(tenMinuteWindowCase, mailHotspot.action.kind === "inspect" ? mailHotspot.action.evidence : "");
    expect(getGameState().evidence).toContain("delivery-notice");

    // Step D: Travel to Repair Shop & Police Station
    const repairPanel = getPanel("repair-shop")!;
    const repairReceiptHotspot = repairPanel.hotspots.find((h) => h.id === "shop-workbench")!;
    activateHotspot(repairReceiptHotspot, panels, handlers);
    collectEvidence(tenMinuteWindowCase, "repair-receipt");
    expect(getGameState().evidence).toContain("repair-receipt");

    const simRackHotspot = repairPanel.hotspots.find((h) => h.id === "shop-sim-rack")!;
    activateHotspot(simRackHotspot, panels, handlers);
    collectEvidence(tenMinuteWindowCase, "sim-swap-record");
    expect(getGameState().evidence).toContain("sim-swap-record");

    // Step E: Verify Case Board Deductions
    const currentState = getGameState();
    const unlocked = checkDeductions(tenMinuteWindowCase.deductions, currentState.evidence, currentState.flags);
    expect(unlocked.length).toBe(5);
    for (const d of unlocked) {
      setFlag(d.unlocksFlag, true);
    }
    expect(getGameState().flags["deduction.freeze-authorization-ready"]).toBe(true);

    // Step F: Present verified deduction at Bank Branch
    const bankPanel = getPanel("bank-branch")!;
    const tellerHotspot = bankPanel.hotspots.find((h) => h.id === "bank-counter")!;
    activateHotspot(tellerHotspot, panels, handlers);
    expect(handlers.talk).toHaveBeenCalledWith("teller-vance");

    const freezeNode = TEN_MINUTE_DIALOGUE["bank-freeze-request"]!;
    stateSlice = { flags: getGameState().flags, evidence: getGameState().evidence };
    choices = getVisibleChoices(freezeNode, stateSlice);
    const presentProofChoice = choices.find((c) => c.id === "c-bnk-present-deduction")!;
    expect(presentProofChoice).toBeDefined();

    const freezeSuccessNode = TEN_MINUTE_DIALOGUE["bank-freeze-success"]!;
    const confirmFreezeChoice = freezeSuccessNode.choices[0]!;
    applyEffects(confirmFreezeChoice.effects!);
    expect(getGameState().flags["branch.emergency-freeze-applied"]).toBe(true);

    // Step G: Resolve case -> funds-recovered
    const resolved = resolveCase(tenMinuteWindowCase, "funds-recovered");
    expect(resolved).toBe(true);
    expect(getGameState().flags["case.outcome"]).toBe("funds-recovered");

    // Step H: Debrief evaluation
    const run: CaseRun = {
      caseId: "ten-minute-window",
      outcome: "funds-recovered",
      evidence: getGameState().evidence,
      deductions: unlocked.map((d) => d.id),
      dismissedFalseLeads: ["delivery-notice", "repair-receipt"],
      pursuedFalseLeads: [],
      verifiedIndependently: true,
      recoverySteps: [],
    };
    const grade = gradeCase(run);
    expect(grade.passed).toBe(true);
    expect(grade.score).toBeGreaterThanOrEqual(70);
    expect(grade.headline).toBe("Stopped it inside the window.");
  });

  it("2. Offline and no API key: hint resolves immediately with authored fallback", async () => {
    delete process.env.GEMINI_API_KEY;
    const hint = await phraseHint("evidence-uncombined");
    expect(hint.situation).toBe("evidence-uncombined");
    expect(hint.text).toContain("Two of those documents disagree");
  });

  it("3. Mid-case save & reload restores location, flags, evidence, and board state", () => {
    setFlag("custom.step", "in-flight");
    giveEvidence("call-log");
    giveEvidence("otp-message");
    flushSave();

    // Reset memory
    resetGame("blank");
    expect(getGameState().evidence).toEqual([]);

    // Reload from storage
    const loaded = load();
    expect(loaded).not.toBeNull();
    expect(loaded?.flags["custom.step"]).toBe("in-flight");
    expect(loaded?.evidence).toContain("call-log");
    expect(loaded?.evidence).toContain("otp-message");
  });

  it("4. Failure paths route into lawful recovery without dead-ending", () => {
    // Branch A: Accusing Ravi Sunder (wrong-suspect)
    resetGame("ten-minute-window");
    const accuseChoice = TEN_MINUTE_DIALOGUE["repair-accuse-open"]!.choices.find(
      (c) => c.id === "c-rep-double-down",
    )!;
    applyEffects(accuseChoice.effects!);
    expect(getGameState().flags["case.accused-repair-shop"]).toBe(true);

    const resolvedWrong = resolveCase(tenMinuteWindowCase, "wrong-suspect");
    expect(resolvedWrong).toBe(true);

    const wrongGrade = gradeCase({
      caseId: "ten-minute-window",
      outcome: "wrong-suspect",
      evidence: ["repair-receipt"],
      deductions: [],
      dismissedFalseLeads: [],
      pursuedFalseLeads: ["repair-receipt"],
      verifiedIndependently: false,
      recoverySteps: [],
    });
    expect(wrongGrade.recovery.steps.length).toBeGreaterThan(0);
    expect(wrongGrade.recovery.steps[0]?.kind).toBeDefined();

    // Branch B: Alienating bank staff (genuine-turned-away)
    resetGame("ten-minute-window");
    const alienateChoice = TEN_MINUTE_DIALOGUE["bank-alienate-open"]!.choices.find(
      (c) => c.id === "c-bnk-commit-alienate",
    )!;
    applyEffects(alienateChoice.effects!);
    expect(getGameState().flags["case.alienated-bank-staff"]).toBe(true);

    const resolvedAlien = resolveCase(tenMinuteWindowCase, "genuine-turned-away");
    expect(resolvedAlien).toBe(true);

    const alienGrade = gradeCase({
      caseId: "ten-minute-window",
      outcome: "genuine-turned-away",
      evidence: [],
      deductions: [],
      dismissedFalseLeads: [],
      pursuedFalseLeads: [],
      verifiedIndependently: false,
      recoverySteps: [],
    });
    expect(alienGrade.recovery.steps.length).toBeGreaterThan(0);
    expect(alienGrade.recovery.closing).toBeDefined();
  });

  it("5. Live victim call simulation maps results to authored effects via createCallCompletion", () => {
    const onComplete = createCallCompletion((score: { passed: boolean; outcome: string }) => [
      { setFlag: "victim.live-call-completed", to: true },
      { setFlag: "victim.complied", to: !score.passed },
      { stress: score.passed ? 15 : 45 },
    ]);

    // Player fell for the scam call
    onComplete({ passed: false, outcome: "scammed" });
    expect(getGameState().flags["victim.live-call-completed"]).toBe(true);
    expect(getGameState().flags["victim.complied"]).toBe(true);
    expect(getGameState().stress).toBe(45);
  });
});
