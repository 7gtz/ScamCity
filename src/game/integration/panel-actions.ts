import type { Effect } from "@/game/dialogue/types";
import type { CaseDefinition, CaseOutcome } from "@/game/case/types";
import type { Hotspot, LocationId, PanelDefinition } from "@/game/world/types";
import { applyEffects, canAccess, emit, enterPanel, getGameState, giveEvidence, setFlag } from "./game";

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
    if (!target || !canAccess(target.requires)) return false;
    enterPanel(action.to);
    handlers.travel(action.to);
  }
  return true;
}

/** Inspection opens a UI first; only an explicit collect action records evidence. */
export function collectEvidence(caseDefinition: CaseDefinition, id: string): boolean {
  if (getGameState().caseId !== caseDefinition.id || !caseDefinition.evidence.some((item) => item.id === id)) return false;
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
export function createCallCompletion<T>(mapResult: (result: T) => readonly Effect[]): (result: T) => void {
  let completed = false;
  return (result) => {
    if (completed) return;
    const effects = mapResult(result);
    completed = true;
    applyEffects(effects);
  };
}
