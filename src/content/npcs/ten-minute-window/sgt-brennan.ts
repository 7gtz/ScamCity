import type { NpcDefinition } from "./detective";

/**
 * Police desk sergeant NPC definition.
 * Matches docs/ART-REQUIREMENTS.md §3 character-id `sgt-brennan`.
 * Procedural, unhurried, not obstructive.
 */
export const sgtBrennanNpc: NpcDefinition = {
  id: "sgt-brennan",
  name: "Sgt. Brennan",
  role: "Duty Desk Sergeant",
  location: "police-station",
  initialTrust: 10,
  summary: "Veteran municipal station duty sergeant. Steady, procedural, and focused on lawful documentation, statutory fraud reporting, and inter-agency preservation requests.",
  expressions: ["neutral", "concerned", "guarded", "open"],
};
