/**
 * The 3D dice tray: React Three Fiber playing the recorded tumbles. Loaded
 * lazily, so the rest of the app paints before three.js arrives.
 *
 * Poses come from timeline.ts each frame and are written straight onto the
 * meshes, so a roll never re-renders React.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Tokens } from '../theme/palette';
import {
  cupAt,
  type HopPlan,
  hopEnd,
  hopPose,
  poseAt,
  type RollPlan,
  restPose,
  timing,
} from './timeline';
import { CAMERA_POS, frameExtent, LOOK_AT } from './framing';
import { AXES, FACE_AXIS, SHELF_Y, SHELF_Z, SLOT_X, TRAY, TRAY_Z } from './tumbleFormat';

export interface SlotRect {
  /** Centre, as a fraction of the canvas width and height. */
  x: number;
  y: number;
  /** Die width as a fraction of the canvas width. */
  size: number;
}

export interface SceneProps {
  values: readonly (number | null)[];
  held: readonly boolean[];
  roll: RollPlan | null;
  hops: readonly HopPlan[];
  colors: Tokens;
  /** Screen positions of each column's tray and shelf spots, for the tap targets. */
  onSlots(slots: { tray: SlotRect[]; shelf: SlotRect[] }): void;
}

const CAMERA = new THREE.Vector3(...CAMERA_POS);
const TARGET = new THREE.Vector3(...LOOK_AT);

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

function pipGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let v = 1; v <= 6; v++) {
    const n = new THREE.Vector3(...AXES[FACE_AXIS[v]!]!);
    const u = Math.abs(n.y) > 0.5 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const w = new THREE.Vector3().crossVectors(n, u);
    const face = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    for (const [a, b] of PIPS[v]!) {
      const g = new THREE.CircleGeometry(0.085, 20);
      g.applyQuaternion(face);
      const p = n
        .clone()
        .multiplyScalar(0.503)
        .addScaledVector(u, a * 0.25)
        .addScaledVector(w, b * 0.25);
      g.translate(p.x, p.y, p.z);
      parts.push(g);
    }
  }
  return mergeGeometries(parts)!;
}

function shadowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(58,30,64,0.35)');
  grad.addColorStop(1, 'rgba(58,30,64,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

const RIM = 0.38;
const RIM_H = 0.42;
const roundedCache = new Map<string, THREE.BufferGeometry>();
/** A rounded block, cached by size. */
function rounded(w: number, h: number, d: number): THREE.BufferGeometry {
  const key = `${w}:${h}:${d}`;
  let g = roundedCache.get(key);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * 0.45);
    roundedCache.set(key, g);
  }
  return g;
}

function Camera({ onSlots }: Pick<SceneProps, 'onSlots'>) {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    cam.position.copy(CAMERA);
    cam.lookAt(TARGET);
    cam.updateMatrixWorld();
    // Fit the whole FRAME box, padding whichever side the canvas has spare.
    // Camera-space offsets: frameExtent measures from the camera position.
    const e = frameExtent();
    let w = e.maxX - e.minX;
    let h = e.maxY - e.minY;
    const aspect = size.width / Math.max(1, size.height);
    if (w / h < aspect) w = h * aspect;
    else h = w / aspect;
    const cx = (e.minX + e.maxX) / 2;
    const cy = (e.minY + e.maxY) / 2;
    Object.assign(cam, {
      left: cx - w / 2,
      right: cx + w / 2,
      top: cy + h / 2,
      bottom: cy - h / 2,
      zoom: 1,
    });
    cam.updateProjectionMatrix();
    const project = (x: number, y: number, z: number): SlotRect => {
      const p = new THREE.Vector3(x, y, z).project(cam);
      return { x: (p.x + 1) / 2, y: (1 - p.y) / 2, size: 1.15 / w };
    };
    onSlots({
      tray: SLOT_X.map((x) => project(x, 0.5, TRAY_Z)),
      shelf: SLOT_X.map((x) => project(x, SHELF_Y + 0.5, SHELF_Z)),
    });
  }, [camera, size, onSlots]);
  return null;
}

