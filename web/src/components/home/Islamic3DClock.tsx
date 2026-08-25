"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Ring } from "@react-three/drei";
import * as THREE from "three";

/* ── Crescent Moon (Islamic symbol at 12 o'clock) ── */
function CrescentMoon({ position, scale = 0.14 }: { position: [number, number, number]; scale?: number }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      if (i === 0) s.moveTo(Math.cos(a), Math.sin(a));
      else s.lineTo(Math.cos(a), Math.sin(a));
    }
    const hole = new THREE.Path();
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      if (i === 0) hole.moveTo(Math.cos(a) * 0.8 + 0.35, Math.sin(a) * 0.8);
      else hole.lineTo(Math.cos(a) * 0.8 + 0.35, Math.sin(a) * 0.8);
    }
    s.holes.push(hole);
    return s;
  }, []);

  const geo = useMemo(() => new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false }), [shape]);

  return (
    <mesh geometry={geo} position={position} scale={scale} rotation={[0, 0, -0.3]}>
      <meshStandardMaterial color="#dca74e" metalness={1} roughness={0.15} />
    </mesh>
  );
}

/* ── 5-pointed Star ── */
function Star5({ position, scale = 0.07 }: { position: [number, number, number]; scale?: number }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 1 : 0.42;
      if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    s.closePath();
    return s;
  }, []);

  const geo = useMemo(() => new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false }), [shape]);

  return (
    <mesh geometry={geo} position={position} scale={scale}>
      <meshStandardMaterial color="#dca74e" metalness={1} roughness={0.15} />
    </mesh>
  );
}

/* ── Clock Hands ── */
function ClockHands() {
  const hourRef = useRef<THREE.Mesh>(null);
  const minRef = useRef<THREE.Mesh>(null);
  const secRef = useRef<THREE.Mesh>(null);

  const hourGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.04, 0); s.lineTo(-0.02, 0.7); s.lineTo(0, 0.82); s.lineTo(0.02, 0.7); s.lineTo(0.04, 0); s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false });
  }, []);

  const minGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.028, -0.05); s.lineTo(-0.014, 1.05); s.lineTo(0, 1.15); s.lineTo(0.014, 1.05); s.lineTo(0.028, -0.05); s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false });
  }, []);

  const secGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.008, -0.18); s.lineTo(-0.008, 1.2); s.lineTo(0.008, 1.2); s.lineTo(0.008, -0.18); s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 0.025, bevelEnabled: false });
  }, []);

  useFrame(() => {
    const now = new Date();
    const h = now.getHours() % 12, m = now.getMinutes(), s = now.getSeconds(), ms = now.getMilliseconds();
    if (hourRef.current) hourRef.current.rotation.z = -(((h + m / 60) / 12) * Math.PI * 2);
    if (minRef.current) minRef.current.rotation.z = -(((m + s / 60) / 60) * Math.PI * 2);
    if (secRef.current) secRef.current.rotation.z = -(((s + ms / 1000) / 60) * Math.PI * 2);
  });

  return (
    <group position={[0, 0, 0.15]}>
      <mesh ref={hourRef} geometry={hourGeo}>
        <meshStandardMaterial color="#dca74e" metalness={1} roughness={0.2} />
      </mesh>
      <mesh ref={minRef} geometry={minGeo} position={[0, 0, 0.05]}>
        <meshStandardMaterial color="#f0e6d0" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh ref={secRef} geometry={secGeo} position={[0, 0, 0.1]}>
        <meshStandardMaterial color="#c0392b" metalness={0.6} roughness={0.4} emissive="#c0392b" emissiveIntensity={0.3} />
      </mesh>
      {/* Center cap */}
      <mesh position={[0, 0, 0.14]}>
        <sphereGeometry args={[0.08, 32, 32]} />
        <meshStandardMaterial color="#dca74e" metalness={1} roughness={0.1} />
      </mesh>
    </group>
  );
}

