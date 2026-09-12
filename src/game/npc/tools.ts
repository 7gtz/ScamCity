/**
 * Guarded tool executor — the deterministic half of the NPC layer.
 *
 * The model decides what to *attempt*; this decides what actually happens.
 * Pure: state in, verdict out. It never touches the store, so the whole matrix
 * of allow/refuse branches unit-tests without a browser, and the case outcome
 * stays reproducible no matter how persuasive the player sounded.
 *
 * This is how free-form voice stays compatible with the doctrine in
 * docs/DETECTIVE-TRACK-24H.md section 11: the AI drives the performance, the
 * authored rules still decide the case.
 *
 * Refusals carry an in-fiction `reason`, which the caller sends back as the
 * Gemini function response so the NPC speaks the refusal instead of going
 * silent or, worse, pretending it worked.
 */

import type { Effect } from "@/game/dialogue/types";
import type { GameState } from "@/game/state/types";
import type { NpcId, NpcToolCall, NpcToolName, NpcToolResult } from "./types";

type ToolState = Pick<GameState, "flags" | "evidence">;

/** Which character may attempt what. Mirrors each persona's `tools`. */
const ALLOWED_TOOLS: Record<NpcId, readonly NpcToolName[]> = {
  miller: ["end_conversation"],
  mara: ["give_evidence", "accuse_suspect", "clear_lead", "end_conversation"],
  // Nothing changes hands down a phone line.
  "mara-call": ["end_conversation"],
  vance: ["give_evidence", "authorize_freeze", "end_conversation"],
  ravi: ["give_evidence", "accuse_suspect", "clear_lead", "end_conversation"],
  brennan: ["give_evidence", "lodge_report", "end_conversation"],
};

/** What each character physically has to hand over. */
const DISCLOSURE: Record<NpcId, readonly string[]> = {
  miller: [],
  mara: ["call-log", "otp-message", "delivery-notice"],
  "mara-call": [],
  vance: ["bank-statement"],
  ravi: ["repair-receipt"],
  brennan: ["sim-swap-record"],
};

/**
 * A floor on articulation, not a judgement of it.
 *
 * Whether the detective actually argued the case is the persona's call — Vance
 * refuses vagueness in character. But the deterministic layer must not be
 * satisfied by evidence alone, or a sloppy model could hand out the win for
 * "just freeze it". The NPC passes back the grounds it heard; too thin to be an
 * argument means the tool does not land.
 */
const MIN_ARGUMENT = 25;

/** The evidence chain that makes a bank hold justifiable. */
const FREEZE_REQUIRES = ["bank-statement", "call-log", "otp-message"] as const;
/** The minimum a report can be filed on. */
const REPORT_REQUIRES = ["call-log", "otp-message"] as const;

const TRUST_ID: Record<NpcId, string> = {
  miller: "detective",
  mara: "mara-okoye",
  "mara-call": "mara-okoye",
  vance: "teller-vance",
  ravi: "ravi-sunder",
  brennan: "sgt-brennan",
};

function holds(state: ToolState, ids: readonly string[]) {
  return ids.every((id) => state.evidence.includes(id));
}

function missing(state: ToolState, ids: readonly string[]) {
  return ids.filter((id) => !state.evidence.includes(id));
}

const ok = (reason: string, effects: readonly Effect[] = [], ends = false): NpcToolResult => ({
  ok: true,
  reason,
  effects,
  ends,
});

const refuse = (reason: string): NpcToolResult => ({ ok: false, reason, effects: [] });

function giveEvidence(call: NpcToolCall, state: ToolState): NpcToolResult {
  const id = String(call.args.evidence ?? "");
  if (!DISCLOSURE[call.npc].includes(id)) {
    return refuse("You do not have that. Say so, and do not invent a document.");
  }
  if (state.evidence.includes(id)) {
    return ok("The detective already has this — acknowledge it rather than handing it over twice.");
  }
  return ok("Handed over.", [{ giveEvidence: id }]);
}

