/**
 * A synthesised two-tone phone ring (no audio files). Starts only after a user
 * gesture has unlocked audio — Wake Up provides one — and fails silently otherwise.
 */
let ctx: AudioContext | null = null;
let timer: ReturnType<typeof setInterval> | undefined;

export function unlockRingtone() {
  try {
    ctx ??= new AudioContext();
    void ctx.resume();
  } catch {
    ctx = null;
  }
}

function burst() {
  if (!ctx || ctx.state !== "running") return;
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.connect(ctx.destination);
  for (const [freq, start] of [
    [440, 0],
    [480, 0],
    [440, 0.5],
    [480, 0.5],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(now + start);
    osc.stop(now + start + 0.4);
  }
  gain.gain.linearRampToValueAtTime(0.06, now + 0.02);
  gain.gain.setValueAtTime(0.06, now + 0.38);
  gain.gain.linearRampToValueAtTime(0, now + 0.42);
  gain.gain.linearRampToValueAtTime(0.06, now + 0.52);
  gain.gain.setValueAtTime(0.06, now + 0.88);
  gain.gain.linearRampToValueAtTime(0, now + 0.92);
}

export function startRing() {
  stopRing();
  burst();
  timer = setInterval(burst, 3000);
}

export function stopRing() {
  clearInterval(timer);
  timer = undefined;
}
