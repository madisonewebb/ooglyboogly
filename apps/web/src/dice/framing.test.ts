import { describe, expect, it } from 'vitest';
import { fitCamera, FOV, STAGE_ASPECT } from './framing';
import { FRAME } from './tumbleFormat';

type V = [number, number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
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

/** Where a world point lands on a canvas of this aspect, -1 to 1 each way. */
function project(p: V, aspect: number) {
  const { position, target } = fitCamera(aspect);
  const forward = unit(sub(target, position));
  const right = unit(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const v = sub(p, position);
  const tanY = Math.tan((FOV * Math.PI) / 360);
  const depth = dot(v, forward);
  return [dot(v, right) / (depth * tanY * aspect), dot(v, up) / (depth * tanY)] as const;
}

describe('the camera fit', () => {
  for (const aspect of [0.9, STAGE_ASPECT, 1.6, 2.4]) {
    it(`keeps the whole tray in view and fills the canvas at aspect ${aspect.toFixed(2)}`, () => {
      const points: V[] = [];
      for (const x of [FRAME.minX, FRAME.maxX]) {
        for (const z of [FRAME.minZ, FRAME.maxZ]) points.push([x, 0, z]);
        for (const z of [FRAME.minZ, FRAME.topMaxZ]) points.push([x, FRAME.maxY, z]);
      }
      const ndc = points.map((p) => project(p, aspect));
      for (const [x, y] of ndc) {
        expect(Math.abs(x)).toBeLessThanOrEqual(1);
        expect(Math.abs(y)).toBeLessThanOrEqual(1);
      }
      // One direction is filled edge to edge, less the margin.
      const spanX = Math.max(...ndc.map((n) => n[0])) - Math.min(...ndc.map((n) => n[0]));
      const spanY = Math.max(...ndc.map((n) => n[1])) - Math.min(...ndc.map((n) => n[1]));
      expect(Math.max(spanX, spanY)).toBeGreaterThan(1.9);
    });
  }
});
