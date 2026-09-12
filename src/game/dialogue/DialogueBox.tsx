/**
 * Dialogue box — visual-novel presentation.
 *
 * Speaker, lines, choices, typewriter reveal, a backlog and a skip.
 * Honours `prefers-reduced-motion`. Fully keyboard operable.
 *
 * This component consumes the pure dialogue engine. It calls `onEffect`
 * with the `Effect[]` from each choice — the engine never mutates state itself.
 *
 * Spec: ops/prompts/antigravity-dialogue-case.md §4.2.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Choice, DialogueNode, Effect } from "@/game/dialogue/types";
import type { GameState } from "@/game/state/types";
import { advanceDialogue, getVisibleChoices } from "@/game/dialogue/engine";

/** The minimal state slice the dialogue box needs. */
export type DialogueBoxState = Pick<GameState, "flags" | "evidence">;

export interface DialogueBoxProps {
  /** The full dialogue graph from the CaseDefinition. */
  dialogue: Record<string, DialogueNode>;
  /** The node to start on. */
  startNodeId: string;
  /** Current game state for condition evaluation. */
  state: DialogueBoxState;
  /** Called with effects from the player's chosen reply. */
  onEffect: (effects: readonly Effect[]) => void;
  /** Called when the dialogue reaches "END". */
  onEnd: () => void;
  className?: string;
}

/** How fast the typewriter reveals characters (ms per char). */
const CHAR_DELAY = 30;

/** Check reduced motion preference. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return reduced;
}

interface BacklogEntry {
  speaker: string;
  text: string;
  isChoice?: boolean;
}

/**
 * Visual-novel dialogue box with typewriter, backlog, and skip.
 */
export function DialogueBox({
  dialogue,
  startNodeId,
  state,
  onEffect,
  onEnd,
  className = "",
}: DialogueBoxProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [currentNodeId, setCurrentNodeId] = useState(startNodeId);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isRevealing, setIsRevealing] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [backlog, setBacklog] = useState<BacklogEntry[]>([]);
  const [showBacklog, setShowBacklog] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const choicesRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const currentNode = dialogue[currentNodeId];

  const visibleChoices = useMemo(
    () => (currentNode ? getVisibleChoices(currentNode, state) : []),
    [currentNode, state],
  );

  // Clean up timers
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Typewriter effect for current line
  useEffect(() => {
    if (!currentNode) return;
    const lines = currentNode.lines;
    if (currentLineIndex >= lines.length) {
      setShowChoices(true);
      return;
    }

    const fullText = lines[currentLineIndex]!;

    if (reducedMotion) {
      setDisplayedText(fullText);
      setIsRevealing(false);
      return;
    }

    setIsRevealing(true);
    setDisplayedText("");
    let charIndex = 0;

    const reveal = () => {
      if (charIndex < fullText.length) {
        charIndex++;
        setDisplayedText(fullText.slice(0, charIndex));
        timerRef.current = setTimeout(reveal, CHAR_DELAY);
      } else {
        setIsRevealing(false);
      }
    };

    timerRef.current = setTimeout(reveal, CHAR_DELAY);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentNode, currentLineIndex, reducedMotion]);

  const skipReveal = useCallback(() => {
    if (!currentNode) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    if (isRevealing) {
      // Complete current line instantly
      const fullText = currentNode.lines[currentLineIndex];
      if (fullText) {
        setDisplayedText(fullText);
      }
      setIsRevealing(false);
    } else if (currentLineIndex < currentNode.lines.length - 1) {
      // Add current line to backlog, advance to next
      setBacklog((prev) => [
        ...prev,
        { speaker: currentNode.speaker, text: currentNode.lines[currentLineIndex]! },
      ]);
      setCurrentLineIndex((prev) => prev + 1);
    } else {
      // All lines shown, reveal choices
      setBacklog((prev) => [
        ...prev,
        { speaker: currentNode.speaker, text: currentNode.lines[currentLineIndex]! },
      ]);
      setShowChoices(true);
    }
  }, [currentNode, currentLineIndex, isRevealing]);

  const handleChoice = useCallback(
    (choice: Choice) => {
      if (!currentNode) return;

      // Log the choice to backlog
      setBacklog((prev) => [
        ...prev,
        { speaker: "You", text: choice.text, isChoice: true },
      ]);

      // Emit effects
      if (choice.effects && choice.effects.length > 0) {
        onEffect(choice.effects);
      }

      if (choice.next === "END") {
        onEnd();
        return;
      }

      // Advance to next node
      setCurrentNodeId(choice.next);
      setCurrentLineIndex(0);
      setShowChoices(false);
      setDisplayedText("");
    },
    [currentNode, onEffect, onEnd],
  );

  // Handle keyboard: Enter/Space to skip, Escape for backlog
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowBacklog((prev) => !prev);
        return;
      }
      if (
        (e.key === "Enter" || e.key === " ") &&
        !showChoices &&
        e.target === boxRef.current
      ) {
        e.preventDefault();
        skipReveal();
      }
    },
    [showChoices, skipReveal],
  );

  if (!currentNode) {
    onEnd();
    return null;
  }

  return (
    <div
      ref={boxRef}
      role="dialog"
      aria-label="Dialogue"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`relative border border-line bg-ink/95 backdrop-blur-sm ${className}`}
    >
      {/* Backlog toggle */}
      <button
        type="button"
        onClick={() => setShowBacklog((prev) => !prev)}
        className="absolute top-2 right-2 z-10 rounded px-2 py-1 text-xs text-dim transition-colors hover:text-smoke focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber"
        aria-label={showBacklog ? "Close backlog" : "Show backlog"}
      >
        {showBacklog ? "✕ Close" : "↑ Log"}
      </button>

      {/* Backlog view */}
      {showBacklog && backlog.length > 0 && (
        <div className="max-h-48 overflow-y-auto border-b border-line p-4 text-sm">
          {backlog.map((entry, i) => (
            <p
              key={i}
              className={`py-1 ${entry.isChoice ? "pl-4 italic text-amber" : "text-ash"}`}
            >
              <span className="mr-2 font-semibold text-smoke">
                {entry.speaker}:
              </span>
              {entry.text}
            </p>
          ))}
        </div>
      )}

      {/* Main dialogue area */}
      <div className="p-4 sm:p-6">
        {/* Speaker name */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber">
          {currentNode.speaker}
        </p>

        {/* Current line with typewriter */}
        <div
          className="min-h-[3em] text-bone leading-relaxed"
          aria-live="polite"
        >
          <p>{displayedText}</p>
        </div>

        {/* Skip button */}
        {(isRevealing || (!showChoices && currentLineIndex < currentNode.lines.length - 1)) && (
          <button
            type="button"
            onClick={skipReveal}
            className="mt-2 text-xs text-dim transition-colors hover:text-smoke"
          >
            {isRevealing ? "Skip ▸" : "Continue ▸"}
          </button>
        )}

        {/* Choices */}
        {showChoices && (
          <div ref={choicesRef} className="mt-4 flex flex-col gap-2" role="group" aria-label="Dialogue choices">
            {visibleChoices.map((choice, i) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => handleChoice(choice)}
                className="group w-full border border-line px-4 py-3 text-left text-sm text-ash transition-colors hover:border-amber/50 hover:bg-raised hover:text-bone focus-visible:border-amber focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/50"
                autoFocus={i === 0}
              >
                <span className="mr-2 text-dim group-hover:text-amber">
                  {i + 1}.
                </span>
                {choice.text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
