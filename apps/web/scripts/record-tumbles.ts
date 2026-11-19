/**
 * Records the dice tumbles with the Rapier physics engine (`task tumbles`).
 * Clients only play these paths back, so phones and laptops never run physics
 * and every roll is the same length. The server picks a path with a seed; the
 * client then renumbers each die so the server's value lands on top.
 *
 * Deterministic: the same seed writes the same file.
 */
import { writeFileSync } from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  CUP,
  DIE_SIZE,
  type DieTrack,
  encodeTumbles,
  FPS,
  FRAMES,
  MAX_DICE,
  PATHS_PER_COUNT,
  TRAY,
  type Tumbles,
  upAxisOf,
} from '../src/dice/tumbleFormat.ts';

const OUT = new URL('../src/dice/tumbles.bin', import.meta.url);
const STEPS_PER_FRAME = 4;
const GRAVITY = -45;

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

/** One attempt at a tumble; null if the dice didn't come to rest cleanly. */
function record(count: number, rand: () => number): DieTrack[] | null {
  const world = new RAPIER.World({ x: 0, y: GRAVITY, z: 0 });
  world.timestep = 1 / (FPS * STEPS_PER_FRAME);

  const cx = (TRAY.minX + TRAY.maxX) / 2;
  const cz = (TRAY.minZ + TRAY.maxZ) / 2;
  const hx = (TRAY.maxX - TRAY.minX) / 2;
  const hz = (TRAY.maxZ - TRAY.minZ) / 2;
  const t = 0.5;
  const h = TRAY.wallHeight;
  const fixed = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  const box = (x: number, y: number, z: number, sx: number, sy: number, sz: number) =>
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(sx, sy, sz)
        .setTranslation(x, y, z)
        .setFriction(0.6)
        .setRestitution(0.2),
      fixed,
    );
  box(cx, -t, cz, hx + 1, t, hz + 1); // floor
  box(TRAY.minX - t, h / 2, cz, t, h, hz + 1);
  box(TRAY.maxX + t, h / 2, cz, t, h, hz + 1);
  box(cx, h / 2, TRAY.minZ - t, hx + 1, h, t);
  box(cx, h / 2, TRAY.maxZ + t, hx + 1, h, t);

  const half = DIE_SIZE / 2;
  const round = 0.1;
  const dice = Array.from({ length: count }, (_, i) => {
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        // Packed in the cup without overlapping: rows of three, stacked.
        .setTranslation(
          CUP.x + Math.floor(i / 3) * 0.3 + (rand() - 0.5) * 0.1,
          CUP.y + Math.floor(i / 3) * 1.15 + rand() * 0.1,
          CUP.z + ((i % 3) - 1) * 1.15 + (rand() - 0.5) * 0.1,
        )
        .setRotation(randomQuat(rand))
        .setLinvel(4 + rand() * 3, -1 + rand() * 2, (rand() - 0.5) * 2.5)
        .setAngvel({ x: (rand() - 0.5) * 30, y: (rand() - 0.5) * 30, z: (rand() - 0.5) * 30 })
        .setLinearDamping(0.8)
        .setAngularDamping(1.5)
        .setCcdEnabled(true),
    );
    world.createCollider(
      RAPIER.ColliderDesc.roundCuboid(half - round, half - round, half - round, round)
        .setDensity(1)
        .setFriction(0.5)
        .setRestitution(0.35),
      body,
    );
    return body;
  });

  const tracks = dice.map(() => ({
    poses: new Float32Array(FRAMES * 7),
    landFrame: -1,
    upAxis: 0,
  }));
  const prevVy = dice.map(() => 0);
  for (let f = 0; f < FRAMES; f++) {
    if (f > 0) for (let s = 0; s < STEPS_PER_FRAME; s++) world.step();
    dice.forEach((body, i) => {
      const p = body.translation();
      const q = body.rotation();
      tracks[i]!.poses.set([p.x, p.y, p.z, q.x, q.y, q.z, q.w], f * 7);
      const vy = body.linvel().y;
      // First landing: the first frame it comes down onto the floor.
      if (tracks[i]!.landFrame < 0 && prevVy[i]! < -2 && p.y < half * Math.SQRT2 + 0.1) {
        tracks[i]!.landFrame = f;
      }
      prevVy[i] = vy;
    });
  }

  for (const [i, body] of dice.entries()) {
    const p = body.translation();
    const v = body.linvel();
    const w = body.angvel();
    const speed = Math.hypot(v.x, v.y, v.z);
    const spin = Math.hypot(w.x, w.y, w.z);
    const up = upAxisOf([
      body.rotation().x,
      body.rotation().y,
      body.rotation().z,
      body.rotation().w,
    ]);
    const inside =
      p.x > TRAY.minX && p.x < TRAY.maxX && p.z > TRAY.minZ && p.z < TRAY.maxZ && p.y < half + 0.1;
    if (speed > 2.5 || spin > 5 || up.dot < 0.9 || !inside || tracks[i]!.landFrame < 0) {
      world.free();
      return null;
    }
    tracks[i]!.upAxis = up.axis;
  }
  world.free();
  return tracks;
}

await RAPIER.init();
const rand = prng(0x0d1ce);
const tumbles: Tumbles = [];
let attempts = 0;
for (let count = 1; count <= MAX_DICE; count++) {
  const paths: DieTrack[][] = [];
  while (paths.length < PATHS_PER_COUNT) {
    attempts++;
    const path = record(count, rand);
    if (path) paths.push(path);
  }
  tumbles.push(paths);
}
const bytes = encodeTumbles(tumbles);
writeFileSync(OUT, bytes);
console.log(
  `wrote ${PATHS_PER_COUNT * MAX_DICE} tumbles (${attempts} attempts), ${(bytes.length / 1024).toFixed(0)} KiB`,
);
