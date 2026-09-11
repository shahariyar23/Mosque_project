"use client";

import { useRef } from "react";
import { useLanguage } from "@/components/language-provider";
import { UserPlus, Building2, Compass, Bell } from "lucide-react";
import { gsap, useIsomorphicLayoutEffect } from "@/lib/gsap";

const steps = [
  {
    icon: UserPlus,
    titleEn: "Create Account",
    titleBn: "অ্যাকাউন্ট তৈরি করুন",
    descEn: "Sign up in seconds with your email",
    descBn: "আপনার ইমেইল দিয়ে সেকেন্ডের মধ্যে সাইন আপ করুন",
  },
  {
    icon: Building2,
    titleEn: "Choose Mosque",
    titleBn: "মসজিদ নির্বাচন করুন",
    descEn: "Find and connect with your mosque",
    descBn: "আপনার মসজিদ খুঁজুন এবং সংযুক্ত হন",
  },
  {
    icon: Compass,
    titleEn: "Explore Services",
    titleBn: "সেবা এক্সপ্লোর করুন",
    descEn: "Access prayer times, events, and more",
    descBn: "নামাজের সময়, অনুষ্ঠান এবং আরও অনেক কিছু",
  },
  {
    icon: Bell,
    titleEn: "Stay Connected",
    titleBn: "সংযুক্ত থাকুন",
    descEn: "Get updates and announcements",
    descBn: "আপডেট এবং ঘোষণা পান",
  },
];

export function HowNoorWorks() {
  const { language } = useLanguage();
  const bn = language === "bn";
  const sectionRef = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        ".how-noor-heading",
        { autoAlpha: 0, y: 18 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.55,
          ease: "power3.out",
          scrollTrigger: { trigger: section, start: "top 78%", once: true },
        },
      );
      gsap.fromTo(
        ".how-noor-step",
        { autoAlpha: 0, y: 24 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: { trigger: section, start: "top 72%", once: true },
        },
      );
    }, section);

    return () => context.revert();
  }, []);

  return (
    <section ref={sectionRef} className="bg-[#0d4d3b] px-4 py-12 sm:py-16 lg:px-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="how-noor-heading text-center mb-8 sm:mb-12">
          <span className="text-xs font-bold tracking-[0.2em] text-[#c79a45] uppercase">
            {bn ? "কিভাবে কাজ করে" : "HOW IT WORKS"}
          </span>
          <h2
            className="mt-2 text-2xl sm:text-3xl font-serif font-bold"
            style={{ fontFamily: "var(--font-heading-en), 'Playfair Display', serif" }}
          >
            {bn ? "নূর কিভাবে কাজ করে" : "How Noor Works"}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map(({ icon: Icon, titleEn, titleBn, descEn, descBn }, idx) => (
            <div
              key={titleEn}
              className="how-noor-step relative rounded-lg border border-white/10 bg-white/5 p-5 text-center transition-colors hover:bg-white/10"
            >
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-[#c79a45] text-xs font-bold text-[#0d4d3b]">
                {idx + 1}
              </span>
              <div className="mt-2 flex justify-center">
                <Icon className="w-8 h-8 text-[#c79a45]" strokeWidth={1.5} />
              </div>
              <h3 className="mt-3 text-base font-semibold">{bn ? titleBn : titleEn}</h3>
              <p className="mt-2 text-sm text-white/70">{bn ? descBn : descEn}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
