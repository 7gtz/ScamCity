import { describe, expect, it } from "vitest";
import { describeBehaviour, gradeDecision } from "@/features/encounters/grade";
import { LIVES, settle, type LogEntry } from "@/features/freestyle/freestyle-store";
import {
  ceilingFor,
  DEMO_GOAL,
  FIRST_RANGE,
  firstDelay,
  GOAL,
  MIN_GENUINE,
  nextDelay,
  PACES,
  pickEncounter,
} from "@/features/freestyle/schedule";
import { FALLBACK_CHATS, pickFallbackChat } from "@/content/fallback-chats";
import { FALLBACK_EMAILS, FALLBACK_SITES } from "@/content/fallback-encounters";
import { ChatPlanSchema, GeneratedEmailSchema, GeneratedSiteSchema } from "@/lib/validation/schemas";

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

describe("the demo", () => {
  it("runs email → text → call, one level harder each time, in under 20 s of waiting", () => {
    const specs = [0, 1, 2].map((h) => pickEncounter(h, () => 0.5, { pace: "demo" }));
    expect(specs.map((s) => s.channel)).toEqual(["email", "sms", "call"]);
    expect(specs.map((s) => s.difficulty)).toEqual([1, 2, 3]);
    expect(specs[0]!.legit || specs[1]!.legit).toBe(false);
    expect(firstDelay(() => 1, "demo") + 2 * PACES.demo.range[1]).toBeLessThan(30_000);
  });

  it("ramps a normal day every three encounters", () => {
    expect([0, 2, 3, 6, 9].map((h) => ceilingFor(h))).toEqual([1, 1, 2, 3, 3]);
  });
});

describe("the day's rules", () => {
  const entry = (o: Partial<LogEntry>): LogEntry => ({
    id: "e",
    channel: "email",
    title: "t",
    legit: false,
    correct: true,
    caught: false,
    at: 0,
    ...o,
  });
  const day = { lives: LIVES, handled: 0, log: [] as LogEntry[], pace: "normal" as const };

  it("costs a life for being scammed and for turning away something genuine — nothing else", () => {
    expect(settle(day, entry({ caught: true, correct: false })).lives).toBe(LIVES - 1);
    expect(settle(day, entry({ legit: true, correct: false })).lives).toBe(LIVES - 1);
    expect(settle(day, entry({ legit: true, correct: false, missed: true })).lives).toBe(LIVES - 1);
    expect(settle(day, entry({ legit: false, correct: true, missed: true })).lives).toBe(LIVES);
    expect(settle(day, entry({ legit: false, correct: false })).lives).toBe(LIVES);
  });

  it("makes ignoring everything cost at least two lives over a full day", () => {
    let s = { ...day };
    let genuine = 0;
    for (let i = 0; i < GOAL; i++) {
      const spec = pickEncounter(s.handled, () => 0.9, { genuineSeen: genuine });
      if (spec.legit) genuine++;
      const next = settle(s, entry({ legit: spec.legit, correct: !spec.legit, missed: true }));
      s = { ...s, lives: next.lives, handled: next.handled, log: next.log };
    }
    expect(genuine).toBeGreaterThanOrEqual(MIN_GENUINE);
    expect(s.lives).toBeLessThanOrEqual(LIVES - MIN_GENUINE);
  });

  it("wins the demo after three encounters and a day after eight", () => {
    expect(settle({ ...day, pace: "demo", handled: DEMO_GOAL - 1 }, entry({})).status).toBe("won");
    expect(settle({ ...day, handled: DEMO_GOAL - 1 }, entry({})).status).toBe("active");
    expect(settle({ ...day, handled: GOAL - 1 }, entry({})).status).toBe("won");
    expect(settle({ ...day, lives: 1 }, entry({ caught: true, correct: false })).status).toBe("lost");
  });
});

describe("the judge's read of behaviour", () => {
  it("describes what the player did, not only whether they were right", () => {
    expect(describeBehaviour({ scam: true, decision: "report", checked: ["sender"] })).toMatch(/checked the sender details before reporting/);
    expect(describeBehaviour({ scam: true, decision: "engaged", checked: ["link"] })).toMatch(/went ahead anyway/);
    expect(describeBehaviour({ scam: true, decision: "report", checked: [] })).toMatch(/on instinct/);
    expect(describeBehaviour({ scam: false, decision: "report", checked: [] })).toMatch(/without checking anything/);
    expect(describeBehaviour({ scam: false, decision: "trust", checked: ["site-info"] })).toMatch(/site information before trusting/);
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

  it("have built-in Messages openings that follow the AI's plan schema, scam and genuine", () => {
    for (const c of FALLBACK_CHATS) expect(ChatPlanSchema.safeParse(c).success, c.pattern).toBe(true);
    expect(pickFallbackChat(() => 0.1).scam).toBe(false);
    expect(pickFallbackChat(() => 0.9).scam).toBe(true);
  });
});
