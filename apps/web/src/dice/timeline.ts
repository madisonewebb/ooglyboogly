/**
 * Where each die and the cup are at any moment of a roll. Pure functions of
 * time, so every screen plays the identical roll and tests can check the
 * result face.
 *
 * A roll: the candy cup pops in (on a reroll the free dice hop into it), the
 * cup rattles, tips, and the dice spill out one after another and play their
 * recorded tumble, with the server's values renumbered onto the top faces.
 * Once everything is still, the dice hop together into their columns (the
 * left-most die to the left-most column, so no two paths cross), then pop
 * left to right like a drumroll.
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
  FPS,
  FRAMES,
  type ImpactKind,
  MIRROR_AXIS,
  POUR_TIP,
  SHELF_Y,
  SHELF_Z,
  SLOT_X,
  SPAWN_TIP,
  TRAY_Z,
  type TumblePath,
} from './tumbleFormat';

export type Celebration = 'yatzy' | 'straight' | null;

export interface RollPlan {
  start: number;
  /** All five values after the roll. */
  values: readonly number[];
  /** The dice rolled, in column order. */
  free: readonly number[];
  held: readonly boolean[];
  /** Whether the free dice were showing before (a reroll scoops them up first). */
  hadDice: boolean;
  /** The recorded tumble, one track per free die; null plays the reduced fade. */
  path: TumblePath | null;
  /** Play the path mirrored front to back. */
  mirror: boolean;
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
  /** Rotation about z: the pour plus the rattle. Negative tips to the right. */
  tip: number;
  scale: number;
  opacity: number;
}

const BASE = {
  cupIn: 160,
  /** The rattle starts this far into the cup's arrival, as it lands. */
  shakeLead: 0.6,
  scoop: 200,
  scoopStagger: 25,
  shake: 280,
  pour: 200,
  linger: 120,
  away: 240,
  tidy: 210,
  stagger: 50,
  pop: 160,
  fade: 220,
  hop: 280,
};
const LAND_SQUISH_MS = 150;
const CELEBRATE_MS = 760;
/** How high a Yatzy jump and a hold hop go. The camera frames room for both. */
export const JUMP = 1.5;
export const HOP = 1.0;
const TIDY_ARC = 0.55;
/** Dice ride in the cup a little smaller than life, so five fit. */
const IN_CUP = 0.8;
const ONE: Vec3 = [1, 1, 1];
const UP: Vec3 = [0, 1, 0];
const Z: Vec3 = [0, 0, 1];
const FRAME_MS = 1000 / FPS;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeInOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
function easeOutBack(x: number) {
  const c = 1.6;
  return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
}

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

/** Track pose at a (fractional) frame, mirrored if the plan says so. */
function sample(track: DieTrack, f: number, mirror: boolean): { pos: Vec3; quat: Quat } {
  const clamped = Math.min(FRAMES - 1, Math.max(0, f));
  const i = Math.min(FRAMES - 2, Math.floor(clamped));
  const u = clamped - i;
  const a = track.poses.subarray(i * 7, i * 7 + 7);
  const b = track.poses.subarray((i + 1) * 7, (i + 1) * 7 + 7);
  const pos = lerp3(a, b, u);
  const quat = slerp(a.subarray(3), b.subarray(3), u);
  if (!mirror) return { pos, quat };
  return {
    pos: [pos[0], pos[1], 2 * CUP.z - pos[2]],
    quat: [-quat[0], -quat[1], quat[2], quat[3]],
  };
}

