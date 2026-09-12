"use client";

/** The player proposes a connection; merely reading the board never changes it. */
import { useState, type FormEvent } from "react";
import type { CaseDefinition } from "./types";
import { useGameState } from "@/game/integration/use-game-state";
import { submitDeduction } from "@/game/integration/deductions";
import { EvidenceCard } from "./EvidenceCard";
import { evidenceTitle, getHeldEvidenceItems } from "./verify";

export interface CaseBoardProps {
  caseDef: CaseDefinition;
  className?: string;
}

export function CaseBoard({ caseDef, className = "" }: CaseBoardProps) {
  const held = useGameState((state) => state.evidence);
  const flags = useGameState((state) => state.flags);
  const [selected, setSelected] = useState<string[]>([]);
  const [conclusion, setConclusion] = useState("");
  const [feedback, setFeedback] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const items = getHeldEvidenceItems(caseDef.evidence, held);
  const resolved = Boolean(flags["case.outcome"]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = submitDeduction(caseDef, conclusion, selected);
    setFeedback(result.message);
    if (result.status === "verified") { setSelected([]); setConclusion(""); }
  }

  return <section aria-label={`Case Board: ${caseDef.title}`} className={`flex flex-col gap-6 ${className}`}>
    <header>
      <h2 className="font-display text-2xl">{caseDef.title}</h2>
      <p>{items.length} documents preserved. Select the documents that support one connection, then propose a conclusion.</p>
    </header>
    <form onSubmit={submit} className="flex flex-col gap-4">
      <fieldset disabled={resolved} className="flex flex-col gap-3">
        <legend className="mb-3 font-semibold">Choose supporting evidence</legend>
        {items.length === 0 && <p>No evidence preserved yet. Inspect documents in the city and choose Preserve Evidence.</p>}
        {items.map((item) => <div key={item.id} className="border border-line p-3">
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input type="checkbox" checked={selected.includes(item.id)} onChange={(event) => setSelected((previous) => event.target.checked ? [...previous, item.id] : previous.filter((id) => id !== item.id))} />
            <span>{item.title}</span>
          </label>
          <button type="button" className="city-ui-button" aria-expanded={expanded === item.id} onClick={() => setExpanded(expanded === item.id ? null : item.id)}>Read {item.title}</button>
          {expanded === item.id && <EvidenceCard item={item} expanded />}
        </div>)}
      </fieldset>
      {!resolved && <>
        <label htmlFor="proposed-conclusion">Proposed conclusion</label>
        <select id="proposed-conclusion" className="min-h-11 w-full min-w-0 border border-line bg-ink p-2 text-bone" value={conclusion} onChange={(event) => setConclusion(event.target.value)}>
          <option value="">Choose a conclusion</option>
          {caseDef.deductions.filter((item) => flags[item.unlocksFlag] !== true).map((item) => <option key={item.id} value={item.id}>{item.conclusion}</option>)}
        </select>
        <button className="city-ui-button" type="submit" disabled={!selected.length || !conclusion}>Verify connection</button>
      </>}
      <p role="status">{resolved ? "Closed investigation — review only." : feedback}</p>
    </form>
    <section aria-label="Verified connections">
      <h3 className="font-semibold">Verified connections</h3>
      <ul className="flex flex-col gap-3">
        {caseDef.deductions.filter((item) => flags[item.unlocksFlag] === true).map((item) => <li key={item.id} className="border border-safe p-3">
          <p>✓ {item.conclusion}</p>
          <p className="mt-2 text-sm text-smoke">{item.from.map((id) => evidenceTitle(caseDef.evidence, id)).join(" + ")}</p>
        </li>)}
      </ul>
    </section>
  </section>;
}
