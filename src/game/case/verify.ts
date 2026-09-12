/**
 * Deterministic verification — does a claim match held evidence?
 *
 * This is the game's core question and must NEVER be answered by a model.
 * Pure functions, fully unit-testable.
 *
 * Spec: ops/prompts/antigravity-dialogue-case.md §4.7.
 */

import type { Deduction, EvidenceItem } from "@/game/case/types";

/**
 * Check whether a specific evidence item is held by the player.
 */
export function hasEvidence(evidenceId: string, heldEvidence: readonly string[]): boolean {
  return heldEvidence.includes(evidenceId);
}

/**
 * Check whether a deduction's requirements are fully satisfied.
 *
 * A deduction fires only when EVERY id in its `from` array is held.
 * This is deterministic — never AI-decided.
 */
export function isDeductionReady(
  deduction: Deduction,
  heldEvidence: readonly string[],
): boolean {
  return deduction.from.every((id) => heldEvidence.includes(id));
}

/**
 * Return all deductions that are newly unlockable given the current evidence
 * and the set of flags already set.
 *
 * A deduction is "newly unlockable" if:
 * 1. Every evidence id in `from` is in `heldEvidence`
 * 2. Its `unlocksFlag` is not yet in `activeFlags`
 */
export function checkDeductions(
  deductions: readonly Deduction[],
  heldEvidence: readonly string[],
  activeFlags: Record<string, boolean | number | string>,
): Deduction[] {
  return deductions.filter(
    (d) =>
      isDeductionReady(d, heldEvidence) &&
      !Object.hasOwn(activeFlags, d.unlocksFlag),
  );
}

/**
 * Verify whether a claimed evidence combination matches a specific deduction.
 *
 * Used to validate player claims on the case board — deterministic, not AI.
 */
export function verifyClaim(
  claimedEvidenceIds: readonly string[],
  deduction: Deduction,
  heldEvidence: readonly string[],
): boolean {
  // All claimed evidence must be held
  if (!claimedEvidenceIds.every((id) => heldEvidence.includes(id))) return false;
  // The claimed set must contain all required evidence for the deduction
  return deduction.from.every((id) => claimedEvidenceIds.includes(id));
}

/**
 * Get all evidence items from a case definition that the player currently holds.
 */
export function getHeldEvidenceItems(
  allEvidence: readonly EvidenceItem[],
  heldIds: readonly string[],
): EvidenceItem[] {
  return allEvidence.filter((item) => heldIds.includes(item.id));
}

/**
 * Check whether any held evidence is a false lead.
 */
export function hasFalseLeads(
  allEvidence: readonly EvidenceItem[],
  heldIds: readonly string[],
): EvidenceItem[] {
  return allEvidence.filter(
    (item) => heldIds.includes(item.id) && item.falseLead === true,
  );
}
