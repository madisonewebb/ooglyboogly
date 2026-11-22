/**
 * Synthesized sounds, so there are no audio files to license or load. Dice
 * use modal synthesis: a porcelain die rings at a few inharmonic partials
 * for a few hundredths of a second, felt deadens it to a thump, and the
 * glossy rim adds a hollow knock. Every impact comes from the recorded
 * physics, panned to where it happens.
 *
 * Everything goes through one AudioContext, created on the first user gesture,
 * then a master volume and a limiter so a busy roll never clips.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let volume = 0.8;

/** 0 to 1. The ear hears loudness roughly as the square. */
export function setVolume(v: number) {
  volume = Math.min(1, Math.max(0, v));
  if (master && ctx) master.gain.setTargetAtTime(volume * volume, ctx.currentTime, 0.02);
}

/** Call from a gesture handler: browsers only start audio after a user gesture. */
export function unlockAudio() {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.knee.value = 6;
      limiter.ratio.value = 8;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.12;
      master = ctx.createGain();
      master.gain.value = volume * volume;
      master.connect(limiter).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
    master = null;
  }
}

function audio(): { a: AudioContext; out: AudioNode } | null {
  if (volume <= 0 || !ctx || !master || ctx.state !== 'running') return null;
  return { a: ctx, out: master };
}

let noise: AudioBuffer | null = null;
function noiseBuffer(a: AudioContext): AudioBuffer {
  if (noise) return noise;
  noise = a.createBuffer(1, Math.floor(a.sampleRate * 0.25), a.sampleRate);
  const data = noise.getChannelData(0);
  // A fixed pseudo-random pattern; it only colors the sound.
  let seed = 7;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 16807) % 2147483647;
    data[i] = (seed / 2147483647) * 2 - 1;
  }
  return noise;
}

let jitterSeed = 1;
/** Small random variation, so no two clacks sound identical. */
function jitter(amount: number) {
  jitterSeed = (jitterSeed * 16807) % 2147483647;
  return 1 + ((jitterSeed / 2147483647) * 2 - 1) * amount;
}

function panned(a: AudioContext, out: AudioNode, pan: number): AudioNode {
  const p = a.createStereoPanner();
  p.pan.value = Math.max(-0.8, Math.min(0.8, pan));
  p.connect(out);
  return p;
}

/** A struck body ringing at a few partials. */
function ring(
  a: AudioContext,
  out: AudioNode,
  at: number,
  base: number,
  partials: [ratio: number, gain: number, decay: number][],
  gain: number,
) {
  for (const [ratio, g, decay] of partials) {
    const osc = a.createOscillator();
    osc.frequency.value = base * ratio * jitter(0.02);
    const env = a.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(gain * g, at + 0.0015);
    env.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    osc.connect(env).connect(out);
    osc.start(at);
    osc.stop(at + decay + 0.01);
  }
}

/** A burst of filtered noise: the contact itself. */
function burst(
  a: AudioContext,
  out: AudioNode,
  at: number,
  type: BiquadFilterType,
  freq: number,
  q: number,
  gain: number,
  decay: number,
) {
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a);
  const f = a.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq * jitter(0.1);
  f.Q.value = q;
  const env = a.createGain();
  env.gain.setValueAtTime(gain, at);
  env.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  src.connect(f).connect(env).connect(out);
  src.start(at, Math.random() * 0.15);
  src.stop(at + decay + 0.01);
}

/** A low thump with a falling pitch: weight landing on something soft. */
function thump(
  a: AudioContext,
  out: AudioNode,
  at: number,
  freq: number,
  gain: number,
  decay: number,
) {
  const osc = a.createOscillator();
  osc.frequency.setValueAtTime(freq * jitter(0.08), at);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.55, at + decay);
  const env = a.createGain();
  env.gain.setValueAtTime(gain, at);
  env.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  osc.connect(env).connect(out);
  osc.start(at);
  osc.stop(at + decay + 0.01);
}

const DIE_PARTIALS: [number, number, number][] = [
  [1, 1, 0.05],
  [1.58, 0.55, 0.035],
  [2.37, 0.35, 0.025],
  [3.61, 0.2, 0.016],
];

