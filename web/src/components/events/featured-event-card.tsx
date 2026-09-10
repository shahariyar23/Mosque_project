"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/ui/toast";
import { registerForEvent } from "@/services/eventService";
import { 
  formatEventDate, 
  formatEventTime, 
  formatEventDayNumber, 
  formatEventMonthShort, 
  formatEventWeekday, 
} from "@/components/events/event-data";
import { type MosqueEvent } from "@/lib/mosque/types";
import { Clock, MapPin, Sparkles, ArrowRight, CalendarPlus, Users, CheckCircle2, Loader2 } from "lucide-react";

const FALLBACK_IMAGE = "/alim-L7J4ytEFRCg-unsplash.jpg";

export function FeaturedEventCard({
  event,
  isRegistered = false,
  onRegistrationChange,
}: {
  event: MosqueEvent;
  isRegistered?: boolean;
  onRegistrationChange?: () => void;
}) {
  const { language } = useLanguage();
  const bn = language === "bn";
  const router = useRouter();
  const { notify } = useToast();
  const { session } = useAuth();
  const [registering, setRegistering] = useState(false);
  const [registeredState, setRegisteredState] = useState(isRegistered);

  const title = event.title;
  const description = event.description;
  const location = event.location;

  // Google calendar link with timezone safety
  const startDateTime = `${event.date.replaceAll("-", "")}T${event.startTime.replace(":", "")}00`;
  const endDateTime = `${(event.endTime || "23:59").replaceAll("-", "")}T${(event.endTime || "23:59").replace(":", "")}00`;
  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDateTime}/${endDateTime}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.location)}`;

  const isFull = Boolean(event.capacity && event.registered && event.registered >= event.capacity);
  const [imgSrc, setImgSrc] = useState(event.imageUrl || FALLBACK_IMAGE);

  const handleRegister = async () => {
    if (registering) return;
    if (!session?.user) {
      router.push(`/sign-in?redirect=/events`);
      return;
    }
    if (!event.id) return;
    setRegistering(true);
    try {
      await registerForEvent(event.id);
      setRegisteredState(true);
      onRegistrationChange?.();
      notify({
        tone: "success",
        message: bn ? "নিবন্ধন সফল হয়েছে" : "Registration successful",
        description: bn
          ? `আপনি "${event.title}" এ নিবন্ধিত হয়েছেন।`
          : `You are now registered for "${event.title}".`,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : bn
          ? "নিবন্ধকরণ ব্যর্থ হয়েছে। আবার চেষ্টা করুন."
          : "Registration failed. Please try again.";
      notify({
        tone: "danger",
        message: bn ? "নিবন্ধকরণ ব্যর্থ" : "Registration failed",
        description: message,
      });
    } finally {
      setRegistering(false);
    }
  };

  const userIsRegistered = isRegistered || registeredState;

  return (
    <section aria-labelledby="featured-event-heading" className="w-full">
      <div className="relative overflow-hidden rounded-3xl border border-[#c79a45]/40 bg-white shadow-xl">
        <div className="grid lg:grid-cols-12 items-stretch">
          
          {/* Photography Side (5 cols on lg) */}
          <div className="relative lg:col-span-5 min-h-[260px] xs:min-h-[300px] sm:min-h-[360px] bg-[#072a20] overflow-hidden">
            <Image
              src={imgSrc}
              alt={title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover object-center filter brightness-[0.9] hover:scale-105 transition-transform duration-700 ease-out"
              onError={() => setImgSrc(FALLBACK_IMAGE)}
            />
            {/* Dark gradient overlay for legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/60" />

            {/* Top Badge: Featured Banner */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#072a20]/90 border border-[#c79a45]/60 text-[#e0be79] text-xs font-bold tracking-wider uppercase backdrop-blur-md shadow-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{bn ? "প্রধান আকর্ষণ · আসন্ন অনুষ্ঠান" : "FEATURED NEXT EVENT"}</span>
            </div>

            {/* Mobile / Inset Date Badge for quick scanning */}
            <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 p-3 rounded-2xl bg-black/75 backdrop-blur-md border border-white/20 text-white">
              <div className="text-center min-w-[50px] border-r border-white/20 pr-3">
                <span className="block text-[10px] font-bold text-[#e0be79] uppercase tracking-widest">
                  {formatEventMonthShort(event.date, language)}
                </span>
                <span className="block text-2xl font-serif font-bold text-white leading-none mt-0.5">
                  {formatEventDayNumber(event.date, language)}
                </span>
              </div>
              <div className="text-xs">
                <span className="font-semibold block text-white/90">
                  {formatEventWeekday(event.date, language)}
                </span>
                <span className="text-white/70">
                  {formatEventTime(event.startTime, language)}
                </span>
              </div>
            </div>
          </div>

          {/* Content Side (7 cols on lg) */}
          <div className="lg:col-span-7 p-6 xs:p-8 sm:p-10 flex flex-col justify-between bg-gradient-to-br from-white via-[#faf8f4] to-[#f4f0e6]">
            <div>
              {/* Category & Registration Status Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#eae6dc]">
                <span className="px-3 py-1 rounded-full bg-[#0d4d3b]/10 text-[#0d4d3b] text-xs font-bold tracking-wider uppercase">
                  {bn && event.category === "Education" ? "শিক্ষা" :
                   bn && event.category === "Quran" ? "কুরআন" :
                   bn && event.category === "Youth" ? "যুব" :
                   bn && event.category === "Charity" ? "দান" :
                   bn && event.category === "Community" ? "কমিউনিটি" :
                   bn && event.category === "Ramadan" ? "রমজান" :
                   bn && event.category === "Seminar" ? "সেমিনার" : event.category}
                </span>

                {isFull ? (
                  <span className="px-2.5 py-1 rounded-md bg-red-100 text-red-700 text-xs font-semibold">
                    {bn ? "আসন পূর্ণ" : "Event Full"}
                  </span>
                ) : event.registrationRequired ? (
                  <span className="px-2.5 py-1 rounded-md bg-[#c79a45]/20 text-[#0e2a22] text-xs font-semibold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#c79a45]" />
                    <span>{bn ? "নিবন্ধন প্রয়োজন" : "Registration Required"}</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-[#0d4d3b] text-xs font-semibold">
                    {bn ? "সবার জন্য উন্মুক্ত" : "Free · Open to All"}
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 id="featured-event-heading" className="mt-4 text-2xl xs:text-3xl sm:text-4xl font-serif font-bold text-[#0e2a22] leading-tight">
                {title}
              </h2>

              {/* Short narrative description */}
              <p className="mt-3 text-sm xs:text-base text-[#52605a] leading-relaxed line-clamp-3">
                {description}
              </p>

              {/* Key Details Grid (Date, Time, Location) */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-white border border-[#e5e1d3] shadow-sm">
                <div className="flex items-center gap-3 text-xs sm:text-sm text-[#2f3d37]">
                  <div className="w-8 h-8 rounded-lg bg-[#0d4d3b]/10 text-[#0d4d3b] flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#718079] uppercase font-bold block">
                      {bn ? "তারিখ ও সময়" : "When"}
                    </span>
                    <span className="font-semibold text-[#0e2a22]">
                      {formatEventDate(event.date, language, { weekday: "short", month: "short", day: "numeric" })} · {formatEventTime(event.startTime, language)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs sm:text-sm text-[#2f3d37]">
                  <div className="w-8 h-8 rounded-lg bg-[#c79a45]/15 text-[#c79a45] flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#718079] uppercase font-bold block">
                      {bn ? "অনুষ্ঠানের স্থান" : "Where"}
                    </span>
                    <span className="font-semibold text-[#0e2a22] line-clamp-1">
                      {location}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons (Touch targets >= 44px) */}
            <div className="mt-8 pt-6 border-t border-[#eae6dc] flex flex-col xs:flex-row items-stretch xs:items-center gap-3">
              {userIsRegistered ? (
                <>
                  <Link
                    href={`/account/events/${event.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-700 text-white font-semibold text-sm transition-all duration-200 hover:bg-emerald-800 active:scale-[0.98] shadow-md min-h-[48px]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span className="text-white">{bn ? "নিবন্ধিত · ডিজিটাল পাস" : "Registered · View Pass"}</span>
                  </Link>

                  <Link
                    href={`/events/${event.slug}`}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-[#cfc9b8] bg-white hover:bg-[#faf7f0] text-[#0d4d3b] font-medium text-sm transition-all duration-200 hover:border-[#c79a45] min-h-[48px]"
                  >
                    <span>{bn ? "বিস্তারিত" : "Details"}</span>
                    <ArrowRight className="w-4 h-4 text-[#0d4d3b]" />
                  </Link>
                </>
              ) : event.registrationRequired ? (
                <>
                  <button
                    type="button"
                    onClick={handleRegister}
                    disabled={registering || isFull}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#0d4d3b] text-white font-semibold text-sm transition-all duration-200 hover:bg-[#072a20] active:scale-[0.98] shadow-md min-h-[48px] disabled:opacity-60"
                  >
                    {registering ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span className="text-white">{bn ? "নিবন্ধন হচ্ছে..." : "Registering..."}</span>
                      </>
                    ) : isFull ? (
                      <span className="text-white">{bn ? "আসন পূর্ণ" : "Event Full"}</span>
                    ) : (
                      <>
                        <Users className="w-4 h-4 text-[#c79a45]" />
                        <span className="text-white">{bn ? "এখনই নিবন্ধন করুন" : "Register for Event"}</span>
                      </>
                    )}
                  </button>

                  <Link
                    href={`/events/${event.slug}`}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-[#cfc9b8] bg-white hover:bg-[#faf7f0] text-[#0d4d3b] font-medium text-sm transition-all duration-200 hover:border-[#c79a45] min-h-[48px]"
                  >
                    <span>{bn ? "বিস্তারিত" : "Details"}</span>
                    <ArrowRight className="w-4 h-4 text-[#0d4d3b]" />
                  </Link>
                </>
              ) : (
                <Link
                  href={`/events/${event.slug}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#0d4d3b] text-white font-semibold text-sm transition-all duration-200 hover:bg-[#072a20] active:scale-[0.98] shadow-md min-h-[48px] hover:text-white"
                >
                  <span className="text-white">{bn ? "বিস্তারিত দেখুন" : "View Event Details"}</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </Link>
              )}

              <a
                href={calendarUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-[#cfc9b8] bg-white hover:bg-[#faf7f0] text-[#0d4d3b] font-medium text-sm transition-all duration-200 hover:border-[#c79a45] active:scale-[0.98] min-h-[48px]"
              >
                <CalendarPlus className="w-4 h-4 text-[#c79a45]" />
                <span>{bn ? "ক্যালেন্ডার" : "Add to Calendar"}</span>
              </a>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}