function authorizeFreeze(call: NpcToolCall, state: ToolState): NpcToolResult {
  if (state.flags["branch.emergency-freeze-applied"]) {
    return ok("The hold is already in place. Confirm it rather than placing a second one.");
  }
  if (state.flags["case.alienated-bank-staff"]) {
    return refuse("This detective has accused you and your branch of complicity. You will not act on their say-so.");
  }
  if (state.flags["branch.window-expired"]) {
    return refuse("The settlement batch has already gone. There is nothing left to hold.");
  }
  const gaps = missing(state, FREEZE_REQUIRES);
  if (gaps.length) {
    return refuse(
      "Not sufficient grounds yet. You still need the detective to evidence the transfer itself, the spoofed call, and the passcode timing — ask them for the specific grounds.",
    );
  }
  if (String(call.args.grounds ?? "").trim().length < MIN_ARGUMENT) {
    return refuse(
      "They have not actually stated their grounds. Ask them directly: what was taken, when, and why do the timestamps prove fraud?",
    );
  }
  return ok("Emergency fraud hold placed.", [
    { setFlag: "branch.emergency-freeze-applied", to: true },
    { setFlag: "branch.freeze-authorized", to: true },
    { setFlag: "deduction.freeze-authorization-ready", to: true },
  ]);
}

function accuseSuspect(call: NpcToolCall): NpcToolResult {
  const suspect = String(call.args.suspect ?? "unknown");
  if (suspect === "ravi") {
    return ok("Recorded — the detective has accused Ravi Sunder.", [
      { setFlag: "case.accused-repair-shop", to: true },
      { trust: "ravi-sunder", by: -60 },
      { stress: 15 },
    ]);
  }
  if (suspect === "vance") {
    return ok("Recorded — the detective has accused the bank.", [
      { setFlag: "case.alienated-bank-staff", to: true },
      { trust: "teller-vance", by: -50 },
      { stress: 15 },
    ]);
  }
  if (suspect === "mara") {
    return ok("Recorded — the detective has turned on the victim.", [
      { trust: "mara-okoye", by: -40 },
      { stress: 10 },
    ]);
  }
  return ok("Noted, but no one specific was named.", [{ stress: 5 }]);
}

function clearLead(call: NpcToolCall, state: ToolState): NpcToolResult {
  const lead = String(call.args.lead ?? "");
  if (lead === "repair-shop") {
    if (!holds(state, ["repair-receipt"])) {
      return refuse("They have not actually looked at the work order yet. Offer it before ruling anything out.");
    }
    return ok("The repair shop is ruled out.", [
      { setFlag: "deduction.repair-shop-cleared", to: true },
      { setFlag: "lead.repair-cleared-in-dialogue", to: true },
      { trust: "ravi-sunder", by: 20 },
    ]);
  }
  if (lead === "delivery") {
    if (!holds(state, ["delivery-notice"])) {
      return refuse("They have not picked up the delivery card yet. There is nothing to rule out.");
    }
    return ok("The delivery card is ruled out.", [
      { setFlag: "lead.delivery-checked", to: true },
      { setFlag: "deduction.delivery-bait-cleared", to: true },
    ]);
  }
  return refuse("That is not a lead in this case.");
}

function lodgeReport(call: NpcToolCall, state: ToolState): NpcToolResult {
  if (state.flags["police.formal-report-lodged"]) {
    return ok("Already filed. Confirm it rather than filing twice.");
  }
  const gaps = missing(state, REPORT_REQUIRES);
  if (gaps.length) {
    return refuse(
      "That is not a chain you can file. You need the spoofed call and the passcode evidenced before this goes on the record — tell them which link is missing.",
    );
  }
  if (String(call.args.summary ?? "").trim().length < MIN_ARGUMENT) {
    return refuse(
      "They have not summarised the case. Make them walk you through it: the call, the passcode, the transfer, the hold.",
    );
  }
  return ok(
    "Formal report filed.",
    [
      { setFlag: "police.formal-report-lodged", to: true },
      { setFlag: "police.has-carrier-log", to: true },
      { setFlag: "deduction.otp-theft-established", to: true },
    ],
    true,
  );
}

/**
 * Decide whether an attempted tool call actually lands.
 *
 * `state` is the live snapshot at the moment of the call — pass
 * `getGameState()`, not a memoised copy, or the guards will judge stale
 * evidence.
 */
export function executeNpcTool(call: NpcToolCall, state: ToolState): NpcToolResult {
  if (!ALLOWED_TOOLS[call.npc]?.includes(call.name)) {
    return refuse("That is not something you can do. Stay in character and tell the detective so.");
  }

  switch (call.name) {
    case "give_evidence":
      return giveEvidence(call, state);
    case "authorize_freeze":
      return authorizeFreeze(call, state);
    case "accuse_suspect":
      return accuseSuspect(call);
    case "clear_lead":
      return clearLead(call, state);
    case "lodge_report":
      return lodgeReport(call, state);
    case "end_conversation":
      return ok("Conversation closed.", [], true);
    default:
      return refuse("Unknown action.");
  }
}

/** The trust id each NPC's relationship is tracked under. */
export { TRUST_ID };
