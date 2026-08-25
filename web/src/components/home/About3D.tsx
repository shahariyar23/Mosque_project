"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

function ArchitecturalArch() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!prefersReducedMotion) {
        groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, -1, 0]}>
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
        <mesh position={[0, 1.5, 0]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[2, 2, 4, 32, 1, true, 0, Math.PI]} />
          <meshBasicMaterial color="#c79a45" transparent opacity={0.15} side={THREE.DoubleSide} wireframe wireframeLinewidth={1.5} />
        </mesh>
        
        <mesh position={[-2, -0.5, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 4]} />
          <meshBasicMaterial color="#e0be79" transparent opacity={0.3} />
        </mesh>
        <mesh position={[2, -0.5, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 4]} />
          <meshBasicMaterial color="#e0be79" transparent opacity={0.3} />
        </mesh>
        
        {/* Inner Arch */}
        <mesh position={[0, 1.3, 0]}>
          <cylinderGeometry args={[1.7, 1.7, 4, 32, 1, true, 0, Math.PI]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.05} side={THREE.DoubleSide} wireframe />
        </mesh>
      </Float>
    </group>
  );
}

export default function About3D() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none opacity-80 mix-blend-screen" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 1.5]}>
        <ArchitecturalArch />
      </Canvas>
    </div>
  );
}
