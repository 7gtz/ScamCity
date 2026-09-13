"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { LocationId, PanelDefinition } from "@/game/world/types";
import type { CaseOutcome, EvidenceItem } from "@/game/case/types";
import type { CallScore } from "@/lib/live/types";
import { panelHref } from "@/game/world/registry";
import { WorldMap } from "@/game/world/WorldMap";
import { Panel } from "@/game/world/Panel";
import type { HotspotProps } from "@/game/world/Hotspot";
import { PanelShell } from "@/game/ui/PanelShell";
import { CityDialog, DestructiveConfirmation } from "@/game/ui/CityDialog";
import { InvestigationHUD } from "@/game/ui/InvestigationHUD";
import { CaseBoard } from "@/game/case/CaseBoard";
import { EvidenceCard } from "@/game/case/EvidenceCard";
import { Debrief } from "@/game/debrief/Debrief";
import { gradeCase, type CaseRun } from "@/game/debrief/grade-case";
import { phraseHint, type HintSituation } from "@/game/ai/hints";
import { configFor, start } from "@/game/pressure/timer";
import { prefersReducedMotion } from "@/game/world/navigation";
import {
  CLEARING_WINDOW,
  hudTimer,
  freezeClearingWindow,
  isWindowClosing,
  openClearingWindow,
  pauseClearingWindow,
  resumeClearingWindow,
  windowStatus,
} from "./clearing-window";
import { settleCase } from "./outcome";
import {
  availableLocations,
  completedLocations,
  currentObjective,
  interactionStates,
  locationAccess,
} from "./progression";
import { VoiceInterrogationOverlay } from "@/game/npc/VoiceInterrogationOverlay";
import { DIALOGUE_KEY_BY_NPC, NPC_BY_DIALOGUE_KEY, type NpcId } from "@/game/npc/types";
import { subscribeNpcConnectionStatus } from "@/game/npc/npc-session-store";
import { SCENARIOS } from "@/content/scenarios";
import { CallRoom } from "@/features/call/CallRoom";
import {
  tenMinuteWindowCase,
  NPC_DIALOGUE_ENTRY,
} from "@/content/cases/ten-minute-window";
import {
  enterPanel,
  evaluateCondition,
  applyEffects,
  setFlag,
  getGameState,
  giveEvidence,
  resetGame,
  setTimer as persistTimer,
} from "./game";
import { clearSave } from "@/game/state/save";
import {
  collectEvidence,
  createCallCompletion,
  hasScoredCall,
  type PanelHandlers,
} from "./panel-actions";
import { useGameState } from "./use-game-state";
import { useGameReady } from "./GameProvider";

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

/**
 * Settle the case if it can be settled. Delegates precedence and the
 * guaranteed-termination rule to `outcome.ts`; the component only decides
 * *when* to ask.
 */
function checkAndAutoResolve(expired = false): CaseOutcome | null {
  return settleCase(tenMinuteWindowCase, { expired });
}

/**
 * What the player actually did, for grading.
 *
 * Deduction ids are derived from the authored deduction list rather than
 * written out here. The previous hand-maintained list used four ids that do not
 * exist in `deductions.ts` (`d-network-intercept`, `d-account-freeze-ready`,
 * `d-dismiss-repair-shop`, `d-dismiss-delivery-bait`), so the debrief reported
 * the right count against the wrong names and any per-deduction reporting would
 * have been silently wrong.
 */
