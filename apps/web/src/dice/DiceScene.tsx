/**
 * The 3D dice tray: React Three Fiber playing the recorded tumbles. Loaded
 * lazily, so the rest of the app paints before three.js arrives.
 *
 * Poses come from timeline.ts each frame and are written straight onto the
 * meshes, so a roll never re-renders React. The look: glazed porcelain dice
 * with violet pips under a soft studio light, on violet felt in a lacquered
 * frame, with the held-dice shelf behind and a black iron cauldron.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { SceneTokens, Tokens } from '../theme/palette';
import { SkinRig } from '../cosmetics/skins/skinRig';
import type { SceneLook } from '../cosmetics/look';
import { dieGeometry, pipGeometry } from './dieModel';
import { fitCamera, FOV } from './framing';
import { renderQuality } from './webgl';
import {
  celebrationFor,
  cupAt,
  type HopPlan,
  hopEnd,
  hopPose,
  poseAt,
  type RollPlan,
  restPose,
  timing,
} from './timeline';
import type { Quat } from './quat';
import { CUP, SHELF_Y, SHELF_Z, SLOT_X, TRAY, TRAY_Z } from './tumbleFormat';

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
  scene: SceneTokens;
  /** The roller's tint, for the cup. */
  hue: string;
  /** The die under the pointer, which lifts a little. */
  hover: number | null;
  /** How each die lies at rest, so they stay put between rolls. */
  rests: readonly (Quat | null)[];
  /** The equipped skin and brew of the player whose tray this is; missing means the default look. */
  look?: SceneLook | undefined;
  /** Screen positions of each column's tray and shelf spots, for the click targets. */
  onSlots(slots: { tray: SlotRect[]; shelf: SlotRect[] }): void;
}

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Seeded noise, so the felt looks the same on every screen. */
function noise(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** Felt: the base color with a fine nap and darker edges where the rim shades it. */
function feltTexture(color: string, w: number, h: number) {
  return canvasTexture(1024, Math.round((1024 * h) / w), (g) => {
    const { width, height } = g.canvas;
    g.fillStyle = color;
    g.fillRect(0, 0, width, height);
    const rand = noise(11);
    // Uneven tone, like a coating brushed on by hand: broad soft patches.
    for (let i = 0; i < 46; i++) {
      const x = rand() * width;
      const y = rand() * height;
      const r = 50 + rand() * 170;
      const glow = g.createRadialGradient(x, y, 0, x, y, r);
      const tone = rand() > 0.55 ? '255,255,255' : '4,14,32';
      glow.addColorStop(0, `rgba(${tone},${0.03 + rand() * 0.04})`);
      glow.addColorStop(1, `rgba(${tone},0)`);
      g.fillStyle = glow;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 14000; i++) {
      const light = rand() > 0.5;
      g.fillStyle = light ? 'rgba(255,255,255,0.05)' : 'rgba(4,14,32,0.06)';
      g.fillRect(rand() * width, rand() * height, 1 + rand() * 2, 1 + rand() * 2);
    }
    const e = height * 0.12;
    const shade = (x0: number, y0: number, x1: number, y1: number, rect: number[]) => {
      const grad = g.createLinearGradient(x0, y0, x1, y1);
      grad.addColorStop(0, 'rgba(4,14,32,0.26)');
      grad.addColorStop(1, 'rgba(4,14,32,0)');
      g.fillStyle = grad;
      g.fillRect(rect[0]!, rect[1]!, rect[2]!, rect[3]!);
    };
    shade(0, 0, 0, e, [0, 0, width, e]);
    shade(0, height, 0, height - e, [0, height - e, width, e]);
    shade(0, 0, e, 0, [0, 0, e, height]);
    shade(width, 0, width - e, 0, [width - e, 0, e, height]);
  });
}

function bumpTexture() {
  const t = canvasTexture(128, 128, (g) => {
    const rand = noise(5);
    const img = g.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = 110 + rand() * 60;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = n;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  });
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(12, 6);
  return t;
}

function shadowTexture(): THREE.Texture {
  return canvasTexture(64, 64, (g) => {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(4,14,32,0.5)');
    grad.addColorStop(0.6, 'rgba(4,14,32,0.18)');
    grad.addColorStop(1, 'rgba(4,14,32,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  });
}

/**
 * A glossy surface: clear-coated where there's a GPU, plain standard where
 * there isn't (the physical material takes seconds to compile in software).
 */
function Gloss({
  ref,
  clearcoat = 1,
  clearcoatRoughness = 0.15,
  ...rest
}: {
  ref?: (material: THREE.Material | null) => void;
  color?: THREE.ColorRepresentation;
  map?: THREE.Texture;
  roughness: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  side?: THREE.Side;
}) {
  return renderQuality() === 'high' ? (
    <meshPhysicalMaterial
      {...(ref ? { ref } : {})}
      clearcoat={clearcoat}
      clearcoatRoughness={clearcoatRoughness}
      {...rest}
    />
  ) : (
    <meshStandardMaterial {...(ref ? { ref } : {})} {...rest} />
  );
}

const RIM = 0.4;
const RIM_H = 0.5;
const SHELF_D = 1.7;
const roundedCache = new Map<string, THREE.BufferGeometry>();
/** A rounded block, cached by size. */
function rounded(w: number, h: number, d: number, r = 0.45): THREE.BufferGeometry {
  const key = `${w}:${h}:${d}:${r}`;
  let g = roundedCache.get(key);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, 4, Math.min(w, h, d) * r);
    roundedCache.set(key, g);
  }
  return g;
}

/** A soft studio: a generated room for reflections, so the gloss has something to catch. */
function Studio({ intensity }: { intensity: number }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.38 * intensity;
    room.dispose();
    pmrem.dispose();
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [gl, scene, intensity]);
  return null;
}

function Rig({ onSlots, roll }: Pick<SceneProps, 'onSlots' | 'roll'>) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const home = useRef(new THREE.Vector3());

  useLayoutEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const fit = fitCamera(aspect);
    camera.fov = FOV;
    camera.aspect = aspect;
    camera.near = 1;
    camera.far = 80;
    camera.position.set(...fit.position);
    camera.lookAt(...fit.target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    home.current.copy(camera.position);
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const project = (x: number, y: number, z: number): SlotRect => {
      const c = new THREE.Vector3(x, y, z);
      const p = c.clone().project(camera);
      const a = c.clone().addScaledVector(right, -0.5).project(camera);
      const b = c.clone().addScaledVector(right, 0.5).project(camera);
      return { x: (p.x + 1) / 2, y: (1 - p.y) / 2, size: (Math.abs(b.x - a.x) / 2) * 1.2 };
    };
    onSlots({
      tray: SLOT_X.map((x) => project(x, 0.5, TRAY_Z)),
      shelf: SLOT_X.map((x) => project(x, SHELF_Y + 0.5, SHELF_Z)),
    });
    invalidate();
  }, [camera, size, onSlots, invalidate]);

  // A Yatzy lands with a little thump of the camera.
  useFrame(() => {
    if (!roll || roll.reduced || !roll.path || celebrationFor(roll.values) !== 'yatzy') {
      if (!camera.position.equals(home.current)) camera.position.copy(home.current);
      return;
    }
    const t = timing(roll);
    const landing = t.celebrate + (t.done - t.celebrate) * 0.9;
    const u = (performance.now() - landing) / 260;
    if (u > 0 && u < 1) {
      const k = (1 - u) * 0.07;
      camera.position.set(
        home.current.x + Math.sin(u * 47) * k,
        home.current.y + Math.sin(u * 61) * k,
        home.current.z,
      );
      invalidate();
    } else if (!camera.position.equals(home.current)) {
      camera.position.copy(home.current);
    }
  });
  return null;
}

