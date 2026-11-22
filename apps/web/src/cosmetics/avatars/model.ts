/**
 * The avatar, modeled in code: a soft, wobbling jelly blob with dot eyes, plus each cosmetic.
 * Geometry and materials are cached and shared by every avatar (a table has at most a dozen, and
 * the item set is small), so building one is just a handful of meshes. Units: the body is about
 * 1.1 tall and 1 wide, standing on y = 0, facing +z.
 */
import * as THREE from 'three';
import type { Pose } from './animation';
import { bodyColorOf } from './colors';
import type { AvatarLook } from './items';

const INK = '#2A2440';
const GOLD = '#E8C766';
const PLUM = '#4D3F69';
const BLUSH = '#D98BA6';
const LILAC = '#9B86E0';

const geoCache = new Map<string, THREE.BufferGeometry>();
const geo = <T extends THREE.BufferGeometry>(key: string, make: () => T): T => {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g as T;
};

const matCache = new Map<string, THREE.Material>();
/** A matte material, cached by color and options. */
const lit = (color: string, opts: { emissive?: string; alpha?: number } = {}): THREE.Material => {
  const key = `l${color}${opts.emissive ?? ''}${opts.alpha ?? 1}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({
      color,
      emissive: opts.emissive ?? '#000000',
      transparent: (opts.alpha ?? 1) < 1,
      opacity: opts.alpha ?? 1,
      side: THREE.DoubleSide,
    });
    matCache.set(key, m);
  }
  return m;
};
/** An unlit, glowing material. */
const glow = (color: string, alpha = 1): THREE.Material => {
  const key = `g${color}${alpha}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, transparent: alpha < 1, opacity: alpha });
    matCache.set(key, m);
  }
  return m;
};

const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => new THREE.Mesh(g, m);
const sphere = (r: number) => geo(`s${r}`, () => new THREE.SphereGeometry(r, 16, 12));
const place = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T => {
  o.position.set(x, y, z);
  return o;
};

/** A piece of the avatar, with an optional per-frame update (seconds). */
interface Part {
  object: THREE.Object3D;
  tick?: (t: number) => void;
}

const star = (r: number) =>
  geo(`star${r}`, () => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.45;
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      if (i === 0) s.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
      else s.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    return new THREE.ExtrudeGeometry(s, { depth: r * 0.3, bevelEnabled: false });
  });

// Hats. Each sits on the crown of the head (y about 1.1).

