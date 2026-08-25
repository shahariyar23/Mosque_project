"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, Float } from "@react-three/drei";
import * as THREE from "three";

function CelestialBodies() {
  const groupRef = useRef<THREE.Group>(null);
  const sunRef = useRef<THREE.Mesh>(null);
  const moonRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      
      if (!prefersReducedMotion) {
        // Very slow continuous orbit
        groupRef.current.rotation.z -= delta * 0.08;
        
        // Small self rotations
        if (sunRef.current) sunRef.current.rotation.y += delta * 0.2;
        if (moonRef.current) moonRef.current.rotation.y += delta * 0.1;
      }
    }
  });

  return (
    <group ref={groupRef} rotation={[0.4, 0, 0]} scale={0.6} position={[0.4, 0, 0]}>
      {/* Central point */}
      <Sphere args={[0.08, 16, 16]}>
        <meshBasicMaterial color="#e0be79" transparent opacity={0.5} />
      </Sphere>
      
      {/* Orbital Path */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 1.815, 64]} />
        <meshBasicMaterial color="#e0be79" transparent opacity={0.35} />
      </mesh>

      {/* Sun */}
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
        <mesh ref={sunRef} position={[1.8, 0, 0]}>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshBasicMaterial color="#e0be79" />
          <pointLight color="#e0be79" intensity={1} distance={5} />
        </mesh>
      </Float>

      {/* Moon */}
      <Float speed={1} rotationIntensity={0.1} floatIntensity={0.2}>
        <mesh ref={moonRef} position={[-1.8, 0, 0]}>
          <sphereGeometry args={[0.22, 32, 32]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} metalness={0.2} />
          <pointLight color="#ffffff" intensity={0.5} distance={3} />
        </mesh>
      </Float>
    </group>
  );
}

export default function PrayerCelestialScene() {
  return (
    <div className="absolute inset-0 z-0 opacity-80" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 3.8], fov: 45 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <CelestialBodies />
      </Canvas>
    </div>
  );
}
