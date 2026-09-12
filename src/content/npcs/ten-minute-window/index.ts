export * from "./detective";
export * from "./mara-okoye";
export * from "./teller-vance";
export * from "./ravi-sunder";
export * from "./sgt-brennan";

import { detectiveNpc } from "./detective";
import { maraOkoyeNpc } from "./mara-okoye";
import { tellerVanceNpc } from "./teller-vance";
import { raviSunderNpc } from "./ravi-sunder";
import { sgtBrennanNpc } from "./sgt-brennan";
import type { NpcDefinition } from "./detective";

export const TEN_MINUTE_NPCS: Record<string, NpcDefinition> = {
  detective: detectiveNpc,
  "mara-okoye": maraOkoyeNpc,
  "teller-vance": tellerVanceNpc,
  "ravi-sunder": raviSunderNpc,
  "sgt-brennan": sgtBrennanNpc,
};
