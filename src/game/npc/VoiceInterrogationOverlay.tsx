"use client";

import { useCallback, useEffect, useInsertionEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { CityDialog } from "@/game/ui/CityDialog";
import { Waveform } from "@/features/call/Waveform";
import { DialogueBox } from "@/game/dialogue/DialogueBox";
import { getGameState } from "@/game/integration/game";
import { prefersReducedMotion } from "@/game/world/navigation";
import { TEN_MINUTE_DIALOGUE } from "@/content/cases/ten-minute-window";
import { NpcPortrait, npcIdentity } from "./NpcPortrait";
import { npcSceneArt } from "./art";
import { CampaignTrailer } from "./CampaignTrailer";
import { SubtitleReel } from "./SubtitleReel";
import { npcSessionFactory, publishNpcConnectionStatus } from "./npc-session-store";
import type {
  NpcSession,
  NpcSessionStatus,
  NpcSubtitle,
  VoiceInterrogationOverlayProps,
} from "./types";
import "./npc-overlay.css";

export function VoiceInterrogationOverlay({
  npc,
  onEffects,
  onClose,
  fallbackDialogueNodeId,
  demoMode = false,
}: VoiceInterrogationOverlayProps) {
  /*
   * The session is created inside the connect effect, not memoised across
   * renders. React's development mode mounts every component twice — effect,
   * cleanup, effect — and `end()` permanently closes a session. A memoised
   * instance is therefore already dead by the second mount: the socket opens,
   * nothing ever plays, and no error is raised. One fresh session per mount is
   * the only arrangement that survives both that and a real unmount.
   */
  const sessionRef = useRef<NpcSession | null>(null);
  const identity = npcIdentity(npc);
  const typedInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<NpcSessionStatus>("idle");
  const [subtitles, setSubtitles] = useState<NpcSubtitle[]>([]);
  const [speaking, setSpeaking] = useState<"player" | "npc" | null>(null);
  const [muted, setMuted] = useState(false);
  const [openMic, setOpenMic] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [evidenceToast, setEvidenceToast] = useState(false);
  const holding = useRef(false);

  /*
   * Hold the newest `onEffects` without making it a dependency of the connect
   * effect: the parent re-renders on every game-state change, and a new
   * callback identity there must not tear down a live conversation.
   */
  const onEffectsRef = useRef(onEffects);
  useInsertionEffect(() => {
    onEffectsRef.current = onEffects;
  }, [onEffects]);

  const close = useCallback(() => {
    void sessionRef.current?.end();
    onClose();
  }, [onClose]);

  useEffect(() => {
    const session = npcSessionFactory(npc);
    sessionRef.current = session;
    const connectionTimeout = window.setTimeout(() => {
      setError("The voice connection timed out. Continue with the case transcript, or leave and try again.");
      setStatus("unavailable");
      void session.end();
    }, 15000);
    const unsubscribe = session.on((event) => {
      if (event.type === "status") {
        if (event.status !== "idle" && event.status !== "connecting") window.clearTimeout(connectionTimeout);
        setStatus(event.status);
        publishNpcConnectionStatus(event.status);
      }
      if (event.type === "speaking") {
        setSpeaking(event.on ? event.who : null);
      }
      if (event.type === "error") setError(event.message);
      if (event.type === "subtitle") {
        setSubtitles((current) => {
          const index = current.findIndex((line) => line.id === event.subtitle.id);
          if (index < 0) return [...current, event.subtitle];
          const next = [...current];
          next[index] = event.subtitle;
          return next;
        });
      }
      if (event.type === "tool") {
        if (event.result.effects.length) onEffectsRef.current(event.result.effects);
        if (
          event.result.ok &&
          event.result.effects.some((effect) => "giveEvidence" in effect)
        ) {
          setEvidenceToast(true);
          window.setTimeout(() => setEvidenceToast(false), 3200);
        }
      }
    });
    void session.connect().catch(() => {
      window.clearTimeout(connectionTimeout);
      setError("Voice connection unavailable. Continue with the case transcript.");
      setStatus("unavailable");
    });
    return () => {
      unsubscribe();
      window.clearTimeout(connectionTimeout);
      publishNpcConnectionStatus("idle");
      void session.end();
      if (sessionRef.current === session) sessionRef.current = null;
    };
  }, [npc]);



  /**
   * Acquire the microphone exactly once, however many times it is asked for.
   *
   * `micReady` is only set after the await, so two quick Hold-to-Talk presses
   * both passed the guard and opened two streams. `startMicrophone` keeps the
   * first and silently drops the second, whose tracks then stay live for the
   * rest of the session — an open microphone with no control able to mute it
   * and no teardown able to stop it. Single-flight fixes that: concurrent
   * callers await the same promise and exactly one stream is ever created.
   *
   * If the conversation ended while permission was still pending, the stream is
   * stopped the moment it arrives rather than handed to a dead session.
   */
  const micRequest = useRef<Promise<boolean> | null>(null);
  const ensureMicrophone = useCallback(async () => {
    if (micReady) return true;
    if (micRequest.current) return micRequest.current;

    const request = (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const session = sessionRef.current;
        if (!session) {
          stream.getTracks().forEach((track) => track.stop());
          return false;
        }
        await session.startMicrophone(stream);
        // Arrives muted. Only an explicit press or Open Mic unmutes it.
        session.setMuted(true);
        setMicReady(true);
        return true;
      } catch {
        setError("Microphone unavailable or permission denied. Type below to continue. To enable voice, allow microphone access in your browser’s site settings, then try again.");
        typedInput.current?.focus();
        return false;
      } finally {
        micRequest.current = null;
      }
    })();

    micRequest.current = request;
    return request;
  }, [micReady]);

  const beginTalking = useCallback(async () => {
    holding.current = true;
    if (status !== "live" || !(await ensureMicrophone())) return;
    if (!holding.current) { sessionRef.current?.setMuted(true); return; }
    sessionRef.current?.setMuted(false);
    setSpeaking("player");
  }, [ensureMicrophone, status]);

  const stopTalking = useCallback(() => {
    holding.current = false;
    if (openMic) return;
    sessionRef.current?.setMuted(true);
    setSpeaking(null);
  }, [openMic]);

  const toggleOpenMic = useCallback(async () => {
    const next = !openMic;
    if (next && !(await ensureMicrophone())) return;
    setOpenMic(next);
    sessionRef.current?.setMuted(!next || muted);
  }, [ensureMicrophone, muted, openMic]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    sessionRef.current?.setMuted(next || !openMic);
  }, [muted, openMic]);

  const submitText = (event: FormEvent) => {
    event.preventDefault();
    const message = text.trim();
    if (!message || status !== "live") return;
    sessionRef.current?.sendText(message);
    setText("");
  };

  if ((status === "unavailable" || status === "error" || status === "ended") && fallbackDialogueNodeId) {
    const state = getGameState();
    return (
      <CityDialog open onOpenChange={(open) => { if (!open) close(); }} title={`Interview ${identity.name}`} className="npc-dialog">
        <div className="npc-fallback-note">Voice line unavailable — continuing from the case transcript.</div>
        <DialogueBox
          dialogue={TEN_MINUTE_DIALOGUE}
          startNodeId={fallbackDialogueNodeId}
          state={{ flags: state.flags, evidence: state.evidence }}
          onEffect={onEffects}
          onEnd={close}
          className="npc-fallback-dialogue"
        />
      </CityDialog>
    );
  }

  const motion = prefersReducedMotion() ? "reduced" : "full";
  const active = speaking !== null;
  const sceneFrame = npcSceneArt(npc, status, getGameState().trust[npc] ?? 0);

  if (demoMode && npc === "vance") {
    // A hard boundary is intentional: normal navigation would retain the
    // disposable preview store instead of rehydrating the campaign.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    const leaveDemo = () => window.location.assign("/city");
    return <CampaignTrailer onExit={leaveDemo} />;
  }

  return (
    <CityDialog open onOpenChange={(open) => { if (!open) close(); }} title={`Interview with ${identity.name}`} showCloseButton={false} className={demoMode ? "npc-dialog npc-dialog-demo" : "npc-dialog"}>
    <div data-motion={motion}>
      <section className="npc-sheet">
        <header className="npc-heading">
          <NpcPortrait npc={npc} />
          <div className="npc-identity">
            <span>Live field interview</span>
            <h2>{identity.name}</h2>
            <p>{identity.role}</p>
          </div>
          <div className="npc-state" data-status={status}>
            <i aria-hidden="true" />
            {status === "connecting" ? "Opening line" : speaking === "npc" ? "Speaking" : speaking === "player" ? "Listening" : status}
          </div>
          <button type="button" className="npc-leave" onClick={close} aria-label={demoMode ? "Exit demo" : "Leave interview"}>
            {demoMode ? "Exit demo ×" : "Leave ×"}
          </button>
        </header>

        <div className="npc-scene-frame" aria-hidden="true">
          <Image
            src={sceneFrame}
            alt=""
            fill
            sizes="(min-width: 768px) 68rem, 100vw"
            priority
          />
        </div>

        <div className="npc-waveform">
          <Waveform active={active} />
        </div>
        <SubtitleReel subtitles={subtitles} />

        {error && <p className="npc-error" role="status">{error}</p>}
        {evidenceToast && <div className="npc-evidence-toast" role="status">Evidence secured — added to case file</div>}

        <div className="npc-controls">
          <button
            type="button"
            className="npc-talk"
            disabled={status !== "live" || openMic || muted}
            onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); void beginTalking(); }}
            onBlur={stopTalking}
            onPointerUp={stopTalking}
            onPointerCancel={stopTalking}
            onKeyDown={(event) => {
              if (event.key === " " || event.key === "Enter") { event.preventDefault(); if (!event.repeat) void beginTalking(); }
            }}
            onKeyUp={(event) => {
              if (event.key === " " || event.key === "Enter") stopTalking();
            }}
          >
            Hold to talk
          </button>
          <button type="button" className="npc-control" aria-pressed={openMic} onClick={() => void toggleOpenMic()} disabled={status !== "live"}>
            Open mic {openMic ? "on" : "off"}
          </button>
          <button type="button" className="npc-control" aria-pressed={muted} onClick={toggleMute} disabled={!micReady}>
            {muted ? "Unmute" : "Mute"}
          </button>
        </div>

        <form className="npc-text-line" onSubmit={submitText}>
          <label htmlFor={`npc-text-${npc}`}>Type instead</label>
          <input ref={typedInput} id={`npc-text-${npc}`} value={text} onChange={(event) => setText(event.target.value)} placeholder="Ask a question…" disabled={status !== "live"} />
          <button type="submit" disabled={status !== "live" || !text.trim()}>Send</button>
        </form>
      </section>
    </div>
    </CityDialog>
  );
}
