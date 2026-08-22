"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage, translations } from "@/components/language-provider";

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

  return (
    <header
      ref={headerRef}
      className={`fixed inset-x-0 top-0 z-40 text-white transition-all duration-300 ${scrolled ? "site-header--scrolled" : ""} ${hidden ? "-translate-y-full" : "translate-y-0"}`}
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
            className="text-xs text-[#e0be79]"
            aria-label="Switch between English and Bangla"
          >
            {language === "bn" ? "English" : "বাংলা"}
          </button>
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
        </div>

        <button
          onClick={() => setOpen((value) => !value)}
          className="grid h-10 w-10 place-items-center border border-white/40 text-xl lg:hidden"
          aria-expanded={open}
          aria-label={open ? "Close navigation" : "Open navigation"}
        >
          {open ? "×" : "☰"}
        </button>
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
        </div>
      </div>
    </header>
  );
}
