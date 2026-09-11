import { describe, expect, it } from "vitest";
import { DISTRICTS } from "@/content/districts";
import { BONUS_SCENARIO, nextScenarioId, SCENARIO_ORDER, SCENARIOS, type Scenario } from "@/content/scenarios";
import { judgeCall } from "@/features/scoring/mock-judge";
import type { CallOutcome, CompletedCall, TacticId } from "@/lib/live/types";

const isEnd = (next: string) => next.startsWith("END:");

/** Every reachable ending, found by walking the script graph. */
function endings(scenario: Scenario) {
  const found = new Set<CallOutcome>();
  const seen = new Set<string>();
  const walk = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    for (const option of scenario.nodes[id]!.options) {
      if (isEnd(option.next)) found.add(option.next.slice(4) as CallOutcome);
      else walk(option.next);
    }
  };
  walk(scenario.start);
  return { found, reached: seen };
}

describe.each(Object.values(SCENARIOS))("scenario $id", (scenario) => {
  it("only points at nodes that exist", () => {
    expect(scenario.nodes[scenario.start]).toBeDefined();
    for (const node of Object.values(scenario.nodes)) {
      expect(node.options.length).toBeGreaterThan(0);
      expect(new Set(node.options.map((o) => o.id)).size).toBe(node.options.length);
      for (const option of node.options) {
        if (!isEnd(option.next)) expect(scenario.nodes[option.next], `${node.id} → ${option.next}`).toBeDefined();
      }
    }
  });

  it("has no unreachable nodes and can be both won and lost", () => {
    const { found, reached } = endings(scenario);
    expect([...reached].sort()).toEqual(Object.keys(scenario.nodes).sort());
    const good = scenario.persona.legitimate ? "verified-legit" : "exposed";
    const bad = scenario.persona.legitimate ? "rejected-legit" : "scammed";
    expect(found.has(good), `${scenario.id} can be won`).toBe(true);
    expect(found.has(bad), `${scenario.id} can be lost`).toBe(true);
  });

  it("every node can still reach an ending (no dead loops)", () => {
    for (const id of Object.keys(scenario.nodes)) {
      expect(endings({ ...scenario, start: id }).found.size, `${scenario.id}/${id}`).toBeGreaterThan(0);
    }
  });

  it("a scammed ending always fails the rules judge", () => {
    if (scenario.persona.legitimate) return;
    const used = Object.values(scenario.nodes).flatMap((n) => n.lines.flatMap((l) => l.tactics ?? []));
    const call: CompletedCall = {
      sessionId: "t",
      scenarioId: scenario.id,
      legitimate: false,
      durationMs: 60_000,
      transcript: [{ id: "s0", speaker: "scammer", text: "…", at: 0, tactics: used as TacticId[] }],
      outcome: "scammed",
      revealed: ["Card number"],
      tacticsDetected: [],
      suspicion: [],
    };
    expect(judgeCall(call).passed).toBe(false);
  });
});

describe("the city", () => {
  it("every district is playable and in the level order", () => {
    for (const district of DISTRICTS) {
      expect(district.scenarioId, district.title).toBeDefined();
      expect(SCENARIO_ORDER).toContain(district.scenarioId);
    }
    expect(SCENARIO_ORDER).toHaveLength(DISTRICTS.length);
  });

  it("keeps the legitimate call off the route as a bonus that leads back onto it", () => {
    expect(SCENARIO_ORDER).not.toContain(BONUS_SCENARIO);
    expect(new Set([...SCENARIO_ORDER, BONUS_SCENARIO]).size).toBe(Object.keys(SCENARIOS).length);
    expect(nextScenarioId(BONUS_SCENARIO)).toBe(SCENARIO_ORDER[1]);
  });
});
