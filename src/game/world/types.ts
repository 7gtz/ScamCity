/**
 * World layer contracts — the places the detective can be, and the things in
 * them that can be activated.
 *
 * Shared contract owned by `chore/game-contracts`. Import it; do not edit it.
 * Types and interfaces only — no runtime logic lives in this file.
 *
 * Spec: docs/DETECTIVE-TRACK-24H.md section 4 (D1).
 */

import type { Condition } from "@/game/dialogue/types";

/**
 * Every place in the case. A closed union rather than a string so that a typo
 * in a panel definition, a travel hotspot or a route parameter fails typecheck
 * instead of producing a dead link at runtime.
 */
export type LocationId =
  | "office"
  | "victim-flat"
  | "bank-branch"
  | "repair-shop"
  | "police-station";

/**
 * An activatable region inside a panel: a person to talk to, an object to
 * inspect, or a way out. Hotspots carry intent only — the case layer decides
 * what actually happens.
 */
export interface Hotspot {
  id: string;
  /** Percentage box within the panel, so it scales with any viewport. */
  rect: { x: number; y: number; w: number; h: number };
  label: string;
  /** What activating it does. Resolved by the case layer, not the world layer. */
  action:
    | { kind: "talk"; npc: string }
    | { kind: "inspect"; evidence: string }
    | { kind: "travel"; to: LocationId };
  /** Hidden until this condition passes. */
  requires?: Condition;
}

/**
 * One screen of the game: a location, its art tone, and everything the player
 * can reach from it. Panel art is DOM + CSS driven by `tone`, not WebGL.
 */
export interface PanelDefinition {
  id: LocationId;
  title: string;
  tone: "dark" | "ember" | "paper" | "amber";
  hotspots: Hotspot[];
  /** Unlocked on the world map only when this passes. */
  requires?: Condition;
}
