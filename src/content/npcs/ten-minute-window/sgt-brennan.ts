import type { NpcDefinition } from "./detective";

/**
 * Police desk sergeant NPC definition.
 * Matches docs/ART-REQUIREMENTS.md §3 character-id `sgt-brennan`.
 * Procedural, unhurried, not obstructive.
 */
export const sgtBrennanNpc: NpcDefinition = {
  id: "sgt-brennan",
  name: "Sgt. Balan Brennan",
  role: "Duty Desk Officer",
  location: "police-station",
  initialTrust: 10,
  summary: "Veteran station duty officer with decades of service handling economic offenses and local cyber fraud reports. Calm under administrative pressure, meticulous with chain of custody, and committed to lawful victim restitution.",
  expressions: ["neutral", "concerned", "guarded", "open"],
};
