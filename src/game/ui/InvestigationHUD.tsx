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
    <strong>{objective}</strong>
    <span>Timer: {timer.status === "not-started" ? "Not started" : timer.status === "untimed" ? "Untimed" : `${timer.label}${timer.status === "paused" ? " (paused)" : ""}`}</span>
    {onHint && <button className="city-ui-button" onClick={onHint}>Hint</button>}
    {onRestart && <details><summary>Investigation options</summary><button className="city-ui-button" onClick={() => setConfirm(true)}>Restart investigation</button></details>}
    <DestructiveConfirmation open={confirm} onOpenChange={setConfirm} title="Restart investigation?" description="Your current investigation progress will be cleared." confirmLabel="Restart investigation" onConfirm={() => onRestart?.()} />
  </aside>;
}
