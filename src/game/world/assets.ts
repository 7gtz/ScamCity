/**
 * Deterministic commissioned-art manifest. Add entries only alongside shipped
 * files. Unlisted locations render their procedural background immediately.
 */

import type { LocationId } from "@/game/world/types";

/** Known commissioned background assets for instant rendering without flash or 404s. */
const KNOWN_BACKGROUNDS: Partial<Record<LocationId, string>> = {
  office: "/art/panels/office/bg-v2.png",
  "victim-flat": "/art/panels/victim-flat/bg-v2.png",
  "bank-branch": "/art/panels/bank-branch/bg.png",
  "repair-shop": "/art/panels/repair-shop/bg.png",
  "police-station": "/art/panels/police-station/bg.png",
};

/** Get synchronously known background path if available. */
export function getStaticBackground(id: LocationId): string | null {
  return KNOWN_BACKGROUNDS[id] ?? null;
}


/** Convention path for a commissioned panel background. */
export function panelBgPath(id: LocationId, ext: string = ".jpg"): string {
  return `/art/panels/${id}/bg${ext}`;
}

/** Convention path for a commissioned panel foreground layer. */
export function panelFgPath(id: LocationId): string {
  return `/art/panels/${id}/fg.webp`;
}

/** Convention path for a panel thumbnail (map tooltips, T1). */
export function panelThumbPath(id: LocationId): string {
  return `/art/panels/${id}/thumb.webp`;
}

/**
 * Check whether a commissioned background exists for a panel.
 * Returns the path if it does, null otherwise.
 *
 * Compatibility async API. Never performs runtime network discovery.
 */
export async function resolveBackground(id: LocationId): Promise<string | null> {
  return getStaticBackground(id);
}
