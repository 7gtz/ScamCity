import type { Effect } from "@/game/dialogue/types";
import type { CaseDefinition, CaseOutcome } from "@/game/case/types";
import type { Hotspot, LocationId, PanelDefinition } from "@/game/world/types";
import { applyEffects, canAccess, emit, enterPanel, getGameState, giveEvidence, setFlag } from "./game";
import { locationAccess } from "./progression";

export interface PanelHandlers {
  talk: (npc: string) => void;
  inspect: (evidence: string) => void;
  travel: (location: LocationId) => void;
}

/** Re-check at activation time, including travel destination gates. */
export function activateHotspot(hotspot: Hotspot, panels: readonly PanelDefinition[], handlers: PanelHandlers): boolean {
  if (!canAccess(hotspot.requires)) return false;
  const action = hotspot.action;
  if (action.kind === "talk") handlers.talk(action.npc);
  else if (action.kind === "inspect") handlers.inspect(action.evidence);
  else {
    const target = panels.find((panel) => panel.id === action.to);
    if (!target || !canAccess(target.requires) || !locationAccess(action.to, getGameState()).allowed) return false;
    setFlag(`panel.visited.${action.to}`, true);
    enterPanel(action.to);
    handlers.travel(action.to);
  }
  return true;
}

/** Inspection opens a UI first; only an explicit collect action records evidence. */
export function collectEvidence(caseDefinition: CaseDefinition, id: string): boolean {
  const state = getGameState();
  if (state.caseId !== caseDefinition.id || state.flags["case.outcome"] || state.evidence.includes(id) || !caseDefinition.evidence.some((item) => item.id === id)) return false;
  giveEvidence(id);
  return true;
}

/** Authored outcome conditions, never an AI answer, authorize resolution. */
export function resolveCase(caseDefinition: CaseDefinition, outcome: CaseOutcome): boolean {
  const state = getGameState();
  if (state.caseId !== caseDefinition.id || state.flags["case.outcome"] !== undefined || !canAccess(caseDefinition.outcomes[outcome].requires)) return false;
  setFlag("case.outcome", outcome);
  emit({ type: "case-resolved", outcome });
  return true;
}

/** The simulation owner maps the existing call result to authored effects. */
/**
 * The flag that makes the prologue call's result canonical.
 *
 * Idempotence used to live in a closure, so it died with the component that
 * created it: remounting the panel, or pressing "Replay Call", produced a fresh
 * callback that happily rewrote the case flags and charged the stress a second
 * time. The record of "this has been scored" has to outlive the closure, so it
 * lives in persisted state like every other fact about the run.
 */
export const CALL_SCORED_FLAG = "victim.live-call-completed";

/** True once the prologue call has been played and scored for this case. */
export const hasScoredCall = (): boolean => Boolean(getGameState().flags[CALL_SCORED_FLAG]);

/**
 * Map a completed call into authored effects — once per case, ever.
 *
 * The first completed call is the canonical result and writes the case flags.
 * Every later call is a practice replay: it still plays, and the player still
 * gets their score screen from the call system, but it cannot touch case
 * history. Callers should read `hasScoredCall()` to label the replay in the UI.
 */
export function createCallCompletion<T>(mapResult: (result: T) => readonly Effect[]): (result: T) => void {
  return (result) => {
    if (hasScoredCall()) return;
    applyEffects(mapResult(result));
    setFlag(CALL_SCORED_FLAG, true);
  };
}
