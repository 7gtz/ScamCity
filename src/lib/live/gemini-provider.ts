import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from "@google/genai";
import type { Analysis } from "@/lib/validation/schemas";
import { MicCapture, PcmPlayer, setLevelSources } from "./audio";
import { LiveCallEmitter } from "./emitter";
import type {
  CallOutcome,
  CompletedCall,
  LiveCallConfig,
  LiveCallProvider,
  RealWorldContext,
  Speaker,
  TacticId,
  TranscriptMessage,
} from "./types";

const OUTCOMES = new Set<CallOutcome>(["scammed", "exposed", "hung-up", "verified-legit", "rejected-legit"]);
const RING_MS = 1400;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Real-time voice call against a Gemini Live persona.
 *
 * Browser mic → AudioWorklet → 16 kHz PCM → Gemini Live WebSocket (ephemeral
 * token) → 24 kHz PCM → scheduled Web Audio playback. Transcriptions arrive
 * alongside the audio; after every caller turn a second model (the analyst,
 * /api/analyze) reads the transcript and emits structured state for the HUD.
 * The persona hangs up itself through the `end_call` tool.
 */
export class GeminiLiveCallProvider extends LiveCallEmitter implements LiveCallProvider {
  /** Created inside the click handler, so the browser lets it play. */
  private readonly player = new PcmPlayer();
  private mic: MicCapture | null = null;
  private session: Session | null = null;

  private scenarioId = "";
  private sessionId = "";
  private legitimate = false;
  private startedAt = 0;
  private seq = 0;
  private speaking: Speaker | null = null;
  private silenceTimer: ReturnType<typeof setInterval> | undefined;

  private transcript: TranscriptMessage[] = [];
  private open: Record<Speaker, TranscriptMessage | null> = { scammer: null, player: null };
  private detected: { tactic: TacticId; at: number }[] = [];
  private revealed: string[] = [];
  private tacticsUsed: TacticId[] = [];
  private suspicion = 0;
  private suspicionLog: { at: number; value: number }[] = [];

  private pendingOutcome: CallOutcome | null = null;
  private ended: CompletedCall | null = null;
  private closed = false;
  private analysis: Promise<void> | null = null;
  private analysisQueued = false;

  constructor(private readonly context?: RealWorldContext) {
    super();
  }

  async connect({ scenarioId }: LiveCallConfig) {
    this.scenarioId = scenarioId;
    this.sessionId = crypto.randomUUID();
    this.emit({ type: "status", status: "connecting" });

    const res = await fetch("/api/live/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId, context: this.context }),
    });
    const body = (await res.json().catch(() => ({}))) as { token?: string; model?: string; legitimate?: boolean; error?: string };
    if (!res.ok || !body.token || !body.model) throw new Error(body.error ?? "Could not open a line to the caller.");
    this.legitimate = Boolean(body.legitimate);

    await this.player.resume();
    const ai = new GoogleGenAI({ apiKey: body.token, httpOptions: { apiVersion: "v1alpha" } });
    this.session = await ai.live.connect({
      model: body.model,
      // Everything else is locked server-side into the ephemeral token.
      config: { responseModalities: [Modality.AUDIO] },
      callbacks: {
        onmessage: (m) => this.handle(m),
        onerror: (e) => this.drop("socket-error", e.message || "The connection failed."),
        onclose: (e) => {
          if (!this.closed) this.drop("closed", e.reason || "The caller's line went dead.");
        },
      },
    });

    setLevelSources({ scammer: () => this.player.level(), player: () => this.mic?.level() ?? 0 });
    this.emit({ type: "status", status: "ringing" });
    await wait(RING_MS);
    if (this.closed) return;

