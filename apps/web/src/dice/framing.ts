/**
 * How the camera frames the dice scene. Plain math (no three.js), so the page
 * can size the stage before the 3D code loads, and tests can check it.
 */
import { FRAME } from './tumbleFormat';

/** The direction the camera looks from: above and in front of the tray. */
export const CAMERA_POS = [0, 11, 5.2] as const;
export const LOOK_AT = [0, 0, -0.35] as const;
/** A long lens: a little perspective for depth, without distorting the dice. */
export const FOV = 28;

type V = [number, number, number];
const sub = (a: readonly number[], b: readonly number[]): V => [
  a[0]! - b[0]!,
  a[1]! - b[1]!,
  a[2]! - b[2]!,
];
const add = (a: readonly number[], b: readonly number[]): V => [
  a[0]! + b[0]!,
  a[1]! + b[1]!,
  a[2]! + b[2]!,
];
const scale = (a: readonly number[], s: number): V => [a[0]! * s, a[1]! * s, a[2]! * s];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (a: V): V => {
  const n = Math.hypot(...a);
  return [a[0] / n, a[1] / n, a[2] / n];
};

/** The points that must stay in view: the floor's corners, and the headroom over the back half. */
function corners(): V[] {
  const out: V[] = [];
  for (const x of [FRAME.minX, FRAME.maxX]) {
    for (const z of [FRAME.minZ, FRAME.maxZ]) out.push([x, 0, z]);
    for (const z of [FRAME.minZ, FRAME.topMaxZ]) out.push([x, FRAME.maxY, z]);
  }
  return out;
}

/** Camera axes looking from `from` to `to`. */
function basis(from: V, to: V) {
  const forward = unit(sub(to, from));
  const right = unit(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  return { forward, right, up };
}

/** The FRAME box's extent on screen, in world units (camera right and up), for a distant camera. */
export function frameExtent() {
  const { right, up } = basis([...CAMERA_POS], [...LOOK_AT]);
  let [minX, maxX, minY, maxY] = [Infinity, -Infinity, Infinity, -Infinity];
  for (const c of corners()) {
    const p = sub(c, CAMERA_POS);
    const sx = dot(p, right);
    const sy = dot(p, up);
    [minX, maxX, minY, maxY] = [
      Math.min(minX, sx),
      Math.max(maxX, sx),
      Math.min(minY, sy),
      Math.max(maxY, sy),
    ];
  }
  return { minX, maxX, minY, maxY };
}

/** Width over height of the framed scene: the stage's natural aspect ratio. */
export const STAGE_ASPECT = (() => {
  const e = frameExtent();
  return (e.maxX - e.minX) / (e.maxY - e.minY);
})();

/**
 * Where to put a perspective camera so the whole FRAME box fills a canvas of
 * this aspect, centred, with a small margin. The view direction stays fixed;
 * only the distance and the point looked at move.
 */
export function fitCamera(aspect: number, fov = FOV, margin = 0.03): { position: V; target: V } {
  const dir = unit(sub(CAMERA_POS, LOOK_AT));
  const tanY = Math.tan((fov * Math.PI) / 360);
  const tanX = tanY * aspect;
  let target: V = [...LOOK_AT];
  let dist = 20;
  for (let i = 0; i < 60; i++) {
    const cam = add(target, scale(dir, dist));
    const { forward, right, up } = basis(cam, target);
    let [minX, maxX, minY, maxY] = [Infinity, -Infinity, Infinity, -Infinity];
    for (const c of corners()) {
      const p = sub(c, cam);
      const depth = dot(p, forward);
      const sx = dot(p, right) / (depth * tanX);
      const sy = dot(p, up) / (depth * tanY);
      [minX, maxX, minY, maxY] = [
        Math.min(minX, sx),
        Math.max(maxX, sx),
        Math.min(minY, sy),
        Math.max(maxY, sy),
      ];
    }
    const span = Math.max(maxX - minX, maxY - minY) / 2 / (1 - margin);
    const [cx, cy] = [(minX + maxX) / 2, (minY + maxY) / 2];
    target = add(target, add(scale(right, cx * dist * tanX), scale(up, cy * dist * tanY)));
    dist *= 1 + (span - 1) * 0.9;
  }
  return { position: add(target, scale(dir, dist)), target };
}