function hat(id: NonNullable<AvatarLook['hat']>): Part {
  const g = new THREE.Group();
  switch (id) {
    case 'partyHat': {
      const cone = place(
        mesh(
          geo('party', () => new THREE.ConeGeometry(0.2, 0.46, 20)),
          lit('#D98BA6'),
        ),
        0,
        0.23,
        0,
      );
      g.add(cone);
      for (const h of [0.3, 0.62]) {
        const ring = mesh(
          geo(`pr${h}`, () => new THREE.TorusGeometry(0.2 * (1 - h), 0.016, 6, 20)),
          lit(GOLD),
        );
        ring.rotation.x = Math.PI / 2;
        g.add(place(ring, 0, 0.46 * h, 0));
      }
      g.add(place(mesh(sphere(0.05), lit(GOLD)), 0, 0.47, 0));
      g.position.set(0, 1.06, 0.02);
      g.rotation.z = -0.18;
      break;
    }
    case 'bow': {
      for (const s of [-1, 1]) {
        const wing = mesh(
          geo('bowWing', () => new THREE.ConeGeometry(0.13, 0.22, 4)),
          lit(LILAC),
        );
        wing.rotation.z = (s * Math.PI) / 2;
        g.add(place(wing, s * 0.12, 0, 0));
      }
      g.add(mesh(sphere(0.055), lit('#7E68C8')));
      g.position.set(0.22, 1.02, 0.14);
      g.rotation.z = -0.35;
      break;
    }
    case 'witchHat': {
      g.add(
        place(
          mesh(
            geo('wBrim', () => new THREE.CylinderGeometry(0.42, 0.42, 0.035, 28)),
            lit(PLUM),
          ),
          0,
          0,
          0,
        ),
      );
      g.add(
        place(
          mesh(
            geo('wLow', () => new THREE.ConeGeometry(0.24, 0.36, 20)),
            lit(PLUM),
          ),
          0,
          0.19,
          0,
        ),
      );
      const tip = place(
        mesh(
          geo('wTip', () => new THREE.ConeGeometry(0.12, 0.3, 16)),
          lit(PLUM),
        ),
        0.05,
        0.45,
        0,
      );
      tip.rotation.z = -0.4;
      g.add(tip);
      const band = mesh(
        geo('wBand', () => new THREE.TorusGeometry(0.235, 0.028, 6, 24)),
        lit(GOLD),
      );
      band.rotation.x = Math.PI / 2;
      g.add(place(band, 0, 0.04, 0));
      g.position.set(0, 1.03, 0);
      g.rotation.z = 0.1;
      break;
    }
    case 'crown': {
      g.add(
        place(
          mesh(
            geo('crBand', () => new THREE.CylinderGeometry(0.22, 0.2, 0.12, 20, 1, true)),
            lit(GOLD),
          ),
          0,
          0.06,
          0,
        ),
      );
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        g.add(
          place(
            mesh(
              geo('crSpike', () => new THREE.ConeGeometry(0.05, 0.14, 6)),
              lit(GOLD),
            ),
            Math.cos(a) * 0.21,
            0.18,
            Math.sin(a) * 0.21,
          ),
        );
      }
      g.add(
        place(
          mesh(
            geo('crGem', () => new THREE.OctahedronGeometry(0.045)),
            lit('#9B6AE0', { emissive: '#3A2370' }),
          ),
          0,
          0.07,
          0.215,
        ),
      );
      g.position.set(0, 1.06, 0);
      g.rotation.z = -0.06;
      break;
    }
  }
  return { object: g };
}

// Faces. The eyes sit at x +-0.17, y 0.7, on the front of the body.

const EYE_X = 0.17;
const EYE_Y = 0.7;

function face(id: NonNullable<AvatarLook['face']>): Part {
  const g = new THREE.Group();
  const ring = (r: number) => geo(`ring${r}`, () => new THREE.TorusGeometry(r, 0.014, 6, 24));
  switch (id) {
    case 'glasses':
      for (const s of [-1, 1]) g.add(place(mesh(ring(0.1), lit(GOLD)), s * EYE_X, EYE_Y, 0.49));
      g.add(
        place(
          mesh(
            geo('bridge', () => new THREE.CylinderGeometry(0.012, 0.012, 0.1, 5)),
            lit(GOLD),
          ),
          0,
          EYE_Y + 0.02,
          0.5,
        ),
      );
      g.children[2]!.rotation.z = Math.PI / 2;
      break;
    case 'mustache':
      for (const s of [-1, 1]) {
        const half = mesh(
          geo('stache', () => new THREE.SphereGeometry(0.1, 12, 8)),
          lit('#4A2F28'),
        );
        half.scale.set(1, 0.4, 0.5);
        half.rotation.z = s * 0.35;
        g.add(place(half, s * 0.09, 0.56, 0.49));
        const curl = mesh(sphere(0.03), lit('#4A2F28'));
        g.add(place(curl, s * 0.2, 0.6, 0.47));
      }
      break;
    case 'monocle': {
      g.add(place(mesh(ring(0.105), lit(GOLD)), EYE_X, EYE_Y, 0.49));
      const chain = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(EYE_X + 0.08, EYE_Y - 0.08, 0.5),
        new THREE.Vector3(EYE_X + 0.2, EYE_Y - 0.25, 0.5),
        new THREE.Vector3(0.38, 0.28, 0.32),
      );
      g.add(mesh(new THREE.TubeGeometry(chain, 8, 0.008, 4), lit(GOLD)));
      break;
    }
    case 'eyepatch': {
      const patch = mesh(
        geo('patch', () => new THREE.SphereGeometry(0.13, 14, 10)),
        lit('#1C1830'),
      );
      patch.scale.set(1, 0.9, 0.35);
      g.add(place(patch, -EYE_X, EYE_Y, 0.46));
      const strap = mesh(
        geo('strap', () => new THREE.TorusGeometry(0.5, 0.012, 5, 36)),
        lit('#1C1830'),
      );
      strap.rotation.set(Math.PI / 2, 0, 0);
      strap.rotation.x = Math.PI / 2 + 0.25;
      g.add(place(strap, 0, EYE_Y + 0.02, 0));
      break;
    }
  }
  return { object: g };
}

