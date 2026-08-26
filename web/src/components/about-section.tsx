"use client";
import { useRef } from "react";
import dynamic from "next/dynamic";
import { useLanguage } from "@/components/language-provider";
import { gsap, ScrollTrigger, useIsomorphicLayoutEffect } from "@/lib/gsap";
import { Sparkles, Users, BookOpen, HeartHandshake, ArrowRight } from "lucide-react";

const About3D = dynamic(() => import("@/components/home/About3D"), { ssr: false });

export function AboutSection() {
  const { language } = useLanguage();
  const bn = language === "bn";
  const containerRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (prefersReducedMotion || !containerRef.current) return;

      // Image clip-path reveal
      if (imageRef.current) {
        gsap.fromTo(
          imageRef.current,
          { clipPath: "polygon(0 100%, 100% 100%, 100% 100%, 0% 100%)", opacity: 0 },
          {
            clipPath: "polygon(0 0%, 100% 0%, 100% 100%, 0% 100%)",
            opacity: 1,
            duration: 1.2,
            ease: "power3.inOut",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 75%",
              once: true,
            },
          }
        );
      }

      // Text stagger reveal
      const textElements = gsap.utils.toArray(containerRef.current.querySelectorAll(".about-text"));
      if (textElements.length) {
        gsap.fromTo(
          textElements as any,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 70%",
              once: true,
            },
          }
        );
      }
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const copy = bn
    ? {
      eyebrow: "আমাদের মসজিদ সম্পর্কে",
      title: "ইবাদত, শিক্ষা ও সম্প্রদায়ের একটি স্থান",
      text: "দুই দশকেরও বেশি সময় ধরে নূর কমিউনিটি মসজিদ সব শ্রেণির মানুষের আধ্যাত্মিক ঠিকানা—সেবা, সহমর্মিতা ও যৌথ শিক্ষায় প্রতিষ্ঠিত।",
      stats: [
        { number: "২০+", label: "বছরের সেবা", Icon: Sparkles },
        { number: "৫০০০+", label: "সদস্য", Icon: Users },
        { number: "২৫+", label: "কার্যক্রম", Icon: BookOpen },
        { number: "৫০+", label: "স্বেচ্ছাসেবক", Icon: HeartHandshake },
      ],
      action: "আমাদের সম্পর্কে আরও জানুন",
    }
    : {
      eyebrow: "ABOUT OUR MOSQUE",
      title: "A place of worship, learning and community",
      text: "For over two decades, Noor Community Mosque has been a spiritual home for people from every walk of life—rooted in service, compassion and shared learning.",
      stats: [
        { number: "20+", label: "Years Serving", Icon: Sparkles },
        { number: "5000+", label: "Members", Icon: Users },
        { number: "25+", label: "Programs", Icon: BookOpen },
        { number: "50+", label: "Volunteers", Icon: HeartHandshake },
      ],
      action: "Learn More About Us",
    };

  return (
    <section
      id="about"
      ref={containerRef}
      className="bg-[#FAF8F5] py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid gap-10 lg:grid-cols-12 items-center">

        {/* Left Column: Mosque Image */}
        <div className="lg:col-span-6 relative">
          <div
            ref={imageRef}
            className="relative min-h-[340px] xs:min-h-[400px] sm:min-h-[480px] lg:min-h-[520px] bg-[linear-gradient(rgba(7,58,45,0.15),rgba(7,58,45,0.15)),url('https://images.unsplash.com/photo-1564121211835-e88c852648ab?auto=format&fit=crop&w=1200&q=85')] bg-cover bg-center overflow-hidden shadow-2xl border border-[#e5e0d5]"
          >
            <About3D />
          </div>
        </div>

        {/* Right Column: About Text & Stats */}
        <div className="lg:col-span-6 self-center pl-0 lg:pl-4">
          <p
            className="about-text font-montserrat text-xs font-semibold tracking-[0.2em] text-[#D4AF37] uppercase"
            style={{ fontFamily: "var(--font-montserrat), 'Montserrat', sans-serif" }}
          >
            {copy.eyebrow}
          </p>

          <h2
            className="about-text mt-3 sm:mt-4 text-3xl xs:text-4xl sm:text-5xl lg:text-[46px] font-serif font-bold text-[#0F2E26] leading-[1.18] tracking-tight"
            style={{ fontFamily: "var(--font-heading-en), 'Playfair Display', serif" }}
          >
            {copy.title}<span className="text-[#D4AF37]">.</span>
          </h2>

          <p
            className="about-text mt-4 sm:mt-6 text-sm sm:text-base lg:text-lg leading-relaxed text-[#6B7280] font-sans font-normal max-w-xl"
            style={{ fontFamily: "var(--font-body-en), 'Inter', sans-serif" }}
          >
            {copy.text}
          </p>

          {/* Thin Horizontal Divider with Centered Diamond */}
          <div className="about-text relative my-6 sm:my-8 border-t border-[#e2ddd3] flex items-center justify-center">
            <span className="absolute bg-[#FAF8F5] px-3 text-[#D4AF37] text-xs font-serif" style={{ fontFamily: "var(--font-heading-en), 'Playfair Display', serif" }}>◇</span>
          </div>

          {/* 4 Stats Cards ALL IN ONE LINE (grid-cols-4) - Centered icons enlarged, numbers fixed size */}
          <div className="about-text grid grid-cols-4 gap-2 xs:gap-3 sm:gap-5 lg:gap-6 items-start">
            {copy.stats.map(({ number, label, Icon }) => (
              <div key={label} className="flex flex-col items-center justify-center text-center space-y-1.5">
                <div className="text-[#D4AF37] mb-1 flex items-center justify-center w-full">
                  <Icon className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 text-[#D4AF37] transition-transform duration-300 hover:scale-110" strokeWidth={1.5} />
                </div>
                <b
                  className="font-montserrat text-lg sm:text-xl font-bold text-[#0F2E26] block"
                  style={{ fontFamily: "var(--font-montserrat), 'Montserrat', sans-serif" }}
                >
                  {number}
                </b>
                <span
                  className="font-sans text-xs sm:text-sm text-[#6B7280] font-normal leading-tight text-center block"
                  style={{ fontFamily: "var(--font-body-en), 'Inter', sans-serif" }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Bottom Link with Gold Underline & Arrow */}
          <div className="about-text mt-8 sm:mt-10">
            <a
              className="inline-flex items-center gap-2 text-sm sm:text-base font-sans font-semibold text-[#0F2E26] hover:text-[#D4AF37] transition-colors pb-1 group"
              style={{ fontFamily: "var(--font-body-en), 'Inter', sans-serif" }}
              href="/about"
            >
              <span>{copy.action}</span>
              <ArrowRight className="w-4 h-4 text-[#D4AF37] transition-transform group-hover:translate-x-1" />
            </a>
          </div>

        </div>

      </div>
    </section>
  );
}
