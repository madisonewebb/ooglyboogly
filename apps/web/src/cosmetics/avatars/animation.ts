/**
 * How an avatar moves, as pure functions of time. Idle: a slow bob and a blink every few seconds.
 * A mood (happy bounce, sad droop) plays once from the moment it is cued. Reduced motion holds
 * the rest pose throughout: nothing moves, and nothing blinks.
 */
import { type GameState } from '@rollhouse/rules';
import { eventsBetween, isYatzyEvent } from '../celebrations/events';

/** Seconds on the clock shared by every avatar and every mood cue. */
export const clockNow = (): number => performance.now() / 1000;

export type Mood = 'happy' | 'droop';

/** A mood to play: `nonce` changes for every new cue, `at` is when it began (seconds). */
export interface MoodCue {
  mood: Mood;
  nonce: number;
  at: number;
}

export interface Pose {
  /** Lift of the whole body, in avatar units (the body is about 1.1 tall). */
  y: number;
  /** Squash and stretch. */
  scaleX: number;
  scaleY: number;
  /** Lean, radians. */
  tilt: number;
  /** Slow sway toward and away from the viewer, radians. */
  yaw: number;
  /** 0 eyes open, 1 shut. */
  blink: number;
  /** 0 normal face, 1 drooped (eyes low, mouth flipped). */
  droop: number;
  /** 0 normal face, 1 big smile. */
  joy: number;
  /** How hard the jelly body ripples: 0 is rigid, 0.1 a calm idle, higher after a bounce. */
  wobble: number;
}

export const REST: Pose = {
  y: 0,
  scaleX: 1,
  scaleY: 1,
  tilt: 0,
  yaw: 0,
  blink: 0,
  droop: 0,
  joy: 0,
  wobble: 0,
};

export const HAPPY_SECONDS = 1.1;
export const DROOP_SECONDS = 2.4;
const BLINK_SECONDS = 0.16;

/** Deterministic 0..1 from a number, so each seat blinks on its own beat. */
export function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** 0 (open) to 1 (shut): one quick blink every 3.5 to 6 seconds, offset per seed. */
export function blinkAt(t: number, seed: number): number {
  const period = 3.5 + hash01(seed) * 2.5;
  const phase = (t + hash01(seed + 7) * period) % period;
  if (phase > BLINK_SECONDS) return 0;
  return Math.sin((phase / BLINK_SECONDS) * Math.PI);
}

const smooth = (v: number) => {
  const x = Math.min(1, Math.max(0, v));
  return x * x * (3 - 2 * x);
};

/** How long a mood plays, in seconds. */
export const moodSeconds = (m: Mood): number => (m === 'happy' ? HAPPY_SECONDS : DROOP_SECONDS);

/** True while a cue is still playing at time `t`. */
export const moodActive = (cue: MoodCue | null | undefined, t: number): boolean =>
  !!cue && t >= cue.at && t - cue.at < moodSeconds(cue.mood);

/** The pose at time `t` (seconds). */
export function poseAt(t: number, seed: number, cue: MoodCue | null, reduced: boolean): Pose {
  if (reduced) return REST;
  const bob = Math.sin(t * 1.9 + hash01(seed) * 6.28);
  const pose: Pose = {
    ...REST,
    y: bob * 0.025,
    scaleY: 1 + bob * 0.012,
    scaleX: 1 - bob * 0.008,
    yaw: Math.sin(t * 0.7 + seed) * 0.16,
    blink: blinkAt(t, seed),
    wobble: 0.07,
  };
  if (!cue || !moodActive(cue, t)) return pose;
  const age = t - cue.at;
  if (cue.mood === 'happy') {
    // Two hops, the second lower, each landing with a little squash.
    const hop = (age / HAPPY_SECONDS) * 2;
    const k = hop % 1;
    const height = Math.sin(k * Math.PI) * (hop < 1 ? 0.42 : 0.2);
    const land = Math.max(0, 1 - k * 8) * 0.08;
    pose.y += height;
    pose.scaleY += (height > 0.02 ? 0.05 : 0) - land;
    pose.scaleX += land * 0.7;
    pose.tilt = Math.sin(age * 9) * 0.08 * (1 - age / HAPPY_SECONDS);
    pose.joy = smooth(age / 0.1) * (1 - smooth((age - 0.8) / 0.3));
    pose.blink = 0;
    pose.wobble += 0.1 * (1 - age / HAPPY_SECONDS);
  } else {
    const hold = smooth(age / 0.35) * (1 - smooth((age - 1.7) / 0.7));
    pose.droop = hold;
    pose.scaleY -= 0.12 * hold;
    pose.scaleX += 0.05 * hold;
    pose.y -= 0.03 * hold;
    pose.tilt = 0.14 * hold;
    pose.wobble = 0.07 * (1 - 0.6 * hold);
  }
  return pose;
}

/** One avatar's mood, as the game decides it: which seat, and happy or drooping. */
export interface MoodEvent {
  player: number;
  mood: Mood;
}

/**
 * The moods that turn `prev` into `next`: a score is happy, a Yatzy is happy, a zero droops.
 * Rolls that are not a Yatzy, undos and big jumps (a reconnect) cause nothing.
 */
export function moodsBetween(prev: GameState, next: GameState): MoodEvent[] {
  const out: MoodEvent[] = [];
  for (const e of eventsBetween(prev, next)) {
    if (e.kind === 'undo') continue;
    if (isYatzyEvent(e)) out.push({ player: e.player, mood: 'happy' });
    else if (e.kind === 'score') {
      out.push({ player: e.player, mood: e.value === 0 ? 'droop' : 'happy' });
    }
  }
  return out;
}
