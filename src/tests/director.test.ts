import { describe, expect, it } from "vitest";
import { SCENARIOS } from "@/content/scenarios";
import { BRIEFS } from "@/lib/gemini/briefs";
import { difficultyFor } from "@/lib/gemini/director";
import { pickVoice } from "@/lib/gemini/models";
import { buildLiveSystemInstruction } from "@/lib/gemini/persona";
import { CallPlanSchema } from "@/lib/validation/schemas";

describe("director briefs", () => {
  it.each(Object.values(SCENARIOS))("$id has a valid fallback plan", (scenario) => {
    const brief = BRIEFS[scenario.id];
    expect(brief, scenario.id).toBeDefined();
    expect(CallPlanSchema.safeParse(brief!.plan).success).toBe(true);
    // Only districts with a genuine variant may secretly turn out to be real.
    if (scenario.twist) expect(brief!.legitGuide, `${scenario.id} twist needs a legit guide`).toBeTruthy();
  });

  it.each(Object.values(SCENARIOS))("$id builds a scam and a genuine persona prompt", (scenario) => {
    const plan = BRIEFS[scenario.id]!.plan;
    const scam = buildLiveSystemInstruction(plan, { legitimate: false, difficulty: 1, weak: ["urgency"] });
    const real = buildLiveSystemInstruction(plan, { legitimate: true, difficulty: 3 });

    expect(scam).toContain(plan.callerName);
    expect(scam).toContain("PIVOT");
    expect(scam).toContain("lean on those");
    expect(real).toContain("GENUINE");
    expect(real).not.toContain("social engineer");
    for (const prompt of [scam, real]) expect(prompt).toContain("end_call");
  });
});

describe("adaptive difficulty", () => {
  const first = SCENARIOS["bank-security"]!;
  const late = SCENARIOS["romance-emergency"]!;

  it("starts gentle and rises with the district and the player's record", () => {
    expect(difficultyFor(first)).toBe(1);
    expect(difficultyFor(late)).toBe(2);
    expect(difficultyFor(first, { weak: [], cleared: 4, recentHooks: [] })).toBe(3);
  });

  it("never leaves the 1–3 range", () => {
    expect(difficultyFor(late, { weak: [], cleared: 50, recentHooks: [] })).toBe(3);
  });
});

describe("voices", () => {
  it("draws from the matching pool", () => {
    const female = new Set(Array.from({ length: 40 }, () => pickVoice("female")));
    const male = new Set(Array.from({ length: 40 }, () => pickVoice("male")));
    expect([...female].every((v) => !male.has(v))).toBe(true);
    expect(female.size).toBeGreaterThan(1);
  });
});
