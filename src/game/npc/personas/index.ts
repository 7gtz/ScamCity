import type { NpcId } from "../types";
import { millerPersona } from "./miller";
import { maraPersona } from "./mara";
import { maraCallPersona } from "./mara-call";
import { vancePersona } from "./vance";
import { raviPersona } from "./ravi";
import { brennanPersona } from "./brennan";

export * from "./shared";
export { millerPersona, maraPersona, maraCallPersona, vancePersona, raviPersona, brennanPersona };

export const NPC_PERSONAS: Record<NpcId, import("./shared").NpcPersona> = {
  miller: millerPersona,
  mara: maraPersona,
  "mara-call": maraCallPersona,
  vance: vancePersona,
  ravi: raviPersona,
  brennan: brennanPersona,
};
