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
  name: "Detective Dev Malhotra",
  role: "Lead Financial Crime Investigator",
  location: "office",
  initialTrust: 0,
  summary: "Grounded, observant fraud investigator. Methodical and sharp, relying on verified paper trails, digital forensics, and lawful banking procedure rather than cinematic hunches.",
  expressions: ["neutral", "concerned", "guarded", "open"],
};
