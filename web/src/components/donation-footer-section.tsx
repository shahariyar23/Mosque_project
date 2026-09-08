"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import { useLanguage } from "@/components/language-provider";
import { gsap, ScrollTrigger, useIsomorphicLayoutEffect } from "@/lib/gsap";
import { fetchPublicFunds, DEFAULT_PUBLIC_MOSQUE_SLUG } from "@/services/publicTransparencyService";
import { useEffect, useState } from "react";

const Donation3D = dynamic(() => import("@/components/home/Donation3D"), { ssr: false });

type FundProgress = {
  name: string;
  collectedAmount: string;
  targetAmount: string | null;
  progressPercentage: number | null;
};

export function DonationFooterSection() {
  const { language } = useLanguage();
  const bn = language === "bn";
  const containerRef = useRef<HTMLElement>(null);
  const [funds, setFunds] = useState<FundProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchPublicFunds(DEFAULT_PUBLIC_MOSQUE_SLUG)
      .then((result) => {
        if (!mounted) return;
        const activeFunds = result
          .filter((f) => f.status?.toLowerCase() === "active")
          .slice(0, 3)
          .map((f) => ({
            name: f.name,
            collectedAmount: f.collectedAmount,
            targetAmount: f.targetAmount,
            progressPercentage: f.progressPercentage,
          }));
        setFunds(activeFunds);
      })
      .catch(() => {
        if (mounted) setFunds([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

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
    <section ref={containerRef} id="donations" className="relative overflow-hidden bg-[#073a2d] py-12 sm:py-16 lg:py-20 text-white">
      <Donation3D />
      <div className="relative z-10 mx-auto grid max-w-7xl gap-8 px-4 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="donation-text text-[10px] xs:text-xs font-bold tracking-[.2em] text-[#e0be79] uppercase">
            {bn ? "উদ্দেশ্যপূর্ণ দান" : "GIVE WITH PURPOSE"}
          </p>
          <h2 className="donation-text mt-3 sm:mt-4 text-2xl xs:text-3xl sm:text-4xl lg:text-4xl font-serif font-semibold">
            {bn ? "আপনার মসজিদকে সহায়তা করুন।" : "Support your mosque."}
          </h2>
          <p className="donation-text mt-3 sm:mt-5 max-w-lg text-xs xs:text-sm sm:text-base leading-relaxed text-white/80">
            {bn
              ? "আপনার দান ইবাদত, ইসলামী শিক্ষা, কমিউনিটি কার্যক্রম এবং প্রয়োজনীয় পরিবারগুলোর সহায়তা বজায় রাখে।"
              : "Your generosity sustains worship, Islamic education, community programmes and care for families in need."}
          </p>

          {!loading && funds.length > 0 && (
            <div className="mt-6 space-y-4">
              {funds.map((fund) => (
                <div key={fund.name} className="border-t border-white/10 pt-4 first:border-t-0 first:pt-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{fund.name}</span>
                    <span className="text-xs text-[#e0be79]">
                      ৳{fund.collectedAmount}
                      {fund.targetAmount && <span className="text-white/60"> / ৳{fund.targetAmount}</span>}
                    </span>
                  </div>
                  {fund.progressPercentage !== null && fund.progressPercentage !== undefined && (
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#e0be79] rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, fund.progressPercentage)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="donation-form bg-white p-5 xs:p-6 sm:p-7 text-[#17211d] shadow-2xl rounded-xl border border-white/20">
          <p className="font-semibold text-sm xs:text-base">
            {bn ? "দানের পরিমাণ বেছে নিন" : "Choose a donation amount"}
          </p>
          <div className="mt-4 sm:mt-5 grid grid-cols-3 gap-2 sm:gap-2.5">
            {amounts.map((amount) => (
              <button
                className="border border-[#d8d8ce] p-2.5 xs:p-3 text-xs xs:text-sm font-semibold rounded-lg transition hover:border-[#0d4d3b] hover:bg-[#f8f6ef] hover:text-[#0d4d3b]"
                key={amount}
                type="button"
              >
                {amount}
              </button>
            ))}
          </div>
          <button className="mt-4 sm:mt-5 w-full bg-[#c79a45] p-3 sm:py-3.5 font-semibold text-xs xs:text-sm sm:text-base text-[#13231c] rounded-lg transition hover:bg-[#e0be79] hover:-translate-y-0.5 shadow-md" type="button">
            {bn ? "এখনই দান করুন" : "Donate Now"}
          </button>
        </div>
      </div>
    </section>
  );
}
