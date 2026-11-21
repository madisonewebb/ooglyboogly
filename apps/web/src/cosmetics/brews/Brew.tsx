/**
 * Brews: the liquid and particles inside the cauldron, and the starwater
 * comet. `BrewInCup` is a child of the cauldron's group, so it shakes and tips
 * with it; the comet lives in the scene, because the cauldron has left by the
 * time a Yatzy lands.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { celebrationFor, cupAt, type RollPlan, timing } from '../../dice/timeline';
import { CUP } from '../../dice/tumbleFormat';
import { seeded } from '../rng';
import { BREWS, type BrewId } from './brews';
import { pointScale, risingPoints, setStar, starPoints, touchStars } from './particles';

/** Where things sit inside the cauldron, in its own units (its mouth is at CUP.height / 2). */
export const BREW_GEOMETRY = {
  surfaceY: -0.05,
  rimY: CUP.height / 2,
  radius: 1.22,
};

/** One still moment of the particles' clock, for reduced motion. */
const STILL_TIME = 3.7;

/** How much of the brew shows while the cauldron is tipped: all of it upright, none once pouring. */
export const tipFade = (tip: number): number => {
  const u = Math.min(1, Math.max(0, (Math.abs(tip) - 0.2) / 0.6));
  return 1 - u * u * (3 - 2 * u);
};

function liquidTexture(id: BrewId): THREE.CanvasTexture {
  const look = BREWS[id];
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = look.liquid;
  g.fillRect(0, 0, 128, 128);
  const rand = seeded(id.length * 97 + 5);
  // Wrapped blotches, so the texture tiles as it drifts.
  for (let i = 0; i < 18; i++) {
    const x = rand() * 128;
    const y = rand() * 128;
    const r = 14 + rand() * 26;
    for (const dx of [-128, 0, 128]) {
      for (const dy of [-128, 0, 128]) {
        const grad = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
        grad.addColorStop(0, `${look.mottle}${rand() > 0.5 ? 'CC' : '77'}`);
        grad.addColorStop(1, `${look.mottle}00`);
        g.fillStyle = grad;
        g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
      }
    }
  }
  if (look.specks) {
    for (let i = 0; i < 46; i++) {
      g.fillStyle = `rgba(255,236,170,${0.35 + rand() * 0.5})`;
      g.fillRect(rand() * 127, rand() * 127, 1.5, 1.5);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function BrewInCup({
  brew,
  roll,
  reduced,
}: {
  brew: BrewId;
  roll: RollPlan | null;
  reduced: boolean;
}) {
  const look = BREWS[brew];
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const map = useMemo(() => liquidTexture(brew), [brew]);
  const layers = useMemo(
    () => look.layers.map((l, i) => risingPoints(l, 31 + i * 7, BREW_GEOMETRY)),
    [look],
  );
  const surface = useRef<THREE.Mesh>(null);
  useEffect(
    () => () => {
      map.dispose();
      for (const p of layers) {
        p.geometry.dispose();
        p.material.dispose();
      }
    },
    [map, layers],
  );

  useFrame(() => {
    const now = performance.now();
    const cup = cupAt(roll, now);
    const fade = cup.opacity * tipFade(cup.tip);
    const time = reduced ? STILL_TIME : (now / 1000) % 1000;
    const scale = pointScale(gl, camera);
    for (const p of layers) {
      const u = p.material.uniforms;
      u['uTime']!.value = time;
      u['uScale']!.value = scale;
      u['uFade']!.value = fade;
      p.visible = fade > 0.01;
    }
    const s = surface.current;
    if (s) {
      s.visible = fade > 0.01;
      (s.material as THREE.MeshStandardMaterial).opacity = 0.86 * fade;
      if (!reduced) map.offset.set(time * 0.012, time * 0.017);
    }
  });

  return (
    <>
      <mesh ref={surface} position={[0, BREW_GEOMETRY.surfaceY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[BREW_GEOMETRY.radius, 40]} />
        <meshStandardMaterial
          map={map}
          emissive={look.glow}
          emissiveMap={map}
          emissiveIntensity={look.glowStrength}
          roughness={0.35}
          transparent
          depthWrite={false}
        />
      </mesh>
      {layers.map((p, i) => (
        <primitive key={i} object={p} />
      ))}
    </>
  );
}

/** The comet's flight: from the cauldron's place, in an arc up and away across the tray. */
export const COMET = { ms: 1150, trail: 14, trailStep: 0.028 } as const;
const FROM = new THREE.Vector3(CUP.x + 0.2, CUP.y + 0.2, CUP.z);
const CONTROL = new THREE.Vector3(0.5, 3.6, 0.6);
const TO = new THREE.Vector3(7.0, 0.8, 1.4);

/** A point on the comet's quadratic arc, u from 0 to 1. */
export function cometAt(u: number, out = new THREE.Vector3()): THREE.Vector3 {
  const k = 1 - u;
  return out
    .copy(FROM)
    .multiplyScalar(k * k)
    .addScaledVector(CONTROL, 2 * k * u)
    .addScaledVector(TO, u * u);
}

/** Starwater on a Yatzy: a comet shoots out and away. Nothing under reduced motion. */
export function BrewComet({
  brew,
  roll,
  reduced,
}: {
  brew: BrewId;
  roll: RollPlan | null;
  reduced: boolean;
}) {
  const on = BREWS[brew].comet && !reduced;
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const invalidate = useThree((s) => s.invalidate);
  const points = useMemo(() => starPoints(COMET.trail + 1, 'comet', '#F6B93B'), []);
  const start = useRef<number | null>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useEffect(
    () => () => {
      points.geometry.dispose();
      points.material.dispose();
    },
    [points],
  );
  useEffect(() => {
    if (on && roll && roll.path && !roll.reduced && celebrationFor(roll.values) === 'yatzy') {
      start.current = timing(roll).celebrate;
      invalidate();
    }
  }, [on, roll, invalidate]);

  useFrame(() => {
    if (!on || start.current === null) return;
    const u = (performance.now() - start.current) / COMET.ms;
    if (u >= 1.1) {
      start.current = null;
      touchStars(points, false);
      return;
    }
    if (u < 0) return;
    points.material.uniforms['uScale']!.value = pointScale(gl, camera);
    for (let k = 0; k <= COMET.trail; k++) {
      const at = Math.min(1, Math.max(0, u - k * COMET.trailStep));
      cometAt(at, tmp);
      const head = k === 0;
      const along = 1 - k / (COMET.trail + 1);
      const end = 1 - Math.max(0, (u - 0.85) / 0.25);
      setStar(
        points,
        k,
        tmp.x,
        tmp.y,
        tmp.z,
        (head ? 1 : 0.7 * along * along) * end,
        head ? 1.1 : 0.7 * along,
      );
    }
    touchStars(points, true);
    invalidate();
  });

  return on ? <primitive object={points} /> : null;
}
