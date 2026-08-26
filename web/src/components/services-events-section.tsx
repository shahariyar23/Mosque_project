"use client";
import { useRef } from "react";
import { useLanguage } from "@/components/language-provider";
import { gsap, useIsomorphicLayoutEffect } from "@/lib/gsap";
import { Moon, BookOpen, Home, Heart } from "lucide-react";

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
        {
          Icon: Moon,
          title: "দৈনিক নামাজ",
          description: "শান্ত ও আন্তরিক পরিবেশে পাঁচ ওয়াক্ত জামাতের নামাজ।",
        },
        {
          Icon: BookOpen,
          title: "কুরআন শিক্ষা",
          description: "সব বয়স ও দক্ষতার জন্য অর্থবহ কুরআন শিক্ষা।",
        },
        {
          Icon: Home,
          title: "নিকাহ সেবা",
          description: "জীবনের গুরুত্বপূর্ণ শুরুর জন্য দিকনির্দেশনা।",
        },
        {
          Icon: Heart,
          title: "কমিউনিটি সেবা",
          description: "প্রতিবেশী ও পরিবারগুলোর জন্য বাস্তব সহায়তা।",
        },
      ]
    : [
        {
          Icon: Moon,
          title: "Daily Prayer",
          description: "Five daily congregational prayers in a calm, welcoming space.",
        },
        {
          Icon: BookOpen,
          title: "Quran Classes",
          description: "Meaningful Quran learning for every age and ability.",
        },
        {
          Icon: Home,
          title: "Nikah Services",
          description: "Guidance for one of life’s most important beginnings.",
        },
        {
          Icon: Heart,
          title: "Community Care",
          description: "Practical support for our neighbours and families.",
        },
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
      {/* HOW WE SERVE SECTION */}
      <section ref={servicesRef} id="services" className="bg-[#FAF8F5] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p
            className="font-montserrat text-xs font-semibold tracking-[0.2em] text-[#D4AF37] uppercase"
            style={{ fontFamily: "var(--font-montserrat), 'Montserrat', sans-serif" }}
          >
            {bn ? "আমরা যেভাবে সেবা করি" : "HOW WE SERVE"}
          </p>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <h2
              className="text-3xl xs:text-4xl sm:text-5xl lg:text-[46px] font-serif font-bold text-[#0F2E26] leading-[1.18] tracking-tight"
              style={{ fontFamily: "var(--font-heading-en), 'Playfair Display', serif" }}
            >
              {bn ? "আমাদের সম্প্রদায়ের হৃদয়ে" : "At the heart of our community"}<span className="text-[#D4AF37]">.</span>
            </h2>

            <a
              href="/services"
              className="text-sm font-sans font-semibold text-[#0F2E26] hover:text-[#D4AF37] transition-colors border-b-2 border-[#D4AF37] pb-0.5"
              style={{ fontFamily: "var(--font-body-en), 'Inter', sans-serif" }}
            >
              {bn ? "সব সেবা →" : "All services →"}
            </a>
          </div>

          {/* 4 Cards Grid with Distinct Card Gaps */}
          <div className="mt-10 grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-4 items-stretch">
            {services.map(({ Icon, title, description }) => (
              <article
                className="service-card group bg-[#FAF8F5] p-6 xs:p-7 sm:p-8 rounded-2xl border border-[#E7E2D6] shadow-sm hover:shadow-xl hover:border-[#D4AF37] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
                key={title}
              >
                <div>
                  <div className="text-[#D4AF37] mb-6">
                    <Icon className="w-6 h-6 text-[#D4AF37] transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5} />
                  </div>

                  <h3
                    className="text-lg xs:text-xl font-sans font-bold text-[#0F2E26] group-hover:text-[#D4AF37] transition-colors"
                    style={{ fontFamily: "var(--font-body-en), 'Inter', sans-serif" }}
                  >
                    {title}
                  </h3>

                  <p
                    className="mt-3 text-xs xs:text-sm leading-relaxed text-[#6B7280] font-sans"
                    style={{ fontFamily: "var(--font-body-en), 'Inter', sans-serif" }}
                  >
                    {description}
                  </p>
                </div>

                <div className="mt-6 pt-2">
                  <a
                    href="/services"
                    className="inline-flex items-center gap-1.5 text-xs xs:text-sm font-sans font-semibold text-[#0F2E26] group-hover:text-[#D4AF37] transition-colors"
                    style={{ fontFamily: "var(--font-body-en), 'Inter', sans-serif" }}
                  >
                    <span>{bn ? "আরও জানুন →" : "Learn more →"}</span>
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* JOIN US / UPCOMING AT NOOR SECTION */}
      <section ref={eventsRef} id="events" className="mx-auto max-w-7xl px-4 py-16 sm:py-20 lg:py-24 lg:px-8">
        <p
          className="font-montserrat text-xs font-semibold tracking-[0.2em] text-[#D4AF37] uppercase"
          style={{ fontFamily: "var(--font-montserrat), 'Montserrat', sans-serif" }}
        >
          {bn ? "আমাদের সাথে যোগ দিন" : "JOIN US"}
        </p>

        <h2
          className="mt-3 text-3xl xs:text-4xl sm:text-5xl lg:text-[46px] font-serif font-bold text-[#0F2E26] leading-[1.18] tracking-tight"
          style={{ fontFamily: "var(--font-heading-en), 'Playfair Display', serif" }}
        >
          {bn ? "নূরে আসন্ন অনুষ্ঠান" : "Upcoming at Noor"}<span className="text-[#D4AF37]">.</span>
        </h2>

        <div className="mt-10 grid gap-5 sm:gap-6 md:grid-cols-3">
          {events.map(([day, category, title, time]) => (
            <article
              className="event-card group border border-[#E7E2D6] p-6 xs:p-7 transition-all duration-300 hover:border-[#D4AF37] hover:shadow-xl hover:-translate-y-1.5 bg-[#FAF8F5] rounded-2xl flex flex-col justify-between"
              key={title}
            >
              <div>
                <div className="flex items-start gap-4">
                  <b
                    className="text-3xl xs:text-4xl text-[#0F2E26] font-montserrat font-bold transition-transform group-hover:scale-105 origin-left"
                    style={{ fontFamily: "var(--font-montserrat), 'Montserrat', sans-serif" }}
                  >
                    {day}
                  </b>
                  <span
                    className="pt-1.5 xs:pt-2 text-[10px] xs:text-xs font-montserrat font-semibold tracking-[0.2em] text-[#D4AF37] uppercase"
                    style={{ fontFamily: "var(--font-montserrat), 'Montserrat', sans-serif" }}
                  >
                    {bn ? "আগস্ট · " : "AUG · "}
                    {category}
                  </span>
                </div>

                <h3
                  className="mt-6 text-lg xs:text-xl font-sans font-bold text-[#0F2E26] group-hover:text-[#D4AF37] transition-colors"
                  style={{ fontFamily: "var(--font-body-en), 'Inter', sans-serif" }}
                >
                  {title}
                </h3>

                <p
                  className="mt-3 text-xs xs:text-sm text-[#6B7280] leading-relaxed font-sans"
                  style={{ fontFamily: "var(--font-body-en), 'Inter', sans-serif" }}
                >
                  {time}
                  <br />
                  {bn ? "নূর কমিউনিটি হল" : "Noor Community Hall"}
                </p>
              </div>

              <div className="mt-6 pt-2">
                <a
                  href="/events"
                  className="inline-block text-xs xs:text-sm font-sans font-semibold text-[#0F2E26] group-hover:text-[#D4AF37] transition-colors"
                  style={{ fontFamily: "var(--font-body-en), 'Inter', sans-serif" }}
                >
                  {bn ? "বিস্তারিত দেখুন →" : "View details →"}
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
