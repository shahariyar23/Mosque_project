"use client";

import { useLanguage } from "@/components/language-provider";
import { ArrowRight, Moon, BookOpen, CalendarDays, Heart } from "lucide-react";

export function HeroSection() {
  const { language } = useLanguage();
  const bangla = language === "bn";
  
  return (
    <section
      id="home"
      className="relative min-h-[850px] lg:min-h-[900px] overflow-hidden bg-[#073a2d] text-white flex flex-col lg:flex-row items-center pt-32 lg:pt-20"
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 1023px) {
          .hero-video-bg {
            object-position: 78% center !important;
          }
        }
      `}} />

      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="hero-video-bg absolute inset-0 z-0 h-full w-full object-cover lg:object-center"
      >
        <source src="/hero.mp4" type="video/mp4" />
      </video>
      
      {/* Gradient Overlay for Text Readability */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#04241b]/95 via-[#072a20]/40 to-transparent lg:bg-gradient-to-r lg:from-[#072a20]/90 lg:via-[#072a20]/60 lg:to-transparent lg:w-2/3 pointer-events-none" />

      {/* Content Container */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 lg:px-8 pointer-events-none mt-10 lg:mt-0 flex flex-col items-center lg:items-start text-center lg:text-left">
        <div className="max-w-2xl pointer-events-auto flex flex-col items-center lg:items-start">
          
          {/* Top Arabic Text */}
          <div className="flex items-center justify-center lg:justify-start gap-2.5 sm:gap-3 text-[#dca74e] mb-3 sm:mb-4 lg:mb-6">
            <span className="text-[10px]">❖</span>
            <span className="font-arabic text-base sm:text-xl tracking-wider">بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</span>
            <span className="text-[10px]">❖</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-[30px] xs:text-[38px] sm:text-6xl lg:text-[72px] font-serif text-[#f2e6ce] leading-[1.1] tracking-wide mb-3 sm:mb-4 lg:mb-6">
            DISCOVER THE<br />
            BEAUTY OF FAITH
          </h1>

          {/* Subheading */}
          <p className="text-[#b0beba] text-xs sm:text-base lg:text-lg max-w-[280px] xs:max-w-[340px] sm:max-w-[450px] leading-relaxed mb-6 sm:mb-8 lg:mb-10">
            NOOR is your digital companion for a stronger connection with Allah and your community.
          </p>

          {/* Buttons */}
          <div className="flex flex-row justify-center lg:justify-start gap-2.5 sm:gap-4">
            <a
              href="#explore"
              className="bg-gradient-to-r from-[#e7b864] to-[#c18931] text-[#13231c] px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-xs sm:text-base font-semibold flex items-center gap-1.5 sm:gap-2 hover:opacity-90 transition-opacity shadow-md"
            >
              Explore Now <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </a>
            <a
              href="#learn"
              className="border border-[#dca74e]/50 text-[#dca74e] px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-xs sm:text-base font-semibold flex items-center gap-1.5 sm:gap-2 hover:bg-[#dca74e]/10 transition-colors shadow-sm"
            >
              Learn More <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </a>
          </div>

          {/* Features Grid */}
          <div className="mt-10 sm:mt-16 lg:mt-20">
            <p className="text-[#7d8c83] text-[10px] sm:text-xs tracking-[0.2em] font-semibold mb-4 sm:mb-6">
              FEATURES
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 sm:gap-8 lg:gap-12">
              <a href="#prayer" className="flex flex-col items-center gap-2 sm:gap-3 group">
                <div className="text-[#dca74e] group-hover:scale-110 transition-transform">
                  <Moon className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={1.5} />
                </div>
                <span className="text-[11px] sm:text-xs text-[#b0beba]">Prayer Times</span>
              </a>
              <a href="#quran" className="flex flex-col items-center gap-2 sm:gap-3 group">
                <div className="text-[#dca74e] group-hover:scale-110 transition-transform">
                  <BookOpen className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={1.5} />
                </div>
                <span className="text-[11px] sm:text-xs text-[#b0beba]">Quran</span>
              </a>
              <a href="#events" className="flex flex-col items-center gap-2 sm:gap-3 group">
                <div className="text-[#dca74e] group-hover:scale-110 transition-transform">
                  <CalendarDays className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={1.5} />
                </div>
                <span className="text-[11px] sm:text-xs text-[#b0beba]">Events</span>
              </a>
              <a href="#donate" className="flex flex-col items-center gap-2 sm:gap-3 group">
                <div className="text-[#dca74e] group-hover:scale-110 transition-transform">
                  <Heart className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={1.5} />
                </div>
                <span className="text-[11px] sm:text-xs text-[#b0beba]">Donate</span>
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}


