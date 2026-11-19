/**
 * Where each die is at any moment of a roll. Pure functions of time, so every
 * screen plays the identical roll and tests can check the result face.
 *
 * A roll: the free dice are scooped into the cup, the cup rattles (shake),
 * tips (pour), the dice play their recorded tumble with the server's values
 * renumbered onto the top faces, squish on landing, then glide into their
 * columns one after another, left to right, 60 ms apart.
 */
import {
  fromAxisAngle,
  fromUnitVectors,
  IDENTITY,
  lerp3,
  mul,
  type Quat,
  slerp,
  type Vec3,
} from './quat';
import {
  AXES,
  CUP,
  DIE_SIZE,
  type DieTrack,
  FACE_AXIS,
  FRAMES,
  SHELF_Y,
  SHELF_Z,
  SLOT_X,
  TRAY_Z,
} from './tumbleFormat';

export type Celebration = 'yatzy' | 'straight' | null;

export interface RollPlan {
  start: number;
  /** All five values after the roll. */
  values: readonly number[];
  /** The dice rolled, in column order; their tracks come from `path` in the same order. */
  free: readonly number[];
  held: readonly boolean[];
  /** Whether the free dice were showing before (a reroll scoops them up first). */
  hadDice: boolean;
  path: readonly DieTrack[];
  /** 1 normally, 0.5 with Fast rolls. */
  speed: number;
  reduced: boolean;
}

export interface Pose {
  pos: Vec3;
  quat: Quat;
  /** World-axis scale, for the jelly squish. */
  squash: Vec3;
  opacity: number;
  visible: boolean;
}

export interface CupPose {
  visible: boolean;
  pos: Vec3;
  /** Tip angle about z; negative pours to the right. */
  tip: number;
  opacity: number;
}

const BASE = { shake: 240, tumble: 560, stagger: 60, settle: 200, fade: 220, hop: 260 };
const LAND_SQUISH_MS = 140;
/** How high a Yatzy jump and a hold hop go. The camera frames room for both. */
export const JUMP = 1.2;
export const HOP = 1.0;
const CELEBRATE_MS = 720;
const ONE: Vec3 = [1, 1, 1];
const UP: Vec3 = [0, 1, 0];

export const restPos = (die: number, held: boolean): Vec3 => [
  SLOT_X[die]!,
  held ? SHELF_Y + DIE_SIZE / 2 : DIE_SIZE / 2,
  held ? SHELF_Z : TRAY_Z,
];

const restQuatCache = new Map<number, Quat>();
/** The orientation that shows `value` on top. */
export function restQuat(value: number): Quat {
  let q = restQuatCache.get(value);
  if (!q) {
    q = fromUnitVectors(AXES[FACE_AXIS[value] ?? 2]!, UP);
    restQuatCache.set(value, q);
  }
  return q;
}

export function celebrationFor(values: readonly number[]): Celebration {
  if (values.length === 5 && values.every((v) => v === values[0])) return 'yatzy';
  const s = [...values].sort().join('');
  if (s === '12345' || s === '23456') return 'straight';
  return null;
}

export interface Timing {
  shakeEnd: number;
  tumbleEnd: number;
  /** When each free die (in `free` order) finishes gliding into its column. */
  settled: number[];
  /** The whole roll is readable: previews may show. */
  end: number;
  /** Celebrations finish. */
  done: number;
}

export function timing(plan: RollPlan): Timing {
  const k = plan.speed;
  if (plan.reduced) {
    const end = plan.start + BASE.fade * k;
    return {
      shakeEnd: plan.start,
      tumbleEnd: plan.start,
      settled: plan.free.map(() => end),
      end,
      done: end,
    };
  }
  const shakeEnd = plan.start + BASE.shake * k;
  const tumbleEnd = shakeEnd + BASE.tumble * k;
  const settled = plan.free.map((_, i) => tumbleEnd + (i * BASE.stagger + BASE.settle) * k);
  const end = Math.max(tumbleEnd, ...settled);
  const done = celebrationFor(plan.values) ? end + CELEBRATE_MS * k : end;
  return { shakeEnd, tumbleEnd, settled, end, done };
}