// Held items, in the right hand (the viewer's left of the body).

function held(id: NonNullable<AvatarLook['held']>): Part {
  const g = new THREE.Group();
  g.position.set(0.58, 0.4, 0.16);
  switch (id) {
    case 'wand': {
      const stick = mesh(
        geo('stick', () => new THREE.CylinderGeometry(0.014, 0.02, 0.5, 6)),
        lit('#6B4A3A'),
      );
      g.add(place(stick, 0.08, 0.2, 0));
      const tip = mesh(star(0.1), glow('#FFE9A8'));
      g.add(place(tip, 0.16, 0.5, -0.015));
      g.rotation.z = -0.35;
      return {
        object: g,
        tick: (t) => {
          tip.rotation.y = t * 1.6;
          tip.scale.setScalar(1 + Math.sin(t * 4) * 0.12);
        },
      };
    }
    case 'lantern': {
      g.position.set(0.6, 0.3, 0.18);
      const cage = mesh(
        geo('cage', () => new THREE.CylinderGeometry(0.075, 0.09, 0.2, 8)),
        lit('#3A3350'),
      );
      const flame = mesh(sphere(0.055), glow('#FFC96B'));
      const halo = mesh(sphere(0.16), glow('#FFC96B', 0.18));
      const handle = mesh(
        geo('lanHandle', () => new THREE.TorusGeometry(0.07, 0.01, 5, 12, Math.PI)),
        lit('#3A3350'),
      );
      g.add(cage, place(flame, 0, 0, 0), place(halo, 0, 0, 0), place(handle, 0, 0.1, 0));
      return {
        object: g,
        tick: (t) => {
          flame.scale.setScalar(1 + Math.sin(t * 9) * 0.1);
          g.rotation.z = Math.sin(t * 1.5) * 0.05;
        },
      };
    }
    case 'cauldron': {
      g.position.set(0.6, 0.3, 0.18);
      const pot = mesh(
        geo('pot', () => new THREE.SphereGeometry(0.15, 14, 10)),
        lit('#2B2640'),
      );
      pot.scale.set(1, 0.8, 1);
      const rim = mesh(
        geo('potRim', () => new THREE.TorusGeometry(0.115, 0.022, 6, 20)),
        lit('#3A3350'),
      );
      rim.rotation.x = Math.PI / 2;
      const brew = mesh(
        geo('potBrew', () => new THREE.CircleGeometry(0.11, 16)),
        glow('#5BD27E'),
      );
      brew.rotation.x = -Math.PI / 2;
      g.add(pot, place(rim, 0, 0.1, 0), place(brew, 0, 0.098, 0));
      const bubbles = [0, 1].map((i) => {
        const b = mesh(sphere(0.03), glow('#B8F5C6'));
        g.add(b);
        return { b, i };
      });
      return {
        object: g,
        tick: (t) => {
          for (const { b, i } of bubbles) {
            const k = (t * 0.7 + i * 0.5) % 1;
            b.position.set(Math.sin(i * 3 + t) * 0.04, 0.1 + k * 0.18, 0);
            b.scale.setScalar(Math.sin(k * Math.PI));
          }
        },
      };
    }
    case 'crystalBall': {
      g.position.set(0.6, 0.3, 0.18);
      const ball = mesh(sphere(0.14), lit('#B9A6F0', { alpha: 0.6 }));
      const base = mesh(
        geo('ballBase', () => new THREE.CylinderGeometry(0.08, 0.1, 0.05, 10)),
        lit(GOLD),
      );
      const inner = mesh(star(0.06), glow('#FFFFFF'));
      g.add(place(base, 0, -0.15, 0), ball, inner);
      return {
        object: g,
        tick: (t) => {
          inner.position.set(Math.cos(t * 1.4) * 0.05, Math.sin(t * 1.9) * 0.04, 0);
          inner.rotation.z = t * 2;
        },
      };
    }
  }
  return { object: g };
}

