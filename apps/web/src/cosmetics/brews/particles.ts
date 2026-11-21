/**
 * Particles for brews and glints: `THREE.Points` with one small shader, shapes
 * drawn in the fragment shader (no images). Rising particles are animated
 * entirely on the GPU from a time uniform; the star points (comet, glints) are
 * placed by the CPU, a handful of vertices a frame.
 */
import * as THREE from 'three';
import { seeded } from '../rng';
import type { ParticleLayer } from './brews';

const SHAPES = { puff: 0, bubble: 1, flame: 2, glitter: 3, star: 4, comet: 5 } as const;

const FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uCore;
uniform float uShape;
uniform float uAlpha;
uniform float uFade;
varying float vFade;
varying float vLife;

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  uv.y = -uv.y;
  float d = length(uv);
  float a = 0.0;
  vec3 c = uColor;
  if (uShape < 0.5) {
    a = (1.0 - smoothstep(0.0, 1.0, d));
    a *= a;
  } else if (uShape < 1.5) {
    float ring = (1.0 - smoothstep(0.82, 1.0, d)) * smoothstep(0.55, 0.8, d);
    float hl = 1.0 - smoothstep(0.0, 0.28, length(uv - vec2(-0.35, 0.35)));
    a = ring * 0.8 + hl * 0.9 + (1.0 - smoothstep(0.0, 0.8, d)) * 0.12;
  } else if (uShape < 2.5) {
    float t = uv.y * 0.5 + 0.5;
    float w = max(mix(0.75, 0.0, pow(t, 0.7)), 0.02);
    float x = abs(uv.x + sin(t * 5.0 + vLife * 20.0) * 0.12 * t);
    a = (1.0 - smoothstep(w * 0.05, w, x)) * smoothstep(0.0, 0.15, t) * (1.0 - smoothstep(0.75, 1.0, t));
    c = mix(uColor, uCore, 1.0 - smoothstep(0.0, 0.6, t + x * 0.5));
  } else if (uShape < 4.5) {
    float cross = max(exp(-abs(uv.x) * 12.0) * exp(-abs(uv.y) * 2.2), exp(-abs(uv.y) * 12.0) * exp(-abs(uv.x) * 2.2));
    a = cross + (1.0 - smoothstep(0.0, 0.4, d)) * 0.7;
    a *= 1.0 - smoothstep(0.85, 1.0, d);
  } else {
    a = (1.0 - smoothstep(0.0, 1.0, d));
    a = a * a * a;
  }
  gl_FragColor = vec4(c, clamp(a, 0.0, 1.0) * vFade * uAlpha * uFade);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const RISING_VERTEX = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform float uScale;
uniform float uSize;
uniform float uRise;
uniform float uSpeed;
uniform float uGrow;
varying float vFade;
varying float vLife;

void main() {
  float life = fract(uTime * uSpeed * (0.6 + 0.8 * aSeed.y) + aSeed.x);
  vec3 p = position;
  p.y += life * uRise;
  p.x += sin(life * 6.2832 + aSeed.x * 20.0) * 0.1 * aSeed.w;
  p.z += cos(life * 6.2832 + aSeed.y * 20.0) * 0.1 * aSeed.w;
  vLife = life;
  vFade = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.55, 1.0, life));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * (0.6 + 0.8 * aSeed.z) * mix(1.0, uGrow, life) * uScale / -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const STAR_VERTEX = /* glsl */ `
attribute float aA;
attribute float aS;
uniform float uScale;
varying float vFade;
varying float vLife;

void main() {
  vLife = 0.0;
  vFade = aA;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aS * uScale / -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const common = (shape: number, color: string, core: string, alpha: number) => ({
  uColor: { value: new THREE.Color(color) },
  uCore: { value: new THREE.Color(core) },
  uShape: { value: shape },
  uAlpha: { value: alpha },
  uFade: { value: 1 },
  uScale: { value: 600 },
});

const base = {
  transparent: true,
  depthWrite: false,
} as const;
const ADD = { ...base, blending: THREE.AdditiveBlending } as const;
// The comet crosses the pale page as well as the dark felt, so it is drawn solid, not as light.
const SOLID = { ...base, blending: THREE.NormalBlending } as const;

/** Where each particle of a layer starts, and its four random numbers; deterministic per layer. */
export function layerSeeds(
  layer: Pick<ParticleLayer, 'count' | 'from'>,
  seed: number,
  surfaceY: number,
  rimY: number,
  radius: number,
): { positions: Float32Array; seeds: Float32Array } {
  const rand = seeded(seed);
  const positions = new Float32Array(layer.count * 3);
  const seeds = new Float32Array(layer.count * 4);
  for (let i = 0; i < layer.count; i++) {
    if (layer.from === 'rim') {
      // Evenly round the rim with a little jitter, so the flames form a ring.
      const a = ((i + rand() * 0.6) / layer.count) * Math.PI * 2;
      positions.set([Math.cos(a) * radius, rimY, Math.sin(a) * radius], i * 3);
    } else {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * radius * 0.85;
      positions.set([Math.cos(a) * r, surfaceY, Math.sin(a) * r], i * 3);
    }
    // Spread the phases evenly, so a layer never bunches up.
    seeds.set([(i + rand() * 0.5) / layer.count, rand(), rand(), rand()], i * 4);
  }
  return { positions, seeds };
}

/** A layer of rising particles as a Points object. `still` holds it at one moment. */
export function risingPoints(
  layer: ParticleLayer,
  seed: number,
  geometry: { surfaceY: number; rimY: number; radius: number },
): THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> {
  const { positions, seeds } = layerSeeds(
    layer,
    seed,
    geometry.surfaceY,
    geometry.rimY,
    geometry.radius,
  );
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  const mat = new THREE.ShaderMaterial({
    ...ADD,
    vertexShader: RISING_VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      ...common(SHAPES[layer.shape], layer.color, layer.core ?? layer.color, layer.alpha),
      uTime: { value: 0 },
      uSize: { value: layer.size },
      uRise: { value: layer.rise },
      uSpeed: { value: layer.speed },
      uGrow: { value: layer.grow },
    },
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return points;
}

/** A few CPU-placed star points: the comet and the gilded glints. */
export function starPoints(
  count: number,
  shape: 'star' | 'comet',
  color: string,
): THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute('aA', new THREE.BufferAttribute(new Float32Array(count), 1));
  geo.setAttribute('aS', new THREE.BufferAttribute(new Float32Array(count), 1));
  const mat = new THREE.ShaderMaterial({
    ...(shape === 'comet' ? SOLID : ADD),
    vertexShader: STAR_VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: common(SHAPES[shape], color, color, 1),
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.visible = false;
  return points;
}

/** Sets one star point; call `touchStars` after setting them all. */
export function setStar(
  points: THREE.Points,
  i: number,
  x: number,
  y: number,
  z: number,
  alpha: number,
  size: number,
) {
  const g = points.geometry;
  g.getAttribute('position').setXYZ(i, x, y, z);
  g.getAttribute('aA').setX(i, alpha);
  g.getAttribute('aS').setX(i, size);
}

export function touchStars(points: THREE.Points, visible: boolean) {
  points.visible = visible;
  const g = points.geometry;
  g.getAttribute('position').needsUpdate = true;
  g.getAttribute('aA').needsUpdate = true;
  g.getAttribute('aS').needsUpdate = true;
}

const size = new THREE.Vector2();
/** Pixels per world unit at distance 1, which scales every point with the view. */
export function pointScale(gl: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): number {
  gl.getDrawingBufferSize(size);
  return size.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
}
