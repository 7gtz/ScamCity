/* global AudioWorkletProcessor, registerProcessor, sampleRate */
/**
 * Microphone → 16 kHz, 16-bit little-endian PCM in ~40 ms chunks, the format
 * Gemini Live expects, plus an RMS level per chunk for the waveform.
 * The capture context normally runs at 16 kHz already (step = 1); where the
 * browser refuses that, frames are resampled here by linear interpolation.
 */
const TARGET_RATE = 16000;
const CHUNK = 640;

class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.step = sampleRate / TARGET_RATE;
    this.pos = 0;
    this.out = new Int16Array(CHUNK);
    this.len = 0;
    this.sum = 0;
  }

  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (!input) return true;

    let t = this.pos;
    while (t < input.length) {
      const i = t | 0;
      const a = input[i];
      const b = i + 1 < input.length ? input[i + 1] : a;
      let s = a + (b - a) * (t - i);
      s = s < -1 ? -1 : s > 1 ? 1 : s;
      this.sum += s * s;
      this.out[this.len++] = s < 0 ? s * 0x8000 : s * 0x7fff;

      if (this.len === CHUNK) {
        const level = Math.sqrt(this.sum / CHUNK);
        this.port.postMessage({ pcm: this.out.buffer, level }, [this.out.buffer]);
        this.out = new Int16Array(CHUNK);
        this.len = 0;
        this.sum = 0;
      }
      t += this.step;
    }
    this.pos = t - input.length;
    return true;
  }
}

registerProcessor("pcm-capture", PcmCapture);
