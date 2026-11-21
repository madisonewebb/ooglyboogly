/**
 * One porcelain die turning slowly beside the wordmark. Loaded lazily; it also
 * warms up three.js before the game needs it. Holds still with reduced motion.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { THEMES, type ThemeName } from '../theme/palette';
import { dieGeometry, glazeMaterial, pipGeometry, porcelainMaterial } from './dieModel';
import { renderQuality } from './webgl';

function Die({ theme, still }: { theme: ThemeName; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const body = useMemo(dieGeometry, []);
  const pips = useMemo(pipGeometry, []);
  const mat = useMemo(
    () => porcelainMaterial(THEMES[theme].die, renderQuality() === 'high'),
    [theme],
  );
  const pearl = useMemo(
    () => glazeMaterial(THEMES[theme].pip, renderQuality() === 'high'),
    [theme],
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

export default function LobbyDie(props: { theme: ThemeName; still: boolean }) {
  // Without a GPU, a die turning nonstop would hog the page; it holds still instead.
  const still = props.still || renderQuality() === 'low';
  const { theme } = props;
  return (
    <Canvas
      className="lobby-die"
      frameloop={still ? 'demand' : 'always'}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: 30, position: [0, 0, 4.2] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
      }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.2} />
      <directionalLight position={[-3, 4, 5]} intensity={2.2} />
      <Die theme={theme} still={still} />
    </Canvas>
  );
}