// Auras. They fill the space around the body.

function aura(id: NonNullable<AvatarLook['aura']>): Part {
  const g = new THREE.Group();
  switch (id) {
    case 'sparkles': {
      const bits = Array.from({ length: 7 }, (_, i) => {
        const m = mesh(
          geo('spark', () => new THREE.OctahedronGeometry(0.045)),
          glow(i % 2 ? '#FFFFFF' : '#FFE9A8'),
        );
        g.add(m);
        return { m, i };
      });
      return {
        object: g,
        tick: (t) => {
          for (const { m, i } of bits) {
            const k = (t * 0.32 + i / bits.length) % 1;
            const a = i * 2.4;
            m.position.set(
              Math.cos(a) * (0.55 + (i % 3) * 0.1),
              -0.05 + k * 1.6,
              Math.sin(a) * 0.35,
            );
            m.scale.setScalar(Math.sin(k * Math.PI) * (1 + 0.4 * Math.sin(t * 6 + i)));
            m.rotation.y = t * 2 + i;
          }
        },
      };
    }
    case 'candleFlame': {
      const candle = mesh(
        geo('candle', () => new THREE.CylinderGeometry(0.035, 0.04, 0.16, 8)),
        lit('#F3E7CF'),
      );
      const flame = mesh(
        geo('flame', () => new THREE.SphereGeometry(0.05, 10, 8)),
        glow('#FF9A3C'),
      );
      const core = mesh(sphere(0.026), glow('#FFF3B0'));
      flame.scale.set(0.8, 1.5, 0.8);
      g.add(candle, place(flame, 0, 0.14, 0), place(core, 0, 0.12, 0.01));
      g.position.set(-0.68, 0.95, 0.2);
      return {
        object: g,
        tick: (t) => {
          g.position.y = 0.95 + Math.sin(t * 1.7) * 0.05;
          const f = 1 + Math.sin(t * 11) * 0.08 + Math.sin(t * 17) * 0.05;
          flame.scale.set(0.8 / f, 1.5 * f, 0.8 / f);
        },
      };
    }
    case 'orbitingStars': {
      const stars = [0, 1, 2].map((i) => {
        const s = mesh(star(0.09), glow(i === 1 ? '#FFFFFF' : '#FFE9A8'));
        g.add(s);
        return { s, i };
      });
      g.position.set(0, 1.45, 0);
      return {
        object: g,
        tick: (t) => {
          for (const { s, i } of stars) {
            const a = t * 1.2 + (i / 3) * Math.PI * 2;
            s.position.set(Math.cos(a) * 0.58, Math.sin(a * 2) * 0.05, Math.sin(a) * 0.35);
            s.rotation.z = t * 1.5 + i;
          }
        },
      };
    }
  }
  return { object: g };
}

/**
 * The blob's own body: a deformed sphere, one geometry per avatar because it wobbles. Each vertex
 * keeps its direction from the center; the wobble moves it in and out along that direction with
 * slow overlapping waves, so the body ripples like jelly. The bottom is pressed flat, as if it
 * were sitting.
 */
