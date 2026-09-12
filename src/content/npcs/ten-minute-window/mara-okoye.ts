import type { NpcDefinition } from "./detective";

/**
 * Victim NPC definition.
 * Matches docs/ART-REQUIREMENTS.md §3 character-id `mara-okoye`.
 * Written with dignity: competent, capable, embarrassed — never foolish.
 */
export const maraOkoyeNpc: NpcDefinition = {
  id: "mara-okoye",
  name: "Meera Okoye",
  role: "Principal Architect / Account Holder",
  location: "victim-flat",
  initialTrust: 15,
  summary: "Senior architectural project lead in her mid-40s. Highly organized, respected in her studio, and deeply shaken that urgent caller pressure bypassed her usual sharp caution.",
  expressions: ["neutral", "concerned", "guarded", "open"],
};
