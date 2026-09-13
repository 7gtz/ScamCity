"use client";
import { useState } from "react";
import { DestructiveConfirmation } from "./CityDialog";
import "./shell.css";

export interface InvestigationHUDProps {
  objective: string;
  timer: { status: "not-started" } | { status: "untimed" } | { status: "running" | "paused"; label: string };
  onHint?: () => void;
  onRestart?: () => void;
}
/** Render in normal document flow. Game integration owns objective and timer semantics. */
export function InvestigationHUD({ objective, timer, onHint, onRestart }: InvestigationHUDProps) {
  const [confirm, setConfirm] = useState(false);
  return <aside className="investigation-hud" aria-label="Investigation status">
    <div className="hud-objective">
      <span>Current objective</span>
      <strong>{objective}</strong>
    </div>
    <div className="hud-actions">
      <span className="hud-timer"><small>Clearing window</small><strong>{timer.status === "not-started" ? "Not started" : timer.status === "untimed" ? "Untimed" : `${timer.label}${timer.status === "paused" ? " · paused" : ""}`}</strong></span>
      {onHint && <button className="hud-button" onClick={onHint}>Hint</button>}
      {onRestart && <details className="hud-options"><summary aria-label="Open investigation options">•••</summary><div><button className="city-ui-button" onClick={() => setConfirm(true)}>Restart investigation</button></div></details>}
    </div>
    <DestructiveConfirmation open={confirm} onOpenChange={setConfirm} title="Restart investigation?" description="Your current investigation progress will be cleared." confirmLabel="Restart investigation" onConfirm={() => onRestart?.()} />
  </aside>;
}
