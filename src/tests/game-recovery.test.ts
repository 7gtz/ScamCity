import { describe, expect, it } from "vitest";
import type { CaseOutcome } from "@/game/case/types";
import { RECOVERY_WORKFLOWS, hasRecoveryPath, kindsCovered, workflowFor } from "@/game/recovery/workflows";
import { CASE_BASE, gradeCase, type CaseRun } from "@/game/debrief/grade-case";
import { PASS_THRESHOLD } from "@/features/scoring/mock-judge";

const OUTCOMES: CaseOutcome[] = [
  "funds-recovered",
  "partial-recovery",
  "case-unsolved",
  "wrong-suspect",
  "genuine-turned-away",
];

const run = (over: Partial<CaseRun> = {}): CaseRun => ({
  caseId: "ten-minute-window",
  outcome: "case-unsolved",
  evidence: [],
  deductions: [],
  dismissedFalseLeads: [],
  pursuedFalseLeads: [],
  verifiedIndependently: false,
  recoverySteps: [],
  ...over,
});

describe("recovery — failure never dead-ends", () => {
  it("every outcome has a workflow with at least one step", () => {
    for (const outcome of OUTCOMES) {
      expect(hasRecoveryPath(outcome)).toBe(true);
      expect(workflowFor(outcome).steps.length).toBeGreaterThan(0);
    }
  });

  it("covers every outcome in the union, so a new ending cannot be forgotten", () => {
    expect(Object.keys(RECOVERY_WORKFLOWS).sort()).toEqual([...OUTCOMES].sort());
  });

  it("the losing outcomes get the full lawful sequence", () => {
    for (const outcome of ["partial-recovery", "case-unsolved", "wrong-suspect"] as CaseOutcome[]) {
      const kinds = kindsCovered(outcome);
      expect(kinds).toContain("preserve");
      expect(kinds).toContain("official-channel");
      expect(kinds).toContain("report");
    }
  });

  it("teaches independent verification after a false alarm", () => {
    expect(kindsCovered("genuine-turned-away")).toContain("verify");
  });

  it("every step is lawful and non-operational", () => {
    // §11: no working scripts, no bypasses, no evasion, no money movement.
    const banned = /\b(bypass|evade|evasion|untraceable|launder|wire the|transfer the money|hack|exploit|spoof|VPN|burner)\b/i;
    for (const outcome of OUTCOMES) {
      const w = workflowFor(outcome);
      for (const text of [w.opening, w.closing, ...w.steps.flatMap((s) => [s.title, s.detail])]) {
        expect(text).not.toMatch(banned);
      }
    }
  });

  it("never blames the player in the opening line", () => {
    for (const outcome of OUTCOMES) {
      expect(workflowFor(outcome).opening).not.toMatch(/\byou should have\b|\bstupid\b|\byour fault\b/i);
    }
  });
});

describe("case grading — deterministic and AI-free", () => {
  it("is a pure function of the run", () => {
    const r = run({ outcome: "funds-recovered", evidence: ["a", "b"], deductions: ["d1"] });
    expect(gradeCase(r)).toEqual(gradeCase(r));
  });

  it("the breakdown always adds up to the score", () => {
    const g = gradeCase(run({ outcome: "partial-recovery", evidence: ["a"], deductions: ["d1"], verifiedIndependently: true }));
    const sum = g.breakdown.base + g.breakdown.items.reduce((n, i) => n + i.points, 0);
    expect(g.score).toBe(Math.max(0, Math.min(100, sum)));
    expect(g.breakdown.base).toBe(CASE_BASE);
  });

  it("uses the existing pass mark rather than inventing one", () => {
    expect(gradeCase(run()).threshold).toBe(PASS_THRESHOLD);
  });

  it("attaches a recovery workflow to every grade, winning or losing", () => {
    for (const outcome of OUTCOMES) {
      expect(gradeCase(run({ outcome })).recovery.steps.length).toBeGreaterThan(0);
    }
  });

  it("clamps to 0..100", () => {
    const best = gradeCase(run({
      outcome: "funds-recovered",
      evidence: ["a", "b", "c", "d", "e"],
      deductions: ["d1", "d2", "d3", "d4"],
      dismissedFalseLeads: ["f1", "f2", "f3"],
      verifiedIndependently: true,
      recoverySteps: ["s1", "s2", "s3", "s4", "s5"],
    }));
    expect(best.score).toBeLessThanOrEqual(100);
    expect(best.score).toBeGreaterThanOrEqual(0);
  });
});

describe("case grading — §11 does not reward paranoia", () => {
  it("penalises turning away something genuine at least as hard as any other ending", () => {
    const falseAlarm = gradeCase(run({ outcome: "genuine-turned-away" })).score;
    for (const outcome of OUTCOMES) {
      expect(falseAlarm).toBeLessThanOrEqual(gradeCase(run({ outcome })).score);
    }
  });

  it("a hoard of evidence cannot buy back a false alarm", () => {
    const g = gradeCase(run({
      outcome: "genuine-turned-away",
      evidence: ["a", "b", "c", "d", "e"],
      deductions: ["d1", "d2"],
    }));
    expect(g.passed).toBe(false);
    expect(g.notes.join(" ")).toMatch(/verify before you decide/i);
  });

  it("agrees with freestyle-store: a false alarm is a real mistake, not a neutral outcome", () => {
    expect(gradeCase(run({ outcome: "genuine-turned-away" })).score).toBeLessThan(CASE_BASE);
  });
});

describe("case grading — rewards reasoning over luck", () => {
  it("scores a reasoned run above a lucky one with the same ending", () => {
    const reasoned = gradeCase(run({ outcome: "funds-recovered", deductions: ["d1", "d2"], verifiedIndependently: true }));
    const lucky = gradeCase(run({ outcome: "funds-recovered" }));
    expect(reasoned.score).toBeGreaterThan(lucky.score);
  });

  it("scores connecting evidence above merely holding it", () => {
    const connected = gradeCase(run({ evidence: ["a", "b"], deductions: ["d1"] }));
    const hoarded = gradeCase(run({ evidence: ["a", "b", "c", "d"] }));
    expect(connected.score).toBeGreaterThan(hoarded.score);
  });

  it("credits ruling out a false lead", () => {
    expect(gradeCase(run({ dismissedFalseLeads: ["f1"] })).score).toBeGreaterThan(gradeCase(run()).score);
  });

  it("nudges a player who is carrying evidence but not using it", () => {
    expect(gradeCase(run({ evidence: ["a", "b", "c"] })).notes.join(" ")).toMatch(/case board is where they meet/i);
  });
});