/** Renumbers a die so that `value` ends up on the face the recording leaves on top. */
export function renumber(track: DieTrack, value: number, mirror: boolean): Quat {
  const up = mirror ? MIRROR_AXIS[track.upAxis]! : track.upAxis;
  return fromUnitVectors(AXES[FACE_AXIS[value]!]!, AXES[up]!);
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

/** The pour's time to reach SPAWN_TIP, as a fraction of the pour. */
const SPAWN_AT = (() => {
  const target = SPAWN_TIP / POUR_TIP;
  let [lo, hi] = [0, 1];
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (easeInOut(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
})();

export interface Timing {
  shakeStart: number;
  shakeEnd: number;
  /** The first die leaves the cup: frame 0 of the recording. */
  physStart: number;
  /** Every die is still. */
  physEnd: number;
  tidyStart: number;
  /** Per free die (column order): its drumroll pop. */
  settled: number[];
  /** The whole roll is readable: previews may show. */
  end: number;
  celebrate: number;
  /** Everything, celebrations included, is over. */
  done: number;
  /** The cup has gone. */
  cupGone: number;
}

interface Prepared {
  timing: Timing;
  /** Per free die (column order): its track, renumbering, end pose and column pose. */
  tracks: DieTrack[];
  inner: Quat[];
  endPos: Vec3[];
  endQuat: Quat[];
  tidyQuat: Quat[];
}

const prepared = new WeakMap<RollPlan, Prepared>();

function prepare(plan: RollPlan): Prepared {
  const hit = prepared.get(plan);
  if (hit) return hit;
  const k = plan.speed;
  const n = plan.free.length;
  // The left-most die to land goes to the left-most column, so the tidy never crosses paths.
  const tracks = plan.path
    ? [...plan.path.tracks].sort((a, b) => a.poses[(FRAMES - 1) * 7]! - b.poses[(FRAMES - 1) * 7]!)
    : [];
  const inner = tracks.map((t, i) => renumber(t, plan.values[plan.free[i]!] ?? 1, plan.mirror));
  const ends = tracks.map((t) => sample(t, FRAMES - 1, plan.mirror));
  const endQuat = ends.map((e, i) => mul(e.quat, inner[i]!));
  const tidyQuat = endQuat.map((q, i) => nearestRest(plan.values[plan.free[i]!] ?? 1, q));

  let timing: Timing;
  if (plan.reduced || !plan.path || n === 0) {
    const end = plan.start + BASE.fade * k;
    timing = {
      shakeStart: plan.start,
      shakeEnd: plan.start,
      physStart: plan.start,
      physEnd: plan.start,
      tidyStart: plan.start,
      settled: plan.free.map(() => end),
      end,
      celebrate: end,
      done: end,
      cupGone: plan.start,
    };
  } else {
    const scoopEnd = plan.hadDice ? BASE.scoopStagger * (n - 1) + BASE.scoop : 0;
    const shakeStart = plan.start + Math.max(BASE.cupIn * BASE.shakeLead, scoopEnd * 0.85) * k;
    const shakeEnd = shakeStart + BASE.shake * k;
    const physStart = shakeEnd + BASE.pour * SPAWN_AT * k;
    const restFrame = Math.max(...tracks.map((t) => t.restFrame));
    const lastSpawn = Math.max(...tracks.map((t) => t.spawnFrame));
    const physEnd = physStart + (restFrame + 1) * FRAME_MS * k;
    const tidyStart = physEnd;
    const tidyEnd = tidyStart + BASE.tidy * k;
    const settled = plan.free.map((_, i) => tidyEnd + i * BASE.stagger * k);
    const celebrate = settled[n - 1]! + 40 * k;
    const done = celebrationFor(plan.values)
      ? celebrate + CELEBRATE_MS * k
      : settled[n - 1]! + BASE.pop * k;
    const cupGone =
      Math.max(physStart + lastSpawn * FRAME_MS * k, shakeEnd + BASE.pour * k) +
      (BASE.linger + BASE.away) * k;
    timing = {
      shakeStart,
      shakeEnd,
      physStart,
      physEnd,
      tidyStart,
      settled,
      end: tidyEnd,
      celebrate,
      done,
      cupGone,
    };
  }
  const p: Prepared = {
    timing,
    tracks,
    inner,
    endPos: ends.map((e) => e.pos),
    endQuat,
    tidyQuat,
  };
  prepared.set(plan, p);
  return p;
}

export const timing = (plan: RollPlan): Timing => prepare(plan).timing;

/** Every sound the roll makes, with when it happens and where (x, for panning). */
export interface RollSound {
  at: number;
  kind: ImpactKind | 'cup' | 'pop';
  strength: number;
  x: number;
}

export function rollSounds(plan: RollPlan): RollSound[] {
  const p = prepare(plan);
  const t = p.timing;
  if (plan.reduced || !plan.path) return [];
  const out: RollSound[] = [];
  // Rerolled dice dropping into the cup.
  if (plan.hadDice) {
    plan.free.forEach((_, i) => {
      out.push({
        at: plan.start + (i * BASE.scoopStagger + BASE.scoop * 0.85) * plan.speed,
        kind: 'cup',
        strength: 0.5,
        x: CUP.x,
      });
    });
  }
  // Collisions from the recording, matched to the dice they belong to.
  for (const im of plan.path.impacts) {
    const track = plan.path.tracks[im.die];
    if (!track) continue;
    const f = im.time * FPS;
    out.push({
      at: t.physStart + im.time * 1000 * plan.speed,
      kind: im.kind,
      strength: im.strength,
      x: sample(track, f, false).pos[0],
    });
  }
  t.settled.forEach((at, i) => {
    out.push({ at, kind: 'pop', strength: 1 - i * 0.06, x: SLOT_X[plan.free[i]!]! });
  });
  return out.sort((a, b) => a.at - b.at);
}

/** Where a die sits inside the cup (cup-local, upright), five to a cup. */
const CUP_SLOTS: { pos: Vec3; quat: Quat }[] = [
  [-0.4, -0.5, -0.24, 0.3],
  [0.4, -0.5, -0.2, 1.4],
  [0.02, -0.5, 0.44, 2.2],
  [-0.2, 0.25, 0.08, 0.9],
  [0.28, 0.22, 0.16, 2.8],
].map(([x, y, z, a]) => ({
  pos: [x!, y!, z!] as Vec3,
  quat: mul(fromAxisAngle(UP, a!), fromAxisAngle([1, 0, 0], a! * 0.7)),
}));

/** Cup-local point to world, given the cup's pose. */
function fromCup(cup: CupPose, local: Vec3): Vec3 {
  const [x, y, z] = [local[0] * cup.scale, local[1] * cup.scale, local[2] * cup.scale];
  const c = Math.cos(cup.tip);
  const s = Math.sin(cup.tip);
  return [cup.pos[0] + x * c - y * s, cup.pos[1] + x * s + y * c, cup.pos[2] + z];
}

export function cupAt(plan: RollPlan | null, now: number): CupPose {
  const home: CupPose = {
    visible: false,
    pos: [CUP.x, CUP.y + 1.2, CUP.z],
    tip: 0,
    scale: 0.7,
    opacity: 0,
  };
  if (!plan || plan.reduced || !plan.path || plan.free.length === 0) return home;
  const t = timing(plan);
  const k = plan.speed;
  if (now < plan.start || now >= t.cupGone) return home;
  // In: drops into place with a little overshoot.
  const inU = clamp01((now - plan.start) / (BASE.cupIn * k));
  const settle = easeOutBack(inU);
  let pos: Vec3 = [CUP.x, CUP.y + (1 - settle) * 1.2, CUP.z];
  let scale = 0.7 + 0.3 * settle;
  let opacity = clamp01(inU * 2.5);
  let tip = 0;
  if (now >= t.shakeStart && now < t.shakeEnd) {
    // Three hearty rattles, strongest in the middle.
    const u = (now - t.shakeStart) / (t.shakeEnd - t.shakeStart);
    const env = Math.sin(Math.PI * u);
    const wave = Math.sin(u * Math.PI * 2 * 3);
    tip = wave * 0.26 * env;
    // Still finishing its drop as the rattle starts.
    pos = [CUP.x + wave * 0.16 * env, pos[1] + Math.abs(wave) * 0.12 * env, CUP.z];
  } else if (now >= t.shakeEnd) {
    const pourU = clamp01((now - t.shakeEnd) / (BASE.pour * k));
    tip = POUR_TIP * easeInOut(pourU);
    const leave = t.cupGone - BASE.away * k;
    if (now >= leave) {
      const u = easeInOut(clamp01((now - leave) / (BASE.away * k)));
      tip = POUR_TIP * (1 - u * 0.6);
      pos = [CUP.x - u * 0.8, CUP.y + u * 1.6, CUP.z];
      scale = 1 - u * 0.15;
      opacity = 1 - u;
    }
  }
  return { visible: opacity > 0.01, pos, tip, scale, opacity };
}

/** A free die inside the cup, rattling along with it and sliding to the mouth as it tips. */
function inCup(plan: RollPlan, rank: number, now: number): Pose {
  const cup = cupAt(plan, now);
  const slot = CUP_SLOTS[rank % CUP_SLOTS.length]!;
  const t = timing(plan);
  const shaking = now >= t.shakeStart && now < t.shakeEnd;
  const jiggle = shaking ? Math.sin((now - t.shakeStart) * 0.06 + rank * 1.7) * 0.12 : 0;
  const slide = clamp01(-cup.tip / -POUR_TIP) * 0.65;
  const local: Vec3 = [slot.pos[0] + jiggle, slot.pos[1] + slide + Math.abs(jiggle), slot.pos[2]];
  const spin = shaking ? fromAxisAngle([1, 0, 0], jiggle * 3) : IDENTITY;
  return {
    pos: fromCup(cup, local),
    quat: mul(fromAxisAngle(Z, cup.tip), mul(spin, slot.quat)),
    squash: [IN_CUP * cup.scale, IN_CUP * cup.scale, IN_CUP * cup.scale],
    opacity: 1,
    visible: cup.visible,
  };
}

/** Die `die`'s pose at time `now` during `plan`. */
export function poseAt(plan: RollPlan, die: number, now: number): Pose {
  const p = prepare(plan);
  const t = p.timing;
  const value = plan.values[die] ?? 1;
  const rank = plan.free.indexOf(die);
  const rest = restPos(die, plan.held[die] ?? false);

  if (rank < 0) {
    // Held: wiggle while the others roll, then join any celebration.
    let quat = restQuat(value);
    if (!plan.reduced && now < t.physEnd) {
      quat = mul(
        fromAxisAngle(Z, Math.sin(((now - plan.start) / 1000) * Math.PI * 10) * 0.07),
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

  if (plan.reduced || !plan.path) {
    const opacity = clamp01((now - plan.start) / (t.end - plan.start || 1));
    return { pos: rest, quat: restQuat(value), squash: ONE, opacity, visible: true };
  }

  const k = plan.speed;
  const track = p.tracks[rank]!;
  const frame = (now - t.physStart) / (FRAME_MS * k);

  if (frame < track.spawnFrame) {
    // A reroll: hop from the column up into the cup's mouth first.
    const scoopStart = plan.start + rank * BASE.scoopStagger * k;
    const scoopEnd = scoopStart + BASE.scoop * k;
    if (plan.hadDice && now < scoopEnd) {
      const u = clamp01((now - scoopStart) / (scoopEnd - scoopStart));
      const mouth = fromCup(cupAt(plan, now), [0, 0.55, 0]);
      const pos = lerp3(rest, mouth, easeInOut(u));
      pos[1] += Math.sin(Math.PI * u) * 1.1;
      const s = 1 - (1 - IN_CUP) * easeInOut(u);
      return {
        pos,
        quat: mul(fromAxisAngle([1, 0, 0], -u * 1.2), restQuat(value)),
        squash: [s, s, s],
        opacity: 1,
        visible: true,
      };
    }
    return inCup(plan, rank, now);
  }

  if (now < t.tidyStart) {
    const { pos, quat } = sample(track, frame, plan.mirror);
    // Leaving the cup it grows back to full size over a few frames.
    const grow = IN_CUP + (1 - IN_CUP) * clamp01((frame - track.spawnFrame) / 4);
    const since = (frame - track.landFrame) * FRAME_MS;
    const amount =
      since >= 0 && since < LAND_SQUISH_MS ? Math.sin((Math.PI * since) / LAND_SQUISH_MS) * 0.2 : 0;
    const sq = squish(amount);
    return {
      pos,
      quat: mul(quat, p.inner[rank]!),
      squash: [sq[0] * grow, sq[1] * grow, sq[2] * grow],
      opacity: 1,
      visible: true,
    };
  }

  // The tidy: every die hops at once, across first and then forward, so paths never cross.
  const u = clamp01((now - t.tidyStart) / (BASE.tidy * k));
  const from = p.endPos[rank]!;
  const ux = easeInOut(clamp01(u / 0.8));
  const uz = easeInOut(clamp01((u - 0.2) / 0.8));
  const pos: Vec3 = [
    from[0] + (rest[0] - from[0]) * ux,
    from[1] + (rest[1] - from[1]) * u + Math.sin(Math.PI * u) * TIDY_ARC,
    from[2] + (rest[2] - from[2]) * uz,
  ];
  const quat = slerp(p.endQuat[rank]!, p.tidyQuat[rank]!, easeInOut(u));
  const air = Math.sin(Math.PI * u);
  let squash: Vec3 = [1 - air * 0.05, 1 + air * 0.08, 1 - air * 0.05];
  // The drumroll: a squish and a little bounce, left to right.
  const pop = (now - t.settled[rank]!) / (BASE.pop * k);
  if (u >= 1 && pop >= 0 && pop < 1) {
    const s = Math.sin(Math.PI * pop);
    squash = squish(s * 0.18);
    pos[1] += Math.sin(Math.PI * Math.min(1, pop * 1.6)) * 0.14;
  }
  return celebrate(plan, t, die, now, { pos, quat, squash, opacity: 1, visible: true });
}

function celebrate(plan: RollPlan, t: Timing, die: number, now: number, pose: Pose): Pose {
  const kind = celebrationFor(plan.values);
  if (!kind || plan.reduced || now < t.celebrate || now > t.done) return pose;
  const span = t.done - t.celebrate;
  if (kind === 'yatzy') {
    // A crouch, a spinning jump that swells toward you at the top, and a squishy landing.
    const u = (now - t.celebrate) / span;
    const crouch = u < 0.12 ? Math.sin((Math.PI * u) / 0.12) * 0.16 : 0;
    const air = clamp01((u - 0.12) / 0.76);
    const up = Math.sin(Math.PI * air);
    const land = u > 0.88 ? Math.sin(((u - 0.88) / 0.12) * Math.PI) * 0.2 : 0;
    const sq = squish(crouch + land);
    const grow = 1 + up * 0.16;
    return {
      ...pose,
      pos: [pose.pos[0], pose.pos[1] + up * JUMP, pose.pos[2]],
      quat: mul(fromAxisAngle(UP, easeInOut(air) * Math.PI * 2), pose.quat),
      squash: [sq[0] * grow, sq[1] * grow, sq[2] * grow],
    };
  }
  // Large Straight: a wave across the columns.
  const u = clamp01((now - t.celebrate - die * 0.1 * span) / (0.55 * span));
  return { ...pose, pos: [pose.pos[0], pose.pos[1] + Math.sin(Math.PI * u) * 0.7, pose.pos[2]] };
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
  const pos = lerp3(from, to, easeInOut(u));
  const air = u < 1 ? Math.sin(Math.PI * u) : 0;
  pos[1] += air * HOP;
  const after = now - (h.start + span);
  const bounce =
    after >= 0 && after < 140 * h.speed ? Math.sin((Math.PI * after) / (140 * h.speed)) * 0.16 : 0;
  // A little forward flip that lands square again.
  const flip = fromAxisAngle([1, 0, 0], (h.toShelf ? -1 : 1) * Math.sin(Math.PI * u) * 0.35);
  const squash: Vec3 =
    bounce > 0 ? squish(bounce) : [1 - air * 0.05, 1 + air * 0.08, 1 - air * 0.05];
  return { pos, quat: mul(flip, restQuat(h.value)), squash, opacity: 1, visible: true };
}

export const restPose = (die: number, value: number | null, held: boolean): Pose => ({
  pos: restPos(die, held),
  quat: restQuat(value ?? 1),
  squash: ONE,
  opacity: 1,
  visible: value !== null,
});
