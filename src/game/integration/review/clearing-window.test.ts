/**
 * Phase 1 — the clock is accurate across navigation, pause, reload and
 * resolution. Every case runs on a fake clock; nothing here reads the wall.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { load, clearSave, flushSave } from "@/game/state/save";
import { useGameStore } from "@/game/state/game-store";
import { getGameState, resetGame, setFlag, setTimer } from "../game";
import {
  CLEARING_WINDOW,
  formatWindow,
  freezeClearingWindow,
  hudTimer,
  isWindowClosing,
  openClearingWindow,
  pauseClearingWindow,
  resumeClearingWindow,
  windowStatus,
} from "../clearing-window";
import { start, configFor } from "@/game/pressure/timer";

const T0 = 1_700_000_000_000;
const at = (ms: number) => T0 + ms;

/** What a reload does: read the save back and rehydrate the store from it. */
function reload() {
  flushSave();
  const saved = load();
  if (saved) useGameStore.setState(saved);
  return saved;
}

beforeEach(() => {
  vi.useFakeTimers();
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
    removeItem: (k: string) => void storage.delete(k),
    clear: () => storage.clear(),
  });
  clearSave();
  resetGame("ten-minute-window");
});

describe("before the case opens", () => {
  it("has no clock at all, rather than a frozen full duration", () => {
    const status = windowStatus(getGameState(), at(0));
    expect(status.phase).toBe("not-started");
    expect(status.display).toBeNull();
    expect(status.secondsLeft).toBeNull();
  });

  it("reports not-started to the HUD", () => {
    expect(hudTimer(getGameState(), at(0))).toEqual({ status: "not-started" });
  });
});

describe("running", () => {
  it("counts down from the full duration after the grace period", () => {
    openClearingWindow(at(0));
    expect(windowStatus(getGameState(), at(3_000)).secondsLeft).toBe(600);
    expect(windowStatus(getGameState(), at(63_000)).secondsLeft).toBe(540);
  });

  it("cannot be restarted, so a second open does not hand out fresh time", () => {
    openClearingWindow(at(0));
    openClearingWindow(at(120_000));
    expect(windowStatus(getGameState(), at(123_000)).secondsLeft).toBe(480);
  });

  it("formats as MM:SS", () => {
    expect(formatWindow(600)).toBe("10:00");
    expect(formatWindow(65)).toBe("01:05");
    expect(formatWindow(0)).toBe("00:00");
  });
});

describe("pause and resume", () => {
  it("does not count paused time", () => {
    openClearingWindow(at(0));
    pauseClearingWindow(at(63_000)); // 540 left
    expect(windowStatus(getGameState(), at(400_000)).secondsLeft).toBe(540);
    resumeClearingWindow(at(400_000));
    expect(windowStatus(getGameState(), at(460_000)).secondsLeft).toBe(480);
  });

  it("survives navigation, which remounts the panel", () => {
    openClearingWindow(at(0));
    pauseClearingWindow(at(63_000));

    // Navigating used to rebuild the timer from a start timestamp, refunding
    // the pause entirely. The pause is persisted state, so it survives.
    const carried = getGameState();
    expect(carried.timer?.pausedAt).toBe(at(63_000));
    expect(windowStatus(carried, at(300_000)).secondsLeft).toBe(540);
  });

  it("survives a reload", () => {
    openClearingWindow(at(0));
    pauseClearingWindow(at(63_000));
    resumeClearingWindow(at(363_000)); // five minutes paused

    const saved = reload();
    expect(saved?.timer?.pausedTotalMs).toBe(300_000);
    expect(windowStatus(getGameState(), at(423_000)).secondsLeft).toBe(480);
  });

  it("treats a double pause as one pause", () => {
    openClearingWindow(at(0));
    pauseClearingWindow(at(63_000));
    pauseClearingWindow(at(120_000));
    expect(getGameState().timer?.pausedAt).toBe(at(63_000));
  });

  it("never expires while paused", () => {
    openClearingWindow(at(0));
    pauseClearingWindow(at(10_000));
    expect(windowStatus(getGameState(), at(999_000)).expired).toBe(false);
  });
});

