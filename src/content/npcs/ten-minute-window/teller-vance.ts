import type { NpcDefinition } from "./detective";

/**
 * Bank teller NPC definition.
 * Matches docs/ART-REQUIREMENTS.md §3 character-id `teller-vance`.
 * Helpful within rules, slightly defensive.
 */
export const tellerVanceNpc: NpcDefinition = {
  id: "teller-vance",
  name: "Teller Vance",
  role: "Senior Branch Specialist",
  location: "bank-branch",
  initialTrust: 0,
  summary: "Frontline Northstar Bank customer representative. Adheres strictly to internal security protocols and fraud escalation thresholds; responsive to verified documentation.",
  expressions: ["neutral", "concerned", "guarded", "open"],
};