function buildCaseRun(state: ReturnType<typeof getGameState>): CaseRun {
  const flagged = (flag: string) => Boolean(state.flags[flag]);
  return {
    caseId: tenMinuteWindowCase.id,
    outcome: (state.flags["case.outcome"] as CaseOutcome) ?? "case-unsolved",
    evidence: state.evidence,
    deductions: tenMinuteWindowCase.deductions
      .filter((deduction) => flagged(deduction.unlocksFlag))
      .map((deduction) => deduction.id),
    dismissedFalseLeads: [
      (flagged("lead.delivery-checked") || flagged("deduction.delivery-bait-cleared")) &&
        "delivery-notice",
      (flagged("lead.repair-cleared-in-dialogue") || flagged("deduction.repair-shop-cleared")) &&
        "repair-receipt",
    ].filter(Boolean) as string[],
    pursuedFalseLeads: [flagged("case.accused-repair-shop") && "repair-receipt"].filter(
      Boolean,
    ) as string[],
    verifiedIndependently:
      flagged("victim.called-bank-back") ||
      flagged("police.has-carrier-log") ||
      flagged("branch.has-statement"),
    recoverySteps: flagged("police.formal-report-lodged") ? ["police-report"] : [],
  };
}

type HotspotState = NonNullable<HotspotProps["state"]>;

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
      <WorldMap
          completedLocations={completedLocations(state)}
          availableLocations={availableLocations(state)}
          objective={currentObjective(state)}
        />

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
  const [isDemo] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("demo") === "1",
  );
  const [demoPrepared, setDemoPrepared] = useState(() => !isDemo);
  // Route entry and map/travel use the same authored access rule. This keeps a
  // player from bypassing investigation progression by typing a panel URL.
  const panelAccess = locationAccess(panel.id, state);
  const open = isDemo || (panelAccess.allowed && (!panel.requires || evaluateCondition(panel.requires, state)));

  // Active interaction modals
  const [activeNpc, setActiveNpc] = useState<NpcId | null>(null);
  /*
   * The cold open. The case does not arrive as a briefing — it arrives as a
   * frightened woman ringing the fraud desk. The phone starts ringing the
   * moment the detective reaches their desk, and the ten-minute window starts
   * when she hangs up, not before.
   */
  const [ringing, setRinging] = useState(false);
  const [inspectItem, setInspectItem] = useState<EvidenceItem | null>(null);
  const [showCaseBoard, setShowCaseBoard] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  /** Restart is destructive and irreversible; it is never one click. */
  const [confirmRestart, setConfirmRestart] = useState(false);
  /** "Review Board" hands the screen over rather than stacking two dialogs. */
  const [debriefHidden, setDebriefHidden] = useState(false);

  // Hints state
  const [currentHint, setCurrentHint] = useState<string | null>(null);
  const [, setIsHintLoading] = useState(false);

  /*
   * The clearing window is read from persisted state, never rebuilt from a
   * start timestamp — that is what used to refund every pause on navigation.
   * `now` is the only local clock, and it exists solely to drive a re-render.
   */
  const [now, setNow] = useState<number>(() => Date.now());
  const caseOutcome = typeof state.flags["case.outcome"] === "string"
    ? (state.flags["case.outcome"] as CaseOutcome)
    : null;

  // Enter panel tracking
  useEffect(() => {
    if (ready && open) enterPanel(panel.id);
  }, [ready, open, panel.id]);

  /*
   * A conversation that is still connecting is not playing time. The pause is
   * written to persisted state so it survives the remount that navigating
   * between panels causes — it used to live in component state and was lost.
   */
  useEffect(() => {
    return subscribeNpcConnectionStatus((status) => {
      const current = Date.now();
      if (status === "connecting") pauseClearingWindow(current);
      else resumeClearingWindow(current);
    });
  }, []);

  /*
   * One tick. It advances the readout and, on expiry, settles the case exactly
   * once — the debrief no longer waits for the player to talk to somebody.
   */
  const hasWindow = state.timer !== null;
  useEffect(() => {
    if (!hasWindow) return;
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      const status = windowStatus(getGameState(), current);
      if (status.phase === "resolved") {
        freezeClearingWindow(current);
        return;
      }
      if (!status.expired) return;
      if (!getGameState().flags["branch.window-expired"]) setFlag("branch.window-expired", true);
      checkAndAutoResolve(true);
      freezeClearingWindow(current);
    }, 1000);
    return () => clearInterval(interval);
  }, [hasWindow]);

  /** A decided case has no clock. Freeze it the moment the outcome lands. */
  useEffect(() => {
    if (caseOutcome) freezeClearingWindow(Date.now());
  }, [caseOutcome]);

  // Handlers for Hotspot interactions
  const handlers: PanelHandlers = useMemo(
    () => ({
      talk: (npc: string) => {
        const voiceNpc = NPC_BY_DIALOGUE_KEY[npc];
        if (voiceNpc) setActiveNpc(voiceNpc);
      },
      inspect: (evidence: string) => {
        // Open it. Preserving it is a separate, explicit act.
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
  /** Wipe the saved case and start the ten-minute window over from the office. */

  /*
   * Judges' demo (`?demo=1`). A pitch has 20–30 seconds, not ten minutes, so
   * this seeds the case as if the detective had already worked the flat —
   * evidence in hand, eight minutes already burned — and opens on the one
   * exchange that shows what the game is: an NPC that refuses you until you can
   * actually argue the case. Everything after it is the real game, unmodified.
   */
  // Read once on the client rather than with useSearchParams: this route is
  // prerendered by generateStaticParams, and that hook would de-optimise the
  // whole panel to client-side rendering for a flag only the demo ever sets.
  // Lazy initialiser rather than an effect: it feeds effects only, never the
  // first render, so there is nothing for hydration to mismatch on.
  useEffect(() => {
    if (!ready || !isDemo || demoPrepared) return;

    // Always build the preview from a clean in-memory state. Demo persistence
    // is disabled in save.ts, so this neither reads nor overwrites campaign
    // progress—even when the preview was entered via client navigation.
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      resetGame("ten-minute-window");
      for (const id of ["bank-statement", "call-log", "otp-message"]) giveEvidence(id);
      const startedAt = Date.now() - 8 * 60_000; // ~2 minutes left on the clock
      persistTimer(start(configFor(CLEARING_WINDOW, prefersReducedMotion()), startedAt));
      setNow(Date.now());
      setFlag("case.opened", true);
      setFlag("demo.seeded", true);
      if (panel.id === "bank-branch") setActiveNpc("vance");
      setDemoPrepared(true);
    });
    return () => { active = false; };
  }, [ready, isDemo, demoPrepared, panel.id]);

  const caseOpened = Boolean(state.flags["case.opened"]);
  useEffect(() => {
    if (!ready || panel.id !== "office" || caseOpened || isDemo) return;
    const timer = window.setTimeout(() => setRinging(true), 900);
    return () => window.clearTimeout(timer);
  }, [ready, panel.id, caseOpened, isDemo]);

  const handleRestartCase = useCallback(() => {
    clearSave();
    resetGame("ten-minute-window");
    router.push(panelHref("office"));
    router.refresh();
  }, [router]);

  const handleRequestHint = useCallback(async () => {
    setIsHintLoading(true);
    try {
      const situation = determineSituation(getGameState(), isWindowClosing(getGameState(), Date.now()));
      const hint = await phraseHint(situation);
      setCurrentHint(hint.text);
    } catch {
      setCurrentHint(
        "Compare the timestamps on the call log with the SMS notification and Northstar statement.",
      );
    } finally {
      setIsHintLoading(false);
    }
  }, []);

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

  /*
   * Escape is owned by CityDialog for every migrated surface (inspection, case
   * board, evidence, debrief, restart) and by the NPC overlay for its own
   * dialog. Only the surfaces the primitive does not own are handled here: the
   * hint banner, which is a non-modal popover, and the full-screen call room.
   */
  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (showCallModal) setShowCallModal(false);
      else if (currentHint) setCurrentHint(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCallModal, currentHint]);

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

  /*
   * Authored progression, read from progression.ts rather than recomputed here.
   * `interactionStates` marks what has been collected or completed; gated exits
   * are marked `locked` and carry the concrete requirement, so a destination
   * that cannot be reached says why instead of rendering as an ordinary button
   * that silently does nothing.
   */
  const hotspotStates = useMemo<Record<string, HotspotState>>(() => {
    const authored: Record<string, HotspotState> = { ...interactionStates(panel, state) };
    for (const hotspot of panel.hotspots) {
      if (hotspot.action.kind === "travel" && !locationAccess(hotspot.action.to, state).allowed) {
        authored[hotspot.id] = "locked";
      }
    }
    return authored;
  }, [panel, state]);

  const hotspotRequirements = useMemo(
    () =>
      Object.fromEntries(
        panel.hotspots.flatMap((hotspot) => {
          if (hotspot.action.kind !== "travel") return [];
          const access = locationAccess(hotspot.action.to, state);
          return access.allowed ? [] : [[hotspot.id, access.requirement]];
        }),
      ),
    [panel, state],
  );

  const objective = currentObjective(state);

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
          {panelAccess.requirement || "You lack the authorization or held facts to enter this location."}
        </p>
        <Link href="/city" className="font-mono text-sm underline text-amber">
          Return to map
        </Link>
      </section>
    );
  }

  const isCaseResolved = caseOutcome !== null;
  const caseGrade = isCaseResolved ? gradeCase(buildCaseRun(state)) : null;

  /** The first completed call is canonical; anything after it is practice. */
  const callIsPractice = hasScoredCall();



  return (
    <PanelShell
      panel={panel}
      onCaseBoard={() => setShowCaseBoard(true)}
      onInventory={() => setShowInventory(true)}
    >
      <InvestigationHUD
        objective={objective}
        timer={hudTimer(state, now)}
        onHint={handleRequestHint}
        onRestart={handleRestartCase}
      />
      <Panel
        panel={panel}
        handlers={handlers}
        interactionStates={hotspotStates}
        hotspotRequirements={hotspotRequirements}
      >
        {panel.id === "victim-flat" && (
          <div className="relative z-20 flex justify-end px-6 pointer-events-auto">
            <button
              type="button"
              onClick={() => setShowCallModal(true)}
              className="border border-line bg-ink/80 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-smoke transition-colors hover:border-amber hover:text-amber focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber"
            >
              {callIsPractice ? "Replay Call (practice)" : "Play Live Call"}
            </button>
          </div>
        )}

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

        {/* Restart confirmation — Agent 2's dialog primitive */}
        <DestructiveConfirmation
          open={confirmRestart}
          onOpenChange={setConfirmRestart}
          title="Restart the investigation?"
          description="The clearing window, every document you preserved and the outcome of this run are cleared. This cannot be undone."
          confirmLabel="Restart investigation"
          onConfirm={handleRestartCase}
        />

        {/* Cold open: the fraud desk telephone */}
        {ringing && !activeNpc && (
          <div className="fixed inset-0 z-[85] flex items-end justify-center bg-ink/70 backdrop-blur-sm pointer-events-auto sm:items-center">
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Incoming call"
              className="m-4 w-full max-w-sm border border-amber/50 bg-ink p-6 shadow-2xl"
            >
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-amber">
                <span className="mr-2 inline-block size-2 animate-ping rounded-full bg-amber align-middle" />
                Incoming call — fraud desk
              </p>
              <p className="mt-4 font-display text-2xl text-bone">Mara Okoye</p>
              <p className="mt-1 text-sm text-smoke">Unlisted number · 07:14</p>
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  autoFocus
                  onClick={() => {
                    setRinging(false);
                    setActiveNpc("mara-call");
                  }}
                  className="flex-1 border border-safe bg-safe/10 px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-safe transition-colors hover:bg-safe/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-safe"
                >
                  Answer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRinging(false);
                    setFlag("case.opened", true);
                  }}
                  className="border border-line px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-dim transition-colors hover:border-smoke hover:text-smoke focus-visible:outline focus-visible:outline-2 focus-visible:outline-smoke"
                >
                  Ignore
                </button>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-dim">
                She has been awake all night. Let her talk — she does not know which part matters.
              </p>
            </div>
          </div>
        )}

        {/* Active Dialogue Box */}
        {activeNpc && (
          <VoiceInterrogationOverlay
            npc={activeNpc}
            demoMode={isDemo}
            fallbackDialogueNodeId={NPC_DIALOGUE_ENTRY[DIALOGUE_KEY_BY_NPC[activeNpc]]}
            onEffects={handleEffectsAndCheck}
            onClose={() => {
              // Mara's call and Miller's briefing both open the case; whichever
              // the player finishes first starts the clearing window.
              if (activeNpc === "mara-call" || activeNpc === "miller") {
                const startedAt = Date.now();
                openClearingWindow(startedAt, prefersReducedMotion());
                setNow(startedAt);
                setFlag("case.opened", true);
              }
              setActiveNpc(null);
              checkAndAutoResolve();
            }}
          />
        )}

        {children}
      </Panel>

      {/*
        * One dialog at a time: CityDialog refuses to nest, so opening the board
        * from the debrief hides the debrief instead of stacking on top of it.
        * Closing the board brings the debrief back.
        */}
      <CityDialog
        open={isCaseResolved && caseGrade !== null && !debriefHidden && !showCaseBoard}
        onOpenChange={(open) => { if (!open) setDebriefHidden(true); }}
        title="Case debrief"
        description="How this investigation was resolved, and what it was scored on."
        closeLabel="Leave debrief"
      >
        {caseGrade && (
          <>
            <Debrief grade={caseGrade} onRecover={() => { setDebriefHidden(true); setShowCaseBoard(true); }} />
            <div className="city-dialog-actions">
              <button
                type="button"
                className="city-ui-button"
                onClick={() => { setDebriefHidden(true); setShowCaseBoard(true); }}
              >
                Review Board
              </button>
              <Link href="/city" className="city-ui-button">Return to City Map</Link>
            </div>
          </>
        )}
      </CityDialog>

      {/*
        * Inspection is not collection. Opening a document shows it; only the
        * explicit Preserve action files it into the case. Re-inspecting an
        * already-preserved document shows a stable collected state and cannot
        * file it twice.
        */}
      <CityDialog
        open={inspectItem !== null}
        onOpenChange={(open) => { if (!open) setInspectItem(null); }}
        title={inspectItem?.title ?? "Evidence"}
        description={
          inspectItem && state.evidence.includes(inspectItem.id)
            ? "Preserved in the case file."
            : "Not yet preserved. Read it, then decide."
        }
      >
        {inspectItem && (
          <>
            <EvidenceCard item={inspectItem} expanded={true} />
            <div className="city-dialog-actions">
              {state.evidence.includes(inspectItem.id) ? (
                <p className="text-safe font-mono text-xs uppercase tracking-wider">
                  ✓ Preserved in the case file
                </p>
              ) : (
                <button
                  type="button"
                  className="city-ui-button"
                  onClick={() => {
                    collectEvidence(tenMinuteWindowCase, inspectItem.id);
                    checkAndAutoResolve();
                  }}
                >
                  Preserve Evidence
                </button>
              )}
            </div>
          </>
        )}
      </CityDialog>

      <CityDialog
        open={showCaseBoard}
        onOpenChange={(open) => {
          setShowCaseBoard(open);
          if (!open && isCaseResolved) setDebriefHidden(false);
        }}
        title="Case Board"
        description="Select the documents that support a conclusion, then verify the connection."
      >
        <CaseBoard caseDef={tenMinuteWindowCase} />
      </CityDialog>

      <CityDialog
        open={showInventory}
        onOpenChange={setShowInventory}
        title="Evidence"
        description={`${state.evidence.length} document(s) preserved in this investigation.`}
      >
        {state.evidence.length === 0 ? (
          <p className="py-8 text-center text-sm text-smoke">
            Nothing preserved yet. Inspect documents at a location, then preserve the ones that matter.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {state.evidence.map((id) => {
              const item = tenMinuteWindowCase.evidence.find((entry) => entry.id === id);
              return item ? <EvidenceCard key={id} item={item} expanded={false} /> : null;
            })}
          </div>
        )}
      </CityDialog>

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
