import { describe, expect, it } from "vitest";
import { TEN_MINUTE_EVIDENCE } from "@/content/cases/ten-minute-window/evidence";
import { buildNpcDossier, renderDossier } from "./context-builder";
import { NPC_PERSONAS, CASE_FACTS, composeInstruction } from "./personas";
import { NPC_TOOL_DECLARATIONS } from "./schemas";
import { NPC_IDS, NPC_BY_DIALOGUE_KEY, type NpcId } from "./types";

const state = (flags: Record<string, boolean | number | string> = {}, evidence: string[] = []) => ({
  flags,
  evidence,
});

describe("persona table", () => {
  it("covers every NPC", () => {
    for (const id of NPC_IDS) expect(NPC_PERSONAS[id]?.id).toBe(id);
  });

  it("gives each distinct person a distinct voice, so three men are tellable apart", () => {
    // `mara-call` is the same woman as `mara`, one phone call earlier, so the
    // two deliberately share a voice — she must sound like herself when the
    // detective reaches her flat. Every other speaker is a different person.
    const people = NPC_IDS.filter((id) => id !== "mara-call");
    const voices = people.map((id) => NPC_PERSONAS[id].voiceName);
    expect(new Set(voices).size).toBe(voices.length);
  });

  it("keeps Mara sounding like herself between the call and the flat", () => {
    expect(NPC_PERSONAS["mara-call"].voiceName).toBe(NPC_PERSONAS.mara.voiceName);
    expect(NPC_PERSONAS["mara-call"].name).toBe(NPC_PERSONAS.mara.name);
  });

  it("lets nothing change hands down a phone line", () => {
    expect(NPC_PERSONAS["mara-call"].tools).toEqual(["end_conversation"]);
  });

  it("only declares tools that actually exist", () => {
    for (const id of NPC_IDS) {
      for (const tool of NPC_PERSONAS[id].tools) expect(NPC_TOOL_DECLARATIONS[tool]).toBeDefined();
    }
  });

  it("maps every authored dialogue key to a persona", () => {
    for (const key of Object.keys(NPC_BY_DIALOGUE_KEY)) {
      expect(NPC_PERSONAS[NPC_BY_DIALOGUE_KEY[key]!]).toBeDefined();
    }
  });
});

describe("case facts", () => {
  it("quotes figures the player can actually find on an evidence card", () => {
    const cards = JSON.stringify(TEN_MINUTE_EVIDENCE);
    expect(cards).toContain(CASE_FACTS.amount);
    expect(cards).toContain(CASE_FACTS.otp);
    expect(cards).toContain("21:47");
    expect(cards).toContain("22:01");
    expect(cards).toContain("22:03");
  });

  it("has no leftover sterling anywhere in the case", () => {
    expect(JSON.stringify(TEN_MINUTE_EVIDENCE)).not.toContain("£");
  });
});

describe("dossier", () => {
  it("tells the victim nothing about the bank's internal systems", () => {
    const dossier = buildNpcDossier("mara", state({ "branch.emergency-freeze-applied": true }), {
      remainingMs: 300_000,
    });
    expect(dossier.flags["branch.emergency-freeze-applied"]).toBeUndefined();
  });

  it("does tell the teller about his own branch", () => {
    const dossier = buildNpcDossier("vance", state({ "branch.emergency-freeze-applied": true }), {
      remainingMs: 300_000,
    });
    expect(dossier.flags["branch.emergency-freeze-applied"]).toBe(true);
  });

  it("omits falsy flags rather than briefing a character on negatives", () => {
    const dossier = buildNpcDossier("brennan", state({ "police.formal-report-lodged": false }), {
      remainingMs: 60_000,
    });
    expect(dossier.flags["police.formal-report-lodged"]).toBeUndefined();
  });

  it("reports whole minutes left, floored, and never negative", () => {
    expect(buildNpcDossier("miller", state(), { remainingMs: 125_000 }).minutesLeft).toBe(2);
    expect(buildNpcDossier("miller", state(), { remainingMs: -5_000 }).minutesLeft).toBe(0);
  });

  it("surfaces unlocked deductions as prose", () => {
    const dossier = buildNpcDossier("brennan", state({ "deduction.otp-theft-established": true }), {
      remainingMs: 120_000,
    });
    expect(dossier.deductions).toContain("deduction.otp-theft-established");
    expect(renderDossier(dossier)).toContain("worked out");
  });

  it("says the money is gone once the window has closed", () => {
    const rendered = renderDossier(buildNpcDossier("vance", state(), { remainingMs: 0 }));
    expect(rendered).toContain("closed");
  });

  it("names held evidence by its card title", () => {
    const rendered = renderDossier(
      buildNpcDossier("vance", state({}, ["bank-statement"]), { remainingMs: 120_000 }),
    );
    expect(rendered).toContain("Interim Account Statement");
  });
});

describe("system instruction", () => {
  it("carries the character, the dossier and the shared rules", () => {
    const dossier = buildNpcDossier("vance", state({}, ["bank-statement"]), { remainingMs: 240_000 });
    const instruction = composeInstruction(NPC_PERSONAS.vance, renderDossier(dossier));
    expect(instruction).toContain("Teller Vance");
    expect(instruction).toContain("HOW TO SPEAK");
    expect(instruction).toContain("SAFETY");
    expect(instruction).toContain("Interim Account Statement");
  });

  it("never tells a character to reveal a culprit Miller does not know", () => {
    const instruction = composeInstruction(NPC_PERSONAS.miller, "");
    expect(instruction).toContain("Do not name a culprit");
  });

  it("builds for every NPC without throwing", () => {
    for (const id of NPC_IDS as NpcId[]) {
      expect(composeInstruction(NPC_PERSONAS[id], "").length).toBeGreaterThan(200);
    }
  });
});

describe("real-world context", () => {
  const india = {
    timezone: "Asia/Kolkata",
    localTime: "07:14",
    country: "India",
    city: "Pune",
    region: "Maharashtra",
    weather: "heavy showers",
    source: "gps" as const,
  };

  it("makes every NPC a local, with the player's own accent", () => {
    const instruction = composeInstruction(NPC_PERSONAS.mara, "", india);
    expect(instruction).toContain("Indian English accent");
    expect(instruction).toContain("Pune, Maharashtra, India");
  });

  it("carries the local hour and weather", () => {
    const instruction = composeInstruction(NPC_PERSONAS.ravi, "", india);
    expect(instruction).toContain("07:14");
    expect(instruction).toContain("heavy showers");
  });

  it("uses it to belong, never to pressure — these are witnesses", () => {
    const instruction = composeInstruction(NPC_PERSONAS.vance, "", india);
    expect(instruction).toContain("Never use it to pressure the detective");
  });

  it("works with no context at all", () => {
    const instruction = composeInstruction(NPC_PERSONAS.miller, "");
    expect(instruction).not.toContain("WHERE YOU ARE");
    expect(instruction.length).toBeGreaterThan(200);
  });
});
