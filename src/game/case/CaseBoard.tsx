/**
 * Case board — the deduction surface.
 *
 * Evidence cards, links between them, deductions unlocked by holding the right
 * combination. A Deduction fires only when every id in its `from` array is
 * held. Deterministic — never AI-decided.
 *
 * Spec: ops/prompts/antigravity-dialogue-case.md §4.4.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CaseDefinition, Deduction, EvidenceItem } from "@/game/case/types";
import { useGameState } from "@/game/integration/use-game-state";
import { setFlag } from "@/game/integration/game";
import { EvidenceCard } from "./EvidenceCard";
import { checkDeductions, getHeldEvidenceItems, isDeductionReady } from "./verify";

export interface CaseBoardProps {
  caseDef: CaseDefinition;
  className?: string;
}

/**
 * The case board renders held evidence and tracks deductions.
 *
 * When a deduction's required evidence is all held, the deduction fires
 * and its `unlocksFlag` is set. This is the only way deduction flags are
 * set — the player must actually combine the evidence.
 */
export function CaseBoard({ caseDef, className = "" }: CaseBoardProps) {
  const heldEvidence = useGameState((s) => s.evidence);
  const flags = useGameState((s) => s.flags);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [newDeductions, setNewDeductions] = useState<Deduction[]>([]);
  const processedRef = useRef<Set<string>>(new Set());

  const heldItems = useMemo(
    () => getHeldEvidenceItems(caseDef.evidence, heldEvidence),
    [caseDef.evidence, heldEvidence],
  );

  // Check and fire newly-unlocked deductions
  useEffect(() => {
    const ready = checkDeductions(caseDef.deductions, heldEvidence, flags);
    const unprocessed = ready.filter((d) => !processedRef.current.has(d.id));

    if (unprocessed.length > 0) {
      for (const d of unprocessed) {
        setFlag(d.unlocksFlag, true);
        processedRef.current.add(d.id);
      }
      setNewDeductions((prev) => [...prev, ...unprocessed]);
    }
  }, [caseDef.deductions, heldEvidence, flags]);

  const dismissDeductionNotice = useCallback((id: string) => {
    setNewDeductions((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return (
    <section
      aria-label={`Case Board: ${caseDef.title}`}
      className={`flex flex-col gap-6 ${className}`}
    >
      {/* Header */}
      <header className="border-b border-line pb-4">
        <h2 className="font-display text-2xl text-bone">{caseDef.title}</h2>
        <p className="mt-1 text-sm text-smoke">
          Evidence collected: {heldEvidence.length} / {caseDef.evidence.length}
        </p>
      </header>

      {/* New deduction notifications */}
      {newDeductions.length > 0 && (
        <div className="flex flex-col gap-2" role="alert" aria-live="polite">
          {newDeductions.map((d) => (
            <div
              key={d.id}
              className="flex items-start gap-3 border border-safe/30 bg-safe/5 p-3 text-sm"
            >
              <span className="mt-0.5 shrink-0 text-safe" aria-hidden>
                ✓
              </span>
              <div className="flex-1">
                <p className="font-semibold text-safe">Deduction Unlocked</p>
                <p className="mt-1 text-ash">{d.conclusion}</p>
              </div>
              <button
                type="button"
                onClick={() => dismissDeductionNotice(d.id)}
                className="shrink-0 text-dim transition-colors hover:text-smoke"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Evidence cards */}
      {heldItems.length === 0 ? (
        <p className="py-8 text-center text-dim italic">
          No evidence collected yet. Investigate locations to gather documents.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {heldItems.map((item) => (
            <EvidenceCard
              key={item.id}
              item={item}
              expanded={expandedCard === item.id}
              onActivate={() =>
                setExpandedCard((prev) =>
                  prev === item.id ? null : item.id,
                )
              }
            />
          ))}
        </div>
      )}

      {/* Deductions tracker */}
      <div className="border-t border-line pt-4">
        <h3 className="mb-3 font-semibold text-smoke">Deductions</h3>
        <ul className="flex flex-col gap-2">
          {caseDef.deductions.map((d) => {
            const ready = isDeductionReady(d, heldEvidence);
            const unlocked = Object.hasOwn(flags, d.unlocksFlag);
            return (
              <li
                key={d.id}
                className={`border p-3 text-sm transition-colors ${
                  unlocked
                    ? "border-safe/30 bg-safe/5"
                    : ready
                      ? "border-amber/30 bg-amber/5"
                      : "border-line bg-ink/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`size-2 shrink-0 rounded-full ${
                      unlocked
                        ? "bg-safe"
                        : ready
                          ? "bg-amber"
                          : "bg-dim"
                    }`}
                    aria-hidden
                  />
                  <span
                    className={
                      unlocked
                        ? "text-bone"
                        : ready
                          ? "text-ash"
                          : "text-dim"
                    }
                  >
                    {unlocked ? d.conclusion : `Requires: ${d.from.join(" + ")}`}
                  </span>
                </div>
                {/* Evidence links */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {d.from.map((evidenceId) => {
                    const held = heldEvidence.includes(evidenceId);
                    return (
                      <span
                        key={evidenceId}
                        className={`rounded px-2 py-0.5 text-xs ${
                          held
                            ? "bg-raised text-bone"
                            : "bg-ink text-dim"
                        }`}
                      >
                        {evidenceId}
                      </span>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
