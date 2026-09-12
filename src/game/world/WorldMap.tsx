"use client";

/**
 * WorldMap — city map screen showing all five locations.
 *
 * Node states: locked | open | current | cleared.
 * SVG-based transit map with keyboard navigation.
 * Respects `prefers-reduced-motion`.
 */

import Link from "next/link";
import { useGameState } from "@/game/integration/use-game-state";
import { useGameReady } from "@/game/integration/GameProvider";
import { canAccess } from "@/game/integration/game";
import { panels, panelHref } from "./registry";
import {
  PANEL_POSITIONS,
  PANEL_ORDER,
  ROUTE_PATH,
  PANEL_LENGTHS,
  ROUTE_LENGTH,
} from "./geometry";
import type { LocationId } from "@/game/world/types";

type NodeState = "locked" | "open" | "current" | "cleared";

export function getNodeState(panelId: LocationId, currentLocation: LocationId, clearedPanels: Set<string>, isAccessible: boolean): NodeState {
  if (!isAccessible) return "locked";
  if (panelId === currentLocation) return "current";
  if (clearedPanels.has(panelId)) return "cleared";
  if (isAccessible) return "open";
  return "locked";
}

const NODE_COLORS: Record<NodeState, string> = {
  locked: "var(--color-dim)",
  open: "var(--color-bone)",
  current: "var(--color-amber)",
  cleared: "var(--color-safe)",
};

const NODE_STROKE: Record<NodeState, string> = {
  locked: "var(--color-line)",
  open: "var(--color-smoke)",
  current: "var(--color-amber)",
  cleared: "var(--color-safe)",
};

export interface WorldMapProps {
  completedLocations?: readonly LocationId[];
  availableLocations?: readonly LocationId[];
  objective?: string;
}