/** A soft shadow under the whole tray, so it sits on the page. */
function groundTexture() {
  // The tray covers the middle 70%; the shadow fades out well before the edges.
  return canvasTexture(512, 512, (g) => {
    const { width, height } = g.canvas;
    g.filter = 'blur(22px)';
    g.fillStyle = 'rgba(4,14,32,0.4)';
    g.beginPath();
    g.roundRect(width * 0.17, height * 0.2, width * 0.66, height * 0.66, 30);
    g.fill();
  });
}

function Tray({ scene }: { scene: SceneTokens }) {
  const hx = (TRAY.maxX - TRAY.minX) / 2;
  const hz = (TRAY.maxZ - TRAY.minZ) / 2;
  const cz = (TRAY.minZ + TRAY.maxZ) / 2;
  const felt = useMemo(() => feltTexture(scene.felt, hx * 2, hz * 2), [scene.felt, hx, hz]);
  const bump = useMemo(bumpTexture, []);
  const ground = useMemo(groundTexture, []);
  useEffect(() => () => felt.dispose(), [felt]);
  const outerW = hx * 2 + RIM * 2;
  const back = SHELF_Z - SHELF_D / 2;
  const front = TRAY.maxZ + RIM;
  return (
    <>
      <mesh position={[0, -0.44, (back + front) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[outerW / 0.7, (front - back) / 0.7]} />
        <meshBasicMaterial map={ground} transparent depthWrite={false} />
      </mesh>
      {/* The tray's body: the felt sits in it, the rim and shelf on top. */}
      <mesh
        position={[0, -0.23, (back + front) / 2]}
        geometry={rounded(outerW, 0.42, front - back, 0.35)}
        receiveShadow
      >
        <Gloss color={scene.rim} roughness={0.4} clearcoat={0.6} />
      </mesh>
      <mesh position={[0, 0, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[hx * 2, hz * 2]} />
        <meshStandardMaterial map={felt} bumpMap={bump} bumpScale={0.8} roughness={0.96} />
      </mesh>
      {[
        [0, cz + hz + RIM / 2, outerW, RIM],
        [0, cz - hz - RIM / 2, outerW, RIM],
        [-hx - RIM / 2, cz, RIM, hz * 2 + RIM * 2],
        [hx + RIM / 2, cz, RIM, hz * 2 + RIM * 2],
      ].map(([x, z, w, d], i) => (
        <mesh
          key={i}
          position={[x!, RIM_H / 2 - 0.05, z!]}
          geometry={rounded(w!, RIM_H, d!)}
          castShadow
          receiveShadow
        >
          <Gloss color={scene.rim} roughness={0.28} clearcoatRoughness={0.12} />
        </mesh>
      ))}
      {/* The oak shelf for held dice, with a seat for each column. */}
      <mesh
        position={[0, SHELF_Y / 2 - 0.02, SHELF_Z]}
        geometry={rounded(outerW, SHELF_Y + 0.04, SHELF_D, 0.3)}
        castShadow
        receiveShadow
      >
        <Gloss color={scene.shelf} roughness={0.3} clearcoat={0.9} />
      </mesh>
      {SLOT_X.map((x) => (
        <mesh
          key={x}
          position={[x, SHELF_Y + 0.004, SHELF_Z]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <circleGeometry args={[0.6, 48]} />
          <meshStandardMaterial color={scene.seat} roughness={0.6} />
        </mesh>
      ))}
    </>
  );
}

const LIFT = 0.16;

function Dice({
  values,
  held,
  roll,
  hops,
  colors,
  hover,
  rests,
  look,
}: Omit<SceneProps, 'onSlots' | 'hue' | 'scene'>) {
  const invalidate = useThree((s) => s.invalidate);
  const camera = useThree((s) => s.camera);
  const body = useMemo(dieGeometry, []);
  const pips = useMemo(pipGeometry, []);
  const blob = useMemo(shadowTexture, []);
  const outer = useRef<(THREE.Group | null)[]>([]);
  const spin = useRef<(THREE.Group | null)[]>([]);
  const blobs = useRef<(THREE.Mesh | null)[]>([]);
  const lift = useRef([0, 0, 0, 0, 0]);
  const skin = look?.skin ?? null;
  const reduced = look?.reduced ?? false;
  // The rig builds the materials: porcelain with no skin, as ever.
  const rig = useMemo(
    () => new SkinRig(skin, { die: colors.die, pip: colors.pip }, renderQuality() === 'high'),
    [skin, colors.die, colors.pip],
  );
  const materials = rig.body;
  useEffect(() => () => rig.dispose(), [rig]);
  // A Yatzy sets off the skin's effects (gilded glints); they run on their own clock afterwards.
  const yatzyAt = useRef<number | null>(null);
  useEffect(() => {
    if (roll && roll.path && !roll.reduced && celebrationFor(roll.values) === 'yatzy') {
      yatzyAt.current = timing(roll).celebrate;
      invalidate();
    } else if (roll?.path) {
      yatzyAt.current = null;
    }
  }, [roll, invalidate]);
  // Skins with a slow idle motion (breathing glow, wandering eyes) redraw a few times a second.
  useEffect(() => {
    if (!rig.look?.idle || reduced) return;
    const id = window.setInterval(() => !document.hidden && invalidate(), 66);
    return () => window.clearInterval(id);
  }, [rig, reduced, invalidate]);

  // Any change to what's shown needs a fresh frame.
  useEffect(() => invalidate(), [values, held, roll, hops, colors, hover, rests, invalidate]);

  useFrame((_, delta) => {
    const now = performance.now();
    let animating = false;
    const t = roll ? timing(roll) : null;
    for (let i = 0; i < 5; i++) {
      const hop = hops.find((h) => h.die === i && now < hopEnd(h) + 200);
      const rolling = !!(roll && t && now < t.done + 50);
      let pose;
      if (rolling) {
        pose = poseAt(roll!, i, now);
        animating = true;
      } else if (hop) {
        pose = hopPose(hop, now);
        animating = true;
      } else {
        pose = restPose(i, values[i] ?? null, held[i] ?? false, rests[i]);
      }
      // The die under the pointer rises to meet it.
      const want = hover === i && !rolling && !hop ? 1 : 0;
      const l = lift.current[i]!;
      const next = l + (want - l) * (1 - Math.exp(-delta * 16));
      lift.current[i] = Math.abs(want - next) < 0.002 ? want : next;
      if (lift.current[i] !== want) animating = true;
      const o = outer.current[i];
      const s = spin.current[i];
      if (!o || !s) continue;
      o.visible = pose.visible;
      o.position.set(pose.pos[0], pose.pos[1] + lift.current[i]! * LIFT, pose.pos[2]);
      o.scale.set(...pose.squash);
      s.quaternion.set(...pose.quat);
      const m = materials[i]!;
      const fading = pose.opacity < 0.999;
      if (m.transparent !== fading) {
        m.transparent = fading;
        m.needsUpdate = true;
      }
      m.opacity = pose.opacity;
      m.emissiveIntensity = rig.glow(i, lift.current[i]!, now, reduced);
      if (
        rig.frame(i, {
          now,
          delta,
          pos: o.position,
          quat: s.quaternion,
          camera,
          reduced,
          opacity: pose.opacity,
          yatzyAt: yatzyAt.current,
        })
      ) {
        animating = true;
      }
      const b = blobs.current[i];
      if (b) {
        const onShelf = held[i] && !(roll && rolling && roll.free.includes(i));
        const floor = onShelf ? SHELF_Y + 0.012 : 0.012;
        const height = Math.max(0, pose.pos[1] + lift.current[i]! * LIFT - floor - 0.5);
        b.visible = pose.visible && pose.squash[1] > 0.85;
        b.position.set(pose.pos[0], floor, pose.pos[2]);
        const k = 1 / (1 + height * 0.8);
        b.scale.setScalar(1.55 * k);
        (b.material as THREE.MeshBasicMaterial).opacity = 0.55 * pose.opacity * k;
      }
    }
    if (animating) invalidate();
  });

  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={`s${i}`}
          ref={(m) => void (blobs.current[i] = m)}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={1}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={blob} transparent depthWrite={false} />
        </mesh>
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <group key={i} ref={(g) => void (outer.current[i] = g)}>
          <group ref={(g) => void (spin.current[i] = g)}>
            <mesh geometry={body} material={materials[i]!} castShadow />
            {rig.eyes ? (
              <>
                <mesh geometry={rig.eyes.geometry.sclera} material={rig.eyes.sclera[i]!} />
                <mesh geometry={rig.eyes.geometry.pupil} material={rig.eyes.pupil[i]!} />
              </>
            ) : (
              <mesh geometry={pips} material={rig.pip[i]!} />
            )}
          </group>
        </group>
      ))}
      {rig.stars && <primitive object={rig.stars} />}
    </>
  );
}

