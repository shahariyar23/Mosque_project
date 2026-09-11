"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage, translations } from "@/components/language-provider";
import { useAuth } from "@/components/auth-provider";
import { UserMenu } from "@/components/account/UserMenu";
import { gsap, useIsomorphicLayoutEffect } from "@/lib/gsap";
import { siteConfig } from "@/config/site";
import { usePublicPrayerTimes } from "@/hooks/use-public-prayer-times";
import { useMosqueBranding } from "@/components/mosque-branding-provider";

const links = [
  { label: "Home", href: "/", section: "home" },
  { label: "About", href: "/about", section: "about" },
  { label: "Prayer Times", href: "/prayer-times", section: "prayer-times" },
  { label: "Ramadan", href: "/ramadan", section: "ramadan" },
  { label: "Events", href: "/events", section: "events" },
  { label: "Services", href: "/services", section: "services" },
  { label: "Quran", href: "/quran", section: "quran" },
  { label: "Donations", href: "/donations", section: "donations" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const { session, loading } = useAuth();
  const { branding } = useMosqueBranding();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const prevY = useRef(0);
  const rafRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const {
    prayers,
    hijri,
    nextPrayerIndex,
    countdownSeconds,
    loading: prayerTimesLoading,
  } = usePublicPrayerTimes();

  // scroll behavior: scrolled state + hide on scroll down / show on scroll up
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setScrolled(y > 24);
        if (y > prevY.current && y > 120) {
          // scrolling down
          setHidden(true);
        } else {
          // scrolling up
          setHidden(false);
        }
        prevY.current = y;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // close on escape & outside click for mobile menu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (
        open &&
        headerRef.current &&
        !headerRef.current.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const t = (key: string) =>
    language === "bn" ? (translations.bn[key] ?? key) : key;
  const routeActiveIndex = links.findIndex((link) => link.href === pathname);
  const currentActiveIndex = pathname === "/" ? 0 : routeActiveIndex;

  const needsGlassHeader =
    pathname.startsWith("/account") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/transparency");
  const forceScrolled = scrolled || needsGlassHeader;

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (prefersReducedMotion) return;

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      
      tl.fromTo(
        ".logo-group",
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.6 }
      )
      .fromTo(
        ".nav-link",
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.05 },
        "-=0.3"
      )
      .fromTo(
        ".nav-user-menu, .donate-btn",
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.4 },
        "-=0.2"
      );
    }, headerRef);
    return () => ctx.revert();
  }, []);

  return (
    <header
      ref={headerRef}
      className={`fixed inset-x-0 top-0 z-40 text-white transition-all duration-300 ${forceScrolled ? "site-header--scrolled" : ""} ${hidden ? "-translate-y-full" : "translate-y-0"}`}
    >
      <MosqueInformationBar
        language={language}
        setLanguage={setLanguage}
        hijri={hijri}
        prayer={prayers[nextPrayerIndex]}
        countdownSeconds={countdownSeconds}
        loading={prayerTimesLoading}
      />
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className="logo-mark -ml-2.5 flex items-center gap-3 px-2 py-1 outline-none transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-white/20"
          aria-label={`${branding.name || siteConfig.name} Mosque home`}
          suppressHydrationWarning
        >
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.name || siteConfig.name}
              className="h-10 w-10 rounded-full object-cover border border-[#e0be79] shadow-sm logo-mark"
            />
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-full border border-[#e0be79] text-xl text-[#e0be79] logo-mark">
              ✦
            </span>
          )}
          <div className="hidden lg:block">
            <b className="block text-sm tracking-[.18em]" suppressHydrationWarning>
              {t((branding.shortName || branding.name || siteConfig.name).toUpperCase())}
            </b>
            <span className="block text-[10px] uppercase tracking-[.18em] text-[#e0be79] opacity-90">
              Community Mosque
            </span>
          </div>
        </Link>

        <div className="hidden items-center gap-6 text-sm text-white/85 lg:flex">
          {links.map((link, i) => {
            const isActive = i === currentActiveIndex;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`nav-link relative px-1 ${isActive ? "active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="nav-link-label">{t(link.label)}</span>
                <span className="nav-underline" aria-hidden="true" />
              </Link>
            );
          })}

          {loading ? (
            <SessionPlaceholder />
          ) : session ? (
            <div className="nav-user-menu">
              <UserMenu />
            </div>
          ) : (
            <>
              <Link
                href="/signin"
                className={`nav-link relative px-1 ${pathname === "/signin" ? "active" : ""}`}
                aria-current={pathname === "/signin" ? "page" : undefined}
              >
                <span className="nav-link-label">{t("Sign In")}</span>
                <span className="nav-underline" aria-hidden="true" />
              </Link>
              <Link href="/signup" className="donate-btn relative inline-block">
                {t("Sign Up")}
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 lg:hidden">
          {loading ? (
            <SessionPlaceholder compact />
          ) : session ? (
            <UserMenu />
          ) : (
            <Link
              href="/signin"
              className="nav-user-menu inline-flex min-h-10 items-center rounded-full border border-white/20 bg-white/5 px-3 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e0be79]"
            >
              {t("Sign In")}
            </Link>
          )}
          <button
            onClick={() => setOpen((value) => !value)}
            className="grid h-10 w-10 place-items-center border border-white/40 text-xl"
            aria-expanded={open}
            aria-label={open ? "Close navigation" : "Open navigation"}
          >
            {open ? "×" : "☰"}
          </button>
        </div>
      </nav>

      <div
        ref={menuRef}
        className={`mobile-menu lg:hidden ${open ? "open" : "closed"}`}
        aria-hidden={!open}
      >
        <div className="px-6 py-6">
          {links.map((link) => (
            <Link
              key={link.label}
              onClick={() => setOpen(false)}
              className="block border-b border-white/10 py-3 text-sm"
              href={link.href}
            >
              {t(link.label)}
            </Link>
          ))}
          {!loading && !session && (
            <>
              <Link
                href="/signup"
                className="mt-5 block w-full bg-[#c79a45] px-4 py-3 text-center font-semibold text-[#15251f]"
              >
                {t("Sign Up")}
              </Link>
              <Link
                href="/signin"
                onClick={() => setOpen(false)}
                className="mt-3 block w-full border border-white/35 px-4 py-3 text-center text-sm font-medium"
              >
                {t("Sign In")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

type MosqueInformationBarProps = {
  language: "en" | "bn";
  setLanguage: (language: "en" | "bn") => void;
  hijri: {
    date: string | null;
    day: number | null;
    month: number | null;
    monthName: string | null;
    year: number | null;
  } | null;
  prayer: {
    nameEn: string;
    nameBn: string;
    timeEn: string;
    timeBn: string;
  } | undefined;
  countdownSeconds: number;
  loading: boolean;
};

function MosqueInformationBar({
  language,
  setLanguage,
  hijri,
  prayer,
  countdownSeconds,
  loading,
}: MosqueInformationBarProps) {
  const isBangla = language === "bn";
  const hijriLabel = formatHijriDate(hijri, isBangla);
  const prayerLabel = prayer ? (isBangla ? prayer.nameBn : prayer.nameEn) : null;
  const prayerTime = prayer ? (isBangla ? prayer.timeBn : prayer.timeEn) : null;
  const countdown = formatPrayerCountdown(countdownSeconds, isBangla);

  return (
    <aside
      className="border-b border-[#c79a45]/35 bg-[var(--green-deep)] text-[var(--ivory)]"
      aria-label={isBangla ? "মসজিদের আজকের তথ্য" : "Today's mosque information"}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 px-5 py-1 text-[10px] leading-5 sm:flex sm:flex-row sm:flex-wrap sm:gap-x-3 sm:py-1.5 sm:text-[11px] lg:flex-nowrap lg:px-8">
        <p className="min-w-0 truncate font-medium tracking-[0.08em] text-white/90 sm:whitespace-nowrap">
          <span className="mr-1 hidden text-[9px] font-semibold tracking-[0.16em] text-[var(--gold)] sm:inline">
            {isBangla ? "হিজরি" : "HIJRI"}
          </span>
          {loading ? "···" : hijriLabel ?? "—"}
        </p>

        <span className="hidden h-3 w-px bg-[#c79a45]/45 sm:block" aria-hidden="true" />

        <p className="col-span-2 min-w-0 whitespace-nowrap text-white/90 sm:col-auto" aria-live="polite">
          <span className="mr-1 text-[8px] font-semibold tracking-[0.14em] text-[var(--gold)] sm:text-[9px] sm:tracking-[0.16em]">
            {isBangla ? "পরবর্তী নামাজ" : "NEXT PRAYER"}
          </span>
          {loading ? (
            "···"
          ) : prayerLabel && prayerTime ? (
            <>
              <strong className="font-semibold">{prayerLabel}</strong>{" "}
              <span className="font-medium tabular-nums">{prayerTime}</span>
              <span className="mx-1 text-[var(--gold)]" aria-hidden="true">•</span>
              <span className="tabular-nums text-white/65">
                {isBangla ? `${countdown} বাকি` : `in ${countdown}`}
              </span>
            </>
          ) : (
            <span className="text-white/65">{isBangla ? "সময় পাওয়া যাচ্ছে না" : "Times unavailable"}</span>
          )}
        </p>

        <div className="col-start-2 row-start-1 flex items-center gap-1 justify-self-end sm:ml-auto" aria-label="Language">
          <button
            type="button"
            onClick={() => setLanguage("en")}
            aria-pressed={language === "en"}
            className={`min-h-8 rounded px-1.5 text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ivory)] ${language === "en" ? "bg-[var(--gold)] text-[var(--ink)]" : "text-white/70 hover:text-white"}`}
          >
            English
          </button>
          <span className="text-[#c79a45]" aria-hidden="true">|</span>
          <button
            type="button"
            onClick={() => setLanguage("bn")}
            aria-pressed={language === "bn"}
            className={`min-h-8 rounded px-1.5 text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ivory)] ${language === "bn" ? "bg-[var(--gold)] text-[var(--ink)]" : "text-white/70 hover:text-white"}`}
          >
            বাংলা
          </button>
        </div>
      </div>
    </aside>
  );
}

function formatHijriDate(hijri: MosqueInformationBarProps["hijri"], isBangla: boolean) {
  if (!hijri) return null;

  const [dayFromDate, monthFromDate, yearFromDate] = (hijri.date ?? "")
    .split("-")
    .map(Number);
  const day = hijri.day ?? dayFromDate;
  const month = hijri.month ?? monthFromDate;
  const year = hijri.year ?? yearFromDate;
  if (!day || !month || !year) return null;

  const monthNames = isBangla
    ? ["মুহাররম", "সফর", "রবিউল আউয়াল", "রবিউস সানি", "জমাদিউল আউয়াল", "জমাদিউস সানি", "রজব", "শাবান", "রমজান", "শাওয়াল", "জিলকদ", "জিলহজ"]
    : ["Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani", "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban", "Ramadan", "Shawwal", "Dhu al-Qidah", "Dhu al-Hijjah"];
  const monthName = isBangla ? monthNames[month - 1] : hijri.monthName ?? monthNames[month - 1];
  if (!monthName) return null;

  return isBangla
    ? `${toBengaliNumerals(day)} ${monthName} ${toBengaliNumerals(year)} হিজরি`
    : `${day} ${monthName} ${year} AH`;
}

function formatPrayerCountdown(countdownSeconds: number, isBangla: boolean) {
  const totalMinutes = Math.max(0, Math.floor(countdownSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const value = hours ? (minutes ? `${hours}h ${minutes}m` : `${hours}h`) : `${minutes}m`;
  return isBangla ? toBengaliNumerals(value) : value;
}

function toBengaliNumerals(value: string | number) {
  const digits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(value).replace(/\d/g, (digit) => digits[Number(digit)] ?? digit);
}

/**
 * Stands in for the account control while the session is being recovered.
 *
 * The signed-out state and the not-yet-known state are different, and the header is where showing them as
 * the same thing is most visible: a reload holds no access token, so rendering "Sign In / Sign Up" during
 * the recovery call announces to a signed-in visitor that they have been logged out, then replaces it a
 * moment later. A placeholder of roughly the avatar's size says "checking" and holds the space still.
 */
function SessionPlaceholder({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2" role="status" aria-live="polite">
      <span className="h-8 w-8 animate-pulse rounded-full bg-white/15" aria-hidden="true" />
      {!compact && (
        <span
          className="hidden h-3 w-16 animate-pulse rounded bg-white/10 lg:block"
          aria-hidden="true"
        />
      )}
      <span className="sr-only">Checking your session…</span>
    </div>
  );
}
