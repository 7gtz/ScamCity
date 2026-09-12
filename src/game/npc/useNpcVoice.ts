import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from "@google/genai";
import { getGameState } from "@/game/integration/game";
import { MicCapture, PcmPlayer, setLevelSources } from "@/lib/live/audio";
import { getRealWorldContext } from "@/lib/live/real-world";
import { executeNpcTool } from "./tools";
import type {
  NpcId,
  NpcSession,
  NpcSessionEvent,
  NpcSessionStatus,
  NpcSubtitle,
  NpcToolCall,
  NpcToolName,
} from "./types";

type Listener = (event: NpcSessionEvent) => void;

/**
 * Nothing in the connect path may hang forever. If the socket has not opened by
 * now, drop to `unavailable` so the overlay falls back to the authored
 * interview instead of sitting on "Opening line" with no error.
 */
const CONNECT_TIMEOUT_MS = 12_000;

class GeminiNpcSession implements NpcSession {
  private readonly listeners = new Set<Listener>();
  private readonly player = new PcmPlayer();
  private session: Session | null = null;
  private mic: MicCapture | null = null;
  private status: NpcSessionStatus = "idle";
  private closed = false;
  private sequence = 0;
  private open: Record<"player" | "npc", NpcSubtitle | null> = {
    player: null,
    npc: null,
  };

  constructor(readonly npc: NpcId) {}

  on(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: NpcSessionEvent) {
    for (const listener of this.listeners) listener(event);
  }

  private setStatus(status: NpcSessionStatus) {
    this.status = status;
    this.emit({ type: "status", status });
  }

