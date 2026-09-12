import type { CaseDefinition } from "@/game/case/types";
import type { LocationId } from "@/game/world/types";
import { TEN_MINUTE_EVIDENCE } from "./evidence";
import { TEN_MINUTE_DEDUCTIONS } from "./deductions";
import { TEN_MINUTE_DIALOGUE } from "./dialogue";
import { TEN_MINUTE_OUTCOMES } from "./outcomes";

export * from "./evidence";
export * from "./deductions";
export * from "./dialogue";
export * from "./outcomes";
export * from "./victim";

export const TEN_MINUTE_LOCATIONS: LocationId[] = [
  "office",
  "victim-flat",
  "bank-branch",
  "repair-shop",
  "police-station",
];

/**
 * Case Definition: "The Ten-Minute Window"
 *
 * Implements the complete CaseDefinition contract from src/game/case/types.ts.
 * Authored strictly with fictional entities, lawful pathways, and deterministic outcomes.
 */
export const tenMinuteWindowCase: CaseDefinition = {
  id: "ten-minute-window",
  title: "The Ten-Minute Window",
  locations: TEN_MINUTE_LOCATIONS,
  evidence: TEN_MINUTE_EVIDENCE,
  deductions: TEN_MINUTE_DEDUCTIONS,
  dialogue: TEN_MINUTE_DIALOGUE,
  outcomes: TEN_MINUTE_OUTCOMES,
};

export default tenMinuteWindowCase;
