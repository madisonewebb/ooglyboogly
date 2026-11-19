/**
 * The dice scene's geometry and the recorded-tumble file format, shared by the
 * recorder (scripts/record-tumbles.ts, run by `task tumbles`) and the client.
 * World units: a die is 1 wide. +y is up, +z points toward the viewer.
 */

export const DIE_SIZE = 1;

/** The rolling area's inner walls. Symmetric about CUP.z, so a path can be mirrored front to back. */
export const TRAY = { minX: -4.3, maxX: 4.3, minZ: -1.5, maxZ: 2.3, wallHeight: 3 };

/** Where dice rest after a roll (tray) or when held (shelf), one column per die. */
export const SLOT_X = [-3.2, -1.6, 0, 1.6, 3.2] as const;
export const TRAY_Z = 0.9;
export const SHELF_Z = -2.75;
export const SHELF_Y = 0.35;

/**
 * Everything the camera must keep in frame: the tray and its shadow, with
 * headroom up to maxY for a hop, a Yatzy jump and the cup. Nothing rises over
 * the front of the tray, so the headroom only reaches forward to topMaxZ.
 */
export const FRAME = { minX: -5.2, maxX: 5.2, minZ: -4, maxZ: 3.25, maxY: 2.9, topMaxZ: 1.5 };

/** The candy cup: its centre while upright over the back-left of the tray, and its shape. */
export const CUP = { x: -3.05, y: 2.2, z: 0.4, radiusTop: 1.22, radiusBottom: 0.95, height: 1.8 };
/** How far the cup tips to pour (about z; negative pours to the right). */
export const POUR_TIP = -1.85;
/** The cup's tip when the first die leaves it: where the recorder spawns the dice. */
export const SPAWN_TIP = -1.35;

export const FPS = 60;
/** Every tumble fits in this many frames, from the first die leaving the cup to all of them at rest. */
export const FRAMES = 54;
/** Every die is at rest by this frame; the recorder throws away tumbles that take longer. */
export const REST_BY = 44;
export const PATHS_PER_COUNT = 64;
export const MAX_DICE = 5;
/** Physics steps per frame; impact times are stored in steps. */
export const STEPS_PER_FRAME = 4;

