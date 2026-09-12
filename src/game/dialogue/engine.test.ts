/**
 * Unit tests for the dialogue engine pure reducer.
 *
 * No React, no store, no I/O. These test the pure functions:
 * - getVisibleChoices: filters choices by condition evaluation
 * - advanceDialogue: returns next node + effects
 * - isChoiceAvailable: individual choice visibility
 */

import { describe, expect, it } from "vitest";
import type { DialogueNode } from "@/game/dialogue/types";
import type { DialogueState } from "@/game/dialogue/engine";
import { advanceDialogue, getVisibleChoices, isChoiceAvailable } from "@/game/dialogue/engine";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const testDialogue: Record<string, DialogueNode> = {
  start: {
    id: "start",
    speaker: "NPC",
    lines: ["Hello, detective."],
    choices: [
      { id: "ask", text: "Ask a question.", next: "question" },
      { id: "leave", text: "Leave.", next: "END", effects: [{ stress: 5 }] },
      {
        id: "confront",
        text: "Confront with evidence.",
        requires: { hasEvidence: "bank-statement" },
        next: "confrontation",
        effects: [
          { setFlag: "npc.confronted", to: true },
          { trust: "npc", by: -20 },
        ],
      },
    ],
  },
  question: {
    id: "question",
    speaker: "NPC",
    lines: ["What do you want to know?"],
    choices: [
      { id: "q-name", text: "What's your name?", next: "name-response" },
      {
        id: "q-secret",
        text: "Tell me the secret.",
        requires: { flag: "npc.trusts-detective" },
        next: "secret-response",
      },
      {
        id: "q-gated",
        text: "I found something interesting.",
        requires: { all: [{ hasEvidence: "call-log" }, { flag: "visited-bank" }] },
        next: "gated-response",
        effects: [{ giveEvidence: "otp-message" }],
      },
    ],
  },
  "name-response": {
    id: "name-response",
    speaker: "NPC",
    lines: ["My name is not important."],
    choices: [{ id: "back", text: "Back.", next: "start" }],
  },
};

const emptyState: DialogueState = { flags: {}, evidence: [] };

const stateWithEvidence: DialogueState = {
  flags: {},
  evidence: ["bank-statement"],
};

const stateWithFlags: DialogueState = {
  flags: { "npc.trusts-detective": true },
  evidence: [],
};

const stateWithAll: DialogueState = {
  flags: { "visited-bank": true },
  evidence: ["call-log"],
};

// ---------------------------------------------------------------------------
// getVisibleChoices
// ---------------------------------------------------------------------------

describe("getVisibleChoices", () => {
  it("returns all unconditional choices", () => {
    const node = testDialogue["start"]!;
    const visible = getVisibleChoices(node, emptyState);
    expect(visible.map((c) => c.id)).toEqual(["ask", "leave"]);
  });

  it("includes a choice when its hasEvidence condition is met", () => {
    const node = testDialogue["start"]!;
    const visible = getVisibleChoices(node, stateWithEvidence);
    expect(visible.map((c) => c.id)).toEqual(["ask", "leave", "confront"]);
  });

  it("hides a choice when its flag condition is not met", () => {
    const node = testDialogue["question"]!;
    const visible = getVisibleChoices(node, emptyState);
    expect(visible.map((c) => c.id)).toEqual(["q-name"]);
  });

  it("shows a flag-gated choice when the flag is set", () => {
    const node = testDialogue["question"]!;
    const visible = getVisibleChoices(node, stateWithFlags);
    expect(visible.map((c) => c.id)).toEqual(["q-name", "q-secret"]);
  });

  it("evaluates compound conditions (all)", () => {
    const node = testDialogue["question"]!;
    const visible = getVisibleChoices(node, stateWithAll);
    expect(visible.map((c) => c.id)).toEqual(["q-name", "q-gated"]);
  });

  it("compound condition fails when only one part is met", () => {
    const node = testDialogue["question"]!;
    const partialState: DialogueState = { flags: {}, evidence: ["call-log"] };
    const visible = getVisibleChoices(node, partialState);
    expect(visible.map((c) => c.id)).toEqual(["q-name"]);
  });
});

// ---------------------------------------------------------------------------
// advanceDialogue
// ---------------------------------------------------------------------------

describe("advanceDialogue", () => {
  it("advances to the next node and returns no effects for a simple choice", () => {
    const result = advanceDialogue(testDialogue, "start", emptyState, "ask");
    expect(result.nextNodeId).toBe("question");
    expect(result.effects).toEqual([]);
  });

  it("returns END and effects for a terminal choice", () => {
    const result = advanceDialogue(testDialogue, "start", emptyState, "leave");
    expect(result.nextNodeId).toBe("END");
    expect(result.effects).toEqual([{ stress: 5 }]);
  });

  it("returns effects for a choice with multiple effects", () => {
    const result = advanceDialogue(
      testDialogue,
      "start",
      stateWithEvidence,
      "confront",
    );
    expect(result.nextNodeId).toBe("confrontation");
    expect(result.effects).toEqual([
      { setFlag: "npc.confronted", to: true },
      { trust: "npc", by: -20 },
    ]);
  });

  it("throws when the choice is not visible", () => {
    expect(() =>
      advanceDialogue(testDialogue, "start", emptyState, "confront"),
    ).toThrow(/not available/);
  });

  it("throws when the choice id does not exist", () => {
    expect(() =>
      advanceDialogue(testDialogue, "start", emptyState, "nonexistent"),
    ).toThrow(/not available/);
  });

  it("returns END for a missing node", () => {
    const result = advanceDialogue(testDialogue, "missing-node", emptyState, "x");
    expect(result.nextNodeId).toBe("END");
  });

  it("returns giveEvidence effect for a gated choice", () => {
    const result = advanceDialogue(
      testDialogue,
      "question",
      stateWithAll,
      "q-gated",
    );
    expect(result.nextNodeId).toBe("gated-response");
    expect(result.effects).toEqual([{ giveEvidence: "otp-message" }]);
  });
});

// ---------------------------------------------------------------------------
// isChoiceAvailable
// ---------------------------------------------------------------------------

describe("isChoiceAvailable", () => {
  const unconditionalChoice = testDialogue["start"]!.choices[0]!;
  const gatedChoice = testDialogue["start"]!.choices[2]!;

  it("returns true for a choice with no requires", () => {
    expect(isChoiceAvailable(unconditionalChoice, emptyState)).toBe(true);
  });

  it("returns false when the condition is not met", () => {
    expect(isChoiceAvailable(gatedChoice, emptyState)).toBe(false);
  });

  it("returns true when the condition is met", () => {
    expect(isChoiceAvailable(gatedChoice, stateWithEvidence)).toBe(true);
  });
});
