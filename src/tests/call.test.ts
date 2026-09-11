import { describe, expect, it, vi } from "vitest";
import { canTransition, transition } from "@/features/call/call-machine";
import { judgeCall, PASS_THRESHOLD } from "@/features/scoring/mock-judge";
import { MockLiveCallProvider } from "@/lib/live/mock-provider";
import type { CallStatus, CompletedCall, PlayerAction } from "@/lib/live/types";

describe("call machine", () => {
  it("follows the documented happy path", () => {
    const path: CallStatus[] = ["idle", "connecting", "ringing", "live", "ending", "scoring", "results"];
    for (let i = 1; i < path.length; i++) expect(canTransition(path[i - 1]!, path[i]!)).toBe(true);
  });

  it("refuses illegal jumps", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(transition("idle", "results")).toBe("idle");
    expect(transition("live", "ringing")).toBe("live");
  });
});

describe("mock provider", () => {
  /** Plays a script with timing compressed 100×; timestamps stay in script time. */
  async function run(scenarioId: string, picks: string[]) {
    const provider = new MockLiveCallProvider(100);
    let options: PlayerAction[] = [];
    let ended: CompletedCall | null = null;
    const statuses: CallStatus[] = [];
    provider.on("status", (e) => statuses.push(e.status));
    provider.on("options", (e) => (options = e.options));
    provider.on("ended", (e) => (ended = e.call));

    await provider.connect({ scenarioId });
    for (const pick of picks) {
      await vi.waitFor(() => expect(options.map((o) => o.id)).toContain(pick), { timeout: 3000, interval: 5 });
      provider.choose(pick);
      options = [];
    }
    await vi.waitFor(() => expect(ended).not.toBeNull(), { timeout: 3000, interval: 5 });
    provider.disconnect();
    return { call: ended as unknown as CompletedCall, statuses };
  }

  it("scores a caller exposed by verification as a pass", async () => {
    const { call, statuses } = await run("bank-security", ["prove", "callback", "risk"]);
    expect(statuses).toEqual(["connecting", "ringing", "live", "ending"]);
    expect(call.outcome).toBe("exposed");
    expect(call.revealed).toEqual([]);

    const score = judgeCall(call);
    expect(score.passed).toBe(true);
    expect(score.caught.map((c) => c.tactic)).toEqual(expect.arrayContaining(["authority", "urgency", "fear"]));
  });

  it("fails a player who reads out the one-time code", async () => {
    const { call } = await run("bank-security", ["comply", "give", "read"]);
    expect(call.outcome).toBe("scammed");
    expect(call.revealed).toEqual(["Card number", "One-time passcode"]);
    expect(judgeCall(call).score).toBeLessThan(PASS_THRESHOLD);
  });

  it("rewards verifying a legitimate caller and penalises rejecting one", async () => {
    const good = judgeCall((await run("card-alert", ["prove", "call"])).call);
    expect(good.passed).toBe(true);

    const bad = judgeCall((await run("card-alert", ["reject"])).call);
    expect(bad.outcome).toBe("rejected-legit");
    expect(bad.passed).toBe(false);
  });
});
