"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

export function HeroAnimation({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (prefersReducedMotion || !containerRef.current) return;

      const tl = gsap.timeline({
        defaults: { ease: "power3.out" }
      });

      const eyebrow = containerRef.current.querySelector(".hero-eyebrow");
      const title = containerRef.current.querySelector(".hero-title");
      const text = containerRef.current.querySelector(".hero-text");
      const cta1 = containerRef.current.querySelector(".hero-cta-1");
      const cta2 = containerRef.current.querySelector(".hero-cta-2");

      if (eyebrow) {
        tl.fromTo(eyebrow, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8 }, "+=0.2");
      }
      
      const titleLines = gsap.utils.toArray(containerRef.current.querySelectorAll(".hero-title .overflow-hidden span"));
      if (titleLines.length) {
        tl.fromTo(titleLines as any, { yPercent: 100 }, { yPercent: 0, duration: 0.8, stagger: 0.1 }, "-=0.4");
      }
      
      if (text) {
        tl.fromTo(text, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8 }, "-=0.4");
      }
      if (cta1) {
        tl.fromTo(cta1, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.6 }, "-=0.4");
      }
      if (cta2) {
        tl.fromTo(cta2, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.6 }, "-=0.4");
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="relative z-10">
      {children}
    </div>
  );
}
