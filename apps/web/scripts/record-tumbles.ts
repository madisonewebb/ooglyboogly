/**
 * Records the dice tumbles with the Rapier physics engine (`task tumbles`).
 * Clients only play these paths back, so the browser never runs physics and
 * the server's dice decide every result. The server picks a path with a seed;
 * the client then renumbers each die so the server's value lands on top.
 *
 * A tumble starts as the cup tips: the dice spill out of its mouth one after
 * another, bounce off the felt and the rim, and come to rest flat. Collisions
 * are recorded too, so every clack has a cause.
 *
 * Deterministic: the same seed and settings write the same file. Settings can
 * be overridden for tuning with TUNE='{"gravity":-90}' and the result written
 * elsewhere with --out=path.
 */
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  CUP,
  DIE_SIZE,
  type DieTrack,
  encodeTumbles,
  FPS,
  FRAMES,
  type Impact,
  type ImpactKind,
  MAX_DICE,
  PATHS_PER_COUNT,
  REST_BY,
  SPAWN_TIP,
  STEPS_PER_FRAME,
  TRAY,
  type TumblePath,
  type Tumbles,
  upAxisOf,
} from '../src/dice/tumbleFormat.ts';

const SETTINGS = {
  gravity: -115,
  /** Frames between dice leaving the cup. */
  spawnGap: 2.6,
  /** Speed out of the cup along its axis, min and max. */
  pour: [8.8, 13.5],
  /** Sideways spread (toward and away from the viewer). */
  spread: 3,
  spin: 26,
  dieFriction: 0.42,
  dieBounce: 0.32,
  feltFriction: 0.45,
  feltBounce: 0.22,
  rimFriction: 0.25,
  rimBounce: 0.55,
  linearDamping: 0.12,
  angularDamping: 0.45,
  rounding: 0.09,
  /** Impacts weaker than this change in speed (units/s) make no sound. */
  impactMin: 1.4,
  seed: 0x0d1ce2,
  ...(JSON.parse(process.env['TUNE'] ?? '{}') as object),
};

const outArg = process.argv.find((a) => a.startsWith('--out='));
const OUT = outArg ? outArg.slice(6) : new URL('../src/dice/tumbles.bin', import.meta.url);
const DT = 1 / (FPS * STEPS_PER_FRAME);
const HALF = DIE_SIZE / 2;

/** mulberry32: a small seeded PRNG, so recordings are reproducible. */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomQuat(rand: () => number) {
  // Shoemake's uniform random rotation.
  const [u1, u2, u3] = [rand(), rand(), rand()];
  const a = Math.sqrt(1 - u1);
  const b = Math.sqrt(u1);
  return {
    x: a * Math.sin(2 * Math.PI * u2),
    y: a * Math.cos(2 * Math.PI * u2),
    z: b * Math.sin(2 * Math.PI * u3),
    w: b * Math.cos(2 * Math.PI * u3),
  };
}

/** The cup's axis (bottom to mouth) and its in-plane normal at a tip angle. */
function cupAxes(tip: number) {
  const axis = { x: -Math.sin(tip), y: Math.cos(tip), z: 0 };
  const side = { x: -Math.cos(tip), y: -Math.sin(tip), z: 0 };
  return { axis, side };
}

interface Stats {
  restFrame: number;
  finalX: number[];
  impacts: number;
}

