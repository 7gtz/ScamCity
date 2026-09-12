import { describe, expect, it, vi } from "vitest";
import type { AiAdapter } from "@/game/ai/adapter";
import { withFallback } from "@/game/ai/with-fallback";
import { AUTHORED_HINTS, hintFor, isUsablePhrasing, phraseHint, type Hint } from "@/game/ai/hints";
import { DetectiveHintSchema } from "@/lib/validation/schemas";

/** CI has no GEMINI_API_KEY, which is the no-key path. Set one to reach `run`. */
const withKey = async <T>(fn: () => Promise<T>): Promise<T> => {
  const had = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key-not-a-real-credential";
  try {
    return await fn();
  } finally {
    if (had === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = had;
  }
};

const adapter = (over: Partial<AiAdapter<string, string>> = {}): AiAdapter<string, string> => ({
  deadlineMs: 50,
  fallback: (input) => `authored:${input}`,
  run: async (input) => `live:${input}`,
  ...over,
});

describe("withFallback — the three guarantees", () => {
  it("uses the authored fallback when there is no key, without calling run", async () => {
    const run = vi.fn(async () => "live");
    const out = await withFallback(adapter({ run }), "x");
    expect(out).toBe("authored:x");
    expect(run).not.toHaveBeenCalled();
  });

  it("returns the live answer when the model is fast", async () => {
    await withKey(async () => {
      expect(await withFallback(adapter(), "x")).toBe("live:x");
    });
  });

  it("never exceeds the deadline: a slow run falls back instead of being awaited", async () => {
    await withKey(async () => {
      const slow = adapter({ deadlineMs: 30, run: () => new Promise((r) => setTimeout(() => r("late"), 5_000)) });
      const started = Date.now();
      const out = await withFallback(slow, "x");
      expect(out).toBe("authored:x");
      expect(Date.now() - started).toBeLessThan(1_000);
    });
  });

  it("never throws when run rejects — an outage is just the authored path", async () => {
    await withKey(async () => {
      const out = await withFallback(adapter({ run: async () => { throw new Error("503 overloaded"); } }), "x");
      expect(out).toBe("authored:x");
    });
  });

  it("never throws when run throws synchronously", async () => {
    await withKey(async () => {
      const out = await withFallback(adapter({ run: (() => { throw new Error("boom"); }) as never }), "x");
      expect(out).toBe("authored:x");
    });
  });

  it("treats timeout, outage and missing key identically", async () => {
    const noKey = await withFallback(adapter(), "x");
    const outage = await withKey(() => withFallback(adapter({ run: async () => { throw new Error("x"); } }), "x"));
    const timeout = await withKey(() =>
      withFallback(adapter({ deadlineMs: 20, run: () => new Promise((r) => setTimeout(() => r("late"), 500)) }), "x"),
    );
    expect(new Set([noKey, outage, timeout]).size).toBe(1);
  });

  it("a late rejection after the deadline does not become an unhandled rejection", async () => {
    await withKey(async () => {
      const out = await withFallback(
        adapter({ deadlineMs: 20, run: () => new Promise((_, reject) => setTimeout(() => reject(new Error("late")), 60)) }),
        "x",
      );
      expect(out).toBe("authored:x");
      await new Promise((r) => setTimeout(r, 120)); // let the late rejection land
    });
  });
});

describe("hints — AI varies phrasing only", () => {
  it("has an authored hint for every situation", () => {
    for (const [situation, text] of Object.entries(AUTHORED_HINTS)) {
      expect(text.length).toBeGreaterThan(12);
      expect(hintFor(situation as keyof typeof AUTHORED_HINTS).text).toBe(text);
    }
  });

  it("returns the authored hint with no key and no rewrite", async () => {
    const hint = await phraseHint("no-evidence");
    expect(hint.text).toBe(AUTHORED_HINTS["no-evidence"]);
    expect(hint.situation).toBe("no-evidence");
  });

  it("accepts a well-behaved rewrite but keeps the situation", async () => {
    await withKey(async () => {
      const hint = await phraseHint("window-closing", async () => "The clock is against you; go with what you can prove.");
      expect(hint.text).toBe("The clock is against you; go with what you can prove.");
      expect(hint.situation).toBe("window-closing");
    });
  });

  it("rejects a rewrite that stops being a hint", () => {
    expect(isUsablePhrasing("Short")).toBe(false);
    expect(isUsablePhrasing("1. Go to the bank\n2. Ask for Dave")).toBe(false);
    expect(isUsablePhrasing("- do this thing first")).toBe(false);
    expect(isUsablePhrasing("x".repeat(500))).toBe(false);
    expect(isUsablePhrasing("Put the two ledgers side by side.")).toBe(true);
  });

  it("falls back to the authored line when the model returns something unusable", async () => {
    await withKey(async () => {
      const hint = await phraseHint("no-evidence", async () => "1. Search the flat\n2. Take the ledger");
      expect(hint.text).toBe(AUTHORED_HINTS["no-evidence"]);
    });
  });

  it("a model that throws still produces the authored hint", async () => {
    await withKey(async () => {
      const hint = await phraseHint("after-mistake", async () => { throw new Error("moderation"); });
      expect(hint.text).toBe(AUTHORED_HINTS["after-mistake"]);
    });
  });

  it("the hint schema has no field in which a model could decide anything", () => {
    expect(Object.keys(DetectiveHintSchema.shape)).toEqual(["text"]);
    expect(DetectiveHintSchema.safeParse({ text: "Put the two ledgers side by side." }).success).toBe(true);
    expect(DetectiveHintSchema.safeParse({ text: "no" }).success).toBe(false);
  });
});