describe("grace", () => {
  it("does not start counting during the settling period", () => {
    openClearingWindow(at(0));
    expect(windowStatus(getGameState(), at(0)).secondsLeft).toBe(600);
    expect(windowStatus(getGameState(), at(2_999)).secondsLeft).toBe(600);
    expect(CLEARING_WINDOW.graceMs).toBe(3_000);
  });
});

describe("expiry", () => {
  it("expires once the duration plus grace has passed", () => {
    openClearingWindow(at(0));
    expect(windowStatus(getGameState(), at(602_999)).expired).toBe(false);
    expect(windowStatus(getGameState(), at(603_001)).expired).toBe(true);
  });

  it("stays expired once the flag is written, whatever the clock says", () => {
    openClearingWindow(at(0));
    setFlag("branch.window-expired", true);
    expect(windowStatus(getGameState(), at(4_000)).expired).toBe(true);
  });
});

describe("a decided case", () => {
  it("stops the clock and reports as resolved", () => {
    openClearingWindow(at(0));
    setFlag("case.outcome", "funds-recovered");
    freezeClearingWindow(at(100_000));

    expect(windowStatus(getGameState(), at(100_000)).phase).toBe("resolved");
    // Time passing after the verdict changes nothing.
    expect(windowStatus(getGameState(), at(900_000)).secondsLeft).toBe(
      windowStatus(getGameState(), at(100_000)).secondsLeft,
    );
  });

  it("cannot be resumed", () => {
    openClearingWindow(at(0));
    setFlag("case.outcome", "wrong-suspect");
    freezeClearingWindow(at(100_000));
    resumeClearingWindow(at(200_000));
    expect(getGameState().timer?.pausedAt).toBe(at(100_000));
  });
});

describe("the untimed policy", () => {
  it("honours reduced motion, and such a case never expires", () => {
    openClearingWindow(at(0), true);
    const status = windowStatus(getGameState(), at(900_000));
    expect(status.untimed).toBe(true);
    expect(status.expired).toBe(false);
    expect(hudTimer(getGameState(), at(900_000))).toEqual({ status: "untimed" });
  });

  it("maps configFor the same way the panel does", () => {
    expect(configFor(CLEARING_WINDOW, true).untimed).toBe(true);
    expect(configFor(CLEARING_WINDOW, false).untimed).toBe(false);
  });
});

describe("hint urgency", () => {
  it("is closing inside the last two minutes", () => {
    openClearingWindow(at(0));
    expect(isWindowClosing(getGameState(), at(300_000))).toBe(false);
    expect(isWindowClosing(getGameState(), at(490_000))).toBe(true);
  });

  it("is never closing before the case opens", () => {
    expect(isWindowClosing(getGameState(), at(0))).toBe(false);
  });
});

describe("restart", () => {
  it("clears the clock, the outcome and every deduction together", () => {
    openClearingWindow(at(0));
    setFlag("deduction.otp-theft-established", true);
    setFlag("case.outcome", "funds-recovered");
    setFlag("victim.live-call-completed", true);
    setTimer(start(CLEARING_WINDOW, at(0)));

    resetGame("ten-minute-window");

    const fresh = getGameState();
    expect(fresh.timer).toBeNull();
    expect(fresh.flags).toEqual({});
    expect(fresh.evidence).toEqual([]);
    expect(windowStatus(fresh, at(900_000)).phase).toBe("not-started");
  });

  it("leaves nothing behind in the save", () => {
    openClearingWindow(at(0));
    setFlag("case.outcome", "funds-recovered");
    flushSave();
    clearSave();
    resetGame("ten-minute-window");
    expect(load()).toBeNull();
  });
});
