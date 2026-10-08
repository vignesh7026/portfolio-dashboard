'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface Scene3DProps {
  paused: boolean;
}

const SHARD_COUNT = 22;
const GEOMETRIES = [
  () => new THREE.IcosahedronGeometry(1, 0),
  () => new THREE.OctahedronGeometry(1, 0),
  () => new THREE.TetrahedronGeometry(1, 0),
];

interface ShardDatum {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  spin: [number, number, number];
  geometryIndex: number;
  colorMix: number;
}

function makeShards(): ShardDatum[] {
  const shards: ShardDatum[] = [];
  for (let i = 0; i < SHARD_COUNT; i++) {
    shards.push({
      position: [
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 11,
        (Math.random() - 0.5) * 10 - 4,
      ],
      rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
      scale: 0.35 + Math.random() * 0.95,
      spin: [
        (Math.random() - 0.5) * 0.06,
        (Math.random() - 0.5) * 0.06,
        (Math.random() - 0.5) * 0.04,
      ],
      geometryIndex: i % GEOMETRIES.length,
      colorMix: Math.random(),
    });
  }
  return shards;
}

function Shard({ datum }: { datum: ShardDatum }) {
  const ref = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => GEOMETRIES[datum.geometryIndex](), [datum.geometryIndex]);

  // Gold <-> steel-blue <-> emerald drift, matching the dashboard's accent/gain tokens.
  const color = useMemo(() => {
    const gold = new THREE.Color('#c9a876');
    const steel = new THREE.Color('#4a5468');
    const emerald = new THREE.Color('#3f6f5b');
    const base = datum.colorMix < 0.5 ? gold.clone().lerp(steel, datum.colorMix * 2) : steel.clone().lerp(emerald, (datum.colorMix - 0.5) * 2);
    return base;
  }, [datum.colorMix]);

  useFrame(() => {
    if (!ref.current) return;
    ref.current.rotation.x += datum.spin[0];
    ref.current.rotation.y += datum.spin[1];
    ref.current.rotation.z += datum.spin[2];
  });

  return (
    <mesh
      ref={ref}
      position={datum.position}
      rotation={datum.rotation}
      scale={datum.scale}
      geometry={geometry}
    >
      <meshStandardMaterial
        color={color}
        metalness={0.82}
        roughness={0.28}
        transparent
        opacity={0.5}
        flatShading
      />
    </mesh>
  );
}

function ParallaxRig({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const target = useRef({ x: 0, y: 0 });
  const { size } = useThree();

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current.x = (e.clientX / size.width - 0.5) * 2;
      target.current.y = (e.clientY / size.height - 0.5) * 2;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [size.width, size.height]);

  useFrame(() => {
    if (!group.current) return;
    // Gentle lerp toward the cursor — never a snap.
    group.current.rotation.y += (target.current.x * 0.25 - group.current.rotation.y) * 0.015;
    group.current.rotation.x += (-target.current.y * 0.15 - group.current.rotation.x) * 0.015;
    group.current.rotation.z += 0.00025; // constant slow ambient drift, independent of the cursor
  });

  return <group ref={group}>{children}</group>;
}

export function Scene3D({ paused }: Scene3DProps) {
  const shards = useMemo(() => makeShards(), []);

  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      camera={{ position: [0, 0, 9], fov: 42 }}
      frameloop={paused ? 'never' : 'always'}
      style={{ width: '100%', height: '100%' }}
    >
      <fog attach="fog" args={['#0a0a0c', 8, 22]} />
      <ambientLight intensity={0.55} />
      <pointLight position={[8, 6, 10]} intensity={60} color="#c9a876" />
      <pointLight position={[-9, -4, 4]} intensity={40} color="#4fae84" />
      <ParallaxRig>
        {shards.map((datum, i) => (
          <Shard key={i} datum={datum} />
        ))}
      </ParallaxRig>
    </Canvas>
  );
}
