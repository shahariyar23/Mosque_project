"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Octahedron, Icosahedron, Tetrahedron } from "@react-three/drei";
import * as THREE from "three";
import { gsap } from "@/lib/gsap";

function GeometricStar() {
  const groupRef = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    if (groupRef.current) {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (!prefersReducedMotion) {
        // Slow majestic rotation
        groupRef.current.rotation.y += delta * 0.1;
        groupRef.current.rotation.z += delta * 0.05;
        groupRef.current.rotation.x += delta * 0.08;

        // Subtle parallax
        pointer.current.x = THREE.MathUtils.lerp(pointer.current.x, state.pointer.x * 0.3, 0.05);
        pointer.current.y = THREE.MathUtils.lerp(pointer.current.y, state.pointer.y * 0.3, 0.05);

        groupRef.current.rotation.x -= pointer.current.y * 0.1;
        groupRef.current.rotation.y += pointer.current.x * 0.1;
      }
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={1.5}>
        {/* Core solid dark green/gold shape */}
        <Octahedron args={[1.5, 0]}>
          <meshStandardMaterial color="#073a2d" metalness={0.8} roughness={0.2} />
        </Octahedron>

        {/* Outer intersecting golden frame */}
        <Icosahedron args={[2, 0]}>
          <meshStandardMaterial color="#dca74e" metalness={1} roughness={0.1} wireframe wireframeLinewidth={3} />
        </Icosahedron>

        {/* Inner solid gold core */}
        <Tetrahedron args={[1.8, 0]}>
          <meshStandardMaterial color="#c18931" metalness={0.9} roughness={0.2} transparent opacity={0.8} />
        </Tetrahedron>
        
        {/* Counter-rotating inner frame */}
        <Octahedron args={[2.2, 0]} rotation={[Math.PI/4, Math.PI/4, 0]}>
          <meshStandardMaterial color="#e7b864" metalness={0.8} roughness={0.2} wireframe wireframeLinewidth={1} opacity={0.5} transparent />
        </Octahedron>
      </Float>
    </group>
  );
}

export default function Hero3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      gsap.fromTo(
        containerRef.current,
        { opacity: 0, scale: 0.8, y: 30 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 2,
          ease: "power3.out",
          delay: 0.5,
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute z-10 pointer-events-none w-full h-[400px] top-[400px] md:top-[420px] lg:h-[650px] lg:top-1/2 lg:left-1/2 lg:-translate-y-1/2 lg:-translate-x-1/4"
      style={{ opacity: 0 }}
    >
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[5, 10, 5]} intensity={3} color="#ffffff" />
        <directionalLight position={[-5, -10, -5]} intensity={1.5} color="#dca74e" />
        <pointLight position={[0, 0, 5]} intensity={2} color="#e7b864" distance={10} />
        <GeometricStar />
      </Canvas>
    </div>
  );
}
