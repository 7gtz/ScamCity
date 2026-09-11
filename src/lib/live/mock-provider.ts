import { getScenario, type Scenario, type ScriptEnd } from "@/content/scenarios";
import type {
  CallOutcome,
  CompletedCall,
  LiveCallConfig,
  LiveCallProvider,
  ScammerState,
  TacticId,
  TranscriptMessage,
} from "./types";
import { LiveCallEmitter } from "./emitter";

const WORDS_PER_SECOND = 2.7;

class Cancelled extends Error {}

/**
 * Deterministic scenario script with simulated timing (ScamCity-stack.md).
 * Used for visual development, demos without credentials, tests and judging.
 */
export class MockLiveCallProvider extends LiveCallEmitter implements LiveCallProvider {
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private scenario: Scenario | null = null;
  private sessionId = "";
  private startedAt = 0;
  private generation = 0;
  private nodeId: string | null = null;
  private transcript: TranscriptMessage[] = [];
  private suspicion = 0;
  private suspicionLog: { at: number; value: number }[] = [];
  private detected: { tactic: TacticId; at: number }[] = [];
  private revealed: string[] = [];
  private tacticsUsed: TacticId[] = [];
  private quality: number | undefined;
  private ended: CompletedCall | null = null;

  /** `speed` > 1 compresses timing (tests). */
  constructor(private readonly speed = 1) {
    super();
  }

  async connect({ scenarioId }: LiveCallConfig) {
    const scenario = getScenario(scenarioId);
    if (!scenario) {
      this.emit({ type: "error", code: "unknown-scenario", message: `No scenario "${scenarioId}".` });
      return;
    }
    this.scenario = scenario;
    this.sessionId = crypto.randomUUID();
    const gen = ++this.generation;

    try {
      this.emit({ type: "status", status: "connecting" });
      await this.wait(900, gen);
      this.emit({ type: "status", status: "ringing" });
      await this.wait(2200, gen);
      this.startedAt = performance.now();
      this.logSuspicion();
      this.emit({ type: "status", status: "live" });
      void this.play(scenario.start);
    } catch (err) {
      if (!(err instanceof Cancelled)) throw err;
    }
  }

  async startMicrophone() {
    // Scripted replies stand in for speech; the microphone is not needed.
  }

  sendText(text: string) {
    if (!this.scenario || this.ended) return;
    this.pushMessage({ speaker: "player", text });
  }

  choose(actionId: string) {
    const scenario = this.scenario;
    if (!scenario || !this.nodeId || this.ended) return;
    const option = scenario.nodes[this.nodeId]?.options.find((o) => o.id === actionId);
    if (!option) return;

    const gen = ++this.generation; // interrupts any queued lines
    this.emit({ type: "options", options: [] });
    this.emit({ type: "speaking", speaker: null });
    const message = this.pushMessage({ speaker: "player", text: option.text });

    this.suspicion = Math.max(0, Math.min(1, this.suspicion + option.suspicion));
    this.logSuspicion();
    for (const tactic of option.detects ?? []) {
      if (this.detected.some((d) => d.tactic === tactic)) continue;
      this.detected.push({ tactic, at: message.at });
      this.emit({ type: "tactic-detected", tactic, at: message.at });
    }
    if (option.reveals) this.revealed.push(option.reveals);
    if (option.quality !== undefined) this.quality = option.quality;
    this.emitState();

    const next = option.next;
    this.schedule(
      () => {
        if (gen !== this.generation) return;
        if (isEnd(next)) this.finish(next.slice(4) as CallOutcome);
        else void this.play(next);
      },
      (isEnd(next) ? 1100 : 800) / this.speed,
    );
  }

  async endCall() {
    if (this.ended) return this.ended;
    const legit = this.scenario?.persona.legitimate;
    const outcome: CallOutcome = legit ? "rejected-legit" : this.detected.length ? "exposed" : "hung-up";
    return this.finish(outcome);
  }

  disconnect() {
    this.generation++;
    this.clearTimers();
    this.clearListeners();
  }

  // ---------------------------------------------------------------------------

  private async play(nodeId: string) {
    const node = this.scenario?.nodes[nodeId];
    if (!node) return;
    this.nodeId = nodeId;
    const gen = ++this.generation;

    try {
      for (const line of node.lines) {
        this.pushMessage({ speaker: "scammer", text: line.text, tactics: line.tactics });
        for (const t of line.tactics ?? []) if (!this.tacticsUsed.includes(t)) this.tacticsUsed.push(t);
        this.emitState(line.tactics?.at(-1));
        this.emit({ type: "speaking", speaker: "scammer" });
        await this.wait(this.speechMs(line.text), gen);
        this.emit({ type: "speaking", speaker: null });
        await this.wait(450, gen);
      }
      this.emit({ type: "options", options: node.options.map(({ id, text }) => ({ id, text })) });
    } catch (err) {
      if (!(err instanceof Cancelled)) throw err;
    }
  }

  private finish(outcome: CallOutcome): CompletedCall {
    if (this.ended) return this.ended;
    this.generation++;
    this.clearTimers();
    this.emit({ type: "speaking", speaker: null });
    this.emit({ type: "options", options: [] });
    this.emit({ type: "status", status: "ending" });

    const call: CompletedCall = {
      sessionId: this.sessionId,
      scenarioId: this.scenario?.id ?? "",
      legitimate: this.scenario?.persona.legitimate ?? false,
      durationMs: this.elapsed(),
      transcript: [...this.transcript],
      outcome,
      revealed: [...this.revealed],
      tacticsDetected: [...this.detected],
      suspicion: [...this.suspicionLog, { at: this.elapsed(), value: this.suspicion }],
      decisionQuality: this.quality,
    };
    this.ended = call;
    this.emit({ type: "ended", call });
    return call;
  }

  private pushMessage(m: Omit<TranscriptMessage, "id" | "at">) {
    const message: TranscriptMessage = { ...m, id: `m${this.transcript.length}`, at: this.elapsed() };
    this.transcript.push(message);
    this.emit({ type: "transcript", message });
    return message;
  }

  private emitState(currentTactic: TacticId | null = null) {
    const state: ScammerState = {
      persona: this.scenario?.persona.id ?? "",
      currentTactic,
      tacticsUsed: [...this.tacticsUsed],
      escalationLevel: Math.min(3, Math.floor(this.tacticsUsed.length / 2)),
      suspicionEstimate: this.suspicion,
    };
    this.emit({ type: "state", state });
  }

  private logSuspicion() {
    this.suspicionLog.push({ at: this.elapsed(), value: this.suspicion });
  }

  private elapsed() {
    return this.startedAt ? Math.round((performance.now() - this.startedAt) * this.speed) : 0;
  }

  private speechMs(text: string) {
    const words = text.split(/\s+/).length;
    return Math.max(1200, (words / WORDS_PER_SECOND) * 1000 + 300);
  }

  private wait(ms: number, gen: number) {
    return new Promise<void>((resolve, reject) => {
      this.schedule(() => (gen === this.generation ? resolve() : reject(new Cancelled())), ms / this.speed);
    });
  }

  private schedule(fn: () => void, ms: number) {
    const id = setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, ms);
    this.timers.add(id);
  }

  private clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers.clear();
  }
}

const isEnd = (next: string): next is ScriptEnd => next.startsWith("END:");
