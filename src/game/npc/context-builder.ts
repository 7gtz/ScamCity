/**
 * Dossier builder — the slice of live game state an NPC is told about before
 * it speaks.
 *
 * Two halves, deliberately split:
 * - `buildNpcDossier` runs on the client, against the real store snapshot, and
 *   produces the small serialisable object sent to the token route.
 * - `renderDossier` runs on the server and turns it into the prose block that
 *   goes into the system instruction.
 *
 * Each NPC is told only what that character would plausibly know. Mara has no
 * idea whether the bank applied a hold; Ravi does not know what the carrier
 * logs say. Leaking the whole flag set into every prompt is what makes NPCs
 * omniscient and the case trivial.
 */

import { TEN_MINUTE_EVIDENCE } from "@/content/cases/ten-minute-window/evidence";
import { TEN_MINUTE_DEDUCTIONS } from "@/content/cases/ten-minute-window/deductions";
import type { GameState } from "@/game/state/types";
import type { NpcDossier } from "./schemas";
import type { NpcId } from "./types";

/**
 * Flag prefixes each NPC is allowed to be briefed on. Prefix match, so
 * `branch.` covers every branch flag without listing them.
 */
const VISIBLE_FLAGS: Record<NpcId, readonly string[]> = {
  // The partner running the case — he gets told everything over the radio.
  miller: ["case.", "branch.", "police.", "deduction.", "lead.", "victim."],
  // The victim knows her own situation and what she has shown the detective.
  mara: ["victim.", "lead.delivery-checked", "lead.repair-noted"],
  // The opening call: she knows only what happened to her.
  "mara-call": ["victim."],
  // The teller sees his own branch systems and the grounds put to him.
  vance: ["branch.", "deduction.freeze-authorization-ready", "deduction.otp-theft-established", "case.alienated-bank-staff"],
  // The repairman knows only what has been said to his face.
  ravi: ["lead.repair", "deduction.repair-shop-cleared", "case.accused-repair-shop"],
  // The desk sergeant sees the filing status and the established chain.
  brennan: ["police.", "deduction.", "branch.emergency-freeze-applied", "case."],
};

const EVIDENCE_TITLES = new Map(TEN_MINUTE_EVIDENCE.map((item) => [item.id, item.title]));
const DEDUCTION_BY_FLAG = new Map(TEN_MINUTE_DEDUCTIONS.map((d) => [d.unlocksFlag, d]));

/** Snapshot the state an NPC may be briefed on. Pure; safe to call per turn. */
export function buildNpcDossier(
  npc: NpcId,
  state: Pick<GameState, "flags" | "evidence">,
  opts: { remainingMs: number },
): NpcDossier {
  const allowed = VISIBLE_FLAGS[npc];
  const flags: NpcDossier["flags"] = {};
  for (const [id, value] of Object.entries(state.flags)) {
    if (!value) continue;
    if (!allowed.some((prefix) => id.startsWith(prefix))) continue;
    flags[id] = value;
  }

  const deductions = Object.keys(flags).filter((id) => DEDUCTION_BY_FLAG.has(id));

  return {
    evidence: [...state.evidence],
    deductions,
    minutesLeft: Math.max(0, Math.floor(opts.remainingMs / 60_000)),
    flags,
  };
}

/** Turn a dossier into the prose block appended to an NPC's system instruction. */
export function renderDossier(dossier: NpcDossier): string {
  const held = dossier.evidence.map((id) => EVIDENCE_TITLES.get(id) ?? id);
  const concluded = dossier.deductions
    .map((flag) => DEDUCTION_BY_FLAG.get(flag)?.conclusion)
    .filter((c): c is string => Boolean(c));

  const lines = [
    held.length
      ? `- The detective is carrying: ${held.join("; ")}.`
      : "- The detective is carrying no evidence yet.",
    concluded.length ? `- They have already worked out:\n${concluded.map((c) => `  - ${c}`).join("\n")}` : "",
    dossier.minutesLeft > 0
      ? `- Roughly ${dossier.minutesLeft} minute${dossier.minutesLeft === 1 ? "" : "s"} left before the transfer settles.`
      : "- The settlement window has closed. The money is gone.",
    Object.keys(dossier.flags).length
      ? `- What you know so far: ${Object.keys(dossier.flags).join(", ")}.`
      : "",
  ].filter(Boolean);

  return `WHAT YOU KNOW RIGHT NOW\n${lines.join("\n")}`;
}
