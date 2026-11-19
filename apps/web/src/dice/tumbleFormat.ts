/**
 * The dice scene's geometry and the recorded-tumble file format, shared by the
 * recorder (scripts/record-tumbles.ts, run by `task tumbles`) and the client.
 * World units: a die is 1 wide. +y is up, +z points toward the viewer.
 */

export const DIE_SIZE = 1;

/** The rolling area's inner walls. */
export const TRAY = { minX: -4.3, maxX: 4.3, minZ: -1.5, maxZ: 2.3, wallHeight: 3 };

/** Where dice rest after a roll (tray) or when held (shelf), one column per die. */
export const SLOT_X = [-3.2, -1.6, 0, 1.6, 3.2] as const;
export const TRAY_Z = 0.9;
export const SHELF_Z = -2.75;
export const SHELF_Y = 0.35;

/** Where the cup pours from: the back-left of the tray. */
export const CUP = { x: -3.1, y: 2.4, z: 0.2 };

export const FPS = 30;
/** Every tumble is this many frames, from the pour to the dice coming to rest. */
export const FRAMES = 27;
export const PATHS_PER_COUNT = 50;
export const MAX_DICE = 5;

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
  /** frames × [x, y, z, qx, qy, qz, qw]. */
  poses: Float32Array;
  /** The frame the die first lands on the tray floor, or -1. */
  landFrame: number;
  /** The local axis (index into AXES) that faces up at the end. */
  upAxis: number;
}

/** tumbles[count - 1][path] = one track per free die. */
export type Tumbles = DieTrack[][][];

const MAGIC = 0x31544852; // "RHT1"
const POS_SCALE = 2000;
const QUAT_SCALE = 32767;
const HEADER = 8;
const trackBytes = 2 + FRAMES * 7 * 2;

export function encodeTumbles(tumbles: Tumbles): Uint8Array {
  let size = HEADER;
  for (const paths of tumbles) for (const path of paths) size += path.length * trackBytes;
  const out = new Uint8Array(size);
  const v = new DataView(out.buffer);
  v.setUint32(0, MAGIC, true);
  v.setUint8(4, FPS);
  v.setUint8(5, FRAMES);
  v.setUint8(6, PATHS_PER_COUNT);
  v.setUint8(7, MAX_DICE);
  let o = HEADER;
  for (const paths of tumbles) {
    for (const path of paths) {
      for (const t of path) {
        v.setUint8(o++, t.landFrame < 0 ? 255 : t.landFrame);
        v.setUint8(o++, t.upAxis);
        for (let i = 0; i < FRAMES * 7; i++) {
          const scale = i % 7 < 3 ? POS_SCALE : QUAT_SCALE;
          v.setInt16(o, Math.round(t.poses[i]! * scale), true);
          o += 2;
        }
      }
    }
  }
  return out;
}

export function decodeTumbles(buf: ArrayBuffer): Tumbles {
  const v = new DataView(buf);
  if (v.getUint32(0, true) !== MAGIC) throw new Error('not a tumble file');
  const [fps, frames, paths, maxDice] = [1, 2, 3, 4].map((i) => v.getUint8(3 + i));
  if (fps !== FPS || frames !== FRAMES || paths !== PATHS_PER_COUNT || maxDice !== MAX_DICE) {
    throw new Error('tumble file does not match this build; run task tumbles');
  }
  let o = HEADER;
  const out: Tumbles = [];
  for (let count = 1; count <= MAX_DICE; count++) {
    const list: DieTrack[][] = [];
    for (let p = 0; p < PATHS_PER_COUNT; p++) {
      const path: DieTrack[] = [];
      for (let d = 0; d < count; d++) {
        const land = v.getUint8(o++);
        const upAxis = v.getUint8(o++);
        const poses = new Float32Array(FRAMES * 7);
        for (let i = 0; i < FRAMES * 7; i++) {
          poses[i] = v.getInt16(o, true) / (i % 7 < 3 ? POS_SCALE : QUAT_SCALE);
          o += 2;
        }
        path.push({ poses, landFrame: land === 255 ? -1 : land, upAxis });
      }
      list.push(path);
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