/* ── Full Clock Face ── */
function ClockFace() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!rm) {
        groupRef.current.rotation.x = 0.12 + Math.sin(state.clock.elapsedTime * 0.35) * 0.025;
        groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.03;
      }
    }
  });

  const hourMarkers = useMemo(() => {
    const els: React.ReactNode[] = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = 1.4;
      const isMain = i % 3 === 0;

      if (i === 0) {
        // Crescent at 12
        els.push(<CrescentMoon key="crescent" position={[0, r + 0.05, 0.08]} scale={0.13} />);
        continue;
      }

      els.push(
        <mesh key={`h${i}`} position={[Math.sin(a) * r, Math.cos(a) * r, 0.08]} rotation={[0, 0, -a]}>
          <boxGeometry args={[isMain ? 0.08 : 0.04, isMain ? 0.26 : 0.13, 0.05]} />
          <meshStandardMaterial color={isMain ? "#dca74e" : "#b8a87a"} metalness={1} roughness={0.2} />
        </mesh>
      );
    }

    // Minute dots
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      const a = (i / 60) * Math.PI * 2;
      els.push(
        <mesh key={`m${i}`} position={[Math.sin(a) * 1.4, Math.cos(a) * 1.4, 0.06]}>
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshStandardMaterial color="#7a7058" metalness={0.8} roughness={0.4} />
        </mesh>
      );
    }
    return els;
  }, []);

  // Decorative stars around bezel
  const stars = useMemo(() => {
    const els: React.ReactNode[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = 1.78;
      els.push(<Star5 key={`s${i}`} position={[Math.sin(a) * r, Math.cos(a) * r, 0.1]} scale={0.065} />);
    }
    return els;
  }, []);

  return (
    <group ref={groupRef}>
      {/* Outer bezel – thick gold */}
      <Ring args={[1.58, 1.9, 64]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#b8892e" metalness={1} roughness={0.2} side={THREE.DoubleSide} />
      </Ring>

      {/* Outer thin gold edge */}
      <Ring args={[1.88, 1.94, 64]} position={[0, 0, 0.01]}>
        <meshStandardMaterial color="#dca74e" metalness={1} roughness={0.15} side={THREE.DoubleSide} />
      </Ring>

      {/* Clock face – deep Islamic green */}
      <mesh position={[0, 0, 0.02]}>
        <circleGeometry args={[1.58, 64]} />
        <meshStandardMaterial color="#0a3a2b" metalness={0.35} roughness={0.65} />
      </mesh>

      {/* Inner accent ring */}
      <Ring args={[1.22, 1.26, 64]} position={[0, 0, 0.05]}>
        <meshStandardMaterial color="#dca74e" metalness={1} roughness={0.25} side={THREE.DoubleSide} />
      </Ring>

      {/* Inner decorative ring */}
      <Ring args={[0.3, 0.34, 32]} position={[0, 0, 0.06]}>
        <meshStandardMaterial color="#dca74e" metalness={1} roughness={0.3} side={THREE.DoubleSide} />
      </Ring>

      {/* Stars around bezel */}
      {stars}

      {/* Hour markers */}
      {hourMarkers}

      {/* Hands */}
      <ClockHands />
    </group>
  );
}

/* ── Export ── */
export default function Islamic3DClock() {
  return (
    <div className="absolute inset-0 z-0" aria-hidden="true">
      <Canvas camera={{ position: [0, 0.2, 3.8], fov: 50 }} dpr={[1, 2]}>
        <ambientLight intensity={2.5} />
        <directionalLight position={[3, 5, 5]} intensity={3.5} color="#ffffff" />
        <directionalLight position={[-3, -2, 4]} intensity={1.8} color="#e0be79" />
        <pointLight position={[0, 0, 3]} intensity={1.5} color="#fff8e7" />
        <ClockFace />
      </Canvas>
    </div>
  );
}
