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
  summary: "Veteran electronics and smartphone repair technician. Fiercely protective of his shop's hard-earned market reputation and instinctively cautious around police scrutiny, but helpful and technically astute when treated with professional respect.",
  expressions: ["neutral", "concerned", "guarded", "open"],
};
