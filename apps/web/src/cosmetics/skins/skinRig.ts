/**
 * The five dice's materials and per-frame animation for one skin. With no skin
 * the rig builds the same porcelain materials the scene always used, so the
 * default look is the very same code path.
 */
import * as THREE from 'three';
import { domeGeometry, glazeMaterial, porcelainMaterial } from '../../dice/dieModel';
import { setStar, starPoints, touchStars } from '../brews/particles';
import { SKINS, type SkinId, type SkinLook } from './skins';
import { glowTexture, grainTexture } from './skinTextures';

/** Hover raises a die's glow by this much; the porcelain default has always done so. */
const HOVER_GLOW = 0.14;
const PORCELAIN_GLOW = 0.04;

/** A Yatzy glint: each die flares in turn, STAGGER ms apart, for FLARE ms. */
export const GLINT = { stagger: 110, flare: 900, tail: 400 } as const;

/** How far through die `i`'s flare it is at `now` (0 to 1), or null outside it. */
export function flareAt(now: number, start: number | null, i: number): number | null {
  if (start === null) return null;
  const u = (now - start - i * GLINT.stagger) / GLINT.flare;
  return u > 0 && u < 1 ? u : null;
}

/** True while any die of the five is still flaring. */
export const glintActive = (now: number, start: number | null): boolean =>
  start !== null && now < start + 4 * GLINT.stagger + GLINT.flare + GLINT.tail;

/** The pupils slide at most this far from the center of an eye. */
export const PUPIL_REACH = 0.04;
const EYE = { white: 0.108, pupil: 0.052 } as const;

let eyeGeos: { sclera: THREE.BufferGeometry; pupil: THREE.BufferGeometry } | null = null;
/** The eyes' geometry is the same for every die and every game, so it is made once. */
const eyeGeometry = () =>
  (eyeGeos ??= {
    sclera: domeGeometry(EYE.white, 0.3, 0.494),
    pupil: domeGeometry(EYE.pupil, 0.45, 0.516, true),
  });

