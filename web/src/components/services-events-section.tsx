"use client";
import { useRef } from "react";
import { useLanguage } from "@/components/language-provider";
import { gsap, ScrollTrigger, useIsomorphicLayoutEffect } from "@/lib/gsap";

export function ServicesEventsSection() {
  const { language } = useLanguage();
  const bn = language === "bn";
  const servicesRef = useRef<HTMLElement>(null);
  const eventsRef = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (prefersReducedMotion) return;

      // Services Animation
      if (servicesRef.current) {
        const serviceCards = gsap.utils.toArray(servicesRef.current.querySelectorAll(".service-card"));
        if (serviceCards.length) {
          gsap.fromTo(
            serviceCards as any,
            { opacity: 0, y: 30 },
            {
              opacity: 1,
              y: 0,
              duration: 0.6,
              stagger: 0.1,
              ease: "power2.out",
              scrollTrigger: {
                trigger: servicesRef.current,
                start: "top 75%",
                once: true,
              },
            }
          );
        }
      }

      // Events Animation
      if (eventsRef.current) {
        const eventCards = gsap.utils.toArray(eventsRef.current.querySelectorAll(".event-card"));
        if (eventCards.length) {
          gsap.fromTo(
            eventCards as any,
            { opacity: 0, y: 30 },
            {
              opacity: 1,
              y: 0,
              duration: 0.6,
              stagger: 0.1,
              ease: "power2.out",
              scrollTrigger: {
                trigger: eventsRef.current,
                start: "top 75%",
                once: true,
              },
            }
          );
        }
      }
    });
    return () => ctx.revert();
  }, []);

  const services = bn
    ? [
        [
          "◐",
          "দৈনিক নামাজ",
          "শান্ত ও আন্তরিক পরিবেশে পাঁচ ওয়াক্ত জামাতের নামাজ।",
        ],
        ["◫", "কুরআন শিক্ষা", "সব বয়স ও দক্ষতার জন্য অর্থবহ কুরআন শিক্ষা।"],
        ["⌂", "নিকাহ সেবা", "জীবনের গুরুত্বপূর্ণ শুরুর জন্য দিকনির্দেশনা।"],
        ["♡", "কমিউনিটি সেবা", "প্রতিবেশী ও পরিবারগুলোর জন্য বাস্তব সহায়তা।"],
      ]
    : [
        [
          "◐",
          "Daily Prayer",
          "Five daily congregational prayers in a calm, welcoming space.",
        ],
        [
          "◫",
          "Quran Classes",
          "Meaningful Quran learning for every age and ability.",
        ],
        [
          "⌂",
          "Nikah Services",
          "Guidance for one of life’s most important beginnings.",
        ],
        [
          "♡",
          "Community Care",
          "Practical support for our neighbours and families.",
        ],
      ];
  const events = bn
    ? [
        [
          "২১",
          "সাপ্তাহিক তাফসির",
          "কুরআন থেকে ভাবনা",
          "প্রতি শুক্রবার · সন্ধ্যা ৭:৩০",
        ],
        ["২৪", "যুব", "ঈমান ও বন্ধুত্বের আয়োজন", "শনিবার · বিকেল ৪:০০"],
        ["২৮", "শিক্ষা", "কুরআন হিফজ কর্মসূচি", "মঙ্গলবার · সন্ধ্যা ৬:০০"],
      ]
    : [
        [
          "21",
          "WEEKLY TAFSIR",
          "Reflections from the Quran",
          "Every Friday · 7:30 PM",
        ],
        ["24", "YOUTH", "Faith & Friendship Circle", "Saturday · 4:00 PM"],
        ["28", "EDUCATION", "Quran Hifz Programme", "Tuesday · 6:00 PM"],
      ];
  return (
    <>
      <section ref={servicesRef} id="services" className="bg-[#ecece3] py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-bold tracking-[.2em] text-[#c79a45]">
            {bn ? "আমরা যেভাবে সেবা করি" : "HOW WE SERVE"}
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-4xl font-semibold">
              {bn
                ? "আমাদের সম্প্রদায়ের হৃদয়ে।"
                : "At the heart of our community."}
            </h2>
            <a href="/services" className="font-semibold text-[#0d4d3b] transition hover:text-[#c79a45]">
              {bn ? "সব সেবা →" : "All services →"}
            </a>
          </div>
          <div className="mt-10 grid gap-px bg-[#d8d8ce] md:grid-cols-2 lg:grid-cols-4">
            {services.map(([icon, title, description]) => (
              <article className="service-card group bg-[#f8f6ef] p-7 transition-all duration-500 hover:z-10 hover:-translate-y-2 hover:shadow-xl hover:bg-white" key={title}>
                <span className="text-2xl text-[#c79a45] transition-transform duration-300 group-hover:scale-110 block w-fit">{icon}</span>
                <h3 className="mt-7 text-xl font-semibold transition-colors group-hover:text-[#0d4d3b]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#69726d]">
                  {description}
                </p>
                <a
                  href="/services"
                  className="mt-6 inline-block text-sm font-semibold text-[#0d4d3b] transition-transform group-hover:translate-x-1"
                >
                  {bn ? "আরও জানুন →" : "Learn more →"}
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section ref={eventsRef} id="events" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <p className="text-xs font-bold tracking-[.2em] text-[#c79a45]">
          {bn ? "আমাদের সাথে যোগ দিন" : "JOIN US"}
        </p>
        <h2 className="mt-3 text-4xl font-semibold">
          {bn ? "নূরে আসন্ন অনুষ্ঠান।" : "Upcoming at Noor."}
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {events.map(([day, category, title, time]) => (
            <article className="event-card group border border-[#deded5] p-6 transition-all duration-300 hover:border-[#0d4d3b] hover:shadow-lg hover:-translate-y-1 bg-white" key={title}>
              <div className="flex items-start gap-4">
                <b className="text-4xl text-[#0d4d3b] transition-transform group-hover:scale-105 origin-left">{day}</b>
                <span className="pt-2 text-xs font-bold tracking-widest text-[#c79a45]">
                  {bn ? "আগস্ট · " : "AUG · "}
                  {category}
                </span>
              </div>
              <h3 className="mt-10 text-xl font-semibold group-hover:text-[#0d4d3b] transition-colors">{title}</h3>
              <p className="mt-3 text-sm text-[#69726d]">
                {time}
                <br />
                {bn ? "নূর কমিউনিটি হল" : "Noor Community Hall"}
              </p>
              <a
                href="/events"
                className="mt-6 inline-block text-sm font-semibold text-[#0d4d3b] transition-transform group-hover:translate-x-1"
              >
                {bn ? "বিস্তারিত দেখুন →" : "View details →"}
              </a>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
