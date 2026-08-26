"use client";
import { useRef } from "react";
import { Clock, Moon, Sparkles, BookOpen, Heart, Zap } from "lucide-react";
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

  const items = [
    { icon: Clock, label: "Prayer Times", href: "/prayer-times" },
    { icon: Moon, label: "Jumu’ah", href: "/prayer-times#jumuah" },
    { icon: Sparkles, label: "Events", href: "/events" },
    { icon: BookOpen, label: "Quran", href: "/quran" },
    { icon: Heart, label: "Donate", href: "/donations" },
    { icon: Zap, label: "Contact", href: "#contact" },
  ];

  return (
    <section ref={containerRef} className="mx-auto max-w-7xl px-4 py-8 sm:py-12 lg:px-8 bg-[#FAF8F5]">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border border-[#e5e0d5] bg-[#F5F2EB] rounded-lg overflow-hidden shadow-sm divide-x divide-y sm:divide-y-0 divide-[#e5e0d5]">
        {items.map(({ icon: IconComponent, label, href }) => (
          <a
            href={href}
            key={label}
            className="quick-link group flex flex-col items-center justify-center p-4 sm:p-5 text-center transition-all duration-300 hover:bg-[#EFEADF] hover:shadow-inner"
          >
            <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-[#c79a45] transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5} />
            <span className="mt-2.5 sm:mt-3 block font-sans text-xs xs:text-sm font-semibold text-[#1e2e28] group-hover:text-[#0d4d3b] transition-colors">{label}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