/** When each free die first lands, for the clack sounds. */
export function landTimes(plan: RollPlan): number[] {
  const t = timing(plan);
  if (plan.reduced) return [];
  return plan.path.map(
    (track) =>
      t.shakeEnd + (Math.max(0, track.landFrame) / (FRAMES - 1)) * (t.tumbleEnd - t.shakeEnd),
  );
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number) => 1 - (1 - x) ** 3;

function framePose(track: DieTrack, f: number): { pos: Vec3; quat: Quat } {
  const i = Math.min(FRAMES - 2, Math.floor(f));
  const u = f - i;
  const a = track.poses.subarray(i * 7, i * 7 + 7);
  const b = track.poses.subarray((i + 1) * 7, (i + 1) * 7 + 7);
  return { pos: lerp3(a, b, u), quat: slerp(a.subarray(3), b.subarray(3), u) };
}

/** Renumbers a die so that `value` ends up on the face the recording leaves on top. */
export function renumber(track: DieTrack, value: number): Quat {
  return fromUnitVectors(AXES[FACE_AXIS[value]!]!, AXES[track.upAxis]!);
}

/** The column orientation for `value`, turned in quarter steps to be nearest `from`. */
function nearestRest(value: number, from: Quat): Quat {
  let best = restQuat(value);
  let bestDot = -1;
  for (let k = 0; k < 4; k++) {
    const q = mul(fromAxisAngle(UP, (k * Math.PI) / 2), restQuat(value));
    const d = Math.abs(q[0] * from[0] + q[1] * from[1] + q[2] * from[2] + q[3] * from[3]);
    if (d > bestDot) [best, bestDot] = [q, d];
  }
  return best;
}

function squish(amount: number): Vec3 {
  return [1 + amount * 0.5, 1 - amount, 1 + amount * 0.5];
}

/** Die `die`'s pose at time `now` during `plan`. */
export function poseAt(plan: RollPlan, die: number, now: number): Pose {
  const t = timing(plan);
  const value = plan.values[die] ?? 1;
  const k = plan.free.indexOf(die);
  const rest = restPos(die, plan.held[die] ?? false);

  if (k < 0) {
    // Held: wiggle while the others roll, then join any celebration.
    let quat = restQuat(value);
    if (!plan.reduced && now < t.tumbleEnd) {
      quat = mul(
        fromAxisAngle([0, 0, 1], Math.sin(((now - plan.start) / 1000) * Math.PI * 12) * 0.08),
        quat,
      );
    }
    return celebrate(plan, t, die, now, {
      pos: rest,
      quat,
      squash: ONE,
      opacity: 1,
      visible: true,
    });
  }

  if (plan.reduced) {
    const opacity = clamp01((now - plan.start) / (t.end - plan.start || 1));
    return { pos: rest, quat: restQuat(value), squash: ONE, opacity, visible: true };
  }

  const track = plan.path[k]!;
  const cup: Vec3 = [CUP.x, CUP.y, CUP.z];
  if (now < t.shakeEnd) {
    if (!plan.hadDice) return { pos: cup, quat: IDENTITY, squash: ONE, opacity: 1, visible: false };
    // Scooped into the cup over the first half of the shake.
    const u = easeOut(clamp01((now - plan.start) / ((t.shakeEnd - plan.start) / 2)));
    const s = 1 - u * 0.5;
    return {
      pos: lerp3(rest, cup, u),
      quat: restQuat(value),
      squash: [s, s, s],
      opacity: 1,
      visible: u < 1,
    };
  }

  const inner = renumber(track, value);
  if (now < t.tumbleEnd) {
    const f = ((now - t.shakeEnd) / (t.tumbleEnd - t.shakeEnd)) * (FRAMES - 1);
    const { pos, quat } = framePose(track, f);
    const landAt = t.shakeEnd + (track.landFrame / (FRAMES - 1)) * (t.tumbleEnd - t.shakeEnd);
    const since = now - landAt;
    const amount =
      track.landFrame >= 0 && since >= 0 && since < LAND_SQUISH_MS * plan.speed
        ? Math.sin((Math.PI * since) / (LAND_SQUISH_MS * plan.speed)) * 0.22
        : 0;
    return { pos, quat: mul(quat, inner), squash: squish(amount), opacity: 1, visible: true };
  }

  const end = track.poses.subarray((FRAMES - 1) * 7, FRAMES * 7);
  const from = mul(end.subarray(3), inner);
  const target = nearestRest(value, from);
  const glideStart = t.settled[k]! - BASE.settle * plan.speed;
  const u = easeOut(clamp01((now - glideStart) / (BASE.settle * plan.speed)));
  const pos = lerp3(end, rest, u);
  const quat = slerp(from, target, u);
  // A small wobble as it arrives.
  const after = now - t.settled[k]!;
  const wobble =
    after >= 0 && after < 160 * plan.speed
      ? Math.sin((Math.PI * after) / (160 * plan.speed)) * 0.08
      : 0;
  return celebrate(plan, t, die, now, {
    pos,
    quat,
    squash: squish(wobble),
    opacity: 1,
    visible: true,
  });
}

