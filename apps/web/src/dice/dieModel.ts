/**
 * The die itself: glazed white porcelain with cobalt-blue pips, like a
 * cyanotype in reverse. Shared by the tray and the lobby's turning die.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { AXES, FACE_AXIS } from './tumbleFormat';

/** Pip spots in a face's own (u, v) plane, a quarter of a die apart. */
const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [
    [-1, -1],
    [1, 1],
  ],
  3: [
    [-1, -1],
    [0, 0],
    [1, 1],
  ],
  4: [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ],
  5: [
    [-1, -1],
    [-1, 1],
    [0, 0],
    [1, -1],
    [1, 1],
  ],
  6: [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ],
};

export const dieGeometry = () => new RoundedBoxGeometry(1, 1, 1, 5, 0.16);

/** Cobalt glaze: a very low dome per pip, pooled just proud of each face. */
export function pipGeometry(): THREE.BufferGeometry {
  const dome = new THREE.SphereGeometry(0.09, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.scale(1, 0.2, 1);
  const parts: THREE.BufferGeometry[] = [];
  for (let v = 1; v <= 6; v++) {
    const n = new THREE.Vector3(...AXES[FACE_AXIS[v]!]!);
    const u = Math.abs(n.y) > 0.5 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const w = new THREE.Vector3().crossVectors(n, u);
    const face = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    for (const [a, b] of PIPS[v]!) {
      const g = dome.clone();
      g.applyQuaternion(face);
      const p = n
        .clone()
        .multiplyScalar(0.496)
        .addScaledVector(u, a * 0.25)
        .addScaledVector(w, b * 0.25);
      g.translate(p.x, p.y, p.z);
      parts.push(g);
    }
  }
  return mergeGeometries(parts)!;
}

/**
 * Glazed porcelain: an opaque white body under a glassy clear coat. Without
 * `rich` (no GPU), a plain glossy standard material: the physical one takes
 * seconds to compile in software. The faint emissive lets a hovered die glow.
 */
export function porcelainMaterial(color: string, rich = true): THREE.MeshStandardMaterial {
  if (!rich) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.3,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.04,
    });
  }
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.34,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.04,
  });
}

/** The cobalt glaze in the pips: deeper and glossier than the body. */
export function glazeMaterial(color: string, rich = true): THREE.MeshStandardMaterial {
  if (!rich) return new THREE.MeshStandardMaterial({ color, roughness: 0.25 });
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  });
}
