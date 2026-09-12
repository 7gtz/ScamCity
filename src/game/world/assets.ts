/**
 * Asset resolver — checks for commissioned art at the convention path,
 * falls back to the procedural T0 background component.
 *
 * When a real `public/art/panels/<id>/bg.avif` is dropped in, this resolver
 * picks it up with no component change.
 */

import type { LocationId } from "@/game/world/types";

/** Convention path for a commissioned panel background. */
export function panelBgPath(id: LocationId): string {
  return `/art/panels/${id}/bg.avif`;
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
 * This is a client-side check — we attempt to load the image head.
 * In SSR / build, we always fall back to procedural.
 */
export async function resolveBackground(id: LocationId): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const path = panelBgPath(id);
  try {
    const res = await fetch(path, { method: "HEAD" });
    return res.ok ? path : null;
  } catch {
    return null;
  }
}
