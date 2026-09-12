"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { LocationId, PanelDefinition } from "@/game/world/types";
import type { CaseOutcome, EvidenceItem } from "@/game/case/types";
import type { CallScore } from "@/lib/live/types";
import { panels, panelHref } from "@/game/world/registry";
import { WorldMap } from "@/game/world/WorldMap";
import { Panel } from "@/game/world/Panel";
import { PanelShell } from "@/game/ui/PanelShell";
import { DialogueBox } from "@/game/dialogue/DialogueBox";
import { CaseBoard } from "@/game/case/CaseBoard";
import { EvidenceCard } from "@/game/case/EvidenceCard";
import { Debrief } from "@/game/debrief/Debrief";
import { gradeCase, type CaseRun } from "@/game/debrief/grade-case";
import { phraseHint, type HintSituation } from "@/game/ai/hints";
import {
  start,
  remainingMs,
  secondsLeft,
  isExpired,
  type TimerConfig,
  type TimerState,
} from "@/game/pressure/timer";
import { SCENARIOS } from "@/content/scenarios";
import { CallRoom } from "@/features/call/CallRoom";
import {
  tenMinuteWindowCase,
  TEN_MINUTE_DIALOGUE,
  NPC_DIALOGUE_ENTRY,
} from "@/content/cases/ten-minute-window";
import {
  enterPanel,
  evaluateCondition,
  applyEffects,
  setFlag,
  getGameState,
} from "./game";
import {
  collectEvidence,
  resolveCase,
  createCallCompletion,
  type PanelHandlers,
} from "./panel-actions";
import { useGameState } from "./use-game-state";
import { useGameReady } from "./GameProvider";

const TEN_MINUTE_TIMER_CONFIG: TimerConfig = {
  durationMs: 600_000,
  graceMs: 3_000,
  untimed: false,
};

function determineSituation(
  state: ReturnType<typeof getGameState>,
  isWindowClosing: boolean,
): HintSituation {
  if (
    state.flags["case.outcome"] ||
    state.flags["case.accused-repair-shop"] ||
    state.flags["case.alienated-bank-staff"]
  ) {
    return "after-mistake";
  }
  if (isWindowClosing) return "window-closing";
  if (state.evidence.length === 0) return "no-evidence";
  const hasFalseLead =
    state.evidence.includes("repair-receipt") ||
    state.evidence.includes("delivery-notice");
  const clearedFalseLead =
    state.flags["lead.delivery-checked"] ||
    state.flags["lead.repair-cleared-in-dialogue"] ||
    state.flags["deduction.repair-shop-cleared"] ||
    state.flags["deduction.delivery-bait-cleared"];
  if (hasFalseLead && !clearedFalseLead) return "false-lead-held";
  if (state.evidence.length >= 2) return "evidence-uncombined";
  return "dialogue-exhausted";
}

function checkAndAutoResolve(): CaseOutcome | null {
  const current = getGameState();
  if (current.flags["case.outcome"]) return current.flags["case.outcome"] as CaseOutcome;

  const outcomes: CaseOutcome[] = [
    "funds-recovered",
    "partial-recovery",
    "wrong-suspect",
    "genuine-turned-away",
  ];
  for (const outcome of outcomes) {
    if (resolveCase(tenMinuteWindowCase, outcome)) {
      return outcome;
    }
  }
  return null;
}

function buildCaseRun(state: ReturnType<typeof getGameState>): CaseRun {
  const outcome = (state.flags["case.outcome"] as CaseOutcome) ?? "case-unsolved";
  return {
    caseId: "ten-minute-window",
    outcome,
    evidence: state.evidence,
    deductions: [
      "d-otp-theft",
      "d-network-intercept",
      "d-account-freeze-ready",
      "d-dismiss-repair-shop",
      "d-dismiss-delivery-bait",
    ].filter((d) => {
      const flagMap: Record<string, string> = {
        "d-otp-theft": "deduction.otp-theft-established",
        "d-network-intercept": "deduction.sim-swap-confirmed",
        "d-account-freeze-ready": "deduction.freeze-authorization-ready",
        "d-dismiss-repair-shop": "deduction.repair-shop-cleared",
        "d-dismiss-delivery-bait": "deduction.delivery-bait-cleared",
      };
      return Boolean(state.flags[flagMap[d]!]);
    }),
    dismissedFalseLeads: [
      Boolean(
        state.flags["lead.delivery-checked"] ||
          state.flags["deduction.delivery-bait-cleared"],
      ) && "delivery-notice",
      Boolean(
        state.flags["lead.repair-cleared-in-dialogue"] ||
          state.flags["deduction.repair-shop-cleared"],
      ) && "repair-receipt",
    ].filter(Boolean) as string[],
    pursuedFalseLeads: [
      Boolean(state.flags["case.accused-repair-shop"]) && "repair-receipt",
    ].filter(Boolean) as string[],
    verifiedIndependently: Boolean(
      state.flags["victim.called-bank-back"] ||
        state.flags["police.has-carrier-log"] ||
        state.flags["branch.has-statement"],
    ),
    recoverySteps: state.flags["police.formal-report-lodged"]
      ? ["police-report"]
      : [],
  };
}