    this.startedAt = performance.now();
    this.logSuspicion();
    this.emit({ type: "status", status: "live" });
    this.session.sendClientContent({
      turns: "(The phone connects. The person has just picked up. Begin the call now.)",
      turnComplete: true,
    });
  }

  async startMicrophone(stream: MediaStream) {
    this.mic = new MicCapture();
    await this.mic.start(stream, (data) =>
      this.session?.sendRealtimeInput({ audio: { data, mimeType: "audio/pcm;rate=16000" } }),
    );
  }

  setMuted(muted: boolean) {
    this.mic?.setMuted(muted);
    if (muted) this.session?.sendRealtimeInput({ audioStreamEnd: true });
  }

  /** Typed reply — for loud rooms. Counts as a player turn and cuts the caller off. */
  sendText(text: string) {
    if (!this.session || this.closed) return;
    this.player.flush();
    this.closeTurn("scammer", true);
    this.closeTurn("player");
    this.upsert({ id: `p${this.seq++}`, speaker: "player", text, at: this.elapsed() });
    this.session.sendClientContent({ turns: text, turnComplete: true });
  }

  async endCall() {
    if (this.ended) return this.ended;
    this.closeTurn("scammer");
    this.closeTurn("player");
    // One last read so the judge sees the final exchange; never block hang-up for long.
    await Promise.race([this.analyze(), wait(2500)]);
    const outcome: CallOutcome =
      this.pendingOutcome ??
      (this.revealed.length ? "scammed" : this.legitimate ? "hung-up" : this.detected.length ? "exposed" : "hung-up");
    return this.finish(outcome);
  }

  disconnect() {
    this.teardown();
    this.clearListeners();
  }

  // ---------------------------------------------------------------------------

  private handle(message: LiveServerMessage) {
    if (this.closed) return;
    const content = message.serverContent;

    if (content?.interrupted) {
      this.player.flush();
      this.closeTurn("scammer", true);
      this.setSpeaking(null);
    }

    for (const part of content?.modelTurn?.parts ?? []) {
      if (part.inlineData?.data) {
        this.player.play(part.inlineData.data);
        this.setSpeaking("scammer");
      }
    }

    if (content?.inputTranscription?.text) this.append("player", content.inputTranscription.text);
    if (content?.outputTranscription?.text) this.append("scammer", content.outputTranscription.text);

    if (content?.turnComplete) {
      this.closeTurn("scammer");
      void this.analyze();
      this.whenSilent(() => {
        this.setSpeaking(null);
        if (this.pendingOutcome) this.finish(this.pendingOutcome);
      });
    }

    const calls = message.toolCall?.functionCalls ?? [];
    if (calls.length) {
      for (const call of calls) {
        const outcome = call.args?.outcome as CallOutcome | undefined;
        if (call.name === "end_call" && outcome && OUTCOMES.has(outcome)) this.pendingOutcome = outcome;
      }
      // 3.1 Live blocks on tool calls: answer at once so the closing line follows.
      this.session?.sendToolResponse({
        functionResponses: calls.map((c) => ({ id: c.id, name: c.name, response: { result: "ok" } })),
      });
      // Safety net if the persona never produces a closing turn.
      setTimeout(() => {
        if (this.pendingOutcome && !this.ended) this.whenSilent(() => this.finish(this.pendingOutcome!));
      }, 7000);
    }
  }

  /** Transcription arrives in fragments; grow the open turn for that speaker. */
  private append(speaker: Speaker, fragment: string) {
    let message = this.open[speaker];
    if (!message) {
      // The caller starting to speak means the player's turn is over.
      if (speaker === "scammer") this.closeTurn("player");
      message = { id: `${speaker[0]}${this.seq++}`, speaker, text: "", at: this.elapsed() };
    }
    const next = { ...message, text: (message.text + fragment).replace(/\s+/g, " ").trimStart() };
    this.open[speaker] = next;
    this.upsert(next);
  }

  private closeTurn(speaker: Speaker, interrupted = false) {
    const message = this.open[speaker];
    if (!message) return;
    this.open[speaker] = null;
    if (interrupted && message.text) this.upsert({ ...message, text: `${message.text.trimEnd()} —` });
  }

  private upsert(message: TranscriptMessage) {
    const i = this.transcript.findIndex((m) => m.id === message.id);
    if (i < 0) this.transcript.push(message);
    else this.transcript[i] = message;
    this.emit({ type: "transcript", message });
  }

  /** Second-model read of the call → HUD state, detections, reveals. Coalesced. */
  private analyze(): Promise<void> {
    if (this.analysis) {
      this.analysisQueued = true;
      return this.analysis;
    }
    const turns = this.transcript.filter((m) => m.text.trim());
    if (!turns.length) return Promise.resolve();

    this.analysis = (async () => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            scenarioId: this.scenarioId,
            transcript: turns.slice(-24).map(({ speaker, text, at }) => ({ speaker, text: text.slice(0, 2000), at })),
            detected: this.detected.map((d) => d.tactic),
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) this.apply((await res.json()) as Analysis);
      } catch {
        // The HUD simply holds its last state; the call continues.
      } finally {
        this.analysis = null;
        if (this.analysisQueued && !this.ended) {
          this.analysisQueued = false;
          void this.analyze();
        }
      }
    })();
    return this.analysis;
  }

  private apply(a: Analysis) {
    if (this.ended) return;
    this.suspicion = a.suspicion;
    this.logSuspicion();

    const lastCaller = this.transcript.findLast((m) => m.speaker === "scammer");
    if (lastCaller && a.scammerTactics.length) {
      this.upsert({ ...lastCaller, tactics: [...new Set([...(lastCaller.tactics ?? []), ...a.scammerTactics])] });
    }
    for (const t of a.scammerTactics) if (!this.tacticsUsed.includes(t)) this.tacticsUsed.push(t);

    const lastPlayer = this.transcript.findLast((m) => m.speaker === "player");
    for (const tactic of a.playerDetected) {
      if (this.detected.some((d) => d.tactic === tactic)) continue;
      const at = lastPlayer?.at ?? this.elapsed();
      this.detected.push({ tactic, at });
      this.emit({ type: "tactic-detected", tactic, at });
    }
    for (const r of a.revealed) if (!this.revealed.includes(r)) this.revealed.push(r);

    this.emit({
      type: "state",
      state: {
        persona: this.scenarioId,
        currentTactic: a.scammerTactics.at(-1) ?? null,
        tacticsUsed: [...this.tacticsUsed],
        escalationLevel: Math.min(3, Math.floor(this.tacticsUsed.length / 2)),
        suspicionEstimate: this.suspicion,
        intent: a.intent,
      },
    });
  }

  private finish(outcome: CallOutcome): CompletedCall {
    if (this.ended) return this.ended;
    const call: CompletedCall = {
      sessionId: this.sessionId,
      scenarioId: this.scenarioId,
      legitimate: this.legitimate,
      durationMs: this.elapsed(),
      transcript: this.transcript.filter((m) => m.text.trim()),
      outcome,
      revealed: [...this.revealed],
      tacticsDetected: [...this.detected],
      suspicion: [...this.suspicionLog, { at: this.elapsed(), value: this.suspicion }],
      context: this.context,
    };
    this.ended = call;
    this.teardown();
    this.emit({ type: "speaking", speaker: null });
    this.emit({ type: "status", status: "ending" });
    this.emit({ type: "ended", call });
    return call;
  }

  /** A dropped line after a real conversation still gets judged; before one, it is an error. */
  private drop(code: string, message: string) {
    if (this.closed || this.ended) return;
    if (this.transcript.filter((m) => m.text.trim()).length >= 2) {
      this.finish(this.pendingOutcome ?? "hung-up");
      return;
    }
    this.teardown();
    this.emit({ type: "error", code, message });
  }

  private teardown() {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.silenceTimer);
    setLevelSources(null);
    this.mic?.stop();
    try {
      this.session?.close();
    } catch {
      // already closed
    }
    this.player.close();
  }

  private whenSilent(fn: () => void) {
    clearInterval(this.silenceTimer);
    this.silenceTimer = setInterval(() => {
      if (this.player.playing) return;
      clearInterval(this.silenceTimer);
      fn();
    }, 150);
  }

  private setSpeaking(speaker: Speaker | null) {
    if (this.speaking === speaker) return;
    this.speaking = speaker;
    this.emit({ type: "speaking", speaker });
  }

  private logSuspicion() {
    this.suspicionLog.push({ at: this.elapsed(), value: this.suspicion });
  }

  private elapsed() {
    return this.startedAt ? Math.round(performance.now() - this.startedAt) : 0;
  }
}
