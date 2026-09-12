import type { PanelDefinition } from "./types";

/** Authoring diagnostics. Rectangles describe artwork, not the fixed-size button target. */
export function validatePanels(panels: readonly PanelDefinition[]): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const panel of panels) {
    if (ids.has(panel.id)) issues.push(`Duplicate panel: ${panel.id}`);
    ids.add(panel.id);
    const hotspots = new Set<string>();
    for (const [index, hotspot] of panel.hotspots.entries()) {
      if (hotspots.has(hotspot.id)) issues.push(`Duplicate hotspot: ${panel.id}/${hotspot.id}`);
      hotspots.add(hotspot.id);
      const { x, y, w, h } = hotspot.rect;
      if (![x, y, w, h].every(Number.isFinite) || x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > 100 || y + h > 100) issues.push(`Out-of-range rectangle: ${hotspot.id}`);
      for (const other of panel.hotspots.slice(0, index)) {
        const r = other.rect;
        const area = Math.max(0, Math.min(x + w, r.x + r.w) - Math.max(x, r.x)) * Math.max(0, Math.min(y + h, r.y + r.h) - Math.max(y, r.y));
        if (area / Math.min(w * h, r.w * r.h) > .35) issues.push(`Excessive overlap: ${other.id}/${hotspot.id}`);
      }
    }
  }
  return issues;
}