export type ImpactSound = 'floor' | 'wall' | 'die' | 'cup';

/** One collision, `delayMs` from now. Strength 0 to 1; pan -1 (left) to 1 (right). */
export function playImpact(delayMs: number, kind: ImpactSound, strength: number, pan = 0) {
  const ok = audio();
  if (!ok) return;
  const { a } = ok;
  const at = a.currentTime + Math.max(0, delayMs) / 1000;
  const out = panned(a, ok.out, pan);
  const s = 0.25 + 0.75 * Math.min(1, strength);
  switch (kind) {
    case 'die':
      // Porcelain on porcelain: bright and ringing.
      ring(a, out, at, 2300 * jitter(0.12), DIE_PARTIALS, 0.16 * s);
      burst(a, out, at, 'highpass', 3500, 0.7, 0.12 * s, 0.012);
      break;
    case 'floor':
      // Felt swallows the ring: mostly a soft thump, with a little click of the corner.
      thump(a, out, at, 150, 0.32 * s, 0.07);
      burst(a, out, at, 'lowpass', 700, 0.8, 0.22 * s, 0.045);
      ring(a, out, at, 2000 * jitter(0.12), DIE_PARTIALS.slice(0, 2), 0.035 * s);
      break;
    case 'wall':
      // The glossy rim: a hollow knock.
      ring(
        a,
        out,
        at,
        820 * jitter(0.08),
        [
          [1, 1, 0.07],
          [1.52, 0.5, 0.05],
          [2.48, 0.25, 0.03],
        ],
        0.12 * s,
      );
      burst(a, out, at, 'bandpass', 1300, 2, 0.16 * s, 0.03);
      ring(a, out, at, 2300 * jitter(0.12), DIE_PARTIALS.slice(0, 2), 0.06 * s);
      break;
    case 'cup':
      // Muffled by the cup around it.
      ring(a, out, at, 1500 * jitter(0.15), DIE_PARTIALS.slice(0, 3), 0.07 * s);
      thump(a, out, at, 260, 0.12 * s, 0.05);
      break;
  }
}

/** The cup rattling: dice knocking inside, and the cup's own knock as it changes direction. */
export function playRattle(delayMs: number, durationMs: number, dice: number, pan = -0.5) {
  const ok = audio();
  if (!ok) return;
  const { a } = ok;
  const start = a.currentTime + Math.max(0, delayMs) / 1000;
  const out = panned(a, ok.out, pan);
  const dur = durationMs / 1000;
  // About fourteen knocks a second per die, and the cup's own knock about eight times a second.
  const clicks = Math.max(2, Math.round(dice * 14 * dur));
  for (let i = 0; i < clicks; i++) {
    const at = start + (i / clicks) * dur + (jitter(1) - 1) * 0.012;
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    lp.connect(out);
    ring(
      a,
      lp,
      Math.max(start, at),
      2100 * jitter(0.15),
      DIE_PARTIALS.slice(0, 3),
      0.07 * jitter(0.3),
    );
  }
  const knocks = Math.max(1, Math.round(dur * 8));
  for (let i = 1; i <= knocks; i++)
    thump(a, out, start + (i / (knocks + 0.5)) * dur, 300, 0.09, 0.04);
}

/** A die settling into its column: a soft tock that steps up a little each column, like a drumroll. */
export function playSettle(delayMs: number, step: number, pan = 0) {
  const ok = audio();
  if (!ok) return;
  const { a } = ok;
  const at = a.currentTime + Math.max(0, delayMs) / 1000;
  const out = panned(a, ok.out, pan);
  const pitch = 520 * 2 ** (step / 12) * 1.12 ** step;
  ring(
    a,
    out,
    at,
    pitch,
    [
      [1, 1, 0.07],
      [2.01, 0.25, 0.04],
    ],
    0.1,
  );
  thump(a, out, at, 160, 0.14, 0.05);
}