  async connect() {
    this.setStatus("connecting");
    try {
      const state = getGameState();
      const dossier = {
        evidence: state.evidence,
        deductions: Object.keys(state.flags).filter(
          (key) => key.startsWith("deduction.") && Boolean(state.flags[key]),
        ),
        minutesLeft: 10,
        flags: state.flags,
      };
      /*
       * Everyone in this city is a local. The device clock and timezone always
       * resolve; GPS is never requested here, so answering the phone costs no
       * permission prompt. Failure is non-fatal — the NPC simply loses its
       * accent and its sense of the hour.
       */
      const context = await getRealWorldContext(false).catch(() => undefined);
      const response = await fetch("/api/detective/npc-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ npc: this.npc, dossier, context }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        token?: string;
        model?: string;
      };
      if (!response.ok || !body.token || !body.model) {
        this.setStatus("unavailable");
        return;
      }

      // Never await this. Under the browser autoplay policy a suspended
      // AudioContext returns a promise that stays pending until the page has
      // user activation — awaiting it hangs connect() silently, with no error
      // in the console. Playback is resumed again when the first audio lands.
      void this.player.resume().catch(() => {});

      const ai = new GoogleGenAI({
        apiKey: body.token,
        httpOptions: { apiVersion: "v1alpha" },
      });
      const connecting = ai.live.connect({
        model: body.model,
        config: { responseModalities: [Modality.AUDIO] },
        callbacks: {
          onmessage: (message) => this.handle(message),
          onerror: (event) => this.fail(event.message || "The interview line failed."),
          onclose: () => {
            if (!this.closed) this.fail("The interview line closed.");
          },
        },
      });
      const session = await Promise.race([
        connecting,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), CONNECT_TIMEOUT_MS)),
      ]);
      if (!session) {
        console.warn("[npc-voice] live connect timed out; falling back");
        void connecting.then((late) => late.close()).catch(() => {});
        this.setStatus("unavailable");
        return;
      }
      if (this.closed) {
        session.close();
        return;
      }
      this.session = session;
      setLevelSources({
        scammer: () => this.player.level(),
        player: () => this.mic?.level() ?? 0,
      });
      this.setStatus("live");
      this.session.sendClientContent({
        turns: "(The detective has approached you. Begin the conversation now.)",
        turnComplete: true,
      });
    } catch (err) {
      console.error("[npc-voice] connect failed", err);
      this.setStatus("unavailable");
    }
  }

  async startMicrophone(stream: MediaStream) {
    if (this.mic) return;
    this.mic = new MicCapture();
    await this.mic.start(stream, (data) => {
      this.session?.sendRealtimeInput({
        audio: { data, mimeType: "audio/pcm;rate=16000" },
      });
    });
  }

  sendText(text: string) {
    const clean = text.trim();
    if (!clean || !this.session || this.closed) return;
    this.player.flush();
    this.closeTurn("npc");
    this.closeTurn("player");
    this.emit({
      type: "subtitle",
      subtitle: { id: `p-${this.sequence++}`, speaker: "player", text: clean, final: true },
    });
    this.session.sendClientContent({ turns: clean, turnComplete: true });
  }

  setMuted(muted: boolean) {
    this.mic?.setMuted(muted);
    if (muted) this.session?.sendRealtimeInput({ audioStreamEnd: true });
  }

  async end() {
    if (this.closed) return;
    this.closed = true;
    this.setStatus("ending");
    this.mic?.stop();
    this.player.close();
    setLevelSources(null);
    this.session?.close();
    this.session = null;
    this.setStatus("ended");
    this.emit({ type: "ended", reason: "player" });
  }

  private handle(message: LiveServerMessage) {
    if (this.closed) return;
    const content = message.serverContent;
    if (content?.interrupted) {
      this.player.flush();
      this.closeTurn("npc");
      this.emit({ type: "speaking", who: "npc", on: false });
    }
    for (const part of content?.modelTurn?.parts ?? []) {
      if (part.inlineData?.data) {
        // By now the player has clicked, so a context blocked at connect time
        // will start here.
        void this.player.resume().catch(() => {});
        this.player.play(part.inlineData.data);
        this.emit({ type: "speaking", who: "npc", on: true });
      }
    }
    if (content?.inputTranscription?.text) this.append("player", content.inputTranscription.text);
    if (content?.outputTranscription?.text) this.append("npc", content.outputTranscription.text);
    if (content?.turnComplete) {
      this.closeTurn("player");
      this.closeTurn("npc");
      this.emit({ type: "speaking", who: "npc", on: false });
    }

    const calls = message.toolCall?.functionCalls ?? [];
    if (calls.length) {
      const responses = calls.map((raw) => {
        const call: NpcToolCall = {
          id: raw.id ?? crypto.randomUUID(),
          name: raw.name as NpcToolName,
          args: raw.args ?? {},
          npc: this.npc,
        };
        const result = executeNpcTool(call, getGameState());
        this.emit({ type: "tool", call, result });
        if (result.ends) queueMicrotask(() => void this.endAsNpc());
        return {
          id: call.id,
          name: call.name,
          response: { result: result.ok ? "ok" : "refused", reason: result.reason },
        };
      });
      this.session?.sendToolResponse({ functionResponses: responses });
    }
  }

  private append(speaker: "player" | "npc", fragment: string) {
    let subtitle = this.open[speaker];
    if (!subtitle) {
      if (speaker === "npc") this.closeTurn("player");
      subtitle = { id: `${speaker[0]}-${this.sequence++}`, speaker, text: "", final: false };
    }
    const next = {
      ...subtitle,
      text: `${subtitle.text}${fragment}`.replace(/\s+/g, " ").trimStart(),
    };
    this.open[speaker] = next;
    this.emit({ type: "subtitle", subtitle: next });
  }

  private closeTurn(speaker: "player" | "npc") {
    const subtitle = this.open[speaker];
    if (!subtitle) return;
    this.open[speaker] = null;
    this.emit({ type: "subtitle", subtitle: { ...subtitle, final: true } });
  }

  private fail(message: string) {
    if (this.closed) return;
    this.emit({ type: "error", message });
    this.setStatus(this.status === "connecting" ? "unavailable" : "error");
  }

  private async endAsNpc() {
    if (this.closed) return;
    this.closed = true;
    this.mic?.stop();
    this.player.close();
    setLevelSources(null);
    this.session?.close();
    this.setStatus("ended");
    this.emit({ type: "ended", reason: "npc" });
  }
}

export function createNpcSession(npc: NpcId): NpcSession {
  return new GeminiNpcSession(npc);
}
