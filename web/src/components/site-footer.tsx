"use client";
import { useRef } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { IslamicTexture } from "@/components/islamic-texture";
import { gsap, ScrollTrigger, useIsomorphicLayoutEffect } from "@/lib/gsap";
import { siteConfig } from "@/config/site";

type FooterLink = { label: string; href: string };
type FooterGroup = { title: string; links: FooterLink[] };

const englishGroups: FooterGroup[] = [
  {
    title: "Explore",
    links: [
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
      { label: "Prayer Times", href: "/prayer-times" },
      { label: "Events", href: "/events" },
      { label: "Services", href: "/services" },
      { label: "Gallery", href: "/gallery" },
    ],
  },
  {
    title: "Worship",
    links: [
      { label: "Prayer Times", href: "/prayer-times" },
      { label: "Jumu'ah", href: "/prayer-times#jumuah" },
      { label: "Quran", href: "/quran" },
      { label: "Donations", href: "/donations" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Events", href: "/events" },
      { label: "Volunteers", href: "/about#volunteers" },
      { label: "Community Services", href: "/services" },
      { label: "3D Mosque Tour", href: "/about#3d-mosque" },
    ],
  },
];

const bengaliGroups: FooterGroup[] = [
  {
    title: "অন্বেষণ",
    links: [
      { label: "হোম", href: "/" },
      { label: "আমাদের সম্পর্কে", href: "/about" },
      { label: "নামাজের সময়", href: "/prayer-times" },
      { label: "অনুষ্ঠান", href: "/events" },
      { label: "সেবাসমূহ", href: "/services" },
      { label: "গ্যালারি", href: "/gallery" },
    ],
  },
  {
    title: "ইবাদত",
    links: [
      { label: "নামাজের সময়", href: "/prayer-times" },
      { label: "জুমুআ", href: "/prayer-times#jumuah" },
      { label: "কুরআন", href: "/quran" },
      { label: "দান", href: "/donations" },
    ],
  },
  {
    title: "সম্প্রদায়",
    links: [
      { label: "আমাদের সম্পর্কে", href: "/about" },
      { label: "অনুষ্ঠান", href: "/events" },
      { label: "স্বেচ্ছাসেবক", href: "/about#volunteers" },
      { label: "কমিউনিটি সেবা", href: "/services" },
      { label: "৩D মসজিদ ভ্রমণ", href: "/about#3d-mosque" },
    ],
  },
];

export function SiteFooter() {
  const { language, setLanguage } = useLanguage();
  const bengali = language === "bn";
  const groups = bengali ? bengaliGroups : englishGroups;
  const footerRef = useRef<HTMLElement>(null);
  const textureRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (prefersReducedMotion) return;

      // Parallax for the Islamic Texture
      gsap.to(textureRef.current, {
        y: -100, // Move up slightly as we scroll down
        ease: "none",
        scrollTrigger: {
          trigger: footerRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });

      // Reveal animation for newsletter
      gsap.fromTo(
        ".newsletter-content",
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".newsletter-section",
            start: "top 80%",
            once: true,
          },
        }
      );
    }, footerRef);
    return () => ctx.revert();
  }, []);

  return (
    <footer
      id="contact"
      ref={footerRef}
      className="relative overflow-hidden bg-[#10251e] text-[#f5f3ea]"
    >
      <div ref={textureRef} className="absolute inset-x-0 bottom-[-100px] h-85 sm:h-107.5 pointer-events-none z-0">
        <IslamicTexture
          variant="footer"
          position="center"
          className="h-full w-full bg-contain bg-bottom bg-no-repeat"
        />
      </div>
      <div className="relative z-10">
        <section className="newsletter-section relative overflow-hidden border-b border-white/10 bg-[#0d4d3b] px-4 py-12 sm:py-16 lg:py-20">
          {/* Subtle moving gradient background for newsletter */}
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.03)_50%,transparent_75%)] bg-[length:250%_250%] animate-[gradient_15s_linear_infinite]" />
          
          <div className="newsletter-content relative z-10 mx-auto flex max-w-7xl flex-col gap-6 sm:gap-8 lg:flex-row lg:items-end lg:justify-center lg:px-8">
            <div>
              <p className="text-[10px] xs:text-xs font-bold tracking-[.22em] text-[#e0be79] uppercase">
                {bengali ? "নূরের সঙ্গে থাকুন" : "STAY CONNECTED"}
              </p>
              <h2 className="mt-3 sm:mt-4 max-w-2xl text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-serif font-semibold leading-tight">
                {bengali
                  ? "আপনার মসজিদের সঙ্গে যুক্ত থাকুন।"
                  : "Stay connected with your mosque."}
              </h2>
              <p className="mt-3 sm:mt-5 max-w-xl text-xs xs:text-sm sm:text-base leading-relaxed text-white/70">
                {bengali
                  ? "নামাজের সময়, আসন্ন অনুষ্ঠান, কুরআন শিক্ষা এবং কমিউনিটির খবর এক জায়গায়।"
                  : "Prayer times, upcoming events, Quran programmes and community updates, all in one place."}
              </p>
            </div>
            <form
              action={`mailto:${siteConfig.email}`}
              method="get"
              className="flex w-full max-w-xl justify-center gap-2 lg:self-center"
            >
              <label htmlFor="footer-email" className="sr-only">
                {bengali ? "ইমেইল ঠিকানা" : "Email address"}
              </label>
              <input
                id="footer-email"
                name="email"
                type="email"
                required
                placeholder={
                  bengali ? "আপনার ইমেইল ঠিকানা" : "Your email address"
                }
                className="w-full max-w-sm border border-white/20 bg-white/10 px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-center text-white outline-none placeholder:text-white/45 focus:border-[#e0be79] transition-colors rounded-lg"
              />
              <button
                type="submit"
                className="bg-[#c79a45] px-5 sm:px-6 py-2.5 sm:py-3 text-center text-xs sm:text-sm font-semibold text-[#153128] transition hover:bg-[#e0be79] hover:-translate-y-0.5 rounded-lg shrink-0 shadow-md"
              >
                {bengali ? "যোগ দিন" : "Join"}
              </button>
            </form>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
          <div className="grid gap-8 sm:gap-12 lg:grid-cols-[1.15fr_2fr_.95fr]">
            <div>
              <Link
                href="/"
                className="inline-block"
                aria-label={`${siteConfig.name} Community Mosque home`}
              >
                <span className="block text-3xl xs:text-4xl sm:text-5xl font-semibold tracking-[.12em] text-white">
                  ✦ {siteConfig.name.toUpperCase()}
                </span>
                <span className="mt-1.5 sm:mt-2 block text-[10px] xs:text-xs font-bold tracking-[.24em] text-[#e0be79]">
                  {bengali ? "কমিউনিটি মসজিদ" : "COMMUNITY MOSQUE"}
                </span>
              </Link>
              <p className="mt-4 sm:mt-6 max-w-xs text-xs xs:text-sm leading-relaxed text-white/60">
                {bengali
                  ? "ইবাদত, জ্ঞান ও সম্প্রদায়ের একটি আন্তরিক স্থান।"
                  : "A welcoming place for worship, knowledge and community."}
              </p>
            </div>

            <nav
              aria-label={bengali ? "ফুটার নেভিগেশন" : "Footer navigation"}
              className="grid gap-8 sm:gap-10 grid-cols-2 sm:grid-cols-3"
            >
              {groups.map((group) => (
                <div key={group.title}>
                  <h3 className="text-[10px] xs:text-xs font-bold tracking-[.2em] text-[#e0be79] uppercase">
                    {group.title}
                  </h3>
                  <ul className="mt-3 sm:mt-5 space-y-2.5 sm:space-y-3 text-xs sm:text-sm text-white/65">
                    {group.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          className="footer-link transition hover:text-white"
                        >
                          {link.label}
                          <span aria-hidden="true"> ↗</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>

            <div>
              <h3 className="text-[10px] xs:text-xs font-bold tracking-[.2em] text-[#e0be79] uppercase">
                {bengali ? "যোগাযোগ" : "CONTACT"}
              </h3>
              <address className="mt-3 sm:mt-5 not-italic text-xs sm:text-sm leading-relaxed text-white/65">
                <span className="block text-white font-medium">
                  {bengali ? siteConfig.fullNameBn : siteConfig.fullName}
                </span>
                {bengali
                  ? "১২৩ পিস অ্যাভিনিউ, ঢাকা"
                  : "123 Peace Avenue, Dhaka"}
                <br />
                <a
                  href="tel:+8801712345678"
                  className="footer-link transition hover:text-white"
                >
                  +880 1712 345678
                </a>
                <br />
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="footer-link transition hover:text-white"
                >
                  {siteConfig.email}
                </a>
              </address>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Noor+Community+Mosque+Dhaka"
                target="_blank"
                rel="noreferrer"
                className="mt-4 sm:mt-5 inline-block text-xs sm:text-sm font-semibold text-[#e0be79] transition hover:text-white"
              >
                {bengali ? "দিকনির্দেশনা ↗" : "Get Directions ↗"}
              </a>
            </div>
          </div>

          <div className="mt-12 sm:mt-16 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs sm:text-sm text-white/45 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © 2026 {bengali ? "নূর কমিউনিটি মসজিদ" : "Noor Community Mosque"}
            </p>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <span>{bengali ? "বাংলা" : "English"}</span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => setLanguage(bengali ? "en" : "bn")}
                className="font-semibold text-[#e0be79] transition hover:text-white"
              >
                {bengali ? "English" : "বাংলা"}
              </button>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="ml-2 border border-white/20 px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-white/70 transition hover:border-[#e0be79] hover:text-[#e0be79] rounded-lg"
              >
                {bengali ? "উপরে যান ↑" : "Back to top ↑"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
