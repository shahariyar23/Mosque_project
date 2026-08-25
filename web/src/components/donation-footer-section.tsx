"use client";
import { useRef } from "react";
import dynamic from "next/dynamic";
import { useLanguage } from "@/components/language-provider";
import { gsap, ScrollTrigger, useIsomorphicLayoutEffect } from "@/lib/gsap";

const Donation3D = dynamic(() => import("@/components/home/Donation3D"), { ssr: false });

export function DonationFooterSection() {
  const { language } = useLanguage();
  const bn = language === "bn";
  const containerRef = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (prefersReducedMotion || !containerRef.current) return;

      const textElements = gsap.utils.toArray(containerRef.current.querySelectorAll(".donation-text"));
      const formPanel = containerRef.current.querySelector(".donation-form");

      if (textElements.length) {
        gsap.fromTo(
          textElements as any,
          { opacity: 0, x: -30 },
          {
            opacity: 1,
            x: 0,
            duration: 0.8,
            stagger: 0.1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 75%",
              once: true,
            },
          }
        );
      }

      if (formPanel) {
        gsap.fromTo(
          formPanel,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 75%",
              once: true,
            },
          }
        );
      }
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const amounts = bn
    ? ["৳৫০০", "৳১,০০০", "৳২,৫০০", "৳৫,০০০", "ইচ্ছামতো"]
    : ["৳500", "৳1,000", "৳2,500", "৳5,000", "Custom"];
    
  return (
    <section ref={containerRef} id="donations" className="relative overflow-hidden bg-[#073a2d] py-20 text-white">
      <Donation3D />
      <div className="relative z-10 mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="donation-text text-xs font-bold tracking-[.2em] text-[#e0be79]">
            {bn ? "উদ্দেশ্যপূর্ণ দান" : "GIVE WITH PURPOSE"}
          </p>
          <h2 className="donation-text mt-4 text-4xl font-semibold">
            {bn ? "আপনার মসজিদকে সহায়তা করুন।" : "Support your mosque."}
          </h2>
          <p className="donation-text mt-5 max-w-lg leading-7 text-white/70">
            {bn
              ? "আপনার দান ইবাদত, ইসলামী শিক্ষা, কমিউনিটি কার্যক্রম এবং প্রয়োজনীয় পরিবারগুলোর সহায়তা বজায় রাখে।"
              : "Your generosity sustains worship, Islamic education, community programmes and care for families in need."}
          </p>
        </div>
        <div className="donation-form bg-white p-6 text-[#17211d] shadow-2xl">
          <p className="font-semibold">
            {bn ? "দানের পরিমাণ বেছে নিন" : "Choose a donation amount"}
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {amounts.map((amount) => (
              <button
                className="border border-[#d8d8ce] p-3 text-sm font-semibold transition hover:border-[#0d4d3b] hover:bg-[#f8f6ef] hover:text-[#0d4d3b]"
                key={amount}
              >
                {amount}
              </button>
            ))}
          </div>
          <button className="mt-5 w-full bg-[#c79a45] p-3 font-semibold transition hover:bg-[#e0be79] hover:-translate-y-0.5">
            {bn ? "এখনই দান করুন" : "Donate Now"}
          </button>
        </div>
      </div>
    </section>
  );
}