/** One attempt at a tumble; null if the dice didn't come to rest cleanly. */
function record(count: number, rand: () => number, stats: Stats[]): TumblePath | null {
  const S = SETTINGS;
  const world = new RAPIER.World({ x: 0, y: S.gravity, z: 0 });
  world.timestep = DT;

  const cx = (TRAY.minX + TRAY.maxX) / 2;
  const cz = (TRAY.minZ + TRAY.maxZ) / 2;
  const hx = (TRAY.maxX - TRAY.minX) / 2;
  const hz = (TRAY.maxZ - TRAY.minZ) / 2;
  const t = 0.5;
  const h = TRAY.wallHeight;
  const fixed = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  const box = (
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    felt: boolean,
  ) =>
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(sx, sy, sz)
        .setTranslation(x, y, z)
        .setFriction(felt ? S.feltFriction : S.rimFriction)
        .setRestitution(felt ? S.feltBounce : S.rimBounce),
      fixed,
    );
  const floor = box(cx, -t, cz, hx + 1, t, hz + 1, true);
  const walls = [
    box(TRAY.minX - t, h / 2, cz, t, h, hz + 1, false),
    box(TRAY.maxX + t, h / 2, cz, t, h, hz + 1, false),
    box(cx, h / 2, TRAY.minZ - t, hx + 1, h, t, false),
    box(cx, h / 2, TRAY.maxZ + t, hx + 1, h, t, false),
  ];

  const r = S.rounding;
  const dice = Array.from({ length: count }, () => {
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setEnabled(false)
        .setLinearDamping(S.linearDamping)
        .setAngularDamping(S.angularDamping)
        .setCcdEnabled(true),
    );
    const collider = world.createCollider(
      RAPIER.ColliderDesc.roundCuboid(HALF - r, HALF - r, HALF - r, r)
        .setDensity(1)
        .setFriction(S.dieFriction)
        .setRestitution(S.dieBounce),
      body,
    );
    return { body, collider };
  });

  // Dice leave the cup one after another, in a random order.
  const order = dice.map((_, i) => i).sort(() => rand() - 0.5);
  const spawnAt = order.map((_, k) => Math.round(k * S.spawnGap + rand() * 1.2));
  const spawnFrame = dice.map((_, i) => spawnAt[order.indexOf(i)]!);
  const { axis, side } = cupAxes(SPAWN_TIP);
  const mouth = {
    x: CUP.x + axis.x * (CUP.height / 2 - 0.45),
    y: CUP.y + axis.y * (CUP.height / 2 - 0.45),
    z: CUP.z,
  };
  const probe = new RAPIER.Cuboid(HALF * 1.02, HALF * 1.02, HALF * 1.02);

  function trySpawn(i: number): boolean {
    for (let attempt = 0; attempt < 6; attempt++) {
      const a = (rand() - 0.5) * 0.8;
      const pos = {
        x: mouth.x + side.x * a,
        y: mouth.y + side.y * a,
        z: mouth.z + (rand() - 0.5) * 1.3,
      };
      const rot = randomQuat(rand);
      let blocked = false;
      world.intersectionsWithShape(pos, rot, probe, () => {
        blocked = true;
        return false;
      });
      if (blocked) continue;
      const { body } = dice[i]!;
      body.setTranslation(pos, true);
      body.setRotation(rot, true);
      const speed = S.pour[0]! + rand() * (S.pour[1]! - S.pour[0]!);
      const lift = -0.6 + rand() * 1.8;
      body.setLinvel(
        {
          x: axis.x * speed + side.x * lift,
          y: axis.y * speed + side.y * lift,
          z: (pos.z - mouth.z) * 1.2 + (rand() - 0.5) * S.spread * 2,
        },
        true,
      );
      body.setAngvel(
        { x: (rand() - 0.5) * S.spin * 2, y: (rand() - 0.5) * S.spin, z: -rand() * S.spin },
        true,
      );
      body.setEnabled(true);
      return true;
    }
    return false;
  }

  const tracks: DieTrack[] = dice.map((_, i) => ({
    poses: new Float32Array(FRAMES * 7),
    spawnFrame: spawnFrame[i]!,
    landFrame: -1,
    restFrame: 0,
    upAxis: 0,
  }));
  const spawned = dice.map(() => false);
  const impacts: Impact[] = [];
  const lastImpact = dice.map(() => -Infinity);
  const moving = dice.map(() => 0);

  const touching = (a: RAPIER.Collider, b: RAPIER.Collider) => {
    let n = 0;
    world.contactPair(a, b, (m) => {
      n += m.numContacts();
    });
    return n > 0;
  };

  let step = 0;
  for (let f = 0; f < FRAMES; f++) {
    for (const [i, s] of spawnFrame.entries()) {
      if (!spawned[i] && f >= s) {
        // Someone's in the way at the mouth: wait a frame.
        if (!trySpawn(i)) continue;
        spawned[i] = true;
        tracks[i]!.spawnFrame = f;
      }
    }
    if (f > 0) {
      for (let k = 0; k < STEPS_PER_FRAME; k++) {
        const before = dice.map(({ body }) => body.linvel());
        world.step();
        step++;
        const kicks = dice.map(({ body }, i) => {
          if (!spawned[i]) return 0;
          const v = body.linvel();
          const b = before[i]!;
          return Math.hypot(v.x - b.x, v.y - b.y - S.gravity * DT, v.z - b.z);
        });
        dice.forEach(({ collider }, i) => {
          const kick = kicks[i]!;
          if (kick < S.impactMin) return;
          let kind: ImpactKind | null = null;
          const other = dice.findIndex(
            (d, j) =>
              j !== i && spawned[j] && kicks[j]! >= S.impactMin && touching(collider, d.collider),
          );
          if (other >= 0)
            kind = other > i ? 'die' : null; // one sound per pair
          else if (walls.some((w) => touching(collider, w))) kind = 'wall';
          else if (touching(collider, floor)) kind = 'floor';
          if (kind === 'floor' && tracks[i]!.landFrame < 0) tracks[i]!.landFrame = f;
          if (!kind || step - lastImpact[i]! < 10) return;
          lastImpact[i] = step;
          impacts.push({ time: step * DT, die: i, kind, strength: Math.min(1, kick / 14) });
        });
      }
    }
    dice.forEach(({ body }, i) => {
      const p = body.translation();
      const q = body.rotation();
      tracks[i]!.poses.set([p.x, p.y, p.z, q.x, q.y, q.z, q.w], f * 7);
      const v = body.linvel();
      const w = body.angvel();
      if (!spawned[i] || Math.hypot(v.x, v.y, v.z) > 0.04 || Math.hypot(w.x, w.y, w.z) > 0.06) {
        moving[i] = f;
      }
    });
  }

  let ok = true;
  for (const [i, { body }] of dice.entries()) {
    const p = body.translation();
    const q = body.rotation();
    const up = upAxisOf([q.x, q.y, q.z, q.w]);
    const inside =
      p.x > TRAY.minX + HALF - 0.05 &&
      p.x < TRAY.maxX - HALF + 0.05 &&
      p.z > TRAY.minZ + HALF - 0.05 &&
      p.z < TRAY.maxZ - HALF + 0.05 &&
      Math.abs(p.y - HALF) < 0.03;
    const track = tracks[i]!;
    track.restFrame = Math.min(FRAMES - 1, moving[i]! + 1);
    track.upAxis = up.axis;
    if (!inside || up.dot < 0.998 || track.restFrame > REST_BY || track.landFrame < 0) ok = false;
  }
  world.free();
  if (!ok) return null;

  // Quaternions on one hemisphere frame to frame, so deltas stay small.
  for (const t of tracks) {
    for (let f = 1; f < FRAMES; f++) {
      const a = t.poses.subarray((f - 1) * 7 + 3, f * 7);
      const b = t.poses.subarray(f * 7 + 3, f * 7 + 7);
      if (a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]! + a[3]! * b[3]! < 0) {
        for (let c = 0; c < 4; c++) b[c] = -b[c]!;
      }
    }
  }
  impacts.sort((a, b) => a.time - b.time);
  stats.push({
    restFrame: Math.max(...tracks.map((t) => t.restFrame)),
    finalX: tracks.map((t) => t.poses[(FRAMES - 1) * 7]!),
    impacts: impacts.length,
  });
  return { tracks, impacts: impacts.slice(0, 255) };
}

