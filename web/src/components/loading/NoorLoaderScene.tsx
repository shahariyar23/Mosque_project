"use client";

import { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";

interface NoorLoaderSceneProps {
  reducedMotion: boolean;
}

export function NoorLoaderScene({ reducedMotion }: NoorLoaderSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45 }}
      dpr={[1, 2]} // Support retina screens but cap at 2x for performance
      gl={{ alpha: true, antialias: true }}
    >
      <Suspense fallback={null}>
        {/* Soft atmospheric lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} color="#c79a45" />
        <pointLight position={[-5, -5, -5]} intensity={0.5} color="#0d4d3b" />
        
        {/* Adds realistic reflections (kept for any future 3D additions) */}
        <Environment preset="city" />

        {/* Sparse, glowing gold dust particles */}
        {!reducedMotion && (
          <Sparkles
            count={40}
            scale={12}
            size={2}
            speed={0.2}
            opacity={0.3}
            color="#c79a45" // Gold
            noise={0.1}
          />
        )}
      </Suspense>
    </Canvas>
  );
}