/** Cast iron: black and dark grey, whoever's turn it is. */
const IRON = { body: '#2A2A2F', inside: '#101013', trim: '#45454C' };

/** The lip's radius: a little wider than CUP.radiusTop, with a thin rim, so spilling dice clear it. */
const LIP = CUP.radiusTop + 0.07;

function Cup({ roll }: Pick<SceneProps, 'roll'>) {
  const group = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  const shell = useMemo(() => {
    // A round-bellied cauldron: the belly bulges past the mouth, which stays
    // at CUP's radius and height so the recorded pour still lines up.
    const h = CUP.height / 2;
    const k = CUP.height / 1.8;
    const profile = new THREE.SplineCurve([
      new THREE.Vector2(0.001, -h),
      new THREE.Vector2(0.7, -h),
      new THREE.Vector2(1.05, -0.62 * k),
      new THREE.Vector2(1.3, -0.1 * k),
      new THREE.Vector2(1.31, 0.22 * k),
      new THREE.Vector2(1.25, 0.62 * k),
      new THREE.Vector2(LIP, h),
    ]).getPoints(28);
    return new THREE.LatheGeometry(profile, 56);
  }, []);
  const materials = useRef<THREE.Material[]>([]);
  useFrame(() => {
    const now = performance.now();
    const c = cupAt(roll, now);
    const g = group.current;
    if (!g) return;
    g.visible = c.visible;
    g.position.set(...c.pos);
    g.rotation.z = c.tip;
    g.scale.setScalar(c.scale);
    // Opaque unless fading, so it never hides the dice it is pouring.
    const fading = c.opacity < 0.999;
    for (const m of materials.current) {
      if (m.transparent !== fading) {
        m.transparent = fading;
        m.needsUpdate = true;
      }
      m.opacity = c.opacity;
    }
    if (c.visible) invalidate();
  });

  const keep = (m: THREE.Material | null) => {
    if (m && !materials.current.includes(m)) materials.current.push(m);
  };
  return (
    <group ref={group} visible={false}>
      <mesh geometry={shell} castShadow>
        <Gloss
          ref={keep}
          color={IRON.body}
          roughness={0.5}
          clearcoat={0.35}
          clearcoatRoughness={0.4}
          side={THREE.FrontSide}
        />
      </mesh>
      <mesh geometry={shell}>
        <meshStandardMaterial
          ref={keep}
          color={IRON.inside}
          roughness={0.7}
          side={THREE.BackSide}
        />
      </mesh>
      <mesh position={[0, CUP.height / 2, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[LIP, 0.06, 14, 56]} />
        <Gloss ref={keep} color={IRON.trim} roughness={0.45} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 1.38, 0.08, 0]} castShadow>
          <torusGeometry args={[0.2, 0.065, 10, 24]} />
          <Gloss ref={keep} color={IRON.trim} roughness={0.45} />
        </mesh>
      ))}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.62, -CUP.height / 2 - 0.02, Math.sin(a) * 0.62]}
            castShadow
          >
            <sphereGeometry args={[0.17, 14, 10]} />
            <Gloss ref={keep} color={IRON.trim} roughness={0.45} />
          </mesh>
        );
      })}
    </group>
  );
}

