import type { NpcDefinition } from "./detective";

/**
 * Victim NPC definition.
 * Matches docs/ART-REQUIREMENTS.md §3 character-id `mara-okoye`.
 * Written with dignity: competent, capable, embarrassed — never foolish.
 */
export const maraOkoyeNpc: NpcDefinition = {
  id: "mara-okoye",
  name: "Mara Okoye",
  role: "Architect / Account Holder",
  location: "victim-flat",
  initialTrust: 15,
  summary: "Senior architectural project lead in her mid-40s. Highly organized and competent; embarrassed and shaken that urgent caller pressure bypassed her usual caution.",
  expressions: ["neutral", "concerned", "guarded", "open"],
};