await RAPIER.init();
const rand = prng(SETTINGS.seed);
const tumbles: Tumbles = [];
const stats: Stats[] = [];
let attempts = 0;
for (let count = 1; count <= MAX_DICE; count++) {
  const paths: TumblePath[] = [];
  while (paths.length < PATHS_PER_COUNT) {
    attempts++;
    if (attempts > 200_000) throw new Error('the dice will not settle; check the settings');
    const path = record(count, rand, stats);
    if (path) paths.push(path);
  }
  tumbles.push(paths);
}
const raw = encodeTumbles(tumbles);
const bytes = gzipSync(raw, { level: 9 });
writeFileSync(OUT, bytes);

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const xs = stats.flatMap((s) => s.finalX);
const third = (lo: number, hi: number) => xs.filter((x) => x >= lo && x < hi).length / xs.length;
console.log(
  `wrote ${PATHS_PER_COUNT * MAX_DICE} tumbles (${attempts} attempts, ` +
    `${((100 * stats.length) / attempts).toFixed(0)}% kept), ` +
    `${(raw.length / 1024).toFixed(0)} KiB raw, ${(bytes.length / 1024).toFixed(0)} KiB gzipped`,
);
console.log(
  `rest at ${((avg(stats.map((s) => s.restFrame)) / FPS) * 1000).toFixed(0)} ms on average; ` +
    `${avg(stats.map((s) => s.impacts)).toFixed(1)} impacts per tumble; ` +
    `dice end left/middle/right: ${[third(-9, -1.45), third(-1.45, 1.45), third(1.45, 9)]
      .map((f) => `${(f * 100).toFixed(0)}%`)
      .join(' / ')}`,
);