export default function DiceScene(props: SceneProps) {
  const { scene } = props;
  const rich = renderQuality() === 'high';
  return (
    <Canvas
      frameloop="demand"
      shadows={rich ? 'percentage' : false}
      dpr={rich ? [1, 2] : 1}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: FOV, near: 1, far: 80, manual: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 1;
      }}
      aria-hidden="true"
    >
      <Rig onSlots={props.onSlots} roll={props.roll} />
      {rich ? (
        <Studio intensity={scene.light} />
      ) : (
        <hemisphereLight args={['#FFFFFF', scene.felt, 0.9 * scene.light]} />
      )}
      <ambientLight intensity={0.12 * scene.light} />
      <directionalLight
        position={[-4.5, 11, 6.5]}
        intensity={2.7 * scene.light}
        castShadow={rich}
        shadow-mapSize={[2048, 2048]}
        shadow-radius={5}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-camera-near={1}
        shadow-camera-far={30}
      />
      <directionalLight position={[6, 5, 8]} intensity={0.35 * scene.light} />
      <Tray scene={scene} />
      <Dice
        values={props.values}
        held={props.held}
        roll={props.roll}
        hops={props.hops}
        colors={props.colors}
        hover={props.hover}
        rests={props.rests}
        look={props.look}
      />
      <Cup roll={props.roll} />
    </Canvas>
  );
}
