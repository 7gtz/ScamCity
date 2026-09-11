"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { useProgressStore } from "@/features/progress/progress-store";
import { useResultsStore } from "@/features/scoring/results-store";
import { scoreCall } from "@/features/scoring/score-call";
import { getAiStatus } from "@/lib/ai-status";
import { createLiveCallProvider, mockForced } from "@/lib/live/provider";
import { getRealWorldContext } from "@/lib/live/real-world";
import type { CompletedCall, LiveCallProvider } from "@/lib/live/types";
import { useCallStore } from "./call-store";

/** Minimum time "REVIEWING TRANSCRIPT" holds, so the moment reads even when the judge is fast. */
const MIN_REVIEW_MS = 1200;

type AnswerOptions = { precise: boolean; forceMock?: boolean };

/** Wires a LiveCallProvider to the call store. The only place UI meets a provider. */
export function useLiveCall(scenarioId: string) {
  const router = useRouter();
  const provider = useRef<LiveCallProvider | null>(null);

  useEffect(() => {
    useCallStore.getState().reset(scenarioId);
    return () => {
      provider.current?.disconnect();
      provider.current = null;
    };
  }, [scenarioId]);

  const complete = useCallback(
    async (call: CompletedCall) => {
      useCallStore.getState().setStatus("scoring");
      const [score] = await Promise.all([scoreCall(call), new Promise((r) => setTimeout(r, MIN_REVIEW_MS))]);

      useResultsStore.getState().save(score);
      const progress = useProgressStore.getState();
      const caught = score.caught.map((c) => c.tactic);
      progress.learn([...caught, ...score.missed]);
      progress.recordTactics(score.missed, caught);
      if (score.passed) progress.clear(call.scenarioId);

      useCallStore.getState().setStatus("results");
      router.push(`/results/${score.sessionId}`);
    },
    [router],
  );

  const wire = useCallback(
    (p: LiveCallProvider) => {
      const s = useCallStore.getState;
      p.on("status", (e) => s().setStatus(e.status));
      p.on("transcript", (e) => s().push(e.message));
      p.on("state", (e) => s().setAgent(e.state));
      p.on("options", (e) => s().setOptions(e.options));
      p.on("speaking", (e) => s().setSpeaking(e.speaker));
      p.on("tactic-detected", (e) => s().addDetected(e.tactic, e.at));
      p.on("error", (e) => s().fail(e.code, e.message));
      p.on("ended", (e) => void complete(e.call));
    },
    [complete],
  );

  const answer = useCallback(
    async ({ precise, forceMock }: AnswerOptions) => {
      const store = useCallStore.getState();
      if (store.status !== "idle" && store.status !== "error") return;
      store.reset(scenarioId);
      provider.current?.disconnect();

      const live = !forceMock && !mockForced() && (await getAiStatus()).gemini;

      if (!live) {
        useCallStore.getState().setMode("mock");
        const p = createLiveCallProvider("mock");
        provider.current = p;
        wire(p);
        await p.connect({ scenarioId });
        return;
      }

      const { setMode, setStatus, setContext, fail } = useCallStore.getState();
      setMode("gemini");
      setStatus("permission-requested");

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          // Echo cancellation keeps the caller's own voice from interrupting itself.
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
        });
      } catch {
        fail("mic-denied", "The microphone is blocked. Allow it from the address bar, or take the scripted version of this call.");
        return;
      }

      const context = await getRealWorldContext(precise);
      setContext(context);

      const p = createLiveCallProvider("gemini", context);
      provider.current = p;
      wire(p);
      try {
        await p.connect({ scenarioId });
        await p.startMicrophone(stream);
      } catch (err) {
        stream.getTracks().forEach((t) => t.stop());
        p.disconnect();
        fail("connect-failed", err instanceof Error ? err.message : "The line could not be opened.");
      }
    },
    [scenarioId, wire],
  );

  const choose = useCallback((actionId: string) => provider.current?.choose?.(actionId), []);
  const sendText = useCallback((text: string) => provider.current?.sendText(text), []);

  const hangUp = useCallback(() => {
    const { status } = useCallStore.getState();
    if (status === "ringing" || status === "live") void provider.current?.endCall();
  }, []);

  const toggleMute = useCallback(() => {
    const { muted, setMuted } = useCallStore.getState();
    setMuted(!muted);
    provider.current?.setMuted?.(!muted);
  }, []);

  return { answer, choose, sendText, hangUp, toggleMute };
}
