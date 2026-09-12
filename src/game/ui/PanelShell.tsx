"use client";

/**
 * PanelShell — persistent chrome wrapping every detective-track panel.
 *
 * Provides: back, map, case board, inventory and settings affordances.
 * One shell, one owner, used by every panel.
 */

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import type { PanelDefinition } from "@/game/world/types";
import { navigateToMap } from "@/game/world/navigation";
import "./shell.css";

export interface PanelShellProps {
  panel: PanelDefinition;
  children: ReactNode;
  /** Called when case board button is pressed (wired by case agent). */
  onCaseBoard?: () => void;
  /** Called when inventory button is pressed (wired by case agent). */
  onInventory?: () => void;
  /** Called when settings button is pressed. */
  onSettings?: () => void;
}

/**
 * Publish the shell's *measured* height so content in normal flow can clear it.
 *
 * The shell is `position: fixed`, so anything in document flow starts beneath
 * it at y=0. The previous integration HUD assumed a 64px offset against a shell
 * that renders at 76px on desktop, and the timer and Hint/Restart controls were
 * partly covered.
 *
 * A hard-coded offset cannot be correct: the bar wraps at narrow widths, grows
 * with text zoom, and gains safe-area padding on notched devices. Measuring it
 * is the only version that holds under all three. Published as
 * `--city-shell-top` / `--city-shell-bottom` on the document element.
 */
function useShellMetrics(
  top: React.RefObject<HTMLDivElement | null>,
  bottom: React.RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const root = document.documentElement;
    const publish = () => {
      root.style.setProperty("--city-shell-top", `${Math.round(top.current?.getBoundingClientRect().height ?? 0)}px`);
      root.style.setProperty("--city-shell-bottom", `${Math.round(bottom.current?.getBoundingClientRect().height ?? 0)}px`);
    };
    publish();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", publish);
      return () => window.removeEventListener("resize", publish);
    }
    const observer = new ResizeObserver(publish);
    if (top.current) observer.observe(top.current);
    if (bottom.current) observer.observe(bottom.current);
    window.addEventListener("resize", publish);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", publish);
      root.style.removeProperty("--city-shell-top");
      root.style.removeProperty("--city-shell-bottom");
    };
  }, [top, bottom]);
}

/** SVG map icon (16×16). */
function MapIcon() {
  return (
    <svg className="shell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3 7 6-3 6 3 6-3v13l-6 3-6-3-6 3V7Z" />
      <path d="M9 4v13" />
      <path d="M15 7v13" />
    </svg>
  );
}

/** SVG clipboard icon for case board (16×16). */
function CaseBoardIcon() {
  return (
    <svg className="shell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  );
}

/** SVG briefcase icon for inventory (16×16). */
function InventoryIcon() {
  return (
    <svg className="shell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <rect width="20" height="14" x="2" y="6" rx="2" />
    </svg>
  );
}

/** SVG settings icon (16×16). */
function SettingsIcon() {
  return (
    <svg className="shell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function PanelShell({
  panel,
  children,
  onCaseBoard,
  onInventory,
  onSettings,
}: PanelShellProps) {
  const topBar = useRef<HTMLDivElement>(null);
  const bottomBar = useRef<HTMLDivElement>(null);
  useShellMetrics(topBar, bottomBar);
  const mapUrl = navigateToMap();
  const toneAttr = panel.tone === "paper" ? "paper" : undefined;

  return (
    <>
      {/* Shell overlay — fixed, pointer-events none, children pass through */}
      <nav className="panel-shell" aria-label="Panel navigation">
        {/* Top bar — back, map, case board, inventory, settings */}
        <div className="shell-top" ref={topBar}>
          <div className="shell-top-left">
            <Link
              href={mapUrl}
              className="shell-btn"
              data-tone={toneAttr}
              aria-label="Open city map"
            >
              <MapIcon />
              <span>City Map</span>
            </Link>
          </div>

          <div className="shell-top-right">
            {onCaseBoard && (
              <button
                type="button"
                className="shell-btn"
                data-tone={toneAttr}
                onClick={onCaseBoard}
                aria-label="Open case board"
              >
                <CaseBoardIcon />
                <span>Case Board</span>
              </button>
            )}
            {onInventory && (
              <button
                type="button"
                className="shell-btn"
                data-tone={toneAttr}
                onClick={onInventory}
                aria-label="Open Evidence"
              >
                <InventoryIcon />
                <span>Evidence</span>
              </button>
            )}
            {onSettings && (
              <button
                type="button"
                className="shell-btn"
                data-tone={toneAttr}
                onClick={onSettings}
                aria-label="Open settings"
              >
                <SettingsIcon />
              </button>
            )}
          </div>
        </div>

        {/* Bottom bar — location indicator */}
        <div className="shell-bottom" ref={bottomBar}>
          <span className="shell-location">{panel.title}</span>
        </div>
      </nav>

      {/* Panel content sits below the shell */}
      {children}
    </>
  );
}
