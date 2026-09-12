import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIMER,
  configFor,
  elapsedMs,
  isExpired,
  isUrgent,
  pause,
  progress,
  remainingMs,
  resume,
  secondsLeft,
  start,
  untimed,
} from "@/game/pressure/timer";
import {
  applyStress,
  applyTrust,
  clampStress,
  clampTrust,
  decayStress,
  shouldOfferHint,
  stressBand,
  trustBand,
} from "@/game/pressure/stress";

const cfg = { durationMs: 60_000, graceMs: 3_000, untimed: false };

describe("timed decision — fairness", () => {
  it("does not start counting during the grace window", () => {
    const t = start(cfg, 0);
    expect(elapsedMs(t, 2_999)).toBe(0);
    expect(remainingMs(t, 2_999)).toBe(60_000);
    expect(elapsedMs(t, 5_000)).toBe(2_000);
  });

  it("never expires while paused, and does not count paused time", () => {
    let t = start(cfg, 0);
    t = pause(t, 10_000); // 7s of thinking used
    expect(isExpired(t, 10_000_000)).toBe(false);
    expect(remainingMs(t, 10_000_000)).toBe(53_000);
  });

  it("ignores a second pause, so a double keypress cannot bank free time", () => {
    let t = start(cfg, 0);
    t = pause(t, 10_000);
    const again = pause(t, 20_000);
    expect(again).toBe(t);
  });

  it("resumes without crediting the pause back as thinking time", () => {
    let t = start(cfg, 0);
    t = pause(t, 10_000);
    t = resume(t, 40_000); // 30s paused
    expect(remainingMs(t, 40_000)).toBe(53_000);
    expect(remainingMs(t, 50_000)).toBe(43_000);
  });

  it("expires exactly once the duration is used up", () => {
    const t = start(cfg, 0);
    expect(isExpired(t, 62_999)).toBe(false);
    expect(isExpired(t, 63_000)).toBe(true);
  });

  it("rounds the readout up, so a '0' is never shown while the player can still act", () => {
    const t = start(cfg, 0);
    expect(secondsLeft(t, 62_500)).toBe(1);
    expect(secondsLeft(t, 63_000)).toBe(0);
  });

  it("clamps progress to 0..1", () => {
    const t = start(cfg, 0);
    expect(progress(t, 0)).toBe(0);
    expect(progress(t, 33_000)).toBeCloseTo(0.5, 5);
    expect(progress(t, 999_999)).toBe(1);
  });

  it("warns late enough to be fair and early enough to matter", () => {
    const t = start(cfg, 0);
    expect(isUrgent(t, 3_000)).toBe(false);
    expect(isUrgent(t, 56_000)).toBe(true);
    expect(isUrgent(t, 63_000)).toBe(false); // expired is not urgent
  });
});

describe("timed decision — untimed mode", () => {
  it("never expires and never reads as urgent", () => {
    const t = start(untimed(cfg), 0);
    expect(isExpired(t, 10_000_000)).toBe(false);
    expect(isUrgent(t, 10_000_000)).toBe(false);
    expect(remainingMs(t, 10_000_000)).toBe(60_000);
    expect(progress(t, 10_000_000)).toBe(0);
  });

  it("prefers-reduced-motion produces the untimed config", () => {
    expect(configFor(DEFAULT_TIMER, true).untimed).toBe(true);
    expect(configFor(DEFAULT_TIMER, false).untimed).toBe(false);
  });
});

describe("trust and stress curves", () => {
  it("clamps to the ranges GameState documents", () => {
    expect(clampTrust(999)).toBe(100);
    expect(clampTrust(-999)).toBe(-100);
    expect(clampStress(999)).toBe(100);
    expect(clampStress(-1)).toBe(0);
  });

  it("loses trust faster than it gains it", () => {
    const gained = applyTrust(0, 20) - 0;
    const lost = 0 - applyTrust(0, -20);
    expect(lost).toBeGreaterThan(gained);
  });

  it("never lets one line slam stress to the ceiling", () => {
    expect(applyStress(0, 100)).toBeLessThan(100);
    expect(applyStress(95, 100)).toBeLessThanOrEqual(100);
  });

  it("lets relief land in full, so a player can always calm things down", () => {
    expect(applyStress(50, -20)).toBe(30);
  });

  it("decays stress over time and never below zero", () => {
    expect(decayStress(50, 60_000)).toBe(42);
    expect(decayStress(2, 600_000)).toBe(0);
  });

  it("bands the curves", () => {
    expect(stressBand(10)).toBe("calm");
    expect(stressBand(50)).toBe("pressed");
    expect(stressBand(80)).toBe("rattled");
    expect(trustBand(50)).toBe("cooperative");
    expect(trustBand(0)).toBe("wary");
    expect(trustBand(-50)).toBe("hostile");
  });

  it("offers help sooner to a rattled player — asking early is the lesson", () => {
    expect(shouldOfferHint(80, 50_000)).toBe(true);
    expect(shouldOfferHint(10, 50_000)).toBe(false);
    expect(shouldOfferHint(10, 130_000)).toBe(true);
  });
});
