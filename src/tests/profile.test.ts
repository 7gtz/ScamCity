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
