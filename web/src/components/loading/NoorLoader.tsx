"use client";

import { useEffect, useState, useRef } from "react";
import gsap from "gsap";
import { NoorLoaderScene } from "./NoorLoaderScene";
import { siteConfig } from "@/config/site";
import "./NoorLoader.css";

export function NoorLoader() {
  const [isLoading, setIsLoading] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [progress, setProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleMotionChange);

    return () => mediaQuery.removeEventListener("change", handleMotionChange);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Minimum display time for the loader to ensure a premium entrance experience
    const MIN_LOAD_TIME = 1500;
    const startTime = Date.now();

    // Context for cleanup
    const ctx = gsap.context(() => {
      // 1. Entrance Sequence
      tlRef.current = gsap.timeline({
        onComplete: () => {
          // Check if document is ready after animation
          checkReadyStatus();
        },
      });

      // Simple fade if reduced motion
      if (reducedMotion) {
        tlRef.current
          .to(".noor-loader-pattern", { opacity: 1, duration: 0.5 })
          .to(".noor-loader-brand, .noor-loader-arch, .noor-loader-progress-container, .noor-loader-lantern, .noor-loader-3d-wrapper", {
            opacity: 1,
            duration: 0.5,
            stagger: 0.1,
          });
      } else {
        tlRef.current
          // Background pattern softly appears
          .to(".noor-loader-pattern", { opacity: 1, duration: 0.8, ease: "power2.inOut" })
          // Mosque arch fades upward
          .fromTo(".noor-loader-arch", 
            { opacity: 0, y: 30 }, 
            { opacity: 0.15, y: 0, duration: 1, ease: "power3.out" }, 
            "-=0.4"
          )
          // 3D wrapper appears
          .fromTo(".noor-loader-3d-wrapper",
            { opacity: 0, scale: 0.8 },
            { opacity: 1, scale: 1, duration: 1.2, ease: "power2.out" },
            "-=0.8"
          )
          // NOOR branding fades in with slight scale
          .fromTo(".noor-loader-brand",
            { opacity: 0, scale: 0.95, y: 10 },
            { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: "power3.out" },
            "-=0.6"
          )
          // Loading indicator appears
          .fromTo(".noor-loader-progress-container",
            { opacity: 0 },
            { opacity: 1, duration: 0.5 },
            "-=0.4"
          )
          // Lantern glow begins
          .fromTo(".noor-loader-lantern",
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
            "-=0.4"
          );
      }
    }, containerRef);

    // Simulate progress while waiting for document ready
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        // Asymptotically approach 95% while waiting
        if (prev >= 95) return prev;
        const remaining = 95 - prev;
        return prev + remaining * 0.1;
      });
    }, 100);

    const exitLoader = () => {
      clearInterval(progressInterval);
      setProgress(100);

      // 2. Exit Sequence
      if (tlRef.current) {
        // Pause any ongoing entrance and kill it
        tlRef.current.kill();
      }

      gsap.to(containerRef.current, {
        opacity: 0,
        scale: reducedMotion ? 1 : 1.05,
        duration: 0.6,
        ease: "power2.inOut",
        onComplete: () => {
          setIsLoading(false);
        },
      });
    };

    const checkReadyStatus = () => {
      const timeElapsed = Date.now() - startTime;
      const isReady = document.readyState === "complete";
      
      if (isReady && timeElapsed >= MIN_LOAD_TIME) {
        exitLoader();
      } else {
        // Keep checking every 100ms until both conditions are met
        setTimeout(checkReadyStatus, 100);
      }
    };

    // Failsafe: if something goes wrong, force exit after 5 seconds
    const failsafe = setTimeout(() => {
      exitLoader();
    }, 5000);

    return () => {
      ctx.revert();
      clearInterval(progressInterval);
      clearTimeout(failsafe);
    };
  }, [reducedMotion]);

  if (!isLoading) return null;

  return (
    <div ref={containerRef} className="noor-loader-container" aria-live="polite" aria-busy="true">
      <div className="noor-loader-pattern" />
      
      <div className="noor-loader-content">
        {/* Subtle background arch silhouette */}
        <div className="noor-loader-arch">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 0 C70 30, 90 40, 90 100 L10 100 C10 40, 30 30, 50 0 Z" fill="url(#archGlow)" />
            <defs>
              <linearGradient id="archGlow" x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse">
                <stop stopColor="#c79a45" stopOpacity="0.8" />
                <stop offset="1" stopColor="#c79a45" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* 3D Scene Layer */}
        <div className="noor-loader-3d-wrapper">
          <NoorLoaderScene reducedMotion={reducedMotion} />
        </div>

        {/* Branding Layer */}
        <div className="noor-loader-brand">
          <h1 className="noor-loader-title">{siteConfig.name.toUpperCase()}</h1>
          <p className="noor-loader-subtitle">A Place of Worship, Learning & Community</p>
        </div>

        {/* Progress Layer */}
        <div className="noor-loader-progress-container">
          <span className="noor-loader-progress-text">LOADING... {Math.round(progress)}%</span>
          <div className="noor-loader-progress-track">
            <div 
              className="noor-loader-progress-bar" 
              style={{ width: `${progress}%`, transition: "width 0.2s ease-out" }}
            >
              <div className="noor-loader-progress-head" />
            </div>
          </div>
        </div>

        {/* Lantern Layer */}
        <div className="noor-loader-lantern">
          <svg viewBox="0 0 32 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Simple elegant lantern shape */}
            <path d="M16 0 L20 6 L18 10 L24 24 L20 48 L22 52 L16 64 L10 52 L12 48 L8 24 L14 10 L12 6 Z" stroke="#c79a45" strokeWidth="1" fill="rgba(199, 154, 69, 0.1)" />
            <circle cx="16" cy="32" r="4" fill="#c79a45" opacity="0.6" />
          </svg>
        </div>
      </div>
    </div>
  );
}
