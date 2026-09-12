/**
 * Phase 1 — the first completed call is canonical, and replay is practice.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Effect } from "@/game/dialogue/types";
import { clearSave } from "@/game/state/save";
import { useGameStore } from "@/game/state/game-store";
import { getGameState, resetGame } from "../game";
import { CALL_SCORED_FLAG, createCallCompletion, hasScoredCall } from "../panel-actions";

interface Result {
  complied: boolean;
}

/** The mapping the panel uses, condensed to what the assertions need. */
const mapResult = (result: Result): Effect[] => [
  { setFlag: "victim.complied", to: result.complied },
  { setFlag: "victim.called-bank-back", to: !result.complied },
  { stress: result.complied ? 40 : 15 },
];

beforeEach(() => {
  vi.useFakeTimers();
  clearSave();
  resetGame("ten-minute-window");
});

describe("the first call", () => {
  it("writes the case flags and charges the stress", () => {
    createCallCompletion(mapResult)({ complied: false });

    const state = getGameState();
    expect(state.flags["victim.called-bank-back"]).toBe(true);
    expect(state.flags["victim.complied"]).toBe(false);
    expect(state.stress).toBe(15);
    expect(hasScoredCall()).toBe(true);
  });
});

describe("replay", () => {
  it("cannot rewrite the canonical result", () => {
    createCallCompletion(mapResult)({ complied: false });

    // "Replay Call" — a different outcome, a fresh callback.
    createCallCompletion(mapResult)({ complied: true });

    const state = getGameState();
    expect(state.flags["victim.complied"]).toBe(false);
    expect(state.flags["victim.called-bank-back"]).toBe(true);
  });

  it("cannot charge the stress again", () => {
    createCallCompletion(mapResult)({ complied: true });
    expect(getGameState().stress).toBe(40);

    createCallCompletion(mapResult)({ complied: true });
    createCallCompletion(mapResult)({ complied: true });
    expect(getGameState().stress).toBe(40);
  });

  it("survives the remount that used to reset idempotence", () => {
    createCallCompletion(mapResult)({ complied: false });

    // Idempotence used to live in a closure, so a remount produced a fresh one
    // and the second call landed. It is persisted state now.
    const carried = getGameState();
    useGameStore.setState(carried);

    createCallCompletion(mapResult)({ complied: true });
    expect(getGameState().flags["victim.complied"]).toBe(false);
    expect(getGameState().stress).toBe(15);
  });

  it("is reported to the UI so a replay can be labelled as practice", () => {
    expect(hasScoredCall()).toBe(false);
    createCallCompletion(mapResult)({ complied: false });
    expect(hasScoredCall()).toBe(true);
    expect(getGameState().flags[CALL_SCORED_FLAG]).toBe(true);
  });

  it("is scorable again only after a restart", () => {
    createCallCompletion(mapResult)({ complied: true });
    resetGame("ten-minute-window");
    expect(hasScoredCall()).toBe(false);

    createCallCompletion(mapResult)({ complied: false });
    expect(getGameState().flags["victim.complied"]).toBe(false);
  });
});