function makeBlob() {
  const g = new THREE.SphereGeometry(0.5, 24, 16);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const dirs = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i).normalize();
    dirs.set([v.x, v.y, v.z], i * 3);
  }
  const wobble = (t: number, amp: number) => {
    for (let i = 0; i < pos.count; i++) {
      const x = dirs[i * 3]!;
      const y = dirs[i * 3 + 1]!;
      const z = dirs[i * 3 + 2]!;
      const w =
        (Math.sin(x * 2.6 + t * 2.3) + Math.sin(y * 2.2 - t * 1.9) + Math.sin(z * 2.8 + t * 1.6)) /
        3;
      const r = 0.5 * (1 + w * amp);
      // Press the underside flat so the blob sits rather than floats.
      const py = y * r;
      pos.setXYZ(i, x * r, py < -0.3 ? -0.3 + (py + 0.3) * 0.35 : py, z * r);
    }
    pos.needsUpdate = true;
  };
  wobble(0, 0);
  return { geometry: g, wobble };
}

/** One avatar, ready to add to a scene. `update` poses it; `root` holds everything. */
export interface Rig {
  root: THREE.Group;
  update(t: number, pose: Pose): void;
  /** Frees the body's own geometry (everything else is shared). */
  dispose(): void;
}

/** Builds one avatar in `look` tinted `tintHex`. Cheap: shared materials, a few dozen meshes at most. */
export function buildRig(look: AvatarLook, tintHex: string): Rig {
  const root = new THREE.Group();
  const bob = new THREE.Group();
  root.add(bob);

  const blob = makeBlob();
  const bodyMat = new THREE.MeshPhongMaterial({
    color: bodyColorOf(tintHex),
    specular: '#ffffff',
    shininess: 40,
  });
  const body = mesh(blob.geometry, bodyMat);
  // A soft, slightly tall bean standing on the ground.
  body.scale.set(1, 1.1, 1);
  body.position.y = 0.55;
  bob.add(body);

  // A light blush on each side. No limbs: the blob is all one squishy body.
  for (const s of [-1, 1]) {
    const cheek = mesh(sphere(0.07), lit(BLUSH, { alpha: 0.7 }));
    cheek.scale.set(1.2, 0.7, 0.4);
    bob.add(place(cheek, s * 0.3, 0.57, 0.4));
  }

  // Eyes: simple dark dots; they blink by squashing, and droop by sinking.
  const eyes = [-1, 1].map((s) => {
    const eye = new THREE.Group();
    const ball = mesh(sphere(0.06), lit(INK));
    ball.scale.set(1, 1.2, 0.6);
    eye.add(ball);
    bob.add(place(eye, s * EYE_X, EYE_Y, 0.46));
    return eye;
  });

  // Mouth: a small arc; joy opens it wider, droop flips it into a frown.
  const mouth = mesh(
    geo('mouth', () => new THREE.TorusGeometry(0.06, 0.014, 5, 12, Math.PI)),
    lit('#4A2A3C'),
  );
  bob.add(place(mouth, 0, 0.52, 0.485));
  mouth.rotation.z = Math.PI;

  const parts: Part[] = [];
  if (look.face) parts.push(face(look.face));
  if (look.hat) parts.push(hat(look.hat));
  if (look.held) parts.push(held(look.held));
  const wornParts = [...parts];
  for (const p of wornParts) bob.add(p.object);
  // Auras float around the figure rather than moving with each hop.
  if (look.aura) {
    const a = aura(look.aura);
    parts.push(a);
    root.add(a.object);
  }

  return {
    root,
    dispose() {
      blob.geometry.dispose();
      bodyMat.dispose();
    },
    update(t, pose) {
      blob.wobble(t, pose.wobble);
      bob.position.y = pose.y;
      bob.scale.set(pose.scaleX, pose.scaleY, pose.scaleX);
      bob.rotation.set(0, pose.yaw, pose.tilt);
      for (const eye of eyes) {
        const open = 1 - pose.blink * 0.92;
        eye.scale.set(1, Math.max(0.08, open) * (1 - pose.droop * 0.25), 1);
        eye.position.y = EYE_Y - pose.droop * 0.05;
      }
      mouth.rotation.z = Math.PI * (1 - pose.droop);
      mouth.position.y = 0.52 - pose.droop * 0.02;
      const w = 1 + pose.joy * 0.9;
      mouth.scale.set(w, 1 + pose.joy * 0.6, 1);
      for (const p of parts) p.tick?.(t);
    },
  };
}