/** Local axes in order: +x, -x, +y, -y, +z, -z. */
export const AXES: readonly (readonly [number, number, number])[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

/** Which local axis each face value sits on. Opposite faces add up to 7. */
export const FACE_AXIS: Record<number, number> = { 1: 2, 6: 3, 2: 4, 5: 5, 3: 0, 4: 1 };

export interface DieTrack {
  /** FRAMES × [x, y, z, qx, qy, qz, qw]. Frames before `spawnFrame` hold the spawn pose. */
  poses: Float32Array;
  /** The frame the die leaves the cup. */
  spawnFrame: number;
  /** The frame the die first lands on the tray floor. */
  landFrame: number;
  /** The frame it comes to rest; every later frame repeats it. */
  restFrame: number;
  /** The local axis (index into AXES) that faces up at the end. */
  upAxis: number;
}

export type ImpactKind = 'floor' | 'wall' | 'die';
export const IMPACT_KINDS: readonly ImpactKind[] = ['floor', 'wall', 'die'];

/** A collision worth a sound. */
export interface Impact {
  /** Seconds after the tumble starts. */
  time: number;
  /** Which die of the path (its index in `tracks`). */
  die: number;
  kind: ImpactKind;
  /** 0 to 1, from how hard it hit. */
  strength: number;
}

export interface TumblePath {
  tracks: DieTrack[];
  /** In time order. */
  impacts: Impact[];
}

/** tumbles[count - 1][path]: one track per free die. */
export type Tumbles = TumblePath[][];

const MAGIC = 0x32544852; // "RHT2"
const POS_SCALE = 500;
const QUAT_SCALE = 4096;
const HEADER = 8;

const scaleOf = (channel: number) => (channel < 3 ? POS_SCALE : QUAT_SCALE);

/** The last frame a track needs stored: everything after repeats it. */
function lastStored(t: DieTrack): number {
  return Math.min(FRAMES - 1, Math.max(t.restFrame, t.spawnFrame));
}

/**
 * Encodes tumbles as a compact binary. Each track keeps only the frames from
 * leaving the cup to coming to rest, one channel at a time. Each value is
 * stored as its error against a constant-velocity guess from the two frames
 * before it, as a zigzag varint: in free flight that error is near zero, so
 * the result gzips well. The caller gzips it.
 */
export function encodeTumbles(tumbles: Tumbles): Uint8Array {
  const bytes: number[] = [];
  const u8 = (n: number) => bytes.push(n & 255);
  const u16 = (n: number) => bytes.push(n & 255, (n >> 8) & 255);
  const varint = (n: number) => {
    let z = n < 0 ? -2 * n - 1 : 2 * n;
    while (z >= 128) {
      bytes.push((z & 127) | 128);
      z = Math.floor(z / 128);
    }
    bytes.push(z);
  };
  [MAGIC & 255, (MAGIC >> 8) & 255, (MAGIC >> 16) & 255, (MAGIC >>> 24) & 255].forEach(u8);
  [FPS, FRAMES, PATHS_PER_COUNT, MAX_DICE].forEach(u8);
  for (const paths of tumbles) {
    for (const path of paths) {
      u8(path.impacts.length);
      for (const im of path.impacts) {
        u16(Math.round(im.time * FPS * STEPS_PER_FRAME));
        u8(im.die);
        u8(IMPACT_KINDS.indexOf(im.kind));
        u8(Math.round(im.strength * 255));
      }
      for (const t of path.tracks) {
        const last = lastStored(t);
        [t.spawnFrame, t.landFrame, t.restFrame, t.upAxis].forEach(u8);
        for (let c = 0; c < 7; c++) {
          let [a, b] = [0, 0];
          for (let f = t.spawnFrame; f <= last; f++) {
            const q = Math.round(t.poses[f * 7 + c]! * scaleOf(c));
            const k = f - t.spawnFrame;
            varint(q - (k === 0 ? 0 : k === 1 ? b : 2 * b - a));
            [a, b] = [b, q];
          }
        }
      }
    }
  }
  return Uint8Array.from(bytes);
}

export function decodeTumbles(buf: ArrayBuffer): Tumbles {
  const v = new DataView(buf);
  if (buf.byteLength < HEADER || v.getUint32(0, true) !== MAGIC) {
    throw new Error('not a tumble file');
  }
  const [fps, frames, paths, maxDice] = [4, 5, 6, 7].map((i) => v.getUint8(i));
  if (fps !== FPS || frames !== FRAMES || paths !== PATHS_PER_COUNT || maxDice !== MAX_DICE) {
    throw new Error('tumble file does not match this build; run task tumbles');
  }
  let o = HEADER;
  const u8 = () => v.getUint8(o++);
  const u16 = () => {
    const n = v.getUint16(o, true);
    o += 2;
    return n;
  };
  const varint = () => {
    let z = 0;
    let scale = 1;
    for (;;) {
      const byte = v.getUint8(o++);
      z += (byte & 127) * scale;
      if (byte < 128) break;
      scale *= 128;
    }
    return z % 2 === 1 ? -(z + 1) / 2 : z / 2;
  };
  const out: Tumbles = [];
  for (let count = 1; count <= MAX_DICE; count++) {
    const list: TumblePath[] = [];
    for (let p = 0; p < PATHS_PER_COUNT; p++) {
      const impacts: Impact[] = [];
      for (let n = u8(); n > 0; n--) {
        const time = u16() / (FPS * STEPS_PER_FRAME);
        const die = u8();
        const kind = IMPACT_KINDS[u8()] ?? 'floor';
        impacts.push({ time, die, kind, strength: u8() / 255 });
      }
      const tracks: DieTrack[] = [];
      for (let d = 0; d < count; d++) {
        const [spawnFrame, landFrame, restFrame, upAxis] = [u8(), u8(), u8(), u8()];
        const t: DieTrack = {
          poses: new Float32Array(FRAMES * 7),
          spawnFrame,
          landFrame,
          restFrame,
          upAxis,
        };
        const last = lastStored(t);
        for (let c = 0; c < 7; c++) {
          let [a, b] = [0, 0];
          for (let f = spawnFrame; f <= last; f++) {
            const k = f - spawnFrame;
            const q = varint() + (k === 0 ? 0 : k === 1 ? b : 2 * b - a);
            t.poses[f * 7 + c] = q / scaleOf(c);
            [a, b] = [b, q];
          }
        }
        // Before leaving the cup it waits at its spawn pose; after resting it stays put.
        for (let f = 0; f < spawnFrame; f++) {
          t.poses.copyWithin(f * 7, spawnFrame * 7, spawnFrame * 7 + 7);
        }
        for (let f = last + 1; f < FRAMES; f++) t.poses.copyWithin(f * 7, last * 7, last * 7 + 7);
        tracks.push(t);
      }
      list.push({ tracks, impacts });
    }
    out.push(list);
  }
  return out;
}

/** Rotates vector v by unit quaternion q = [x, y, z, w]. */
export function rotate(q: readonly number[], v: readonly number[]): [number, number, number] {
  const [qx, qy, qz, qw] = q as [number, number, number, number];
  const [vx, vy, vz] = v as [number, number, number];
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);
  return [
    vx + qw * tx + (qy * tz - qz * ty),
    vy + qw * ty + (qz * tx - qx * tz),
    vz + qw * tz + (qx * ty - qy * tx),
  ];
}

/** The local axis pointing most nearly up for orientation q, and how nearly (1 = straight up). */
export function upAxisOf(q: readonly number[]): { axis: number; dot: number } {
  let best = { axis: 0, dot: -Infinity };
  AXES.forEach((a, axis) => {
    const dot = rotate(q, a)[1];
    if (dot > best.dot) best = { axis, dot };
  });
  return best;
}

/**
 * A path mirrored front to back (z about CUP.z): another valid tumble for free.
 * A mirrored cube is the same cube with its z axis flipped, so the up axis swaps ±z.
 */
export const MIRROR_AXIS = [0, 1, 2, 3, 5, 4] as const;