/** A die hopping on or off the shelf. */
export function playHop(delayMs = 0, toShelf = true) {
  const ok = audio();
  if (!ok) return;
  const { a, out } = ok;
  const at = a.currentTime + Math.max(0, delayMs) / 1000;
  ring(
    a,
    out,
    at,
    toShelf ? 1250 : 1050,
    [
      [1, 1, 0.06],
      [1.5, 0.4, 0.04],
    ],
    0.09,
  );
  thump(a, out, at, 200, 0.12, 0.05);
}

function bell(
  a: AudioContext,
  out: AudioNode,
  at: number,
  freq: number,
  gain: number,
  decay: number,
) {
  ring(
    a,
    out,
    at,
    freq,
    [
      [1, 1, decay],
      [2.76, 0.18, decay * 0.5],
      [5.4, 0.06, decay * 0.25],
    ],
    gain,
  );
}

/** A score written in: a soft rising pop. */
export function playPop() {
  const ok = audio();
  if (!ok) return;
  const { a, out } = ok;
  const at = a.currentTime;
  const osc = a.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, at);
  osc.frequency.exponentialRampToValueAtTime(940, at + 0.07);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.16, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + 0.17);
  bell(a, out, at + 0.04, 1880, 0.03, 0.2);
}

/** It's your turn: a little three-note chime, up, like a shop door bell. */
export function playTurn() {
  const ok = audio();
  if (!ok) return;
  const { a, out } = ok;
  [784, 988, 1319].forEach((f, i) =>
    bell(a, out, a.currentTime + i * 0.09, f, 0.13, 0.7 + i * 0.15),
  );
}

/** The upper bonus earned: a quick bright triad. */
export function playBonus() {
  const ok = audio();
  if (!ok) return;
  const { a, out } = ok;
  [1047, 1319, 1568].forEach((f, i) => bell(a, out, a.currentTime + i * 0.06, f, 0.07, 0.4));
}

/** A sparkly run for a Yatzy. */
export function playCelebrate() {
  const ok = audio();
  if (!ok) return;
  const { a, out } = ok;
  [784, 988, 1175, 1568, 1976, 2349].forEach((f, i) =>
    bell(a, out, a.currentTime + i * 0.06, f, 0.08, 0.5 + i * 0.05),
  );
  burst(a, out, a.currentTime + 0.3, 'highpass', 6000, 0.5, 0.05, 0.6);
}

/**
 * The notes of the Yatzy fanfare: [frequency in Hz, start in seconds, gain,
 * decay in seconds]. A rising C major arpeggio and a held, shimmering chord.
 * The quiet version for reduced motion is three soft bells.
 */
export const YATZY_FANFARE: readonly (readonly [number, number, number, number])[] = [
  [523, 0, 0.1, 0.9],
  [659, 0.1, 0.1, 0.9],
  [784, 0.2, 0.1, 0.9],
  [1047, 0.3, 0.11, 1.1],
  [1319, 0.42, 0.1, 1.3],
  [1568, 0.54, 0.1, 1.5],
  [2093, 0.66, 0.08, 1.8],
];
export const YATZY_FANFARE_QUIET: readonly (readonly [number, number, number, number])[] = [
  [784, 0, 0.05, 0.6],
  [988, 0.12, 0.05, 0.6],
  [1319, 0.24, 0.05, 0.9],
];

/**
 * The big Yatzy fanfare, once, as the celebration starts: a soft drum thump, a
 * run of bells and a bright shimmer. It goes through the master volume like
 * every other sound, so the volume slider and mute apply, and it says nothing
 * until the browser has allowed audio.
 */
export function playYatzyFanfare(quiet = false) {
  const ok = audio();
  if (!ok) return;
  const { a, out } = ok;
  const at = a.currentTime;
  if (!quiet) thump(a, out, at, 120, 0.22, 0.28);
  for (const [freq, start, gain, decay] of quiet ? YATZY_FANFARE_QUIET : YATZY_FANFARE) {
    bell(a, out, at + start, freq, gain, decay);
  }
  if (!quiet) burst(a, out, at + 0.62, 'highpass', 6500, 0.5, 0.05, 1.2);
}
