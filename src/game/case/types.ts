/**
 * Case contracts — evidence, deductions, the whole authored case, and the
 * closed set of ways it can end.
 *
 * Shared contract owned by `chore/game-contracts`. Import it; do not edit it.
 * Types and interfaces only — the case board, evidence renderers and
 * `verifyClaim()` live beside this file (D2, feat/detective-ui); case data
 * lives in `src/content/cases/`.
 *
 * Spec: docs/DETECTIVE-TRACK-24H.md section 4 (D2).
 */

import type { Condition, DialogueNode } from "@/game/dialogue/types";
import type { FlagId } from "@/game/state/types";
import type { LocationId } from "@/game/world/types";

/**
 * A document the detective can collect and read. Rendered by the existing
 * DistrictArtifact renderers, so `kind` picks the presentation and `lines`
 * carries the content.
 */
export interface EvidenceItem {
  id: string;
  title: string;
  /** Reuses the DistrictArtifact renderers. */
  kind: "ledger" | "tracking" | "log" | "notice" | "chat" | "statement";
  lines: { text: string; value?: string; flag?: boolean }[];
  /** A lead that goes nowhere. Must be plausible, and must be dismissible. */
  falseLead?: boolean;
}

/**
 * A conclusion the player can reach by holding the right documents together.
 * Deductions are the only way `unlocksFlag` is set — the player must actually
 * combine the evidence, not merely possess it.
 */
export interface Deduction {
  id: string;
  /** Evidence ids that, held together, unlock this conclusion. */
  from: string[];
  conclusion: string;
  unlocksFlag: FlagId;
}

/**
 * How a case can end. Closed union so `CaseDefinition.outcomes` is exhaustive
 * and no case can ship with an unhandled ending.
 *
 * Never AI-decided: the outcome is whichever entry's `requires` passes.
 */
export type CaseOutcome =
  /** Correct deduction inside the ten-minute window; the transfer is frozen. */
  | "funds-recovered"
  /** Correct deduction after the window; the lawful recovery path returns part of it. */
  | "partial-recovery"
  /** The window closed with no conclusion reached. Routes into recovery, never a dead end. */
  | "case-unsolved"
  /** A false lead was pursued to an accusation. The real transfer completed. */
  | "wrong-suspect"
  /** A legitimate party was treated as a scammer. A mistake, and scored as one. */
  | "genuine-turned-away";

/**
 * One complete authored case: its places, its documents, the conclusions they
 * support, every conversation, and the deterministic mapping from end state to
 * ending.
 */
export interface CaseDefinition {
  id: string;
  title: string;
  locations: LocationId[];
  evidence: EvidenceItem[];
  deductions: Deduction[];
  dialogue: Record<string, DialogueNode>;
  /** Deterministic. Never AI-decided. */
  outcomes: Record<CaseOutcome, { requires: Condition; debrief: string }>;
}
