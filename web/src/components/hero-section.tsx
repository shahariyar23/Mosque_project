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
          <div className="flex items-center justify-center lg:justify-start gap-3 text-[#dca74e] mb-4 lg:mb-6">
            <span className="text-[10px]">❖</span>
            <span className="font-arabic text-lg sm:text-xl tracking-wider">بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</span>
            <span className="text-[10px]">❖</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-[38px] sm:text-6xl lg:text-[72px] font-serif text-[#f2e6ce] leading-[1.1] tracking-wide mb-4 lg:mb-6">
            DISCOVER THE<br />
            BEAUTY OF FAITH
          </h1>

          {/* Subheading */}
          <p className="text-[#b0beba] text-sm sm:text-lg max-w-[300px] sm:max-w-[450px] leading-relaxed mb-8 lg:mb-10">
            NOOR is your digital companion for a stronger connection with Allah and your community.
          </p>

          {/* Buttons - Side by side even on mobile to match image 1 */}
          <div className="flex flex-row justify-center lg:justify-start gap-3 sm:gap-5">
            <a
              href="#explore"
              className="bg-gradient-to-r from-[#e7b864] to-[#c18931] text-[#13231c] px-4 sm:px-7 py-2.5 sm:py-3.5 rounded-full text-sm sm:text-base font-medium flex items-center gap-1.5 sm:gap-2 hover:opacity-90 transition-opacity"
            >
              Explore Now <ArrowRight size={16} />
            </a>
            <a
              href="#learn"
              className="border border-[#dca74e]/50 text-[#dca74e] px-4 sm:px-7 py-2.5 sm:py-3.5 rounded-full text-sm sm:text-base font-medium flex items-center gap-1.5 sm:gap-2 hover:bg-[#dca74e]/10 transition-colors"
            >
              Learn More <ArrowRight size={16} />
            </a>
          </div>

          {/* Features Grid */}
          <div className="mt-16 lg:mt-20">
            <p className="text-[#7d8c83] text-[10px] sm:text-xs tracking-[0.2em] font-semibold mb-6">
              FEATURES
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-6 sm:gap-12">
              <a href="#prayer" className="flex flex-col items-center gap-3 group">
                <div className="text-[#dca74e] group-hover:scale-110 transition-transform">
                  <Moon size={28} className="sm:w-8 sm:h-8" strokeWidth={1.5} />
                </div>
                <span className="text-xs sm:text-sm text-[#b0beba]">Prayer Times</span>
              </a>
              <a href="#quran" className="flex flex-col items-center gap-3 group">
                <div className="text-[#dca74e] group-hover:scale-110 transition-transform">
                  <BookOpen size={28} className="sm:w-8 sm:h-8" strokeWidth={1.5} />
                </div>
                <span className="text-xs sm:text-sm text-[#b0beba]">Quran</span>
              </a>
              <a href="#events" className="flex flex-col items-center gap-3 group">
                <div className="text-[#dca74e] group-hover:scale-110 transition-transform">
                  <CalendarDays size={28} className="sm:w-8 sm:h-8" strokeWidth={1.5} />
                </div>
                <span className="text-xs sm:text-sm text-[#b0beba]">Events</span>
              </a>
              <a href="#donate" className="flex flex-col items-center gap-3 group">
                <div className="text-[#dca74e] group-hover:scale-110 transition-transform">
                  <Heart size={28} className="sm:w-8 sm:h-8" strokeWidth={1.5} />
                </div>
                <span className="text-xs sm:text-sm text-[#b0beba]">Donate</span>
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}


