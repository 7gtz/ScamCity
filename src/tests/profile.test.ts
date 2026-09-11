import { describe, expect, it } from "vitest";
import { DISTRICTS } from "@/content/districts";
import { defenseProfile, lessonFrom } from "@/features/profile/defense";

describe("defense profile", () => {
  it("stays empty until the player has played", () => {
    expect(defenseProfile({ weak: {}, strong: {} })).toBeNull();
  });

  it("calls out the skeptic who turns away genuine contact", () => {
    expect(defenseProfile({ weak: {}, strong: { authority: 2 }, falseAlarms: 2, trusted: 0 })?.archetype).toBe("The Skeptic");
  });

  it("aims the next threat at the district built on the player's weakest tactic", () => {
    const p = defenseProfile({ weak: { urgency: 3, authority: 1 }, strong: { fear: 1 } });
    expect(p).toMatchObject({ weak: "urgency", strong: "fear", archetype: "The Accommodator" });
    expect(p?.nextThreat?.id).toBe("delivery");
  });

  it("never names one tactic as both a strength and a weakness", () => {
    const p = defenseProfile({ weak: { urgency: 2 }, strong: { urgency: 2, fear: 1 } });
    expect(p?.strong).not.toBe(p?.weak);
  });

  it("lets the report on screen outrank history, so the page can't contradict itself", () => {
    // History says the player usually catches urgency; this report says they just missed it.
    const p = defenseProfile({ weak: { urgency: 1 }, strong: { urgency: 4 } , session: { missed: ["urgency"], caught: ["authority"] } });
    expect(p?.weak).toBe("urgency");
    expect(p?.strong).toBe("authority");
  });

  it("gives every district its own lever", () => {
    expect(new Set(DISTRICTS.map((d) => d.lever)).size).toBe(DISTRICTS.length);
  });
});

describe("what the city learns from one encounter", () => {
  it("warns that a missed tactic follows the player into other channels", () => {
    expect(lessonFrom({ missed: ["urgency"], caught: [], legit: false, rejectedGenuine: false })).toMatchObject({
      tone: "danger",
      next: expect.stringContaining("urgency"),
    });
  });

  it("treats turning away a genuine contact as a mistake, not caution", () => {
    expect(lessonFrom({ missed: [], caught: [], legit: true, rejectedGenuine: true })?.tone).toBe("uncertain");
    expect(lessonFrom({ missed: [], caught: [], legit: true, rejectedGenuine: false })?.tone).toBe("safe");
  });
});
