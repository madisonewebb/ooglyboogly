/**
 * One porcelain die turning slowly beside the wordmark. Loaded lazily; it also
 * warms up three.js before the game needs it. Holds still with reduced motion.
 *
 * Without a real GPU (a software renderer, as in Discord with hardware
 * acceleration off) it still turns: the cheap materials are already chosen by
 * `renderQuality()`, and the frames are capped so one small die stays light.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SCHEMES, type SchemeId, type ThemeName } from '../theme/palette';
import { dieGeometry, glazeMaterial, pipGeometry, porcelainMaterial } from './dieModel';
import { renderQuality } from './webgl';

/** Frames per second while turning without a GPU. */
const SOFTWARE_FPS = 20;

/** With `frameloop="demand"`, asks for a frame on a timer so the die turns at a capped rate. */
function FrameLimiter({ fps }: { fps: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const id = setInterval(invalidate, 1000 / fps);
    return () => clearInterval(id);
  }, [invalidate, fps]);
  return null;
}

function Die({ theme, scheme, still }: { theme: ThemeName; scheme: SchemeId; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const body = useMemo(dieGeometry, []);
  const pips = useMemo(pipGeometry, []);
  const mat = useMemo(
    () => porcelainMaterial(SCHEMES[scheme].themes[theme].die, renderQuality() === 'high'),
    [scheme, theme],
  );
  const pearl = useMemo(
    () => glazeMaterial(SCHEMES[scheme].themes[theme].pip, renderQuality() === 'high'),
    [scheme, theme],
  );

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.7;
    room.dispose();
    pmrem.dispose();
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [gl, scene]);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = still ? 0.6 : state.clock.elapsedTime;
    g.rotation.set(0.55 + Math.sin(t * 0.7) * 0.25, t * 0.6 + 0.6, 0.35 + Math.cos(t * 0.5) * 0.15);
    g.position.y = still ? 0 : Math.sin(t * 1.6) * 0.06;
  });

  return (
    <group ref={group}>
      <mesh geometry={body} material={mat} />
      <mesh geometry={pips} material={pearl} />
    </group>
  );
}

export default function LobbyDie(props: { theme: ThemeName; scheme: SchemeId; still: boolean }) {
  const { theme, scheme, still } = props;
  const software = renderQuality() === 'low';
  return (
    <Canvas
      className="lobby-die"
      frameloop={still || software ? 'demand' : 'always'}
      dpr={software ? 1 : [1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: 30, position: [0, 0, 3.3] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
      }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.2} />
      <directionalLight position={[-3, 4, 5]} intensity={2.2} />
      {software && !still && <FrameLimiter fps={SOFTWARE_FPS} />}
      <Die theme={theme} scheme={scheme} still={still} />
    </Canvas>
  );
}
