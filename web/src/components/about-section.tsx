"use client";
import { useRef } from "react";
import { useLanguage } from "@/components/language-provider";
import { gsap, ScrollTrigger, useIsomorphicLayoutEffect } from "@/lib/gsap";
import dynamic from "next/dynamic";

const About3D = dynamic(() => import("@/components/home/About3D"), { ssr: false });

export function AboutSection() {
  const { language } = useLanguage();
  const bn = language === "bn";
  const containerRef = useRef<HTMLElement | null>(null);
  const imageRef = useRef<HTMLDivElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (!containerRef.current || !imageRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".about-text", {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
        y: 40,
        opacity: 0,
        stagger: 0.15,
        duration: 0.8,
        ease: "power3.out",
      });

      gsap.from(imageRef.current, {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
        scale: 0.9,
        opacity: 0,
        duration: 1,
        ease: "power2.out",
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const copy = bn
    ? {
        eyebrow: "আমাদের মসজিদ সম্পর্কে",
        title: "ইবাদত, শিক্ষা ও সম্প্রদায়ের একটি স্থান।",
        text: "দুই দশকেরও বেশি সময় ধরে নূর কমিউনিটি মসজিদ সব শ্রেণির মানুষের আধ্যাত্মিক ঠিকানা—সেবা, সহমর্মিতা ও যৌথ শিক্ষায় প্রতিষ্ঠিত।",
        stats: [
          ["২০+", "বছরের সেবা"],
          ["৫০০০+", "সদস্য"],
          ["২৫+", "কার্যক্রম"],
          ["৫০+", "স্বেচ্ছাসেবক"],
        ],
        action: "আমাদের সম্পর্কে আরও জানুন",
      }
    : {
        eyebrow: "ABOUT OUR MOSQUE",
        title: "A place of worship, learning and community.",
        text: "For over two decades, Noor Community Mosque has been a spiritual home for people from every walk of life—rooted in service, compassion and shared learning.",
        stats: [
          ["20+", "Years Serving"],
          ["5000+", "Members"],
          ["25+", "Programs"],
          ["50+", "Volunteers"],
        ],
        action: "Learn More About Us",
      };
      
  return (
    <section
      id="about"
      ref={containerRef}
      className="mx-auto grid max-w-7xl gap-10 px-5 py-12 lg:grid-cols-2 lg:px-8"
    >
      <div 
        ref={imageRef}
        className="relative min-h-[360px] bg-[linear-gradient(#0b423155,#0b423155),url('https://images.unsplash.com/photo-1564121211835-e88c852648ab?auto=format&fit=crop&w=1000&q=80')] bg-cover bg-center overflow-hidden"
      >
        <About3D />
      </div>
      <div className="self-center">
        <p className="about-text text-xs font-bold tracking-[.2em] text-[#c79a45]">
          {copy.eyebrow}
        </p>
        <h2 className="about-text mt-4 text-4xl font-semibold leading-tight">
          {copy.title}
        </h2>
        <p className="about-text mt-5 max-w-xl leading-7 text-[#69726d]">{copy.text}</p>
        <div className="about-text mt-8 grid grid-cols-2 gap-6 border-t border-[#dcdcd2] pt-6 sm:grid-cols-4">
          {copy.stats.map(([number, label]) => (
            <div key={label}>
              <b className="text-2xl text-[#0d4d3b]">{number}</b>
              <span className="mt-1 block text-xs text-[#69726d]">{label}</span>
            </div>
          ))}
        </div>
        <a
          className="about-text mt-8 inline-block border-b-2 border-[#c79a45] pb-1 font-semibold transition hover:text-[#c79a45]"
          href="/about"
        >
          {copy.action}
        </a>
      </div>
    </section>
  );
}
