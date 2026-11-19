/**
 * Soft synthesized sounds, so there are no audio files to license or load.
 * Everything goes through one AudioContext, created on the first user tap.
 */

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

/** Call from a tap handler: browsers only start audio after a user gesture. */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

function audio(): AudioContext | null {
  if (!enabled || !ctx || ctx.state !== 'running') return null;
  return ctx;
}

let noise: AudioBuffer | null = null;
function noiseBuffer(a: AudioContext): AudioBuffer {
  if (noise) return noise;
  noise = a.createBuffer(1, Math.floor(a.sampleRate * 0.1), a.sampleRate);
  const data = noise.getChannelData(0);
  // A fixed pseudo-random pattern; it only colors the sound.
  let seed = 7;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 16807) % 2147483647;
    data[i] = (seed / 2147483647) * 2 - 1;
  }
  return noise;
}

/** A short knock: filtered noise plus a quick resonant blip, like a candy die on a tray. */
function knock(a: AudioContext, at: number, pitch: number, gain: number) {
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a);
  const band = a.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = pitch;
  band.Q.value = 6;
  const env = a.createGain();
  env.gain.setValueAtTime(gain, at);
  env.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
  src.connect(band).connect(env).connect(a.destination);
  src.start(at);
  src.stop(at + 0.08);

  const osc = a.createOscillator();
  osc.frequency.setValueAtTime(pitch * 0.5, at);
  osc.frequency.exponentialRampToValueAtTime(pitch * 0.3, at + 0.05);
  const og = a.createGain();
  og.gain.setValueAtTime(gain * 0.35, at);
  og.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
  osc.connect(og).connect(a.destination);
  osc.start(at);
  osc.stop(at + 0.06);
}

/** The cup rattling: a few quick soft knocks. */
export function playRattle(durationMs: number) {
  const a = audio();
  if (!a) return;
  const steps = Math.max(2, Math.round(durationMs / 55));
  for (let i = 0; i < steps; i++) {
    knock(a, a.currentTime + (i * durationMs) / steps / 1000, 1500 + (i % 2) * 400, 0.12);
  }
}

/** One die landing, `delayMs` from now. */
export function playClack(delayMs = 0, strength = 1) {
  const a = audio();
  if (!a) return;
  knock(a, a.currentTime + delayMs / 1000, 900 + strength * 500, 0.25 * strength);
}

/** A score written in: a soft rising pop. */
export function playPop() {
  const a = audio();
  if (!a) return;
  const at = a.currentTime;
  const osc = a.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(420, at);
  osc.frequency.exponentialRampToValueAtTime(880, at + 0.08);
  const g = a.createGain();
  g.gain.setValueAtTime(0.18, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.14);
  osc.connect(g).connect(a.destination);
  osc.start(at);
  osc.stop(at + 0.15);
}

/** A sparkly arpeggio for a Yatzy. */
export function playCelebrate() {
  const a = audio();
  if (!a) return;
  [784, 988, 1175, 1568].forEach((f, i) => {
    const at = a.currentTime + i * 0.07;
    const osc = a.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = f;
    const g = a.createGain();
    g.gain.setValueAtTime(0.14, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
    osc.connect(g).connect(a.destination);
    osc.start(at);
    osc.stop(at + 0.32);
  });
}
