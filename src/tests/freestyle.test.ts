import { describe, expect, it } from "vitest";
import { gradeDecision } from "@/features/encounters/grade";
import { FIRST_RANGE, firstDelay, nextDelay, PACES, pickEncounter } from "@/features/freestyle/schedule";
import { FALLBACK_EMAILS, FALLBACK_SITES } from "@/content/fallback-encounters";
import { GeneratedEmailSchema, GeneratedSiteSchema } from "@/lib/validation/schemas";

/** Deterministic sequence of "random" numbers. */
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

describe("freestyle schedule", () => {
  it("always places the first encounter under 20 seconds", () => {
    for (const r of [0, 0.5, 0.999999]) {
      const d = firstDelay(() => r);
      expect(d).toBeGreaterThanOrEqual(FIRST_RANGE[0]);
      expect(d).toBeLessThan(20_000);
    }
  });

  it("keeps later encounters inside the chosen pace", () => {
    for (const pace of Object.keys(PACES) as (keyof typeof PACES)[]) {
      const [min, max] = PACES[pace].range;
      for (const r of [0, 0.3, 0.999]) {
        const d = nextDelay(pace, () => r);
        expect(d).toBeGreaterThanOrEqual(min);
        expect(d).toBeLessThanOrEqual(max);
      }
    }
  });

  it("mixes every channel and both scams and genuine encounters", () => {
    const channels = new Set<string>();
    let legit = 0;
    for (let i = 0; i < 400; i++) {
      const e = pickEncounter(9);
      channels.add(e.channel);
      if (e.legit) legit++;
      if (e.channel === "call") expect(e.scenarioId).toBeDefined();
    }
    expect([...channels].sort()).toEqual(["call", "email", "sms", "web"]);
    expect(legit).toBeGreaterThan(60);
    expect(legit).toBeLessThan(200);
  });

  it("starts easy and ramps difficulty as encounters are handled", () => {
    expect(pickEncounter(0, seq(0.1, 0.9, 0.99)).difficulty).toBe(1);
    expect(pickEncounter(9, seq(0.1, 0.9, 0.99)).difficulty).toBe(3);
  });

  it("rings the genuine fraud-alert call for genuine calls", () => {
    expect(pickEncounter(0, seq(0.01, 0.1, 0.5, 0.5))).toMatchObject({ channel: "call", legit: true, scenarioId: "card-alert" });
  });
});

describe("grading decisions", () => {
  it("rewards reporting scams and trusting genuine things", () => {
    expect(gradeDecision(true, "report").correct).toBe(true);
    expect(gradeDecision(false, "trust").correct).toBe(true);
    expect(gradeDecision(false, "engaged").correct).toBe(true);
  });

  it("marks taking a scam's bait as the worst result", () => {
    expect(gradeDecision(true, "engaged")).toMatchObject({ correct: false, caught: true });
    expect(gradeDecision(true, "trust")).toMatchObject({ correct: false, caught: false });
    expect(gradeDecision(false, "report").correct).toBe(false);
  });
});

describe("built-in encounters", () => {
  it("match the same schemas the AI must follow", () => {
    for (const e of FALLBACK_EMAILS) expect(GeneratedEmailSchema.safeParse(e).success).toBe(true);
    for (const s of FALLBACK_SITES) expect(GeneratedSiteSchema.safeParse(s).success).toBe(true);
  });

  it("include both scams and genuine ones, with link markers that resolve", () => {
    expect(FALLBACK_EMAILS.some((e) => e.scam) && FALLBACK_EMAILS.some((e) => !e.scam)).toBe(true);
    expect(FALLBACK_SITES.some((s) => s.scam) && FALLBACK_SITES.some((s) => !s.scam)).toBe(true);
    for (const e of FALLBACK_EMAILS) {
      for (const m of e.paragraphs.join(" ").matchAll(/\[link:(\d+)\]/g)) expect(e.links[Number(m[1])]).toBeDefined();
    }
  });
});
