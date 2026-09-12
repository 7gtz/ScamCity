import { beforeEach, expect, it } from "vitest";
import { tenMinuteWindowCase as caseDef } from "@/content/cases/ten-minute-window";
import { getGameState, giveEvidence, resetGame, setFlag } from "../game";
import { submitDeduction } from "../deductions";

beforeEach(() => resetGame());
it("holding evidence and reading proposals does not solve the board", () => {
  caseDef.evidence.forEach((item) => giveEvidence(item.id));
  expect(caseDef.deductions.length).toBeGreaterThan(0);
  expect(getGameState().flags[caseDef.deductions[0]!.unlocksFlag]).toBeUndefined();
});
it("only a valid, explicit held-evidence connection unlocks a conclusion once", () => {
  const deduction = caseDef.deductions[0]!;
  expect(submitDeduction(caseDef, deduction.id, deduction.from).status).toBe("invalid");
  deduction.from.forEach(giveEvidence);
  expect(submitDeduction(caseDef, deduction.id, [deduction.from[0]!]).status).toBe("invalid");
  expect(submitDeduction(caseDef, deduction.id, deduction.from).status).toBe("verified");
  expect(getGameState().flags[deduction.unlocksFlag]).toBe(true);
  expect(submitDeduction(caseDef, deduction.id, deduction.from).status).toBe("already-verified");
});
it("rejects invented conclusions and cannot rewrite a decided case", () => {
  expect(submitDeduction(caseDef, "invented", []).status).toBe("invalid");
  const deduction = caseDef.deductions[0]!;
  deduction.from.forEach(giveEvidence);
  setFlag("case.outcome", "case-unsolved");
  expect(submitDeduction(caseDef, deduction.id, deduction.from).status).toBe("resolved");
  expect(getGameState().flags[deduction.unlocksFlag]).toBeUndefined();
});
