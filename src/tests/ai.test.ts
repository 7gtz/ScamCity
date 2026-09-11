import { describe, expect, it } from "vitest";
import { composeScore } from "@/features/scoring/compose";
import { PASS_THRESHOLD } from "@/features/scoring/mock-judge";
import { toResponseSchema } from "@/lib/gemini/server";
import type { CompletedCall } from "@/lib/live/types";
import { AnalysisSchema, CompletedCallSchema, JudgeSchema } from "@/lib/validation/schemas";

const call: CompletedCall = {
  sessionId: "s1",
  scenarioId: "bank-security",
  legitimate: false,
  durationMs: 60_000,
  transcript: [
    { id: "s0", speaker: "scammer", text: "This is Martin from Northstar.", at: 0, tactics: ["authority"] },
    { id: "p1", speaker: "player", text: "What's your employee ID?", at: 8_000 },
  ],
  outcome: "exposed",
  revealed: [],
  tacticsDetected: [{ tactic: "authority", at: 8_000 }],
  suspicion: [{ at: 0, value: 0 }],
};

describe("judge → score composition", () => {
  it("clamps times to the call, dedupes tactics and applies the pass mark itself", () => {
    const score = composeScore(call, {
      score: 64.6,
      caught: [
        { tactic: "urgency", atSeconds: 30 },
        { tactic: "authority", atSeconds: 8 },
        { tactic: "authority", atSeconds: 20 },
      ],
      missed: ["authority", "fear", "fear"],
      events: [{ atSeconds: 999, label: "Questioned" }],
      notes: ["You asked for his ID straight away."],
    });

    expect(score.score).toBe(65);
    expect(score.passed).toBe(65 >= PASS_THRESHOLD);
    expect(score.caught).toEqual([
      { tactic: "authority", at: 8_000 },
      { tactic: "urgency", at: 30_000 },
    ]);
    expect(score.missed).toEqual(["fear"]);
    expect(score.events.every((e) => e.at <= call.durationMs)).toBe(true);
    expect(score.events[0]?.label).toBe("questioned");
    expect(score.judge).toBe("gemini");
  });

  it("always ends the timeline with the end of the call", () => {
    const score = composeScore(call, { score: 10, caught: [], missed: [], events: [], notes: ["x"] });
    expect(score.events.at(-1)).toEqual({ at: 60_000, label: "ended" });
    expect(score.passed).toBe(false);
  });
});

describe("contracts", () => {
  it("turns Zod schemas into Gemini response schemas without a $schema key", () => {
    for (const schema of [AnalysisSchema, JudgeSchema]) {
      const json = toResponseSchema(schema);
      expect(json).not.toHaveProperty("$schema");
      expect(json).toMatchObject({ type: "object" });
      expect(Object.keys((json as { properties: object }).properties).length).toBeGreaterThan(2);
    }
  });

  it("accepts a real completed call at the score boundary", () => {
    expect(CompletedCallSchema.safeParse(call).success).toBe(true);
    expect(CompletedCallSchema.safeParse({ ...call, outcome: "won" }).success).toBe(false);
  });
});