/** Pupil material: a glossy black dome whose vertices slide across their face toward the gaze. */
function pupilMaterial(gaze: { value: THREE.Vector3 }, rich: boolean): THREE.MeshStandardMaterial {
  const m = rich
    ? new THREE.MeshPhysicalMaterial({ color: '#08080C', roughness: 0.15, clearcoat: 1 })
    : new THREE.MeshStandardMaterial({ color: '#08080C', roughness: 0.2 });
  m.customProgramCacheKey = () => 'googly-pupil';
  m.onBeforeCompile = (shader) => {
    shader.uniforms['uGaze'] = gaze;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute vec3 aFaceN;\nuniform vec3 uGaze;',
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec3 tang = uGaze - aFaceN * dot(uGaze, aFaceN);
        transformed += tang * min(0.12, ${PUPIL_REACH.toFixed(3)} / max(length(tang), 0.0001));`,
      );
  };
  return m;
}

function bodyMaterial(look: SkinLook, skin: SkinId, rich: boolean, map: THREE.Texture | null) {
  const common = {
    color: look.body,
    roughness: look.roughness,
    // Metal needs an environment to reflect; the simple lighting of a software renderer has none.
    metalness: rich ? look.metalness : Math.min(look.metalness, 0.55),
    emissive: new THREE.Color(look.emissive),
    emissiveIntensity: look.glow,
    ...(look.texture === 'grain' && map ? { map } : {}),
    ...(look.texture === 'glow' && map ? { emissiveMap: map } : {}),
  };
  if (!rich) return new THREE.MeshStandardMaterial(common);
  return new THREE.MeshPhysicalMaterial({
    ...common,
    clearcoat: look.clearcoat,
    clearcoatRoughness: 0.08,
    ...(skin === 'moonstone' ? { iridescence: 0.45, iridescenceIOR: 1.3 } : {}),
  });
}

function pipMaterial(look: SkinLook, rich: boolean) {
  const common = {
    color: look.pip,
    roughness: look.pipRoughness,
    metalness: rich ? look.pipMetalness : Math.min(look.pipMetalness, 0.4),
    emissive: new THREE.Color('#FFD36A'),
    emissiveIntensity: 0,
  };
  return rich
    ? new THREE.MeshPhysicalMaterial({ ...common, clearcoat: 1, clearcoatRoughness: 0.05 })
    : new THREE.MeshStandardMaterial(common);
}

/** What each frame tells the rig about one die. */
export interface DieFrame {
  now: number;
  delta: number;
  /** World position and orientation of the die. */
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  camera: THREE.Camera;
  reduced: boolean;
  opacity: number;
  /** When the current Yatzy effect began, or null. */
  yatzyAt: number | null;
}

const tmp = new THREE.Vector3();
const right = new THREE.Vector3();
const up = new THREE.Vector3();
const inv = new THREE.Quaternion();

export class SkinRig {
  readonly look: SkinLook | null;
  readonly body: THREE.MeshStandardMaterial[];
  readonly pip: THREE.MeshStandardMaterial[];
  readonly eyes: {
    sclera: THREE.MeshStandardMaterial[];
    pupil: THREE.MeshStandardMaterial[];
    geometry: { sclera: THREE.BufferGeometry; pupil: THREE.BufferGeometry };
  } | null = null;
  readonly stars: THREE.Points | null = null;
  private readonly gaze: { value: THREE.Vector3 }[] = [];
  private readonly last = [0, 1, 2, 3, 4].map(() => new THREE.Vector3());
  private readonly textures: THREE.Texture[] = [];

  constructor(skin: SkinId | null, colors: { die: string; pip: string }, rich: boolean) {
    if (!skin) {
      this.look = null;
      this.body = [0, 1, 2, 3, 4].map(() => porcelainMaterial(colors.die, rich));
      const glaze = glazeMaterial(colors.pip, rich);
      this.pip = [glaze, glaze, glaze, glaze, glaze];
      return;
    }
    const look = SKINS[skin];
    this.look = look;
    const map =
      look.texture === 'grain' ? grainTexture() : look.texture === 'glow' ? glowTexture() : null;
    if (map) this.textures.push(map);
    this.body = [0, 1, 2, 3, 4].map(() => bodyMaterial(look, skin, rich, map));
    if (look.eyes) {
      this.gaze = [0, 1, 2, 3, 4].map(() => ({ value: new THREE.Vector3(0, 0, 1) }));
      const white = () =>
        rich
          ? new THREE.MeshPhysicalMaterial({ color: '#FBFBF6', roughness: 0.18, clearcoat: 1 })
          : new THREE.MeshStandardMaterial({ color: '#FBFBF6', roughness: 0.25 });
      this.eyes = {
        sclera: [0, 1, 2, 3, 4].map(white),
        pupil: this.gaze.map((g) => pupilMaterial(g, rich)),
        geometry: eyeGeometry(),
      };
      this.pip = [];
    } else {
      const pip = pipMaterial(look, rich);
      this.pip = [pip, pip, pip, pip, pip];
    }
    if (look.glint) {
      // Each die flares on its own clock, so each gets its own pip material.
      this.pip = [0, 1, 2, 3, 4].map(() => pipMaterial(look, rich));
      this.stars = starPoints(5, 'star', '#FFE7A0');
    }
  }

  /** The body's emissive strength: resting glow, hover, and the moonstone's slow breath. */
  glow(i: number, lift: number, now: number, reduced: boolean): number {
    if (!this.look) return PORCELAIN_GLOW + lift * HOVER_GLOW;
    const breath =
      this.look.idle && !this.look.eyes && !reduced ? Math.sin(now / 830 + i * 1.3) : 0;
    return this.look.glow * (1 + 0.22 * breath) + lift * HOVER_GLOW;
  }

  /** Per-die, per-frame effects. Returns true while it needs more frames. */
  frame(i: number, f: DieFrame): boolean {
    let busy = false;
    const look = this.look;
    if (!look) return false;
    if (this.eyes) {
      this.trackGaze(i, f);
      for (const m of [this.eyes.sclera[i]!, this.eyes.pupil[i]!]) {
        const fading = f.opacity < 0.999;
        if (m.transparent !== fading) {
          m.transparent = fading;
          m.needsUpdate = true;
        }
        m.opacity = f.opacity;
      }
    }
    if (look.glint) busy = this.glint(i, f);
    return busy;
  }

  /** Looks toward the camera, drifting a little, and lagging behind the die's own motion. */
  private trackGaze(i: number, f: DieFrame) {
    const g = this.gaze[i]!.value;
    g.copy(f.camera.position).sub(f.pos).normalize();
    if (!f.reduced) {
      const t = f.now / 1000;
      right.setFromMatrixColumn(f.camera.matrixWorld, 0);
      up.setFromMatrixColumn(f.camera.matrixWorld, 1);
      g.addScaledVector(right, Math.sin(t * 0.9 + i * 1.7) * 0.4);
      g.addScaledVector(up, Math.cos(t * 0.7 + i * 2.3) * 0.28);
      // The pupil trails the movement, like a loose googly eye.
      tmp
        .copy(f.pos)
        .sub(this.last[i]!)
        .divideScalar(Math.max(f.delta, 1 / 120));
      const speed = tmp.length();
      if (speed > 0.001) g.addScaledVector(tmp, -Math.min(0.06, 0.8 / speed));
    }
    this.last[i]!.copy(f.pos);
    // Into the die's own space, where the pupils live.
    g.applyQuaternion(inv.copy(f.quat).invert());
  }

  private glint(i: number, f: DieFrame): boolean {
    const u = f.reduced ? null : flareAt(f.now, f.yatzyAt, i);
    const env = u === null ? 0 : Math.sin(Math.PI * u);
    this.pip[i]!.emissiveIntensity = env * 1.5;
    const stars = this.stars!;
    setStar(stars, i, f.pos.x + 0.2, f.pos.y + 0.6, f.pos.z + 0.28, env, 0.2 + env * 0.55);
    // The last die to flare closes the star batch.
    if (i === 4) touchStars(stars, !f.reduced && glintActive(f.now, f.yatzyAt));
    return !f.reduced && glintActive(f.now, f.yatzyAt);
  }

  dispose() {
    for (const m of new Set([
      ...this.body,
      ...this.pip,
      ...(this.eyes?.sclera ?? []),
      ...(this.eyes?.pupil ?? []),
    ])) {
      m.dispose();
    }
    this.textures.forEach((t) => t.dispose());
    if (this.stars) {
      this.stars.geometry.dispose();
      (this.stars.material as THREE.Material).dispose();
    }
  }
}
