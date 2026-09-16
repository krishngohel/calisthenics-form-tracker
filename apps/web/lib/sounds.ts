/**
 * Short synthesized chimes for hold events. WebAudio needs a user gesture
 * before it can play on iOS, so the context is created lazily on first use
 * (the Start button on the training screen is that gesture).
 */
let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, at: number, durationS: number, gain = 0.18): void {
  const ac = context();
  if (!ac) return;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(0, at);
  amp.gain.linearRampToValueAtTime(gain, at + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.001, at + durationS);
  osc.connect(amp).connect(ac.destination);
  osc.start(at);
  osc.stop(at + durationS + 0.02);
}

/** Warm the audio context from a user gesture so later chimes are not blocked. */
export function unlockAudio(): void {
  context();
}

export const chimes = {
  /** Hold started: single rising note. */
  start(): void {
    const ac = context();
    if (!ac) return;
    tone(660, ac.currentTime, 0.12);
    tone(880, ac.currentTime + 0.1, 0.16);
  },
  /** Every five seconds while holding: soft tick. */
  tick(): void {
    const ac = context();
    if (!ac) return;
    tone(1046, ac.currentTime, 0.06, 0.1);
  },
  /** Hold ended: falling pair. */
  drop(): void {
    const ac = context();
    if (!ac) return;
    tone(660, ac.currentTime, 0.12);
    tone(440, ac.currentTime + 0.12, 0.22);
  },
  /** New personal best: three ascending notes. */
  best(): void {
    const ac = context();
    if (!ac) return;
    tone(659, ac.currentTime, 0.12);
    tone(784, ac.currentTime + 0.12, 0.12);
    tone(1046, ac.currentTime + 0.24, 0.3);
  },
};