function Dice({ values, held, roll, hops, colors }: Omit<SceneProps, 'onSlots'>) {
  const invalidate = useThree((s) => s.invalidate);
  const body = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 4, 0.16), []);
  const pips = useMemo(pipGeometry, []);
  const shadow = useMemo(shadowTexture, []);
  const outer = useRef<(THREE.Group | null)[]>([]);
  const spin = useRef<(THREE.Group | null)[]>([]);
  const shadows = useRef<(THREE.Mesh | null)[]>([]);
  const cup = useRef<THREE.Group>(null);
  const cupMat = useRef<THREE.MeshPhysicalMaterial>(null);
  const materials = useMemo(
    () =>
      [0, 1, 2, 3, 4].map(
        () =>
          new THREE.MeshPhysicalMaterial({
            color: colors.die,
            roughness: 0.22,
            clearcoat: 1,
            clearcoatRoughness: 0.08,
            sheen: 0.6,
            sheenColor: new THREE.Color('#FFD1E6'),
            emissive: new THREE.Color(colors.die),
            emissiveIntensity: 0.12,
            transparent: true,
            opacity: 0.93,
          }),
      ),
    [colors.die],
  );
  const pipMat = useMemo(() => new THREE.MeshBasicMaterial({ color: colors.pip }), [colors.pip]);

  // Any change to what's shown needs a fresh frame.
  useEffect(() => invalidate(), [values, held, roll, hops, colors, invalidate]);

  useFrame(() => {
    const now = performance.now();
    let animating = false;
    const t = roll ? timing(roll) : null;
    for (let i = 0; i < 5; i++) {
      const hop = hops.find((h) => h.die === i && now < hopEnd(h) + 200);
      let pose;
      if (roll && t && now < t.done + 50) {
        pose = poseAt(roll, i, now);
        animating = true;
      } else if (hop) {
        pose = hopPose(hop, now);
        animating = true;
      } else {
        pose = restPose(i, values[i] ?? null, held[i] ?? false);
      }
      const o = outer.current[i];
      const s = spin.current[i];
      if (!o || !s) continue;
      o.visible = pose.visible;
      o.position.set(...pose.pos);
      o.scale.set(...pose.squash);
      s.quaternion.set(...pose.quat);
      materials[i]!.opacity = 0.93 * pose.opacity;
      const sh = shadows.current[i];
      if (sh) {
        const floor = held[i] && !(roll && roll.free.includes(i)) ? SHELF_Y + 0.01 : 0.01;
        const lift = Math.max(0, pose.pos[1] - floor - 0.5);
        sh.visible = pose.visible;
        sh.position.set(pose.pos[0], floor, pose.pos[2]);
        const k = 1 / (1 + lift * 0.6);
        sh.scale.setScalar(1.7 * k);
        (sh.material as THREE.MeshBasicMaterial).opacity = pose.opacity * k;
      }
    }
    const c = cupAt(roll, now);
    if (cup.current && cupMat.current) {
      cup.current.visible = c.visible && c.opacity > 0.01;
      cup.current.position.set(...c.pos);
      cup.current.rotation.z = c.tip;
      cupMat.current.opacity = 0.75 * c.opacity;
    }
    if (animating) invalidate();
  });

  const hx = (TRAY.maxX - TRAY.minX) / 2;
  const hz = (TRAY.maxZ - TRAY.minZ) / 2;
  const cz = (TRAY.minZ + TRAY.maxZ) / 2;

  return (
    <>
      {/* The tray: a pad-colored floor inside a soft rounded rim on all four sides. */}
      <mesh position={[0, -0.05, cz]}>
        <boxGeometry args={[hx * 2 + 0.2, 0.1, hz * 2 + 0.2]} />
        <meshBasicMaterial color={colors.pad} />
      </mesh>
      {[
        [0, cz + hz + RIM / 2, hx * 2 + RIM * 2, RIM],
        [0, cz - hz - RIM / 2, hx * 2 + RIM * 2, RIM],
        [-hx - RIM / 2, cz, RIM, hz * 2 + RIM * 2],
        [hx + RIM / 2, cz, RIM, hz * 2 + RIM * 2],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x!, RIM_H / 2, z!]} geometry={rounded(w!, RIM_H, d!)}>
          <meshLambertMaterial color={colors.rule} emissive={colors.rule} emissiveIntensity={0.3} />
        </mesh>
      ))}
      {/* The butter-yellow shelf for held dice, behind the tray. */}
      <mesh
        position={[0, SHELF_Y / 2, SHELF_Z]}
        geometry={rounded(hx * 2 + RIM * 2, SHELF_Y, 1.45)}
      >
        <meshLambertMaterial
          color={colors.butter}
          emissive={colors.butter}
          emissiveIntensity={0.3}
        />
      </mesh>

      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={`s${i}`}
          ref={(m) => void (shadows.current[i] = m)}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={-1}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={shadow} transparent depthWrite={false} />
        </mesh>
      ))}

      {[0, 1, 2, 3, 4].map((i) => (
        <group key={i} ref={(g) => void (outer.current[i] = g)}>
          <group ref={(g) => void (spin.current[i] = g)}>
            <mesh geometry={body} material={materials[i]!} />
            <mesh geometry={pips} material={pipMat} />
          </group>
        </group>
      ))}

      <group ref={cup}>
        <mesh>
          <cylinderGeometry args={[1.05, 0.8, 1.7, 32, 1, true]} />
          <meshPhysicalMaterial
            ref={cupMat}
            color={colors.accent}
            roughness={0.3}
            clearcoat={1}
            side={THREE.DoubleSide}
            transparent
            opacity={0.75}
          />
        </mesh>
        {/* A rolled rim and a base, so it reads as a candy cup. */}
        <mesh position={[0, 0.85, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.05, 0.11, 12, 40]} />
          <meshLambertMaterial
            color={colors.accent}
            emissive={colors.accent}
            emissiveIntensity={0.3}
          />
        </mesh>
        <mesh position={[0, -0.85, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.8, 32]} />
          <meshLambertMaterial color={colors.accent} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </>
  );
}

export default function DiceScene(props: SceneProps) {
  return (
    <Canvas
      orthographic
      frameloop="demand"
      flat
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ near: 0.1, far: 50, manual: true }}
      aria-hidden="true"
    >
      <Camera onSlots={props.onSlots} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[-3, 8, 5]} intensity={1.6} />
      <directionalLight position={[4, 3, 6]} intensity={0.5} />
      <Dice {...props} />
    </Canvas>
  );
}
