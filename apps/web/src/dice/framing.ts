/**
 * How the camera frames the dice scene. Plain math (no three.js), so the page
 * can size the stage before the 3D code loads.
 */
import { FRAME } from './tumbleFormat';

export const CAMERA_POS = [0, 11, 5.2] as const;
export const LOOK_AT = [0, 0, -0.35] as const;

type V = [number, number, number];
const sub = (a: readonly number[], b: readonly number[]): V => [
  a[0]! - b[0]!,
  a[1]! - b[1]!,
  a[2]! - b[2]!,
];
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

/** The FRAME box's extent on screen, in world units (camera right and up). */
export function frameExtent() {
  const forward = unit(sub(LOOK_AT, CAMERA_POS));
  const right = unit(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  let [minX, maxX, minY, maxY] = [Infinity, -Infinity, Infinity, -Infinity];
  for (const x of [FRAME.minX, FRAME.maxX])
    for (const y of [0, FRAME.maxY])
      for (const z of [FRAME.minZ, FRAME.maxZ]) {
        const p = sub([x, y, z], CAMERA_POS);
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

/** Width over height of the framed scene: the stage's aspect ratio. */
export const STAGE_ASPECT = (() => {
  const e = frameExtent();
  return (e.maxX - e.minX) / (e.maxY - e.minY);
})();
