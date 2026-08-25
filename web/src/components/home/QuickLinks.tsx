"use client";
import { useRef } from "react";
import { gsap, ScrollTrigger, useIsomorphicLayoutEffect } from "@/lib/gsap";

export function QuickLinks() {
  const containerRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (prefersReducedMotion || !containerRef.current) return;

      const links = gsap.utils.toArray(containerRef.current.querySelectorAll(".quick-link"));
      
      if (links.length) {
        gsap.set(links as any, { opacity: 0, y: 30, rotationX: 10 });

        ScrollTrigger.create({
          trigger: containerRef.current,
          start: "top 85%",
          onEnter: () => {
            gsap.to(links as any, {
              opacity: 1,
              y: 0,
              rotationX: 0,
              duration: 0.6,
              stagger: 0.05,
              ease: "back.out(1.2)"
            });
          },
          once: true
        });
      }
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="mx-auto max-w-7xl px-5 py-20 lg:px-8" style={{ perspective: "1000px" }}>
      <div className="grid grid-cols-2 border border-[#dfdfd5] sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["◷", "Prayer Times", "/prayer-times"],
          ["☾", "Jumu’ah", "/prayer-times#jumuah"],
          ["✦", "Events", "/events"],
          ["◈", "Quran", "/quran"],
          ["♡", "Donate", "/donations"],
          ["⌁", "Contact", "#contact"],
        ].map(([i, t, href]) => (
          <a
            href={href}
            className="quick-link group border border-[#dfdfd5] p-5 text-center transition-all duration-300 hover:z-10 hover:-translate-y-1 hover:scale-105 hover:bg-[#0d4d3b] hover:text-white hover:shadow-xl"
            key={t}
          >
            <span className="block text-xl text-[#c79a45] transition-transform duration-300 group-hover:scale-125">{i}</span>
            <span className="mt-3 block text-sm font-semibold">{t}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
