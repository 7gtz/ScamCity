import type { NpcDefinition } from "./detective";

/**
 * Phone-repair shop owner NPC definition.
 * Matches docs/ART-REQUIREMENTS.md §3 character-id `ravi-sunder`.
 * Wary of police, not a criminal. Carries the false lead.
 */
export const raviSunderNpc: NpcDefinition = {
  id: "ravi-sunder",
  name: "Ravi Sunder",
  role: "Proprietor, Apex Fix & Tech",
  location: "repair-shop",
  initialTrust: -10,
  summary: "Independent electronics repair technician. Protective of his livelihood and cautious around law enforcement, but willing to share diagnostic logs and carrier tickets when treated fairly.",
  expressions: ["neutral", "concerned", "guarded", "open"],
};
