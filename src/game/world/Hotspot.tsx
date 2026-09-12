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

import { useCallback } from "react";
import type { Hotspot as HotspotDef, PanelDefinition } from "@/game/world/types";
import { activateHotspot, type PanelHandlers } from "@/game/integration/panel-actions";
import { canAccess } from "@/game/integration/game";
import "./panels.css";

export interface HotspotProps {
  hotspot: HotspotDef;
  panels: readonly PanelDefinition[];
  handlers: PanelHandlers;
  /**
   * Authored interaction state. `locked` renders the control as present but
   * unavailable — announced, focusable, and explicitly not actionable.
   */
  state?: "available" | "relevant" | "collected" | "complete" | "locked";
  /** Why a `locked` hotspot is unavailable. Shown and announced; never a rule. */
  requirement?: string;
}

export function Hotspot({ hotspot, panels, handlers, state = "available", requirement }: HotspotProps) {
  const locked = state === "locked";
  const handleActivate = useCallback(() => {
    if (locked) return;
    activateHotspot(hotspot, panels, handlers);
  }, [locked, hotspot, panels, handlers]);

  // Respect condition gating after hooks so visibility changes preserve hook order.
  if (!canAccess(hotspot.requires)) return null;

  return (
    <button
      type="button"
      className="hotspot"
      aria-label={locked && requirement ? `${hotspot.label} — locked. ${requirement}` : `${hotspot.label} — ${state}`}
      aria-disabled={locked || undefined}
      data-interaction-state={state}
      data-label-edge={hotspot.rect.x < 25 ? "left" : hotspot.rect.x > 65 ? "right" : "center"}
      data-hotspot-id={hotspot.id}
      data-action-kind={hotspot.action.kind}
      style={{
        left: `${Math.max(8, Math.min(92, hotspot.rect.x + hotspot.rect.w / 2))}%`,
        top: `${Math.max(20, Math.min(80, hotspot.rect.y + hotspot.rect.h / 2))}%`,
      }}
      onClick={handleActivate}
    >
      <span className="hotspot-marker" aria-hidden="true">{hotspot.action.kind === "travel" ? "→" : hotspot.action.kind === "talk" ? "Talk" : "Inspect"}</span>
      <span className="hotspot-label" aria-hidden="true">
        {hotspot.label}
        {state !== "available" && <strong> · {state}</strong>}
        {locked && requirement && <em className="hotspot-requirement"> — {requirement}</em>}
      </span>
    </button>
  );
}
