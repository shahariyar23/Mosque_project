"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useIsomorphicLayoutEffect } from "@/lib/gsap";

export function PrayerReveal({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (prefersReducedMotion || !containerRef.current) return;

      const leftPanel = containerRef.current.querySelector(".prayer-left-panel");
      const rightPanel = containerRef.current.querySelector(".prayer-right-panel");
      const cards = gsap.utils.toArray(containerRef.current.querySelectorAll(".prayer-card"));

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 75%",
          once: true,
        },
      });

      if (leftPanel) {
        tl.fromTo(
          leftPanel,
          { opacity: 0, x: -30 },
          { opacity: 1, x: 0, duration: 0.8, ease: "power3.out" }
        );
      }
      
      if (rightPanel) {
        tl.fromTo(
          rightPanel,
          { opacity: 0, x: 30 },
          { opacity: 1, x: 0, duration: 0.8, ease: "power3.out" },
          "-=0.6"
        );
      }
      
      if (cards.length) {
        tl.fromTo(
          cards as any,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" },
          "-=0.4"
        );
      }
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return <div ref={containerRef}>{children}</div>;
}
