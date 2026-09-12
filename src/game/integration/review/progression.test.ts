import { expect, it } from "vitest";
import { initialGameState } from "@/game/state/game-store";
import { availableLocations, completedLocations, currentObjective, locationAccess } from "../progression";

it("starts at the office and gates every later direct route", () => {
  const state = initialGameState();
  expect(availableLocations(state)).toEqual(["office"]);
  expect(locationAccess("bank-branch", state).requirement).toContain("office");
  expect(currentObjective(state)).toContain("Open Mara");
});
it("unlocks through authored facts without clearing merely visited places", () => {
  const state = initialGameState();
  state.flags["case.opened"] = true;
  expect(availableLocations(state)).toEqual(["office", "victim-flat"]);
  state.evidence.push("bank-statement");
  expect(locationAccess("bank-branch", state).allowed).toBe(true);
  expect(locationAccess("repair-shop", state).allowed).toBe(false);
  state.flags["panel.visited.bank-branch"] = true;
  expect(locationAccess("repair-shop", state).allowed).toBe(true);
  expect(completedLocations(state)).not.toContain("bank-branch");
  state.evidence.push("sim-swap-record");
  expect(locationAccess("police-station", state).allowed).toBe(true);
});
it("completion survives backtracking and objectives require submitted deductions", () => {
  const state = initialGameState();
  state.flags["case.opened"] = true;
  state.evidence = ["bank-statement", "call-log", "otp-message"];
  expect(currentObjective(state)).toContain("Case Board");
  expect(completedLocations(state)).toContain("victim-flat");
  state.flags["panel.cleared.bank-branch"] = true;
  state.location = "office";
  expect(completedLocations(state)).toContain("bank-branch");
  state.flags["deduction.freeze-authorization-ready"] = true;
  expect(currentObjective(state)).toContain("emergency freeze");
});