function celebrate(plan: RollPlan, t: Timing, die: number, now: number, pose: Pose): Pose {
  const kind = celebrationFor(plan.values);
  if (!kind || plan.reduced || now < t.end || now > t.done) return pose;
  const span = t.done - t.end;
  if (kind === 'yatzy') {
    const u = (now - t.end) / span;
    const lift = Math.sin(Math.PI * u) * JUMP;
    const spin = fromAxisAngle(UP, u * Math.PI * 2);
    return {
      ...pose,
      pos: [pose.pos[0], pose.pos[1] + lift, pose.pos[2]],
      quat: mul(spin, pose.quat),
    };
  }
  // Large Straight: a wave across the columns.
  const u = clamp01((now - t.end - die * 0.1 * span) / (0.55 * span));
  return { ...pose, pos: [pose.pos[0], pose.pos[1] + Math.sin(Math.PI * u) * 0.7, pose.pos[2]] };
}

export function cupAt(plan: RollPlan | null, now: number): CupPose {
  // The cup only appears for a roll.
  const home: CupPose = { visible: false, pos: [CUP.x, CUP.y - 1.2, CUP.z], tip: 0, opacity: 0 };
  if (!plan || plan.reduced || plan.free.length === 0) return home;
  const t = timing(plan);
  if (now < t.shakeEnd) {
    const rattle = Math.sin(((now - plan.start) / 1000) * Math.PI * 2 * 11) * 0.18;
    const lift = easeOut(clamp01((now - plan.start) / 120)) * 1.2;
    return {
      visible: true,
      pos: [CUP.x + rattle, CUP.y - 1.2 + lift, CUP.z],
      tip: rattle * 0.3,
      opacity: 1,
    };
  }
  const pour = clamp01((now - t.shakeEnd) / (140 * plan.speed));
  const away = clamp01((now - t.shakeEnd - 160 * plan.speed) / (200 * plan.speed));
  if (now < t.end) {
    return {
      visible: away < 1,
      pos: [CUP.x, CUP.y, CUP.z],
      tip: -easeOut(pour) * 1.9,
      opacity: 1 - away,
    };
  }
  return home;
}

/** Holding or releasing a die: a hop between the tray and the shelf. */
export interface HopPlan {
  start: number;
  die: number;
  value: number;
  toShelf: boolean;
  speed: number;
  reduced: boolean;
}

export function hopEnd(h: HopPlan): number {
  return h.reduced ? h.start : h.start + BASE.hop * h.speed;
}

export function hopPose(h: HopPlan, now: number): Pose {
  const from = restPos(h.die, !h.toShelf);
  const to = restPos(h.die, h.toShelf);
  const span = BASE.hop * h.speed;
  const u = h.reduced ? 1 : clamp01((now - h.start) / span);
  const pos = lerp3(from, to, easeOut(u));
  if (u < 1) pos[1] += Math.sin(Math.PI * u) * HOP;
  const after = now - (h.start + span);
  const bounce =
    after >= 0 && after < 120 * h.speed ? Math.sin((Math.PI * after) / (120 * h.speed)) * 0.15 : 0;
  return { pos, quat: restQuat(h.value), squash: squish(bounce), opacity: 1, visible: true };
}

export const restPose = (die: number, value: number | null, held: boolean): Pose => ({
  pos: restPos(die, held),
  quat: restQuat(value ?? 1),
  squash: ONE,
  opacity: 1,
  visible: value !== null,
});
