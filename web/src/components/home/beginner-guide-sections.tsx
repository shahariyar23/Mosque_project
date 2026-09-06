"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import {
  UserPlus,
  Compass,
  Users,
  Bell,
  FileText,
  ShieldCheck,
  LogIn,
  Sparkles,
  Clock,
  Moon,
  BookOpen,
  Megaphone,
  CalendarDays,
  Heart,
  Receipt,
  GraduationCap,
  Phone,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ *
 * Shared section header — the same eyebrow / title pattern used by the
 * services and events sections, so these sit naturally on the page.
 * ------------------------------------------------------------------ */
function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p
        className="font-montserrat text-xs font-semibold tracking-[0.2em] text-[#D4AF37] uppercase"
        style={{ fontFamily: "var(--font-montserrat), 'Montserrat', sans-serif" }}
      >
        {eyebrow}
      </p>
      <h2
        className="mt-3 text-3xl xs:text-4xl sm:text-5xl lg:text-[46px] font-serif font-bold text-[#0F2E26] leading-[1.18] tracking-tight"
        style={{ fontFamily: "var(--font-heading-en), 'Playfair Display', serif" }}
      >
        {title}
      </h2>
      {description && (
        <p
          className="mt-4 text-sm sm:text-base leading-relaxed text-[#6B7280] font-sans"
          style={{ fontFamily: "var(--font-body-en), 'Inter', sans-serif" }}
        >
          {description}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * SECTION 1 — HOW NOOR WORKS
 *
 * Four numbered steps in simple language. Static content: nothing here
 * needs a backend, so none is added.
 * ------------------------------------------------------------------ */
const HOW_STEPS = [
  {
    Icon: UserPlus,
    titleEn: "Create Your Account",
    titleBn: "আপনার অ্যাকাউন্ট তৈরি করুন",
    bodyEn: "Create an account with your basic information.",
    bodyBn: "আপনার প্রাথমিক তথ্য দিয়ে একটি অ্যাকাউন্ট তৈরি করুন।",
  },
  {
    Icon: Compass,
    titleEn: "Explore Your Mosque",
    titleBn: "আপনার মসজিদ দেখুন",
    bodyEn: "Check prayer times, announcements, events and Quran.",
    bodyBn: "নামাজের সময়, ঘোষণা, অনুষ্ঠান এবং কুরআন দেখুন।",
  },
  {
    Icon: Users,
    titleEn: "Join the Community",
    titleBn: "সম্প্রদায়ে যোগ দিন",
    bodyEn: "Donate, join programs, register for activities or volunteer.",
    bodyBn: "দান করুন, প্রোগ্রামে যোগ দিন, কার্যক্রমে নিবন্ধন করুন বা স্বেচ্ছাসেবক হোন।",
  },
  {
    Icon: Bell,
    titleEn: "Stay Connected",
    titleBn: "সংযুক্ত থাকুন",
    bodyEn: "Receive important updates from your mosque.",
    bodyBn: "আপনার মসজিদ থেকে গুরুত্বপূর্ণ আপডেট পান।",
  },
];

export function HowNoorWorksSection() {
  const { language } = useLanguage();
  const bn = language === "bn";

  return (
    <section className="bg-[#FAF8F5] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={bn ? "নূর কীভাবে কাজ করে" : "HOW NOOR WORKS"}
          title={bn ? "মাত্র ৪টি সহজ ধাপ" : "Getting started in 4 simple steps"}
          description={
            bn
              ? "আপনি যদি প্রথমবার ব্যবহার করেন তবুও চিন্তা নেই। এই চারটি ধাপ অনুসরণ করলেই সব ঠিকঠাক চলবে।"
              : "New to Noor? No problem. These four steps are all you need to begin."
          }
        />

        <ol className="mt-12 grid gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_STEPS.map(({ Icon, titleEn, titleBn, bodyEn, bodyBn }, i) => (
            <li
              key={titleEn}
              className="relative rounded-2xl border border-[#E7E2D6] bg-white p-6 xs:p-7 shadow-sm transition-all duration-300 hover:border-[#D4AF37] hover:shadow-xl hover:-translate-y-1.5"
            >
              <span
                className="absolute right-5 top-4 font-montserrat text-4xl font-bold text-[#E7E2D6]"
                style={{ fontFamily: "var(--font-montserrat), 'Montserrat', sans-serif" }}
                aria-hidden="true"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#073a2d] text-[#D4AF37]">
                <Icon className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <h3
                className="mt-5 text-lg xs:text-xl font-sans font-bold text-[#0F2E26]"
                style={{ fontFamily: "var(--font-body-en), 'Inter', sans-serif" }}
              >
                {bn ? titleBn : titleEn}
              </h3>
              <p
                className="mt-2 text-xs xs:text-sm leading-relaxed text-[#6B7280] font-sans"
                style={{ fontFamily: "var(--font-body-en), 'Inter', sans-serif" }}
              >
                {bn ? bodyBn : bodyEn}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * SECTION 2 — HOW TO CREATE AN ACCOUNT
 *
 * Five numbered steps, ending in a CTA to the existing sign-up flow.
 * No second authentication system is created — the buttons link to the
 * existing /signup and /signin routes.
 * ------------------------------------------------------------------ */
const ACCOUNT_STEPS = [
  {
    Icon: UserPlus,
    titleEn: "Create Account",
    titleBn: "অ্যাকাউন্ট তৈরি করুন",
    bodyEn: "Tap “Sign Up” on the top of the page.",
    bodyBn: "পেজের উপরে “সাইন আপ” বাটনে চাপ দিন।",
  },
  {
    Icon: FileText,
    titleEn: "Enter Your Information",
    titleBn: "আপনার তথ্য লিখুন",
    bodyEn: "Your name, email or phone, and a password.",
    bodyBn: "আপনার নাম, ইমেইল বা ফোন এবং একটি পাসওয়ার্ড।",
  },
  {
    Icon: ShieldCheck,
    titleEn: "Verify Your Account",
    titleBn: "আপনার অ্যাকাউন্ট যাচাই করুন",
    bodyEn: "Confirm your email or phone when asked.",
    bodyBn: "জিজ্ঞাসা করা হলে আপনার ইমেইল বা ফোন নিশ্চিত করুন।",
  },
  {
    Icon: LogIn,
    titleEn: "Sign In",
    titleBn: "সাইন ইন করুন",
    bodyEn: "Use your email or phone and password to sign in.",
    bodyBn: "সাইন ইন করতে আপনার ইমেইল বা ফোন এবং পাসওয়ার্ড ব্যবহার করুন।",
  },
  {
    Icon: Sparkles,
    titleEn: "Start Using Noor",
    titleBn: "নূর ব্যবহার শুরু করুন",
    bodyEn: "Open prayer times, events, donations and more.",
    bodyBn: "নামাজের সময়, অনুষ্ঠান, দান এবং আরও অনেক কিছু খুলুন।",
  },
];

export function CreateAccountSection() {
  const { language } = useLanguage();
  const bn = language === "bn";

  return (
    <section className="bg-[#073a2d] py-16 sm:py-20 lg:py-24 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={bn ? "অ্যাকাউন্ট তৈরি" : "CREATE AN ACCOUNT"}
          title={bn ? "কীভাবে অ্যাকাউন্ট তৈরি করবেন" : "How to create your account"}
          description={
            bn
              ? "কয়েক মিনিটেই হয়ে যাবে। ধাপে ধাপে অনুসরণ করুন।"
              : "It only takes a few minutes. Follow the steps below."
          }
        />

        <ol className="mt-12 grid gap-4 sm:gap-5 lg:grid-cols-5">
          {ACCOUNT_STEPS.map(({ Icon, titleEn, titleBn, bodyEn, bodyBn }, i) => (
            <li
              key={titleEn}
              className="relative rounded-xl border border-[#0d4d3b] bg-[#0a2c22]/80 p-5 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D4AF37] font-montserrat text-sm font-bold text-[#13231c]">
                  {i + 1}
                </span>
                <Icon className="h-5 w-5 shrink-0 text-[#D4AF37]" strokeWidth={1.5} />
              </div>
              <h3 className="mt-4 text-base xs:text-lg font-sans font-bold text-white">
                {bn ? titleBn : titleEn}
              </h3>
              <p className="mt-1.5 text-xs xs:text-sm leading-relaxed text-white/70 font-sans">
                {bn ? bodyBn : bodyEn}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-gradient-to-r from-[#e7b864] to-[#c18931] px-6 py-3 text-sm font-semibold text-[#13231c] shadow-md transition hover:opacity-90"
          >
            {bn ? "অ্যাকাউন্ট তৈরি করুন" : "Create Your Account"}
          </Link>
          <Link
            href="/signin"
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#dca74e]/50 px-6 py-3 text-sm font-semibold text-[#dca74e] transition hover:bg-[#dca74e]/10"
          >
            {bn ? "আগে থেকেই অ্যাকাউন্ট আছে? সাইন ইন করুন" : "Already have an account? Sign in"}
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * SECTION 3 — WHAT CAN I DO WITH NOOR?
 *
 * Every item links to a route that already exists. Nothing is advertised
 * that is not implemented: volunteering is linked to the public /about
 * volunteers form, not the admin-only dashboard.
 * ------------------------------------------------------------------ */
type Capability = {
  Icon: LucideIcon;
  titleEn: string;
  titleBn: string;
  bodyEn: string;
  bodyBn: string;
  href: string;
};

const CAPABILITIES: Capability[] = [
  {
    Icon: Clock,
    titleEn: "Check Prayer Times",
    titleBn: "নামাজের সময় দেখুন",
    bodyEn: "See today's prayer times at a glance.",
    bodyBn: "এক নজরে আজকের নামাজের সময় দেখুন।",
    href: "/prayer-times",
  },
  {
    Icon: Moon,
    titleEn: "See Jumu'ah Information",
    titleBn: "জুমু'আর তথ্য দেখুন",
    bodyEn: "Friday khutbah and jamaat times.",
    bodyBn: "শুক্রবারের খুতবা ও জামাতের সময়।",
    href: "/prayer-times#jumuah",
  },
  {
    Icon: BookOpen,
    titleEn: "Read Quran",
    titleBn: "কুরআন পড়ুন",
    bodyEn: "Browse surahs and read the Quran online.",
    bodyBn: "সূরা ব্রাউজ করুন এবং অনলাইনে কুরআন পড়ুন।",
    href: "/quran",
  },
  {
    Icon: Megaphone,
    titleEn: "Read Mosque Announcements",
    titleBn: "মসজিদের ঘোষণা পড়ুন",
    bodyEn: "Stay up to date with mosque news.",
    bodyBn: "মসজিদের খবরের সাথে আপডেট থাকুন।",
    href: "/announcements",
  },
  {
    Icon: CalendarDays,
    titleEn: "Join Events",
    titleBn: "অনুষ্ঠানে যোগ দিন",
    bodyEn: "Browse and join upcoming community events.",
    bodyBn: "আসন্ন কমিউনিটি অনুষ্ঠান দেখুন এবং যোগ দিন।",
    href: "/events",
  },
  {
    Icon: Heart,
    titleEn: "Donate",
    titleBn: "দান করুন",
    bodyEn: "Support your mosque with a donation.",
    bodyBn: "দান করে আপনার মসজিদকে সহায়তা করুন।",
    href: "/donations",
  },
  {
    Icon: Receipt,
    titleEn: "View Your Contributions",
    titleBn: "আপনার দান দেখুন",
    bodyEn: "See your giving history in your account.",
    bodyBn: "আপনার অ্যাকাউন্টে দানের ইতিহাস দেখুন।",
    href: "/account/donations",
  },
  {
    Icon: GraduationCap,
    titleEn: "Register for Classes",
    titleBn: "ক্লাসে নিবন্ধন করুন",
    bodyEn: "Find and join classes for all ages.",
    bodyBn: "সব বয়সের জন্য ক্লাস খুঁজুন এবং যোগ দিন।",
    href: "/account/classes",
  },
  {
    Icon: Users,
    titleEn: "Volunteer",
    titleBn: "স্বেচ্ছাসেবক হোন",
    bodyEn: "Offer your time through the volunteers form.",
    bodyBn: "স্বেচ্ছাসেবক ফর্মের মাধ্যমে আপনার সময় দিন।",
    href: "/about#volunteers",
  },
  {
    Icon: Phone,
    titleEn: "Contact the Mosque",
    titleBn: "মসজিদে যোগাযোগ করুন",
    bodyEn: "Reach the mosque with questions.",
    bodyBn: "প্রশ্নের জন্য মসজিদে যোগাযোগ করুন।",
    href: "/contact",
  },
];

export function WhatCanIDoSection() {
  const { language } = useLanguage();
  const bn = language === "bn";

  return (
    <section className="bg-[#FAF8F5] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={bn ? "নূর দিয়ে কী করবেন" : "WHAT CAN I DO WITH NOOR?"}
          title={bn ? "নূর দিয়ে যা যা করতে পারেন" : "Everything you can do with Noor"}
          description={
            bn
              ? "নীচে আপনার জন্য যা যা আছে তার একটি তালিকা। যেকোনো কার্ডে চাপ দিন।"
              : "Here is everything waiting for you. Tap any card to get started."
          }
        />

        <ul className="mt-12 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {CAPABILITIES.map(({ Icon, titleEn, titleBn, bodyEn, bodyBn, href }) => (
            <li key={titleEn}>
              <Link
                href={href}
                className="group flex h-full flex-col rounded-2xl border border-[#E7E2D6] bg-white p-5 xs:p-6 shadow-sm transition-all duration-300 hover:border-[#D4AF37] hover:shadow-xl hover:-translate-y-1.5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#073a2d]/10 text-[#0F2E26] transition-colors group-hover:bg-[#073a2d] group-hover:text-[#D4AF37]">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <h3 className="mt-4 text-base xs:text-lg font-sans font-bold text-[#0F2E26]">
                  {bn ? titleBn : titleEn}
                </h3>
                <p
                  className="mt-1.5 text-xs xs:text-sm leading-relaxed text-[#6B7280] font-sans"
                  style={{ fontFamily: "var(--font-body-en), 'Inter', sans-serif" }}
                >
                  {bn ? bodyBn : bodyEn}
                </p>
                <span className="mt-4 inline-block text-xs xs:text-sm font-semibold text-[#0F2E26] group-hover:text-[#D4AF37] transition-colors">
                  {bn ? "শুরু করুন →" : "Get started →"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * SECTION 4 — FAQ / HELP
 *
 * A simple disclosure accordion (no external component — none exists in
 * the codebase). Each answer links to the real page for more detail.
 * ------------------------------------------------------------------ */
const FAQ_ITEMS: Array<{
  qEn: string;
  qBn: string;
  aEn: string;
  aBn: string;
  href?: string;
  ctaEn?: string;
  ctaBn?: string;
}> = [
  {
    qEn: "How do I create an account?",
    qBn: "কীভাবে অ্যাকাউন্ট তৈরি করব?",
    aEn: "Tap “Sign Up” at the top of the page, enter your name, email or phone and a password, then follow the steps to finish.",
    aBn: "পেজের উপরে “সাইন আপ”-এ চাপ দিন, আপনার নাম, ইমেইল বা ফোন এবং একটি পাসওয়ার্ড দিন, তারপর বাকি ধাপগুলো অনুসরণ করুন।",
    href: "/signup",
    ctaEn: "Create an account →",
    ctaBn: "অ্যাকাউন্ট তৈরি করুন →",
  },
  {
    qEn: "How do I check today's prayer times?",
    qBn: "কীভাবে আজকের নামাজের সময় দেখব?",
    aEn: "Open the Prayer Times page. Today's times are shown at the top, and the next prayer is highlighted for you.",
    aBn: "নামাজের সময় পেজটি খুলুন। উপরে আজকের সময় দেখানো আছে এবং পরবর্তী নামাজটি হাইলাইট করা থাকে।",
    href: "/prayer-times",
    ctaEn: "View prayer times →",
    ctaBn: "নামাজের সময় দেখুন →",
  },
  {
    qEn: "How do I donate?",
    qBn: "কীভাবে দান করব?",
    aEn: "Open the Donations page, choose an amount and follow the payment steps. You can also see the public funds your gift supports.",
    aBn: "দান পেজটি খুলুন, একটি পরিমাণ বেছে নিন এবং পেমেন্টের ধাপগুলো অনুসরণ করুন। আপনার দান কোন তহবিলে যায় তাও দেখতে পারেন।",
    href: "/donations",
    ctaEn: "Go to donations →",
    ctaBn: "দান পেজে যান →",
  },
  {
    qEn: "How can I see my contribution history?",
    qBn: "কীভাবে আমার দানের ইতিহাস দেখব?",
    aEn: "Sign in, then open “My Donations” from your account to see your giving history.",
    aBn: "সাইন ইন করুন, তারপর আপনার অ্যাকাউন্ট থেকে “আমার দান” খুলে দানের ইতিহাস দেখুন।",
    href: "/account/donations",
    ctaEn: "Open my donations →",
    ctaBn: "আমার দান খুলুন →",
  },
  {
    qEn: "How do I receive mosque announcements?",
    qBn: "কীভাবে মসজিদের ঘোষণা পাব?",
    aEn: "Announcements appear on the home page and the Announcements page. After signing in, you can also receive them in your account notifications.",
    aBn: "ঘোষণা হোম পেজ এবং ঘোষণা পেজে দেখা যায়। সাইন ইন করার পর আপনার অ্যাকাউন্টের নোটিফিকেশনে-ও পাবেন।",
    href: "/announcements",
    ctaEn: "Read announcements →",
    ctaBn: "ঘোষণা পড়ুন →",
  },
  {
    qEn: "Can I use Noor on my phone?",
    qBn: "মোবাইলে কি নূর ব্যবহার করা যাবে?",
    aEn: "Yes. Noor works in any phone browser. Just open the website on your phone — the layout adjusts to fit your screen.",
    aBn: "হ্যাঁ। নূর যেকোনো ফোনের ব্রাউজারে চলে। আপনার ফোনে ওয়েবসাইটটি খুলুন — লেআউট স্বয়ংক্রিয়ভাবে আপনার স্ক্রিনের সাথে মানিয়ে নেয়।",
  },
];

function FaqItem({
  qEn,
  qBn,
  aEn,
  aBn,
  href,
  ctaEn,
  ctaBn,
  defaultOpen = false,
}: {
  qEn: string;
  qBn: string;
  aEn: string;
  aBn: string;
  href?: string;
  ctaEn?: string;
  ctaBn?: string;
  defaultOpen?: boolean;
}) {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `faq-panel-${qEn.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;

  return (
    <div className="rounded-xl border border-[#E7E2D6] bg-white shadow-sm transition-colors hover:border-[#D4AF37]/60">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-12 w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm xs:text-base font-sans font-semibold text-[#0F2E26]">
          {bn ? qBn : qEn}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[#D4AF37] transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        id={panelId}
        role="region"
        className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-[#F0EDE3] px-5 pb-5 pt-3">
            <p
              className="text-xs xs:text-sm leading-relaxed text-[#6B7280] font-sans"
              style={{ fontFamily: "var(--font-body-en), 'Inter', sans-serif" }}
            >
              {bn ? aBn : aEn}
            </p>
            {href && ctaEn && ctaBn && (
              <Link
                href={href}
                className="mt-3 inline-block text-xs xs:text-sm font-semibold text-[#0F2E26] hover:text-[#D4AF37] transition-colors"
              >
                {bn ? ctaBn : ctaEn}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FaqSection() {
  const { language } = useLanguage();
  const bn = language === "bn";

  return (
    <section className="bg-[#FAF8F5] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={bn ? "সাহায্য ও উত্তর" : "FAQ / HELP"}
          title={bn ? "সাধারণ প্রশ্নের উত্তর" : "Answers to common questions"}
          description={
            bn
              ? "আপনার প্রশ্নের উত্তর না পেলে যোগাযোগ পেজ থেকে মসজিদে জানাতে পারেন।"
              : "Didn't find your answer? Reach out through the contact page."
          }
        />

        <div className="mt-10 flex flex-col gap-3">
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem key={item.qEn} {...item} defaultOpen={i === 0} />
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-[#6B7280] font-sans">
          {bn ? "আরও প্রশ্ন আছে?" : "Still have questions?"}{" "}
          <Link
            href="/contact"
            className="font-semibold text-[#0F2E26] underline decoration-[#D4AF37] underline-offset-2 hover:text-[#D4AF37]"
          >
            {bn ? "যোগাযোগ করুন" : "Contact us"}
          </Link>
        </p>
      </div>
    </section>
  );
}
