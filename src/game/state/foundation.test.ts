import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { evaluateCondition } from "./conditions";
import { createEventBus, on } from "./event-bus";
import { initialGameState, useGameStore } from "./game-store";
import { AUTOSAVE_DELAY_MS, clearSave, flushSave, load, save, SAVE_KEY, SAVE_VERSION } from "./save";
import { getGameState } from "@/game/integration/game";

beforeEach(() => {
  vi.useFakeTimers();
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
  });
  useGameStore.getState().resetGame();
  clearSave();
});

afterEach(() => { clearSave(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("conditions", () => {
  it("uses strict equality, treats missing/prototype flags as absent, and supports falsy facts", () => {
    const state = { flags: { no: false, zero: 0, blank: "", yes: "yes" }, evidence: [] };
    expect(evaluateCondition({ flag: "no" }, state)).toBe(false);
    expect(evaluateCondition({ flag: "no", is: false }, state)).toBe(true);
    expect(evaluateCondition({ flag: "zero", is: 0 }, state)).toBe(true);
    expect(evaluateCondition({ flag: "blank", is: "" }, state)).toBe(true);
    expect(evaluateCondition({ flag: "zero", is: "0" }, state)).toBe(false);
    expect(evaluateCondition({ flag: "missing", is: false }, state)).toBe(false);
    expect(evaluateCondition({ flag: "toString" }, state)).toBe(false);
  });

  it("evaluates nested evidence gates and empty conjunctions", () => {
    const state = { flags: { verified: true }, evidence: ["ledger"] };
    expect(evaluateCondition({ all: [{ hasEvidence: "ledger" }, { any: [{ flag: "verified" }, { flag: "other" }] }, { not: { hasEvidence: "phone" } }] }, state)).toBe(true);
    expect(evaluateCondition({ hasEvidence: "phone" }, state)).toBe(false);
    expect(evaluateCondition({ all: [] }, state)).toBe(true);
    expect(evaluateCondition({ any: [] }, state)).toBe(false);
  });
});

describe("events and state", () => {
  it("isolates failing subscribers, filters event types and supports cleanup", () => {
    const bus = createEventBus();
    const seen = vi.fn();
    bus.on("flag-set", () => { throw new Error("observer failure"); });
    const off = bus.on("flag-set", seen);
    expect(() => bus.emit({ type: "flag-set", id: "verified" })).not.toThrow();
    bus.emit({ type: "evidence-found", id: "ledger" });
    off();
    off();
    bus.emit({ type: "flag-set", id: "another" });
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("publishes after mutations and deduplicates evidence and unchanged flags", () => {
    const snapshots: string[][] = [];
    const evidenceOff = on("evidence-found", () => snapshots.push([...useGameStore.getState().evidence]));
    const flagListener = vi.fn();
    const flagOff = on("flag-set", flagListener);
    try {
      const actions = useGameStore.getState();
      actions.giveEvidence("phone"); actions.giveEvidence("phone"); actions.giveEvidence("ledger");
      actions.setFlag("verified", false); actions.setFlag("verified", false); actions.setFlag("verified", true);
      expect(snapshots).toEqual([["phone"], ["phone", "ledger"]]);
      expect(flagListener).toHaveBeenCalledTimes(2);
      expect(actions.hasFlag("verified")).toBe(true);
      expect(actions.hasFlag("constructor")).toBe(false);
    } finally { evidenceOff(); flagOff(); }
  });

  it("applies authored deltas, clamps pressure and rejects non-finite values", () => {
    const actions = useGameStore.getState();
    actions.applyEffects([{ setFlag: "interviewed", to: true }, { giveEvidence: "phone" }, { trust: "victim", by: 150 }, { stress: 120 }]);
    expect(getGameState()).toMatchObject({ flags: { interviewed: true }, evidence: ["phone"], trust: { victim: 100 }, stress: 100 });
    actions.changeTrust("victim", -500); actions.changeStress(-300);
    actions.changeStress(NaN); actions.changeTrust("victim", Infinity); actions.setFlag("bad", NaN);
    expect(getGameState()).toMatchObject({ trust: { victim: -100 }, stress: 0 });
    expect(actions.hasFlag("bad")).toBe(false);
  });

  it("returns detached snapshots and resets all persisted fields", () => {
    const actions = useGameStore.getState();
    actions.giveItem("badge"); actions.giveItem("badge");
    const state = getGameState(); state.inventory.push("fake"); state.flags.fake = true;
    expect(getGameState().inventory).toEqual(["badge"]);
    expect(actions.hasFlag("fake")).toBe(false);
    actions.removeItem("badge");
    expect(getGameState().inventory).toEqual([]);
    actions.enterPanel("bank-branch"); actions.resetGame();
    expect(getGameState()).toEqual(initialGameState());
  });
});

describe("autosave", () => {
  it("debounces into exactly one key and saves the latest snapshot", () => {
    useGameStore.getState().setFlag("step", 1);
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS - 1);
    expect(localStorage.setItem).not.toHaveBeenCalled();
    useGameStore.getState().setFlag("step", 2);
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
    expect(localStorage.setItem).toHaveBeenCalledTimes(1);
    expect(vi.mocked(localStorage.setItem).mock.calls[0]?.[0]).toBe(SAVE_KEY);
    expect(load()?.flags.step).toBe(2);
  });

  it("restores location, flags, board evidence, inventory, trust, stress and case on hydration", async () => {
    const saved = { ...initialGameState(), location: "bank-branch", flags: { deduction: true }, evidence: ["phone", "ledger"], inventory: ["badge"], trust: { victim: 30 }, stress: 25 };
    localStorage.setItem(SAVE_KEY, JSON.stringify({ state: saved, version: SAVE_VERSION }));
    await useGameStore.persist.rehydrate();
    expect(getGameState()).toEqual(saved);
    expect(useGameStore.getState().evaluate({ all: [{ flag: "deduction" }, { hasEvidence: "ledger" }] })).toBe(true);
    useGameStore.getState().setFlag("after-reload", true);
    save(); flushSave();
    expect(load()?.flags["after-reload"]).toBe(true);
  });

  it.each(["{", "null", "[]", "{}", JSON.stringify({ state: initialGameState(), version: 0 }), JSON.stringify({ state: { ...initialGameState(), version: 0 }, version: SAVE_VERSION }), JSON.stringify({ state: { ...initialGameState(), stress: 101 }, version: SAVE_VERSION }), JSON.stringify({ state: { ...initialGameState(), location: "unknown" }, version: SAVE_VERSION }), JSON.stringify({ state: { ...initialGameState(), evidence: ["a", "a"] }, version: SAVE_VERSION })])("rejects corrupt or obsolete saves: %s", (raw) => {
    localStorage.setItem(SAVE_KEY, raw);
    expect(load()).toBeNull();
  });

  it("never throws when storage reads or writes fail, or storage does not exist", () => {
    vi.mocked(localStorage.getItem).mockImplementation(() => { throw new Error("denied"); });
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error("quota"); });
    expect(load()).toBeNull();
    expect(() => { save(); flushSave(); }).not.toThrow();
    vi.stubGlobal("localStorage", undefined);
    expect(load()).toBeNull();
    expect(() => { save(); flushSave(); clearSave(); }).not.toThrow();
  });

  it("clearing a save cancels pending writes", () => {
    useGameStore.getState().setFlag("pending", true);
    clearSave(); vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
    expect(load()).toBeNull();
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });
});
