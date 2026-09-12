/**
 * Panel transition and navigation utilities.
 *
 * Lazy-loads panel components. Transitions use `--d-wipe` (1400 ms) and
 * honour `prefers-reduced-motion`.
 */

import type { LocationId } from "@/game/world/types";
import { panelHref } from "./registry";

/** Duration tokens from the design system (ms). */
export const WIPE_DURATION = 1400;
export const REDUCED_MOTION_DURATION = 0;

/** Check if the user prefers reduced motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Get the appropriate transition duration. */
export function getTransitionDuration(): number {
  return prefersReducedMotion() ? REDUCED_MOTION_DURATION : WIPE_DURATION;
}

/** Build the city URL for a given panel id. */
export function navigateToPanel(id: LocationId): string {
  return panelHref(id);
}

/** Build the city map URL. */
export function navigateToMap(): string {
  return "/city";
}
