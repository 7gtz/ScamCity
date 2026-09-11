/**
 * Low-latency duplex PCM for the live call (ScamCity-stack.md "Voice packages").
 * Web Audio only — no <audio>, no audio library in the realtime path.
 */

const CAPTURE_RATE = 16000;
const PLAYBACK_RATE = 24000;

function createContext(sampleRate?: number) {
  try {
    return sampleRate ? new AudioContext({ sampleRate }) : new AudioContext();
  } catch {
    return new AudioContext();
  }
}

export function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function fromBase64Pcm16(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer, 0, bytes.length >> 1);
}

/** Microphone → 16 kHz PCM16 chunks via an AudioWorklet. */
export class MicCapture {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private muted = false;
  private lvl = 0;

  async start(stream: MediaStream, onChunk: (base64: string) => void) {
    this.stream = stream;
    let ctx = createContext(CAPTURE_RATE);
    await ctx.audioWorklet.addModule("/worklets/pcm-capture.js");

    let source: MediaStreamAudioSourceNode;
    try {
      source = ctx.createMediaStreamSource(stream);
    } catch {
      // Firefox cannot bridge a 48 kHz mic into a 16 kHz context; the worklet resamples instead.
      await ctx.close();
      ctx = createContext();
      await ctx.audioWorklet.addModule("/worklets/pcm-capture.js");
      source = ctx.createMediaStreamSource(stream);
    }
    this.ctx = ctx;

    const node = new AudioWorkletNode(ctx, "pcm-capture");
    node.port.onmessage = (e: MessageEvent<{ pcm: ArrayBuffer; level: number }>) => {
      this.lvl = this.muted ? 0 : e.data.level;
      if (!this.muted) onChunk(toBase64(e.data.pcm));
    };
    // A silent sink keeps the graph pulled without echoing the mic to the speakers.
    const sink = ctx.createGain();
    sink.gain.value = 0;
    source.connect(node).connect(sink).connect(ctx.destination);
  }

  level() {
    return this.lvl;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.stream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }

  stop() {
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}

/**
 * Gapless scheduled playback of 24 kHz PCM16 chunks. `flush()` drops every
 * queued buffer immediately — used when the player interrupts the caller.
 */
export class PcmPlayer {
  private readonly ctx = createContext(PLAYBACK_RATE);
  private readonly out: GainNode;
  private readonly analyser: AnalyserNode;
  private readonly frame = new Float32Array(512);
  private readonly sources = new Set<AudioBufferSourceNode>();
  private next = 0;
  /** performance.now() when the last buffer finished (or was flushed). */
  private quietSince = 0;

  constructor() {
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.out = this.ctx.createGain();
    this.out.connect(this.analyser).connect(this.ctx.destination);
  }

  resume() {
    return this.ctx.resume();
  }

  play(base64: string) {
    const pcm = fromBase64Pcm16(base64);
    if (!pcm.length) return;
    const buffer = this.ctx.createBuffer(1, pcm.length, PLAYBACK_RATE);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) channel[i] = pcm[i]! / 32768;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.out);
    const at = Math.max(this.ctx.currentTime + 0.04, this.next);
    src.start(at);
    this.next = at + buffer.duration;
    this.sources.add(src);
    src.onended = () => {
      this.sources.delete(src);
      if (!this.sources.size) this.quietSince = performance.now();
    };
  }

  get playing() {
    return this.sources.size > 0;
  }

  /** True while the caller is audible, and for `tailMs` after: room echo off speakers takes a moment to die. */
  recentlyAudible(tailMs: number) {
    return this.sources.size > 0 || performance.now() - this.quietSince < tailMs;
  }

  flush() {
    for (const src of this.sources) {
      try {
        src.stop();
      } catch {
        // already stopped
      }
    }
    this.sources.clear();
    this.next = 0;
    this.quietSince = performance.now();
  }

  level() {
    this.analyser.getFloatTimeDomainData(this.frame);
    let sum = 0;
    for (const v of this.frame) sum += v * v;
    return Math.sqrt(sum / this.frame.length);
  }

  close() {
    this.flush();
    void this.ctx.close().catch(() => {});
  }
}

/** Live audio levels for the waveform, read once per animation frame (no React state). */
type LevelSources = { scammer: () => number; player: () => number } | null;
let levelSources: LevelSources = null;

export const setLevelSources = (sources: LevelSources) => {
  levelSources = sources;
};

/** Loudest current level (0–~0.5), or null when no live audio is connected. */
export const readLevel = () => (levelSources ? Math.max(levelSources.scammer(), levelSources.player()) : null);
