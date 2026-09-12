import type { LocationId } from "@/game/world/types";

export interface NpcDefinition {
  id: string;
  name: string;
  role: string;
  location: LocationId;
  initialTrust: number;
  summary: string;
  expressions: ("neutral" | "concerned" | "guarded" | "open")[];
}

/**
 * Player detective definition.
 * Matches docs/ART-REQUIREMENTS.md §3 character-id `detective`.
 */
export const detectiveNpc: NpcDefinition = {
  id: "detective",
  name: "Detective Miller",
  role: "Lead Investigator",
  location: "office",
  initialTrust: 0,
  summary: "Grounded, observant municipal fraud investigator. Relies on verified paper trails and lawful procedure rather than cinematic hunches.",
  expressions: ["neutral", "concerned", "guarded", "open"],
};
