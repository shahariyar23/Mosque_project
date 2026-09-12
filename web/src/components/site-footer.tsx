"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/components/language-provider";
import { siteConfig } from "@/config/site";
import { useMosqueBranding } from "@/components/mosque-branding-provider";

export function SiteFooter() {
  const { language, setLanguage } = useLanguage();
  const { branding } = useMosqueBranding();
  const bengali = language === "bn";
  const mosqueName = branding.name || siteConfig.fullName;
  const mosqueEmail = branding.email || siteConfig.email;
  const mosquePhone = branding.phone;
  const phoneHref = mosquePhone ? `tel:${mosquePhone.replace(/[^+\d]/g, "")}` : undefined;
  const mosqueAddress = [
    branding.addressLine,
    branding.city,
    branding.district,
    branding.country,
    branding.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState("");
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const toggleAccordion = (key: string) => {
    setOpenAccordion((prev) => (prev === key ? null : key));
  };

  const handleSubscribe = (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setTimeout(() => {
      setEmail("");
    }, 4000);
  };

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Navigation link groups
  const exploreLinks = [
    { label: bengali ? "হোম" : "Home", href: "/" },
    { label: bengali ? "আমাদের সম্পর্কে" : "About Us", href: "/about" },
    { label: bengali ? "নামাজের সময়" : "Prayer Times", href: "/prayer-times" },
    { label: bengali ? "রামাদান" : "Ramadan", href: "/ramadan" },
    { label: bengali ? "অনুষ্ঠান" : "Events", href: "/events" },
    { label: bengali ? "সেবা সমূহ" : "Services", href: "/services" },
    { label: bengali ? "গ্যালারি" : "Gallery", href: "/gallery" },
  ];

  const worshipLinks = [
    { label: bengali ? "নামাজের সময়" : "Prayer Times", href: "/prayer-times" },
    { label: bengali ? "জুমুআহ" : "Jumu'ah", href: "/prayer-times#jumuah" },
    { label: bengali ? "কুরআন" : "Quran", href: "/quran" },
    { label: bengali ? "মসজিদ ভ্রমণ (3D)" : "3D Mosque Tour", href: "/about#3d-mosque" },
    { label: bengali ? "দান করুন" : "Donate", href: "/donations" },
    { label: bengali ? "স্বচ্ছতা" : "Transparency", href: "/transparency" },
  ];

  const communityLinks = [
    { label: bengali ? "অনুষ্ঠান" : "Events", href: "/events" },
    { label: bengali ? "স্বেচ্ছাসেবক" : "Volunteers", href: "/about#volunteers" },
    { label: bengali ? "কমিউনিটি সেবা" : "Community Services", href: "/services" },
    { label: bengali ? "শিক্ষা ও ক্লাস" : "Education & Classes", href: "/services#education" },
    { label: bengali ? "ঘোষণা" : "Announcements", href: "/events#announcements" },
    { label: bengali ? "যোগাযোগ" : "Contact", href: "#contact" },
  ];

  return (
    <footer id="contact" className="relative overflow-hidden bg-[#031711] text-[#e8f0eb] select-none font-sans">
      {/* Decorative ambient background glows */}
      <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-[#0d4d3b]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-40 h-96 w-96 rounded-full bg-[#c79a45]/10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        {/* =========================================================================
            TOP NEWSLETTER & INSPIRATION CARD
            ========================================================================= */}
        <section
          aria-labelledby="newsletter-heading"
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#c79a45]/30 bg-gradient-to-br from-[#062c22] via-[#093c2f] to-[#05261d] p-6 sm:p-8 lg:p-12 shadow-2xl"
        >
          {/* Subtle Islamic Arabesque Arches in Corner Backgrounds */}
          <svg
            className="pointer-events-none absolute -left-6 -top-6 h-48 w-48 text-[#e5c278] opacity-15"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          >
            <path d="M 0 100 A 100 100 0 0 1 100 0" />
            <path d="M 0 80 A 80 80 0 0 1 80 0" />
            <path d="M 0 60 A 60 60 0 0 1 60 0" />
            <path d="M 0 40 A 40 40 0 0 1 40 0" />
            <circle cx="50" cy="50" r="15" strokeDasharray="3 3" />
            <path d="M 35 50 Q 50 20 65 50 Q 50 80 35 50 Z" />
          </svg>
          <svg
            className="pointer-events-none absolute -right-6 -bottom-6 h-48 w-48 text-[#e5c278] opacity-15 rotate-180"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          >
            <path d="M 0 100 A 100 100 0 0 1 100 0" />
            <path d="M 0 80 A 80 80 0 0 1 80 0" />
            <path d="M 0 60 A 60 60 0 0 1 60 0" />
            <circle cx="50" cy="50" r="15" strokeDasharray="3 3" />
            <path d="M 35 50 Q 50 20 65 50 Q 50 80 35 50 Z" />
          </svg>

          {/* Desktop & Mobile Card Content */}
          <div className="relative z-10 grid gap-8 lg:grid-cols-12 lg:items-center">
            {/* Left Content (Cols 1-5): Eyebrow, Heading, Description */}
            <div className="lg:col-span-5">
              <span className="inline-block text-xs font-semibold tracking-wider text-[#e5c278] uppercase">
                {bengali ? "যোগাযোগে থাকুন" : "STAY CONNECTED"}
              </span>
              <h2
                id="newsletter-heading"
                className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl font-serif leading-snug"
              >
                {bengali
                  ? "আপনার মসজিদের খবর পেতে সঙ্গে থাকুন"
                  : "Stay updated with your mosque"}
              </h2>
              <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[#bad1c7]">
                {bengali
                  ? "নামাজের সময়, আসন্ন অনুষ্ঠান, কুরআন প্রোগ্রাম এবং গুরুত্বপূর্ণ আপডেট সরাসরি আপনার ইনবক্সে পান।"
                  : "Get prayer times, upcoming events, Quran programs, and important updates directly in your inbox."}
              </p>

              {/* Decorative Divider */}
              <div className="mt-4 flex items-center gap-2 text-[#c79a45]/50">
                <div className="h-[1px] w-12 bg-current" />
                <span className="text-xs">◈</span>
                <div className="h-[1px] w-24 bg-current" />
              </div>
            </div>

            {/* Middle Content (Cols 6-8): Input Field & Button */}
            <div className="lg:col-span-4 flex flex-col justify-center">
              <form onSubmit={handleSubscribe} className="w-full">
                <label htmlFor="newsletter-email" className="sr-only">
                  {bengali ? "আপনার ইমেইল ঠিকানা" : "Your email address"}
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center rounded-xl bg-[#031d16]/90 border border-[#c79a45]/40 p-1.5 focus-within:border-[#e5c278] shadow-inner transition-colors gap-2 sm:gap-0">
                  <div className="flex items-center flex-1 px-2.5">
                    <svg
                      className="h-5 w-5 text-[#8ea39b] shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.6"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <input
                      id="newsletter-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={
                        bengali ? "আপনার ইমেইল ঠিকানা" : "Your email address"
                      }
                      className="w-full bg-transparent px-2.5 py-2 text-xs sm:text-sm text-white placeholder-[#789389] focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#f0ca7d] hover:bg-[#fadfa3] px-5 py-2.5 text-xs sm:text-sm font-bold text-[#06241b] transition-all shadow-md active:scale-95 shrink-0 text-center"
                  >
                    {bengali ? "যোগ দিন" : "Join"}
                  </button>
                </div>
              </form>

              {subscribed ? (
                <p className="mt-2.5 text-xs text-[#a3e8b6] flex items-center justify-center lg:justify-start gap-1.5 animate-fadeIn">
                  <span>✓</span>{" "}
                  {bengali
                    ? "ধন্যবাদ! আপনি সফলভাবে যুক্ত হয়েছেন।"
                    : "Thank you! You have been subscribed."}
                </p>
              ) : (
                <p className="mt-2.5 text-[11px] sm:text-xs text-[#8ea39b] flex items-center justify-center lg:justify-start gap-1.5">
                  <svg
                    className="h-3.5 w-3.5 text-[#c79a45] shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <span>
                    {bengali
                      ? "আমরা কখনোই আপনার তথ্য তৃতীয় পক্ষের সাথে শেয়ার করব না।"
                      : "We will never share your information with third parties."}
                  </span>
                </p>
              )}
            </div>

            {/* Right Content (Cols 9-12): Quranic Quote */}
            <div className="lg:col-span-3 flex flex-col items-center lg:items-end text-center lg:text-right border-t border-white/10 lg:border-t-0 pt-6 lg:pt-0">
              <blockquote className="font-serif text-base sm:text-lg font-medium text-[#f0ca7d] leading-relaxed">
                {bengali
                  ? "“ভাল কাজের প্রতিযোগিতায় এগিয়ে চল”"
                  : "“Compete with one another in good deeds”"}
              </blockquote>
              <cite className="mt-1.5 block text-xs sm:text-sm text-[#bad1c7] not-italic">
                {bengali ? "— সূরা আল-বাকারা ২:১৪৮" : "— Surah Al-Baqarah 2:148"}
              </cite>
              <div className="mt-3 flex items-center gap-2 text-[#c79a45]/60">
                <div className="h-[1px] w-8 bg-current" />
                <span className="text-xs">❖</span>
                <div className="h-[1px] w-8 bg-current" />
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            MAIN FOOTER BODY
            Desktop: 5 Columns
            Mobile: Brand on top, then Collapsible Accordion sections
            ========================================================================= */}
        <div className="mt-14 lg:mt-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
            {/* Column 1: Brand details (Takes 4 cols on lg) */}
            <div className="lg:col-span-4 text-left">
              <Link
                href="/"
                className="inline-flex items-center gap-3 group"
                aria-label={`${branding.name || siteConfig.name} Community Mosque`}
                suppressHydrationWarning
              >
                {branding.logoUrl ? (
                  <img
                    src={branding.logoUrl}
                    alt={branding.name || siteConfig.name}
                    className="h-10 w-10 rounded-xl object-cover border border-[#c79a45]/40 shadow-md group-hover:border-[#e5c278] transition-colors"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#08362a] border border-[#c79a45]/40 text-[#f0ca7d] shadow-md group-hover:border-[#e5c278] transition-colors">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 1L14.8 9.2L23 12L14.8 14.8L12 23L9.2 14.8L1 12L9.2 9.2L12 1Z" />
                    </svg>
                  </div>
                )}
                <div>
                  <span className="block text-2xl font-bold tracking-[.16em] text-white" suppressHydrationWarning>
                    {branding.shortName || "NOOR"}
                  </span>
                  <span className="block text-[10px] font-semibold tracking-[.22em] text-[#e5c278] uppercase">
                    {bengali ? "কমিউনিটি মসজিদ" : "COMMUNITY MOSQUE"}
                  </span>
                </div>
              </Link>

              <p className="mt-4 max-w-sm text-xs sm:text-sm leading-relaxed text-[#bad1c7]">
                {bengali
                  ? "ইবাদত, শিক্ষা ও সমাজসেবার মাধ্যমে একটি সুসংহত ও কল্যাণময় সম্প্রদায় গড়ে তোলাই আমাদের লক্ষ্য।"
                  : "Our mission is to build a cohesive and compassionate community through worship, education, and social service."}
              </p>

              {/* Social Media Buttons */}
              <div className="mt-6 flex items-center gap-3">
                {/* Facebook */}
                <a
                  href={`https://${siteConfig.facebook}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#05261d] border border-[#c79a45]/30 text-white/80 hover:border-[#e5c278] hover:bg-[#0b4233] hover:text-[#f0ca7d] transition-all shadow-sm"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                  </svg>
                </a>

                {/* YouTube */}
                <a
                  href={`https://${siteConfig.youtube}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="YouTube"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#05261d] border border-[#c79a45]/30 text-white/80 hover:border-[#e5c278] hover:bg-[#0b4233] hover:text-[#f0ca7d] transition-all shadow-sm"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>

                {/* Instagram */}
                <a
                  href={`https://${siteConfig.instagram}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#05261d] border border-[#c79a45]/30 text-white/80 hover:border-[#e5c278] hover:bg-[#0b4233] hover:text-[#f0ca7d] transition-all shadow-sm"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>

                {/* Email / Contact */}
                <a
                  href={`mailto:${siteConfig.email}`}
                  aria-label="Email"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#05261d] border border-[#c79a45]/30 text-white/80 hover:border-[#e5c278] hover:bg-[#0b4233] hover:text-[#f0ca7d] transition-all shadow-sm"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Desktop Navigation Links (Cols 5-12, shown on lg screens) */}
            <div className="hidden lg:grid lg:col-span-8 lg:grid-cols-4 gap-6">
              {/* Col 2: অন্বেষণ করুন (Explore) */}
              <div>
                <h3 className="text-sm font-bold tracking-wider text-[#e5c278] uppercase mb-4">
                  {bengali ? "অন্বেষণ করুন" : "Explore"}
                </h3>
                <ul className="space-y-2.5 text-xs sm:text-sm text-[#bad1c7]">
                  {exploreLinks.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className="transition hover:text-white hover:translate-x-0.5 inline-block"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Col 3: ইবাদত (Worship) */}
              <div>
                <h3 className="text-sm font-bold tracking-wider text-[#e5c278] uppercase mb-4">
                  {bengali ? "ইবাদত" : "Worship"}
                </h3>
                <ul className="space-y-2.5 text-xs sm:text-sm text-[#bad1c7]">
                  {worshipLinks.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className="transition hover:text-white hover:translate-x-0.5 inline-block"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Col 4: সমাজ (Community) */}
              <div>
                <h3 className="text-sm font-bold tracking-wider text-[#e5c278] uppercase mb-4">
                  {bengali ? "সমাজ" : "Community"}
                </h3>
                <ul className="space-y-2.5 text-xs sm:text-sm text-[#bad1c7]">
                  {communityLinks.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className="transition hover:text-white hover:translate-x-0.5 inline-block"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Col 5: যোগাযোগ করুন (Contact) */}
              <div>
                <h3 className="text-sm font-bold tracking-wider text-[#e5c278] uppercase mb-4">
                  {bengali ? "যোগাযোগ করুন" : "Contact Us"}
                </h3>
                <div className="space-y-3.5 text-xs sm:text-sm text-[#bad1c7]">
                  {/* Address */}
                  <div className="flex items-start gap-2.5">
                    <svg className="h-4 w-4 text-[#e5c278] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-white">{mosqueName}</p>
                      <p className="text-[11px] text-[#8ea39b] leading-relaxed">
                        {mosqueAddress || (bengali ? "মসজিদ কার্যালয়ে যোগাযোগ করুন" : "Contact the mosque office")}
                      </p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-2.5">
                    <svg className="h-4 w-4 text-[#e5c278] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {mosquePhone ? (
                      <a href={phoneHref} className="hover:text-white transition-colors">
                        {mosquePhone}
                      </a>
                    ) : (
                      <span>{bengali ? "ফোন নম্বর দেওয়া হয়নি" : "Phone number not provided"}</span>
                    )}
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-2.5">
                    <svg className="h-4 w-4 text-[#e5c278] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <a href={`mailto:${mosqueEmail}`} className="hover:text-white transition-colors">
                      {mosqueEmail}
                    </a>
                  </div>

                  {/* Hours */}
                  <div className="flex items-start gap-2.5">
                    <svg className="h-4 w-4 text-[#e5c278] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-white">{bengali ? "প্রতিদিন খোলা" : "Open Daily"}</p>
                      <p className="text-[11px] text-[#8ea39b]">
                        {bengali ? "ফজর থেকে ইশা পর্যন্ত" : "Fajr to Isha"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Collapsible Accordions (Shown on < lg screens) */}
            <div className="lg:hidden space-y-2 divide-y divide-[#c79a45]/20 border-y border-[#c79a45]/20 py-2">
              {/* Accordion 1: অন্বেষণ করুন */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion("explore")}
                  className="flex w-full items-center justify-between py-3 text-left text-sm font-semibold text-[#e5c278]"
                >
                  <span>{bengali ? "অন্বেষণ করুন" : "Explore"}</span>
                  <svg
                    className={`h-4 w-4 transition-transform duration-200 ${
                      openAccordion === "explore" ? "rotate-180 text-white" : "text-[#c79a45]"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openAccordion === "explore" && (
                  <ul className="pb-3 pl-2 space-y-2 text-xs text-[#bad1c7] animate-fadeIn">
                    {exploreLinks.map((item) => (
                      <li key={item.label}>
                        <Link href={item.href} className="block py-1 hover:text-white">
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Accordion 2: ইবাদত */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion("worship")}
                  className="flex w-full items-center justify-between py-3 text-left text-sm font-semibold text-[#e5c278]"
                >
                  <span>{bengali ? "ইবাদত" : "Worship"}</span>
                  <svg
                    className={`h-4 w-4 transition-transform duration-200 ${
                      openAccordion === "worship" ? "rotate-180 text-white" : "text-[#c79a45]"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openAccordion === "worship" && (
                  <ul className="pb-3 pl-2 space-y-2 text-xs text-[#bad1c7] animate-fadeIn">
                    {worshipLinks.map((item) => (
                      <li key={item.label}>
                        <Link href={item.href} className="block py-1 hover:text-white">
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Accordion 3: সমাজ */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion("community")}
                  className="flex w-full items-center justify-between py-3 text-left text-sm font-semibold text-[#e5c278]"
                >
                  <span>{bengali ? "সমাজ" : "Community"}</span>
                  <svg
                    className={`h-4 w-4 transition-transform duration-200 ${
                      openAccordion === "community" ? "rotate-180 text-white" : "text-[#c79a45]"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openAccordion === "community" && (
                  <ul className="pb-3 pl-2 space-y-2 text-xs text-[#bad1c7] animate-fadeIn">
                    {communityLinks.map((item) => (
                      <li key={item.label}>
                        <Link href={item.href} className="block py-1 hover:text-white">
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Accordion 4: যোগাযোগ করুন */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion("contact")}
                  className="flex w-full items-center justify-between py-3 text-left text-sm font-semibold text-[#e5c278]"
                >
                  <span>{bengali ? "যোগাযোগ করুন" : "Contact Us"}</span>
                  <svg
                    className={`h-4 w-4 transition-transform duration-200 ${
                      openAccordion === "contact" ? "rotate-180 text-white" : "text-[#c79a45]"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openAccordion === "contact" && (
                  <div className="pb-3 pl-2 space-y-3 text-xs text-[#bad1c7] animate-fadeIn">
                    <div>
                      <p className="font-semibold text-white">{mosqueName}</p>
                      <p className="text-[11px] text-[#8ea39b]">
                        {mosqueAddress || (bengali ? "মসজিদ কার্যালয়ে যোগাযোগ করুন" : "Contact the mosque office")}
                      </p>
                    </div>
                    <p>
                      {mosquePhone ? (
                        <a href={phoneHref} className="hover:text-white">
                          {mosquePhone}
                        </a>
                      ) : (
                        <span>{bengali ? "ফোন নম্বর দেওয়া হয়নি" : "Phone number not provided"}</span>
                      )}
                    </p>
                    <p>
                      <a href={`mailto:${mosqueEmail}`} className="hover:text-white">
                        {mosqueEmail}
                      </a>
                    </p>
                    <div>
                      <p className="font-semibold text-white">{bengali ? "প্রতিদিন খোলা" : "Open Daily"}</p>
                      <p className="text-[11px] text-[#8ea39b]">
                        {bengali ? "ফজর থেকে ইশা পর্যন্ত" : "Fajr to Isha"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            QUICK ACTION CARDS & MOSQUE SILHOUETTE SECTION
            ========================================================================= */}
        <div className="relative mt-12 sm:mt-16 overflow-hidden rounded-2xl sm:rounded-3xl border border-[#c79a45]/20 bg-[#02130e]">
          {/* Mosque Skyline Background Art */}
          <div className="absolute inset-0 pointer-events-none opacity-75 sm:opacity-85">
            <Image
              src="/footer-mosque-skyline.jpg"
              alt="Mosque Silhouette"
              fill
              className="object-cover object-center"
              priority={false}
            />
            {/* Smooth gradient blend overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#02130e]/60 via-[#02130e]/20 to-[#02130e]/45" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#02130e]/55 via-transparent to-[#02130e]/55" />
          </div>

          {/* Quick Action Cards Content */}
          <div className="relative z-10 p-6 sm:p-8 lg:p-10">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl">
              {/* Card 1: নামাজের সময় (Prayer Times) */}
              <Link
                href="/prayer-times"
                className="group flex items-center justify-between rounded-xl border border-[#c79a45]/30 bg-[#04241b]/85 p-4 sm:p-5 backdrop-blur-md transition-all hover:border-[#e5c278] hover:bg-[#073629] shadow-lg"
              >
                <div className="flex items-center gap-3.5">
                  {/* Mosque Dome Icon */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#08362a] text-[#f0ca7d] border border-[#c79a45]/30 group-hover:border-[#e5c278] transition-colors">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 3v3m0 0a5 5 0 015 5v8H7v-8a5 5 0 015-5zM3 14v5h3v-5M18 14v5h3v-5M12 2l.5 1h-1l.5-1z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-white group-hover:text-[#f0ca7d] transition-colors">
                      {bengali ? "নামাজের সময়" : "Prayer Times"}
                    </h4>
                    <p className="text-[11px] text-[#8ea39b] group-hover:text-white/80 transition-colors">
                      {bengali ? "আজকের সময় দেখুন →" : "View today's times →"}
                    </p>
                  </div>
                </div>
                <svg
                  className="h-4 w-4 text-[#e5c278] transition-transform group-hover:translate-x-1 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              {/* Card 2: কুরআন (Quran) */}
              <Link
                href="/quran"
                className="group flex items-center justify-between rounded-xl border border-[#c79a45]/30 bg-[#04241b]/85 p-4 sm:p-5 backdrop-blur-md transition-all hover:border-[#e5c278] hover:bg-[#073629] shadow-lg"
              >
                <div className="flex items-center gap-3.5">
                  {/* Open Quran Icon */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#08362a] text-[#f0ca7d] border border-[#c79a45]/30 group-hover:border-[#e5c278] transition-colors">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-white group-hover:text-[#f0ca7d] transition-colors">
                      {bengali ? "কুরআন" : "Quran"}
                    </h4>
                    <p className="text-[11px] text-[#8ea39b] group-hover:text-white/80 transition-colors">
                      {bengali ? "পড়ুন ও শুনুন →" : "Read & listen →"}
                    </p>
                  </div>
                </div>
                <svg
                  className="h-4 w-4 text-[#e5c278] transition-transform group-hover:translate-x-1 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              {/* Card 3: দান করুন (Donate) */}
              <Link
                href="/donations"
                className="group flex items-center justify-between rounded-xl border border-[#c79a45]/30 bg-[#04241b]/85 p-4 sm:p-5 backdrop-blur-md transition-all hover:border-[#e5c278] hover:bg-[#073629] shadow-lg sm:col-span-2 lg:col-span-1"
              >
                <div className="flex items-center gap-3.5">
                  {/* Heart / Sadaqah Icon */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#08362a] text-[#f0ca7d] border border-[#c79a45]/30 group-hover:border-[#e5c278] transition-colors">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-white group-hover:text-[#f0ca7d] transition-colors">
                      {bengali ? "দান করুন" : "Donate"}
                    </h4>
                    <p className="text-[11px] text-[#8ea39b] group-hover:text-white/80 transition-colors">
                      {bengali ? "সদকা ও সহযোগিতা →" : "Sadaqah & support →"}
                    </p>
                  </div>
                </div>
                <svg
                  className="h-4 w-4 text-[#e5c278] transition-transform group-hover:translate-x-1 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* =========================================================================
            BOTTOM BAR
            Copyright, legal links, language toggle, scroll to top
            ========================================================================= */}
        <div className="mt-12 flex flex-col gap-5 border-t border-[#c79a45]/20 pt-6 pb-12 sm:flex-row sm:items-center sm:justify-between text-xs text-[#8ea39b]">
          {/* Copyright notice */}
          <p className="text-center sm:text-left">
            © 2026 {mosqueName}.{" "}
            {bengali ? "সকল অধিকার সংরক্ষিত।" : "All rights reserved."}
          </p>

          {/* Links & Language & Scroll to Top */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4">
            <Link href="#privacy" className="hover:text-white transition-colors">
              {bengali ? "গোপনীয়তা নীতি" : "Privacy Policy"}
            </Link>
            <span className="text-white/20">|</span>
            <Link href="#terms" className="hover:text-white transition-colors">
              {bengali ? "ব্যবহারের শর্তাবলী" : "Terms of Service"}
            </Link>
            <span className="text-white/20">|</span>
            <Link href="#support" className="hover:text-white transition-colors">
              {bengali ? "সহায়তা" : "Support"}
            </Link>

            {/* Scroll-to-Top Circular Gold Button */}
            <button
              type="button"
              onClick={scrollToTop}
              aria-label={bengali ? "উপরে যান" : "Scroll to top"}
              className="ml-2 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-[#f0ca7d] hover:bg-[#fadfa3] text-[#04241b] shadow-lg transition-transform hover:-translate-y-1 active:scale-95"
            >
              <svg className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
