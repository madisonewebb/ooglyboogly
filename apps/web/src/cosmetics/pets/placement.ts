/**
 * Where the pet stands on the dice stage. The 3D scene frames the tray with
 * fitCamera for the stage's aspect, so the same camera projects a spot in the
 * scene (the tray frame's back-right corner, clear of the held-dice shelf and
 * of the cauldron, which pours from the left) to a place on the page. Plain
 * math, no three.js, so it can be tested.
 */
import { fitCamera, FOV } from '../../dice/framing';

type V = [number, number, number];

/** The pet's feet, in scene units: on the right side of the tray frame, at the back. */
export const PET_SPOT: V = [4.75, 0.35, -1.2];
/** How wide the pet is, in scene units. */
export const PET_WIDTH = 2;

export interface PetPlacement {
  /** The feet's position and the sprite's width, as fractions of the stage's width and height. */
  x: number;
  y: number;
  width: number;
}

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

export function petPlacement(aspect: number, spot: V = PET_SPOT, width = PET_WIDTH): PetPlacement {
  const { position, target } = fitCamera(aspect);
  const forward = unit(sub(target, position));
  const right = unit(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const tanY = Math.tan((FOV * Math.PI) / 360);
  const tanX = tanY * aspect;
  const p = sub(spot, position);
  const depth = dot(p, forward);
  return {
    x: 0.5 + dot(p, right) / (depth * tanX) / 2,
    y: 0.5 - dot(p, up) / (depth * tanY) / 2,
    width: width / (depth * tanX) / 2,
  };
}