/** City transit map screen showing the investigation route across all 5 locations. */
export function CityMapScreen() {
  const ready = useGameReady();
  const state = useGameState((s) => s);
  const [showCallModal, setShowCallModal] = useState(false);

  const bankScenario = SCENARIOS["bank-security"];
  const callerPersona = bankScenario?.persona ?? {
    id: "martin-hayes",
    name: "Martin Hayes",
    role: "Account Security",
    organization: "Northstar Bank",
    legitimate: false,
    district: "bank",
    level: 1,
  };

  const handleLiveCallComplete = useCallback((score: CallScore) => {
    const completeFn = createCallCompletion((s: CallScore) => {
      const complied = s.outcome === "scammed" || !s.passed;
      return [
        { setFlag: "victim.live-call-completed", to: true },
        { setFlag: "victim.complied", to: complied },
        { setFlag: "victim.revealed-otp", to: complied },
        { setFlag: "victim.called-bank-back", to: !complied },
        { setFlag: "victim.froze-card", to: !complied },
        { setFlag: "victim.reported-promptly", to: !complied },
        { stress: complied ? 40 : 15 },
      ];
    });
    completeFn(score);
    setShowCallModal(false);
  }, []);

  if (!ready) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-24 text-bone" role="status">
        <p>Restoring investigation…</p>
      </section>
    );
  }

  return (
    <div className="min-h-dvh bg-ink text-bone">
      {/* Top navigation bar for city transit map */}
      <header className="mx-auto max-w-5xl px-6 pt-6 flex items-center justify-between">
        <Link
          href="/modes"
          className="inline-flex items-center gap-2 border border-line bg-raised/80 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-smoke transition-colors hover:border-amber hover:text-bone focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber"
        >
          <span aria-hidden="true">←</span>
          <span>All Modes</span>
        </Link>
        <span className="font-mono text-xs uppercase tracking-widest text-amber">
          SCAM CITY / Detective Track
        </span>
      </header>

      {/* Victim call banner */}
      <aside
        aria-label="Victim live call simulation"
        className="mx-auto max-w-5xl px-6 pt-6"
      >
        <div className="flex flex-col items-start justify-between gap-4 border border-line bg-raised/80 p-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber animate-pulse" />
              <p className="font-mono text-xs uppercase tracking-widest text-amber">
                {state.flags["victim.live-call-completed"]
                  ? "Victim Encounter Completed"
                  : "Prologue Encounter — Victim Perspective"}
              </p>
            </div>
            <h2 className="mt-1 font-display text-lg text-bone">
              Mara Okoye&apos;s Inbound Scam Call (Martin Hayes, Northstar Security)
            </h2>
            <p className="text-sm text-smoke">
              {state.flags["victim.live-call-completed"]
                ? "You experienced the live spoofed call. Its outcome has set the baseline evidence for this case."
                : "Play the real-time AI voice simulation to experience the high-pressure OTP extraction firsthand."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCallModal(true)}
            className="shrink-0 border border-amber/70 bg-amber/10 px-4 py-2 font-mono text-xs uppercase tracking-wider text-amber transition-colors hover:bg-amber hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber"
          >
            {state.flags["victim.live-call-completed"] ? "Replay Call" : "Answer Call"}
          </button>
        </div>
      </aside>

      {/* World transit map */}
      <WorldMap />

      {/* Live Call Modal */}
      {showCallModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Victim Scam Call Simulation"
          className="fixed inset-0 z-50 flex flex-col bg-ink"
        >
          <header className="flex items-center justify-between border-b border-line bg-ink/90 px-6 py-3">
            <p className="font-mono text-xs uppercase tracking-widest text-amber">
              SCAM CITY / Victim Perspective Call Room
            </p>
            <button
              type="button"
              onClick={() => setShowCallModal(false)}
              className="border border-line px-3 py-1 font-mono text-xs text-smoke hover:text-bone"
            >
              ✕ Exit Call
            </button>
          </header>
          <div className="min-h-0 flex-1">
            <CallRoom
              scenarioId="bank-security"
              persona={callerPersona}
              onComplete={handleLiveCallComplete}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** CityPanelScreen wraps Panel with PanelShell, binds handlers, and manages overlays. */
export function CityPanelScreen({
  panel,
  children,
  overlay,
}: {
  panel: PanelDefinition;
  children?: ReactNode;
  overlay?: ReactNode;
}) {
  const router = useRouter();
  const ready = useGameReady();
  const state = useGameState((s) => s);
  const open = !panel.requires || evaluateCondition(panel.requires, state);

  // Active interaction modals
  const [activeDialogueNodeId, setActiveDialogueNodeId] = useState<string | null>(null);
  const [inspectItem, setInspectItem] = useState<EvidenceItem | null>(null);
  const [showCaseBoard, setShowCaseBoard] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);

  // Hints state
  const [currentHint, setCurrentHint] = useState<string | null>(null);
  const [isHintLoading, setIsHintLoading] = useState(false);

  // 10-Minute pressure timer state
  const [timer] = useState<TimerState>(() =>
    start(TEN_MINUTE_TIMER_CONFIG, Date.now()),
  );
  const [now, setNow] = useState<number>(Date.now());

  // Enter panel tracking
  useEffect(() => {
    if (ready && open) enterPanel(panel.id);
  }, [ready, open, panel.id]);

  // Timer tick effect
  useEffect(() => {
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (isExpired(timer, current) && !state.flags["branch.window-expired"]) {
        setFlag("branch.window-expired", true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timer, state.flags]);

  // Handlers for Hotspot interactions
  const handlers: PanelHandlers = useMemo(
    () => ({
      talk: (npc: string) => {
        const entryNode = NPC_DIALOGUE_ENTRY[npc];
        if (entryNode && TEN_MINUTE_DIALOGUE[entryNode]) {
          setActiveDialogueNodeId(entryNode);
        }
      },
      inspect: (evidence: string) => {
        collectEvidence(tenMinuteWindowCase, evidence);
        const item = tenMinuteWindowCase.evidence.find((e) => e.id === evidence);
        if (item) setInspectItem(item);
      },
      travel: (location: LocationId) => {
        router.push(panelHref(location));
      },
    }),
    [router],
  );

  // Auto-resolve check helper
  const handleEffectsAndCheck = useCallback((effects: readonly Parameters<typeof applyEffects>[0][number][]) => {
    applyEffects(effects);
    checkAndAutoResolve();
  }, []);

  // Request AI / authored hint
  const handleRequestHint = useCallback(async () => {
    setIsHintLoading(true);
    try {
      const isUrgent = remainingMs(timer, now) <= 120_000;
      const situation = determineSituation(getGameState(), isUrgent);
      const hint = await phraseHint(situation);
      setCurrentHint(hint.text);
    } catch {
      setCurrentHint(
        "Compare the timestamps on the call log with the SMS notification and Northstar statement.",
      );
    } finally {
      setIsHintLoading(false);
    }
  }, [timer, now]);

  // Live call completion in flat / panel
  const handleCallComplete = useCallback((score: CallScore) => {
    const completeFn = createCallCompletion((s: CallScore) => {
      const complied = s.outcome === "scammed" || !s.passed;
      return [
        { setFlag: "victim.live-call-completed", to: true },
        { setFlag: "victim.complied", to: complied },
        { setFlag: "victim.revealed-otp", to: complied },
        { setFlag: "victim.called-bank-back", to: !complied },
        { setFlag: "victim.froze-card", to: !complied },
        { setFlag: "victim.reported-promptly", to: !complied },
        { stress: complied ? 40 : 15 },
      ];
    });
    completeFn(score);
    setShowCallModal(false);
  }, []);

  // Escape key handler to dismiss active modals
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        if (inspectItem) {
          setInspectItem(null);
        } else if (showCaseBoard) {
          setShowCaseBoard(false);
        } else if (showInventory) {
          setShowInventory(false);
        } else if (showCallModal) {
          setShowCallModal(false);
        } else if (currentHint) {
          setCurrentHint(null);
        } else if (activeDialogueNodeId) {
          setActiveDialogueNodeId(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    inspectItem,
    showCaseBoard,
    showInventory,
    showCallModal,
    currentHint,
    activeDialogueNodeId,
  ]);

  const bankScenario = SCENARIOS["bank-security"];
  const callerPersona = bankScenario?.persona ?? {
    id: "martin-hayes",
    name: "Martin Hayes",
    role: "Account Security",
    organization: "Northstar Bank",
    legitimate: false,
    district: "bank",
    level: 1,
  };

  if (!ready) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-24 text-bone" role="status">
        <p>Restoring investigation…</p>
      </section>
    );
  }

  if (!open) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-24 text-bone">
        <h1 className="font-display text-4xl">Location locked</h1>
        <p className="my-4 text-smoke">
          You lack the authorization or held facts to enter this location.
        </p>
        <Link href="/city" className="font-mono text-sm underline text-amber">
          Return to map
        </Link>
      </section>
    );
  }

  // Format timer
  const secLeft = secondsLeft(timer, now);
  const minutes = Math.floor(secLeft / 60);
  const seconds = secLeft % 60;
  const timerDisplay = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const windowExpired = Boolean(state.flags["branch.window-expired"]);

  // Debrief outcome check
  const isCaseResolved = Boolean(state.flags["case.outcome"]);
  const caseGrade = isCaseResolved ? gradeCase(buildCaseRun(state)) : null;

  return (
    <PanelShell
      panel={panel}
      onCaseBoard={() => setShowCaseBoard(true)}
      onInventory={() => setShowInventory(true)}
    >
      <Panel panel={panel} handlers={handlers}>
        {/* Top HUD: Timer & Action pills */}
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-6 pt-16 pb-2 pointer-events-auto">
          {/* 10-minute countdown indicator */}
          <div
            className={`flex items-center gap-2 border px-3 py-1.5 font-mono text-xs tracking-wider backdrop-blur-sm ${
              windowExpired
                ? "border-signal/50 bg-signal/10 text-signal"
                : "border-line bg-ink/80 text-bone"
            }`}
            role="timer"
            aria-live="polite"
          >
            <span
              className={`size-2 rounded-full ${
                windowExpired ? "bg-signal" : "bg-amber animate-ping"
              }`}
            />
            <span className="text-smoke uppercase">Clearing Window:</span>
            <span className="font-bold tabular-nums">
              {windowExpired ? "EXPIRED" : timerDisplay}
            </span>
          </div>

          {/* Action pills: Live Call (if in flat) & Hint button */}
          <div className="flex items-center gap-2">
            {panel.id === "victim-flat" && (
              <button
                type="button"
                onClick={() => setShowCallModal(true)}
                className="border border-line bg-ink/80 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-smoke transition-colors hover:border-amber hover:text-amber focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber"
              >
                {state.flags["victim.live-call-completed"]
                  ? "Replay Call"
                  : "Play Live Call"}
              </button>
            )}

            <button
              type="button"
              onClick={handleRequestHint}
              disabled={isHintLoading}
              className="border border-line bg-ink/80 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-smoke transition-colors hover:border-amber hover:text-amber disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber"
            >
              {isHintLoading ? "Analyzing..." : "Ask for Hint"}
            </button>
          </div>
        </div>

        {/* Hint banner popover */}
        {currentHint && (
          <div className="relative z-20 mx-6 my-2 flex items-start justify-between gap-4 border border-amber/40 bg-ink/95 p-3 text-sm text-bone shadow-lg">
            <div className="flex items-start gap-2">
              <span className="font-mono text-xs text-amber uppercase font-semibold shrink-0">
                [Investigator Note]
              </span>
              <p className="leading-relaxed">{currentHint}</p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentHint(null)}
              className="shrink-0 text-dim hover:text-smoke text-xs font-mono"
            >
              ✕
            </button>
          </div>
        )}

        {/* Active Dialogue Box */}
        {activeDialogueNodeId && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 z-30 pointer-events-auto">
            <DialogueBox
              dialogue={TEN_MINUTE_DIALOGUE}
              startNodeId={activeDialogueNodeId}
              state={{ flags: state.flags, evidence: state.evidence }}
              onEffect={handleEffectsAndCheck}
              onEnd={() => {
                setActiveDialogueNodeId(null);
                checkAndAutoResolve();
              }}
            />
          </div>
        )}

        {children}
      </Panel>

      {/* Case Debrief Overlay (when case is resolved) */}
      {isCaseResolved && caseGrade && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Case Debrief"
          className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-ink/95 p-4 py-12 backdrop-blur-md pointer-events-auto"
        >
          <div className="relative w-full max-w-3xl border border-line bg-raised p-6 shadow-2xl my-auto sm:my-8">
            <Debrief
              grade={caseGrade}
              onRecover={() => setShowCaseBoard(true)}
            />
            <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setShowCaseBoard(true)}
                className="border border-line px-4 py-2 font-mono text-xs uppercase tracking-wider text-smoke hover:text-bone"
              >
                Review Board
              </button>
              <Link
                href="/city"
                className="border border-amber bg-amber/10 px-4 py-2 font-mono text-xs uppercase tracking-wider text-amber hover:bg-amber hover:text-ink"
              >
                Return to City Map
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Inspection Modal */}
      {inspectItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Inspecting Evidence: ${inspectItem.title}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectItem(null);
          }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm pointer-events-auto"
        >
          <div className="relative w-full max-w-xl border border-line bg-raised p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <span className="font-mono text-xs uppercase tracking-widest text-amber">
                Preserved Evidence Item
              </span>
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="text-smoke hover:text-bone text-sm font-mono border border-line px-2 py-0.5 hover:border-amber hover:text-amber"
              >
                ✕ Close
              </button>
            </div>
            <EvidenceCard item={inspectItem} expanded={true} />
            <div className="mt-4 flex justify-between items-center text-xs text-smoke font-mono">
              <span className="text-safe">✓ Added to case file</span>
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="border border-line px-4 py-1.5 uppercase hover:bg-line text-bone"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Case Board Modal */}
      {showCaseBoard && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Case Deduction Board"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCaseBoard(false);
          }}
          className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-ink/90 p-4 py-12 backdrop-blur-md pointer-events-auto"
        >
          <div className="relative w-full max-w-4xl border border-line bg-raised p-6 shadow-2xl my-auto sm:my-8">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-raised pb-3 mb-4">
              <span className="font-mono text-xs uppercase tracking-widest text-amber">
                Case Board & Deductions
              </span>
              <button
                type="button"
                onClick={() => setShowCaseBoard(false)}
                className="text-smoke hover:text-bone text-sm font-mono border border-line px-3 py-1 hover:border-amber hover:text-amber"
              >
                ✕ Close
              </button>
            </div>
            <CaseBoard caseDef={tenMinuteWindowCase} />
          </div>
        </div>
      )}

      {/* Inventory Modal */}
      {showInventory && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Case Evidence Inventory"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowInventory(false);
          }}
          className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-ink/90 p-4 py-12 backdrop-blur-md pointer-events-auto"
        >
          <div className="relative w-full max-w-3xl border border-line bg-raised p-6 shadow-2xl my-auto sm:my-8">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-raised pb-3 mb-4">
              <span className="font-mono text-xs uppercase tracking-widest text-amber">
                Held Evidence ({state.evidence.length})
              </span>
              <button
                type="button"
                onClick={() => setShowInventory(false)}
                className="text-smoke hover:text-bone text-sm font-mono border border-line px-3 py-1 hover:border-amber hover:text-amber"
              >
                ✕ Close
              </button>
            </div>
            {state.evidence.length === 0 ? (
              <p className="py-8 text-center text-sm text-smoke">
                No physical evidence collected yet. Search the location hotspots to preserve documents.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {state.evidence.map((id) => {
                  const item = tenMinuteWindowCase.evidence.find((e) => e.id === id);
                  return item ? (
                    <EvidenceCard key={id} item={item} expanded={false} />
                  ) : null;
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Victim Live Call Modal */}
      {showCallModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Victim Scam Call Simulation"
          className="fixed inset-0 z-[90] flex flex-col bg-ink pointer-events-auto"
        >
          <header className="flex items-center justify-between border-b border-line bg-ink/90 px-6 py-3">
            <p className="font-mono text-xs uppercase tracking-widest text-amber">
              SCAM CITY / Victim Perspective Call Room
            </p>
            <button
              type="button"
              onClick={() => setShowCallModal(false)}
              className="border border-line px-3 py-1 font-mono text-xs text-smoke hover:text-bone"
            >
              ✕ Exit Call
            </button>
          </header>
          <div className="min-h-0 flex-1">
            <CallRoom
              scenarioId="bank-security"
              persona={callerPersona}
              onComplete={handleCallComplete}
            />
          </div>
        </div>
      )}

      {overlay}
    </PanelShell>
  );
}
