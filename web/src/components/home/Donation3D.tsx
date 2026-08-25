"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Icosahedron } from "@react-three/drei";
import * as THREE from "three";

function GeometricStructure() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!prefersReducedMotion) {
        groupRef.current.rotation.y += delta * 0.1;
        groupRef.current.rotation.z += delta * 0.05;
      }
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={1} rotationIntensity={0.1} floatIntensity={0.5}>
        <Icosahedron args={[3, 1]}>
          <meshBasicMaterial color="#e0be79" wireframe transparent opacity={0.15} />
        </Icosahedron>
        <Icosahedron args={[2, 0]}>
          <meshBasicMaterial color="#e0be79" wireframe transparent opacity={0.1} />
        </Icosahedron>
      </Float>
    </group>
  );
}

export default function Donation3D() {
  return (
    <div className="absolute left-0 top-0 h-full w-full lg:w-1/2 z-0 pointer-events-none mix-blend-screen opacity-60 overflow-hidden" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 1.5]}>
        <GeometricStructure />
      </Canvas>
    </div>
  );
}
