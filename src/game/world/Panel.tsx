"use client";

/**
 * Panel — renders a panel background, hotspot layer and overlay slot.
 *
 * Uses `data-tone` attribute to drive the colour palette. Structured so a
 * future `public/art/panels/<id>/bg.avif` replaces the procedural background
 * with no component change — the asset resolver checks for it.
 *
 * Backgrounds are DOM + CSS, not WebGL.
 */

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { PanelDefinition } from "@/game/world/types";
import type { PanelHandlers } from "@/game/integration/panel-actions";
import { panels } from "./registry";
import { resolveBackground } from "./assets";
import { Hotspot } from "./Hotspot";
import {
  OfficeBackground,
  VictimFlatBackground,
  BankBranchBackground,
  RepairShopBackground,
  PoliceStationBackground,
} from "./backgrounds";
import "./panels.css";

/** Map panel id to its T0 procedural background component. */
function ProceduralBackground({ panelId }: { panelId: string }) {
  switch (panelId) {
    case "office":
      return <OfficeBackground />;
    case "victim-flat":
      return <VictimFlatBackground />;
    case "bank-branch":
      return <BankBranchBackground />;
    case "repair-shop":
      return <RepairShopBackground />;
    case "police-station":
      return <PoliceStationBackground />;
    default:
      return null;
  }
}

export interface PanelProps {
  panel: PanelDefinition;
  handlers: PanelHandlers;
  children?: ReactNode;
  overlay?: ReactNode;
}

export function Panel({ panel, handlers, children, overlay }: PanelProps) {
  const [commissionedBg, setCommissionedBg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void resolveBackground(panel.id).then((path) => {
      if (!cancelled && path) setCommissionedBg(path);
    });
    return () => { cancelled = true; };
  }, [panel.id]);

  const noop = useCallback(() => {}, []);

  return (
    <div
      className="panel"
      data-tone={panel.tone}
      data-panel-id={panel.id}
      aria-labelledby={`panel-title-${panel.id}`}
    >
      {/* Background layer — commissioned or procedural */}
      {commissionedBg ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={commissionedBg}
          alt=""
          className="panel-bg-commissioned"
          loading="eager"
        />
      ) : (
        <ProceduralBackground panelId={panel.id} />
      )}

      {/* Sodium-amber light gradient */}
      <div className="panel-amber-gradient" />

      {/* Grain and halftone overlays */}
      <div className="panel-grain" />
      <div className="panel-halftone" />

      {/* Vignette */}
      <div className="panel-vignette" />

      {/* Location title — large, subtle */}
      <span
        id={`panel-title-${panel.id}`}
        className="panel-title"
      >
        {panel.title}
      </span>

      {/* Hotspot layer */}
      <div className="hotspot-layer">
        {panel.hotspots.map((hotspot) => (
          <Hotspot
            key={hotspot.id}
            hotspot={hotspot}
            panels={panels}
            handlers={handlers}
          />
        ))}
      </div>

      {/* Content slot — dialogue, evidence, etc. */}
      {children && <div className="panel-content">{children}</div>}

      {/* Overlay slot — modals, full-screen evidence, calls */}
      {overlay && <div className="panel-overlay">{overlay}</div>}
    </div>
  );
}
