"use client";

import { useRef } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { siteConfig } from "@/config/site";
import { gsap, useIsomorphicLayoutEffect } from "@/lib/gsap";
import { Moon, BookOpen, Home, Heart, ArrowRight, Clock, MapPin } from "lucide-react";
import { usePublicHomeData } from "@/hooks/use-public-home-data";
import { EventGridSkeleton } from "@/components/ui/skeletons";

const SERVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  prayer: Moon,
  quran: BookOpen,
  nikah: Home,
  funeral: Heart,
  marriage: Home,
  education: BookOpen,
  community: Heart,
  default: Heart,
};

function getServiceIcon(category: string) {
  const key = category?.toLowerCase() || "default";
  return SERVICE_ICONS[key] || SERVICE_ICONS.default;
}

function formatEventDate(dateStr: string, bn: boolean): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (bn) {
    return date.toLocaleDateString("bn-BD", { day: "numeric", month: "short" });
  }
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

function formatEventDay(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return String(date.getDate());
}

export function ServicesEventsSection() {
  const { language } = useLanguage();
  const bn = language === "bn";
  const servicesRef = useRef<HTMLElement>(null);
  const eventsRef = useRef<HTMLElement>(null);
  const { data, loading } = usePublicHomeData();
  const { services, events } = data;

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (prefersReducedMotion) return;

      if (servicesRef.current) {
        const serviceCards = gsap.utils.toArray(servicesRef.current.querySelectorAll(".service-card"));
        if (serviceCards.length) {
          gsap.fromTo(
            serviceCards as HTMLElement[],
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

      if (eventsRef.current) {
        const eventCards = gsap.utils.toArray(eventsRef.current.querySelectorAll(".event-card"));
        if (eventCards.length) {
          gsap.fromTo(
            eventCards as HTMLElement[],
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

  const showServices = !loading.services && services.length > 0;
  const showEvents = !loading.events && events.length > 0;
  const loadingServices = loading.services && services.length === 0;
  const loadingEvents = loading.events && events.length === 0;

  if (!showServices && !showEvents && !loadingServices && !loadingEvents) {
    return null;
  }

  return (
    <>
      {showServices && (
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

              <Link
                href="/services"
                className="text-sm font-sans font-semibold text-[#0F2E26] hover:text-[#D4AF37] transition-colors border-b-2 border-[#D4AF37] pb-0.5"
                style={{ fontFamily: "var(--font-body-en), 'Inter', sans-serif" }}
              >
                {bn ? "সব সেবা →" : "All services →"}
              </Link>
            </div>

            <div className="mt-10 grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-4 items-stretch">
              {services.map((service) => {
                const Icon = getServiceIcon(service.category);
                return (
                  <article
                    className="service-card group bg-[#FAF8F5] p-6 xs:p-7 sm:p-8 rounded-2xl border border-[#E7E2D6] shadow-sm hover:shadow-xl hover:border-[#D4AF37] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
                    key={service.slug}
                  >
                    <div>
                      <div className="text-[#D4AF37] mb-6">
                        <Icon className="w-6 h-6 text-[#D4AF37] transition-transform duration-300 group-hover:scale-110" />
                      </div>

                      <h3
                        className="text-lg xs:text-xl font-sans font-bold text-[#0F2E26] group-hover:text-[#D4AF37] transition-colors"
                        style={{ fontFamily: "var(--font-body-en), 'Inter', sans-serif" }}
                      >
                        {service.name}
                      </h3>

                      <p
                        className="mt-3 text-xs xs:text-sm leading-relaxed text-[#6B7280] font-sans"
                        style={{ fontFamily: "var(--font-body-en), 'Inter', sans-serif" }}
                      >
                        {service.summary}
                      </p>
                    </div>

                    <div className="mt-6 pt-2">
                      <Link
                        href={`/services/${service.slug}`}
                        className="inline-flex items-center gap-1.5 text-xs xs:text-sm font-sans font-semibold text-[#0F2E26] group-hover:text-[#D4AF37] transition-colors"
                        style={{ fontFamily: "var(--font-body-en), 'Inter', sans-serif" }}
                      >
                        <span>{bn ? "আরও জানুন" : "Learn more"}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {showEvents && (
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
            {bn ? `${siteConfig.nameBn}-এ আসন্ন অনুষ্ঠান` : `Upcoming at ${siteConfig.name}`}<span className="text-[#D4AF37]">.</span>
          </h2>

          <div className="mt-10 grid gap-5 sm:gap-6 md:grid-cols-3">
            {events.map((event) => (
              <article
                className="event-card group border border-[#E7E2D6] p-6 xs:p-7 transition-all duration-300 hover:border-[#D4AF37] hover:shadow-xl hover:-translate-y-1.5 bg-[#FAF8F5] rounded-2xl flex flex-col justify-between"
                key={event.slug}
              >
                <div>
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <b
                        className="text-3xl xs:text-4xl text-[#0F2E26] font-montserrat font-bold transition-transform group-hover:scale-105 origin-left"
                        style={{ fontFamily: "var(--font-montserrat), 'Montserrat', sans-serif" }}
                      >
                        {formatEventDay(event.date)}
                      </b>
                      <span
                        className="text-[10px] xs:text-xs font-montserrat font-semibold tracking-[0.1em] text-[#D4AF37] uppercase"
                        style={{ fontFamily: "var(--font-montserrat), 'Montserrat', sans-serif" }}
                      >
                        {formatEventDate(event.date, false)}
                      </span>
                    </div>
                    <span
                      className="pt-1.5 xs:pt-2 text-[10px] xs:text-xs font-montserrat font-semibold tracking-[0.2em] text-[#D4AF37] uppercase"
                      style={{ fontFamily: "var(--font-montserrat), 'Montserrat', sans-serif" }}
                    >
                      {event.category}
                    </span>
                  </div>

                  <h3
                    className="mt-6 text-lg xs:text-xl font-sans font-bold text-[#0F2E26] group-hover:text-[#D4AF37] transition-colors"
                    style={{ fontFamily: "var(--font-body-en), 'Inter', sans-serif" }}
                  >
                    {event.title}
                  </h3>

                  <div className="mt-3 space-y-1.5">
                    {event.timeLabel && (
                      <p className="flex items-center gap-2 text-xs xs:text-sm text-[#6B7280] leading-relaxed font-sans">
                        <Clock className="w-3.5 h-3.5" />
                        {event.timeLabel}
                      </p>
                    )}
                    {event.location && (
                      <p className="flex items-center gap-2 text-xs xs:text-sm text-[#6B7280] leading-relaxed font-sans">
                        <MapPin className="w-3.5 h-3.5" />
                        {event.location}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-2">
                  <Link
                    href={`/events/${event.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs xs:text-sm font-sans font-semibold text-[#0F2E26] group-hover:text-[#D4AF37] transition-colors"
                    style={{ fontFamily: "var(--font-body-en), 'Inter', sans-serif" }}
                  >
                    <span>{bn ? "বিস্তারিত দেখুন" : "View details"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {(loadingServices || loadingEvents) && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:py-20 lg:py-24 lg:px-8">
          <EventGridSkeleton count={3} />
        </section>
      )}
    </>
  );
}
