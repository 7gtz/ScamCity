import type { NpcId, NpcSessionStatus } from "./types";

/**
 * Supplied 16:9 key art. Standalone frames establish identity; paired frames
 * are used when an interview has become an active scene. Keeping the mapping
 * here prevents filenames from leaking into dialogue or UI components.
 */
const ART_ROOT = "/art/frames";

const PORTRAITS: Record<NpcId, string> = {
  miller: `${ART_ROOT}/detective.png`,
  mara: `${ART_ROOT}/girl.png`,
  "mara-call": `${ART_ROOT}/scammer_girl.png`,
  vance: `${ART_ROOT}/banker.png`,
  ravi: `${ART_ROOT}/boy.png`,
  brennan: `${ART_ROOT}/boy_detective.png`,
};

export function npcPortraitArt(npc: NpcId): string {
  return PORTRAITS[npc];
}

/** Pick a contextual frame without making the AI decide presentation state. */
export function npcSceneArt(npc: NpcId, status: NpcSessionStatus, trust = 0): string {
  if (npc === "mara-call") return `${ART_ROOT}/scammer_girl.png`;
  if (npc === "miller") return status === "live" ? `${ART_ROOT}/girl_boy_detective.png` : `${ART_ROOT}/girl_detective.png`;
  if (npc === "mara") return status === "live" ? `${ART_ROOT}/girl_detective.png` : `${ART_ROOT}/girl.png`;
  if (npc === "vance") return status === "live" ? `${ART_ROOT}/banker_girl.png` : `${ART_ROOT}/boy_banker.png`;
  if (npc === "ravi") return trust < 0 ? `${ART_ROOT}/boy_girl_angry.png` : `${ART_ROOT}/boy_girl_calm.png`;
  return status === "live" ? `${ART_ROOT}/boy_detective.png` : `${ART_ROOT}/girl_boy_detective.png`;
}
