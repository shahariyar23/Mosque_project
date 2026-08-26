"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage, translations } from "@/components/language-provider";
import { useAuth } from "@/components/auth-provider";
import { UserMenu } from "@/components/account/UserMenu";
import { gsap, useIsomorphicLayoutEffect } from "@/lib/gsap";

const links = [
  { label: "Home", href: "/", section: "home" },
  { label: "About", href: "/about", section: "about" },
  { label: "Prayer Times", href: "/prayer-times", section: "prayer-times" },
  { label: "Events", href: "/events", section: "events" },
  { label: "Services", href: "/services", section: "services" },
  { label: "Quran", href: "/quran", section: "quran" },
  { label: "Donations", href: "/donations", section: "donations" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const { session, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const prevY = useRef(0);
  const rafRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

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

  const isAppPage = pathname.startsWith("/account") || pathname.startsWith("/dashboard");
  const forceScrolled = scrolled || isAppPage;

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
        ".nav-lang-btn",
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.4 },
        "-=0.2"
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
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className="flex items-center gap-3 logo-group"
          aria-label="Noor Mosque home"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full border border-[#e0be79] text-xl text-[#e0be79] logo-mark">
            ✦
          </span>
          <span>
            <b className="block text-sm tracking-[.18em]">{t("NOOR")}</b>
            <span className="text-[10px] tracking-[.23em] text-white/65">
              {t("COMMUNITY MOSQUE")}
            </span>
          </span>
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

          <button
            onClick={() => setLanguage(language === "bn" ? "en" : "bn")}
            className="nav-lang-btn text-xs text-[#e0be79]"
            aria-label="Switch between English and Bangla"
          >
            {language === "bn" ? "English" : "বাংলা"}
          </button>
          
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

        <div className="flex items-center gap-4 lg:hidden">
          {loading ? <SessionPlaceholder compact /> : session ? <UserMenu /> : null}
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
          <button
            onClick={() => setLanguage(language === "bn" ? "en" : "bn")}
            className="mt-4 text-sm text-[#e0be79]"
          >
            {language === "bn" ? "English" : "বাংলা"}
          </button>
          
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
