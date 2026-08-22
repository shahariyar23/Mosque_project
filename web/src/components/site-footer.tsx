"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { IslamicTexture } from "@/components/islamic-texture";

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

  return (
    <footer
      id="contact"
      className="relative overflow-hidden bg-[#10251e] text-[#f5f3ea]"
    >
      <IslamicTexture
        variant="footer"
        position="center"
        className="absolute inset-x-0 bottom-0 h-85 bg-contain bg-bottom bg-no-repeat sm:h-107.5"
      />
      <div className="relative z-10">
        <section className="border-b border-white/10 bg-[#0d4d3b] px-5 py-16 sm:py-20">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-center lg:px-8">
            <div>
              <p className="text-xs font-bold tracking-[.22em] text-[#e0be79]">
                {bengali ? "নূরের সঙ্গে থাকুন" : "STAY CONNECTED"}
              </p>
              <h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
                {bengali
                  ? "আপনার মসজিদের সঙ্গে যুক্ত থাকুন।"
                  : "Stay connected with your mosque."}
              </h2>
              <p className="mt-5 max-w-xl leading-7 text-white/70">
                {bengali
                  ? "নামাজের সময়, আসন্ন অনুষ্ঠান, কুরআন শিক্ষা এবং কমিউনিটির খবর এক জায়গায়।"
                  : "Prayer times, upcoming events, Quran programmes and community updates, all in one place."}
              </p>
            </div>
            <form
              action="mailto:salam@noormosque.org"
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
                className="w-full max-w-sm border border-white/20 bg-white/10 px-4 py-3 text-center text-white outline-none placeholder:text-white/45 focus:border-[#e0be79]"
              />
              <button
                type="submit"
                className="bg-[#c79a45] px-6 py-3 text-center font-semibold text-[#153128] transition hover:bg-[#e0be79]"
              >
                {bengali ? "যোগ দিন" : "Join"}
              </button>
            </form>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_2fr_.95fr]">
            <div>
              <Link
                href="/"
                className="inline-block"
                aria-label={
                  bengali
                    ? "নূর কমিউনিটি মসজিদ হোম"
                    : "Noor Community Mosque home"
                }
              >
                <span className="block text-5xl font-semibold tracking-[.12em] text-white">
                  ✦ NOOR
                </span>
                <span className="mt-2 block text-xs font-bold tracking-[.24em] text-[#e0be79]">
                  {bengali ? "কমিউনিটি মসজিদ" : "COMMUNITY MOSQUE"}
                </span>
              </Link>
              <p className="mt-6 max-w-xs leading-7 text-white/60">
                {bengali
                  ? "ইবাদত, জ্ঞান ও সম্প্রদায়ের একটি আন্তরিক স্থান।"
                  : "A welcoming place for worship, knowledge and community."}
              </p>
            </div>

            <nav
              aria-label={bengali ? "ফুটার নেভিগেশন" : "Footer navigation"}
              className="grid gap-10 sm:grid-cols-3"
            >
              {groups.map((group) => (
                <div key={group.title}>
                  <h3 className="text-xs font-bold tracking-[.2em] text-[#e0be79]">
                    {group.title}
                  </h3>
                  <ul className="mt-5 space-y-3 text-sm text-white/65">
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
              <h3 className="text-xs font-bold tracking-[.2em] text-[#e0be79]">
                {bengali ? "যোগাযোগ" : "CONTACT"}
              </h3>
              <address className="mt-5 not-italic text-sm leading-7 text-white/65">
                <span className="block text-white">
                  {bengali ? "নূর কমিউনিটি মসজিদ" : "Noor Community Mosque"}
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
                  href="mailto:salam@noormosque.org"
                  className="footer-link transition hover:text-white"
                >
                  salam@noormosque.org
                </a>
              </address>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Noor+Community+Mosque+Dhaka"
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-block text-sm font-semibold text-[#e0be79] transition hover:text-white"
              >
                {bengali ? "দিকনির্দেশনা ↗" : "Get Directions ↗"}
              </a>
            </div>
          </div>

          <div className="mt-16 flex flex-col gap-5 border-t border-white/10 pt-6 text-sm text-white/45 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © 2026 {bengali ? "নূর কমিউনিটি মসজিদ" : "Noor Community Mosque"}
            </p>
            <div className="flex items-center gap-4">
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
                className="ml-2 border border-white/20 px-3 py-2 text-xs font-semibold text-white/70 transition hover:border-[#e0be79] hover:text-[#e0be79]"
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
