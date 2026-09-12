import type { GameState } from "@/game/state/types";
import type { LocationId, PanelDefinition } from "@/game/world/types";
import { evaluateCondition } from "@/game/state/conditions";

type Facts = Pick<GameState, "flags" | "evidence">;
export const INVESTIGATION_LOCATIONS: readonly LocationId[] = ["office", "victim-flat", "bank-branch", "repair-shop", "police-station"];

/** One authored sequence, shared by route entry, map availability and travel activation. */
export function locationAccess(id: LocationId, state: Facts): { allowed: boolean; requirement: string } {
  if (id === "office") return { allowed: true, requirement: "" };
  if (!state.flags["case.opened"]) return { allowed: false, requirement: "Return to the detective office and open Mara Okoye’s case." };
  if (id === "victim-flat") return { allowed: true, requirement: "" };
  if (!state.evidence.includes("bank-statement")) return { allowed: false, requirement: "Preserve Mara’s bank statement at her flat before following the payment trail." };
  if (id === "bank-branch") return { allowed: true, requirement: "" };
  if (!state.flags["panel.visited.bank-branch"]) return { allowed: false, requirement: "Visit the bank branch with the preserved statement first." };
  if (id === "repair-shop") return { allowed: true, requirement: "" };
  return { allowed: state.evidence.includes("sim-swap-record"), requirement: "Preserve the carrier record at the bank or repair shop before visiting the police station." };
}

export function availableLocations(state: Facts): LocationId[] {
  return INVESTIGATION_LOCATIONS.filter((id) => locationAccess(id, state).allowed);
}

/** Meaningful completion, not visiting or clicking every object. Never infer a finding from possession alone. */
export function completedLocations(state: Facts): LocationId[] {
  const done: Record<LocationId, boolean> = {
    office: state.flags["case.opened"] === true,
    "victim-flat": ["call-log", "otp-message", "bank-statement"].every((id) => state.evidence.includes(id)),
    "bank-branch": state.flags["branch.emergency-freeze-applied"] === true,
    "repair-shop": state.flags["deduction.repair-shop-cleared"] === true,
    "police-station": state.flags["police.formal-report-lodged"] === true,
  };
  return INVESTIGATION_LOCATIONS.filter((id) => done[id] || state.flags[`panel.cleared.${id}`] === true);
}

export function currentObjective(state: Facts): string {
  if (state.flags["case.outcome"]) return "Review the case debrief and your verified evidence.";
  if (!state.flags["case.opened"]) return "Open Mara Okoye’s case at the detective office.";
  if (!["call-log", "otp-message", "bank-statement"].every((id) => state.evidence.includes(id))) return "Visit Mara’s flat and preserve the call, message and payment records.";
  if (!state.flags["deduction.freeze-authorization-ready"]) return "Use the Case Board to connect the records and establish grounds for intervention.";
  if (!state.flags["branch.emergency-freeze-applied"]) return "Present your verified findings to the bank and request an emergency freeze.";
  return "Take the evidence chain to the police and lodge a formal report.";
}

export function interactionStates(panel: PanelDefinition, state: Facts): Record<string, "available" | "relevant" | "collected" | "complete"> {
  return Object.fromEntries(panel.hotspots.map((hotspot) => {
    const action = hotspot.action;
    if (action.kind === "inspect") return [hotspot.id, state.evidence.includes(action.evidence) ? "collected" : "available"];
    if (action.kind === "talk") return [hotspot.id, state.flags[`interview.completed.${action.npc}`] ? "complete" : "available"];
    return [hotspot.id, locationAccess(action.to, state).allowed ? "relevant" : "available"];
  }));
}

/** Feed the world only accessible exits; locked destinations remain explained on the map/route. */
export function accessiblePanel(panel: PanelDefinition, state: GameState): PanelDefinition {
  return { ...panel, hotspots: panel.hotspots.filter((hotspot) =>
    (!hotspot.requires || evaluateCondition(hotspot.requires, state)) &&
    (hotspot.action.kind !== "travel" || locationAccess(hotspot.action.to, state).allowed)) };
}
