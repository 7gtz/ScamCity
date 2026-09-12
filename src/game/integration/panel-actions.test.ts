import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { CaseDefinition } from "@/game/case/types";
import type { Hotspot } from "@/game/world/types";
import { activateHotspot, collectEvidence, createCallCompletion, resolveCase } from "./panel-actions";
import { getGameState, on, resetGame, setFlag } from "./game";
import { panels, getPanel } from "./panel-registry";
import { clearSave } from "@/game/state/save";

beforeEach(() => { vi.useFakeTimers(); resetGame(); });
afterEach(() => { clearSave(); vi.useRealTimers(); });

it("checks hotspot and destination conditions before invoking hosts", () => {
  const handlers = { talk: vi.fn(), inspect: vi.fn(), travel: vi.fn() };
  const hotspot: Hotspot = { id: "door", label: "Bank", rect: { x: 0, y: 0, w: 10, h: 10 }, action: { kind: "travel", to: "bank-branch" }, requires: { flag: "ready" } };
  expect(activateHotspot(hotspot, panels, handlers)).toBe(false);
  setFlag("ready", true);
  const gated = panels.map((panel) => panel.id === "bank-branch" ? { ...panel, requires: { flag: "verified" } } : panel);
  expect(activateHotspot(hotspot, gated, handlers)).toBe(false);
  setFlag("verified", true);
  expect(activateHotspot(hotspot, gated, handlers)).toBe(true);
  expect(handlers.travel).toHaveBeenCalledWith("bank-branch");
  expect(getGameState().location).toBe("bank-branch");
  expect(activateHotspot({ ...hotspot, action: { kind: "inspect", evidence: "phone" } }, panels, handlers)).toBe(true);
  expect(handlers.inspect).toHaveBeenCalledWith("phone");
  expect(getGameState().evidence).toEqual([]);
  activateHotspot({ ...hotspot, action: { kind: "talk", npc: "victim" } }, panels, handlers);
  expect(handlers.talk).toHaveBeenCalledWith("victim");
});

it("maps call results once without coupling to the call room", () => {
  const complete = createCallCompletion((verified: boolean) => [{ setFlag: "victim.verified", to: verified }, { stress: 10 }]);
  complete(true); complete(false);
  expect(getGameState()).toMatchObject({ flags: { "victim.verified": true }, stress: 10 });
});

const outcome = { requires: { flag: "verified" }, debrief: "Authored ending" };
const caseDefinition: CaseDefinition = {
  id: "ten-minute-window", title: "Test case", locations: ["office"], dialogue: {}, deductions: [],
  evidence: [{ id: "phone", title: "Phone", kind: "log", lines: [] }],
  outcomes: { "funds-recovered": outcome, "partial-recovery": outcome, "case-unsolved": outcome, "wrong-suspect": outcome, "genuine-turned-away": outcome },
};

it("only collects evidence belonging to the active case", () => {
  expect(collectEvidence(caseDefinition, "unknown")).toBe(false);
  expect(collectEvidence({ ...caseDefinition, id: "other" }, "phone")).toBe(false);
  expect(collectEvidence(caseDefinition, "phone")).toBe(true);
  expect(getGameState().evidence).toEqual(["phone"]);
});

it("resolves once only after an authored outcome condition passes", () => {
  const listener = vi.fn(); const off = on("case-resolved", listener);
  try {
    expect(resolveCase(caseDefinition, "funds-recovered")).toBe(false);
    setFlag("verified", true);
    expect(resolveCase(caseDefinition, "funds-recovered")).toBe(true);
    expect(resolveCase(caseDefinition, "partial-recovery")).toBe(false);
    expect(listener).toHaveBeenCalledExactlyOnceWith({ type: "case-resolved", outcome: "funds-recovered" });
    expect(getGameState().flags["case.outcome"]).toBe("funds-recovered");
  } finally { off(); }
});

it("provides exactly five distinct static destinations and rejects unknown ids", () => {
  expect(new Set(panels.map((panel) => panel.id)).size).toBe(5);
  expect(getPanel("unknown")).toBeUndefined();
});
