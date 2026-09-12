"use client";

/**
 * Hotspot — an interactive region inside a panel.
 *
 * Positioned by percentage box (rect: {x, y, w, h} — all percentages) so
 * it scales with any viewport. Works by pointer, keyboard and touch.
 *
 * Focusable, activatable via click/Enter/Space. Hidden hotspots respect
 * `requires` via the foundation's `canAccess()`.
 */

import { useCallback, type KeyboardEvent } from "react";
import type { Hotspot as HotspotDef, PanelDefinition } from "@/game/world/types";
import { activateHotspot, type PanelHandlers } from "@/game/integration/panel-actions";
import { canAccess } from "@/game/integration/game";
import "./panels.css";

export interface HotspotProps {
  hotspot: HotspotDef;
  panels: readonly PanelDefinition[];
  handlers: PanelHandlers;
}

export function Hotspot({ hotspot, panels, handlers }: HotspotProps) {
  // Respect condition gating
  if (!canAccess(hotspot.requires)) return null;

  const handleActivate = useCallback(() => {
    activateHotspot(hotspot, panels, handlers);
  }, [hotspot, panels, handlers]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleActivate();
      }
    },
    [handleActivate],
  );

  return (
    <div
      className="hotspot"
      role="button"
      tabIndex={0}
      aria-label={hotspot.label}
      data-hotspot-id={hotspot.id}
      data-action-kind={hotspot.action.kind}
      style={{
        left: `${hotspot.rect.x}%`,
        top: `${hotspot.rect.y}%`,
        width: `${hotspot.rect.w}%`,
        height: `${hotspot.rect.h}%`,
      }}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
    >
      <span className="hotspot-indicator" aria-hidden="true" />
      <span className="hotspot-label" aria-hidden="true">
        {hotspot.label}
      </span>
    </div>
  );
}