export function WorldMap({ completedLocations, availableLocations, objective }: WorldMapProps = {}) {
  const ready = useGameReady();
  const location = useGameState((s) => s.location);
  const flags = useGameState((s) => s.flags);

  if (!ready) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-24 text-bone" role="status">
        <p>Restoring investigation…</p>
      </section>
    );
  }

  // Derive cleared panels from flags
  const clearedPanels = new Set<string>(completedLocations);
  for (const [key, value] of Object.entries(flags)) {
    if (!completedLocations && key.startsWith("panel.cleared.") && value === true) {
      clearedPanels.add(key.replace("panel.cleared.", ""));
    }
  }

  // Calculate the progress line length (how far along the route the player has been)
  const currentPanelLength = Math.max(0, ...[...clearedPanels].map((id) => PANEL_LENGTHS[id as LocationId] ?? 0));
  const progressFraction = currentPanelLength / ROUTE_LENGTH;

  return (
    <section
      aria-labelledby="city-map-title"
      className="mx-auto max-w-5xl px-6 py-24 text-bone"
    >
      <p className="font-mono text-sm uppercase tracking-widest text-amber">
        SCAM CITY / Detective Track
      </p>
      <h1 id="city-map-title" className="my-6 font-display text-5xl">
        The Ten-Minute Window
      </h1>
      <p className="mb-10 text-smoke">
        {objective ?? "Choose a location."} Your investigation is saved on this device.
      </p>

      <p>● Current · → Available · ✓ Complete · Locked</p>
      {/* Decorative overview; the full-size location cards are the navigation. */}
      <div className="relative mx-auto hidden md:block" aria-hidden="true" style={{ maxWidth: "800px" }}>
        <svg
          viewBox="0 0 800 400"
          className="w-full"
          aria-label="City investigation map"
          role="img"
        >
          {/* Route line — untravelled */}
          <path
            d={ROUTE_PATH}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Route line — travelled portion */}
          <path
            d={ROUTE_PATH}
            fill="none"
            stroke="var(--color-amber)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${ROUTE_LENGTH}`}
            strokeDashoffset={`${ROUTE_LENGTH * (1 - progressFraction)}`}
            opacity="0.7"
            style={{ transition: "stroke-dashoffset var(--d-reveal) var(--ease-out)" }}
          />

          {/* Panel nodes */}
          {PANEL_ORDER.map((panelId) => {
            const panel = panels.find((p) => p.id === panelId);
            if (!panel) return null;

            const pos = PANEL_POSITIONS[panelId];
            const accessible = availableLocations ? availableLocations.includes(panel.id) : canAccess(panel.requires);
            const state = getNodeState(panelId, location, clearedPanels, accessible);

            return (
              <g key={panelId}>
                {/* Node circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={state === "current" ? 18 : 14}
                  fill={state === "locked" ? "var(--color-surface)" : NODE_COLORS[state]}
                  stroke={NODE_STROKE[state]}
                  strokeWidth="2"
                  opacity={state === "locked" ? 0.4 : 1}
                  style={{ transition: "r var(--d-ui) var(--ease-out), opacity var(--d-ui) var(--ease-out)" }}
                />

                {/* State icon */}
                {state === "locked" && (
                  <text
                    x={pos.x}
                    y={pos.y + 4}
                    textAnchor="middle"
                    fontSize="12"
                    fill="var(--color-dim)"
                    aria-hidden="true"
                  >
                    ✕
                  </text>
                )}
                {state === "cleared" && (
                  <text
                    x={pos.x}
                    y={pos.y + 5}
                    textAnchor="middle"
                    fontSize="14"
                    fill="var(--color-ink)"
                    aria-hidden="true"
                  >
                    ✓
                  </text>
                )}
                {state === "current" && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={6}
                    fill="var(--color-ink)"
                  />
                )}

                {/* Label below node */}
                <text
                  x={pos.x}
                  y={pos.y + 34}
                  textAnchor="middle"
                  fontSize="11"
                  fontFamily="var(--font-mono)"
                  fill={state === "locked" ? "var(--color-dim)" : "var(--color-smoke)"}
                  letterSpacing="0.04em"
                >
                  {panel.title}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Clickable node links — positioned over the SVG */}
        <div
          className="absolute inset-0"
          style={{ pointerEvents: "none" }}
        >
          {PANEL_ORDER.map((panelId) => {
            const panel = panels.find((p) => p.id === panelId);
            if (!panel) return null;

            const pos = PANEL_POSITIONS[panelId];
            const accessible = availableLocations ? availableLocations.includes(panel.id) : canAccess(panel.requires);
            const state = getNodeState(panelId, location, clearedPanels, accessible);

            // Convert SVG coordinates to percentage for overlay
            const xPct = (pos.x / 800) * 100;
            const yPct = (pos.y / 400) * 100;

            if (state === "locked") {
              return (
                <div
                  key={panelId}
                  className="absolute"
                  style={{
                    left: `${xPct}%`,
                    top: `${yPct}%`,
                    width: "40px",
                    height: "40px",
                    transform: "translate(-50%, -50%)",
                    pointerEvents: "auto",
                    cursor: "not-allowed",
                  }}
                  aria-label={`${panel.title} — Locked`}
                  aria-disabled="true"
                />
              );
            }

            return (
              <Link
                tabIndex={-1}
                key={panelId}
                href={panelHref(panelId)}
                className="absolute block rounded-full"
                style={{
                  left: `${xPct}%`,
                  top: `${yPct}%`,
                  width: "40px",
                  height: "40px",
                  transform: "translate(-50%, -50%)",
                  pointerEvents: "auto",
                }}
                aria-label={`Go to ${panel.title}${state === "current" ? " (current)" : state === "cleared" ? " (cleared)" : ""}`}
              />
            );
          })}
        </div>
      </div>

      {/* Panel list — accessible fallback and mobile-friendly */}
      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
        {panels.map((panel) => {
          const accessible = availableLocations ? availableLocations.includes(panel.id) : canAccess(panel.requires);
          const state = getNodeState(panel.id, location, clearedPanels, accessible);

          return (
            <li
              key={panel.id}
              className="border border-line p-5"
              style={{
                borderLeftColor: state === "current" ? "var(--color-amber)" : state === "cleared" ? "var(--color-safe)" : undefined,
                borderLeftWidth: state === "current" || state === "cleared" ? "3px" : undefined,
                opacity: state === "locked" ? 0.5 : 1,
              }}
            >
              {accessible ? (
                <Link
                  href={panelHref(panel.id)}
                  className="inline-flex min-h-11 min-w-11 items-center text-xl font-display underline underline-offset-4"
                >
                  {panel.title}
                </Link>
              ) : (
                <span className="text-xl font-display text-dim">
                  {panel.title} — Locked
                </span>
              )}
              {/*
                * Current and complete are independent facts, not one state.
                * `getNodeState` collapses them for the node's colour, which is
                * fine for a single swatch — but a player standing in a location
                * they have already finished could not tell it was finished.
                * The list reports both.
                */}
              {state === "current" && (
                <p className="mt-2 text-sm text-amber">Current location</p>
              )}
              {clearedPanels.has(panel.id) && (
                <p className="mt-2 text-sm text-safe">✓ Complete</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
