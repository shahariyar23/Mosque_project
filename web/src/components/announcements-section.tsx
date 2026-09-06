"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { Megaphone } from "lucide-react";
import type { Announcement } from "@/lib/mosque/types";
import { fetchPublicAnnouncements } from "@/services/announcementsService";
import { DEFAULT_PUBLIC_MOSQUE_SLUG } from "@/services/publicHomeService";

/**
 * The public announcements strip.
 *
 * Optional section: when the mosque has no published, everyone-audience announcements — or the
 * public API is unavailable — the whole section renders nothing. A single failed fetch never takes
 * any other home page section down with it.
 */
export function AnnouncementsSection() {
  const { language } = useLanguage();
  const bn = language === "bn";

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchPublicAnnouncements(DEFAULT_PUBLIC_MOSQUE_SLUG, { limit: 5 })
      .then((res) => {
        const rows = res?.data ?? [];
        if (mounted && rows.length > 0) setAnnouncements(rows.slice(0, 5));
      })
      .catch(() => {
        // Public announcements unavailable — the section hides itself.
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return null;
  if (announcements.length === 0) return null;

  const categoryLabel = (category: string): string => {
    const map: Record<string, string> = {
      general: bn ? "সাধারণ" : "General",
      prayer: bn ? "নামাজ" : "Prayer",
      event: bn ? "অনুষ্ঠান" : "Event",
      ramadan: bn ? "রমজান" : "Ramadan",
      fundraising: bn ? "তহবিল সংগ্রহ" : "Fundraising",
      closure: bn ? "বন্ধ" : "Closure",
      urgent: bn ? "জরুরি" : "Urgent",
    };
    return map[category.toLowerCase()] ?? (bn ? "ঘোষণা" : "Announcement");
  };

  return (
    <section
      id="announcements"
      className="relative bg-[#040e0b] py-12 sm:py-16 px-4 sm:px-6 lg:px-8 text-white overflow-hidden"
    >
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-[#0c382b]/30 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#dca74e]/15 border border-[#dca74e]/40 text-[#f5d78e]">
              <Megaphone className="h-4 w-4" />
            </span>
            <h2 className="text-lg xs:text-xl sm:text-2xl font-serif font-bold tracking-tight">
              {bn ? "মসজিদের ঘোষণা" : "Mosque Announcements"}
            </h2>
          </div>
          <Link
            href="/announcements"
            className="shrink-0 text-[11px] xs:text-xs font-semibold text-[#f5d78e] hover:text-[#dca74e] transition-colors"
          >
            {bn ? "সব দেখুন →" : "View all →"}
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {announcements.map((announcement) => (
            <article
              key={announcement.title + (announcement.publishedAt ?? "")}
              className="rounded-lg border border-[#1b4334] bg-gradient-to-b from-[#0a271e] via-[#082019] to-[#061913] p-4 xs:p-5 transition-colors hover:border-[#dca74e]/40"
            >
              <span className="text-[9px] xs:text-[10px] font-bold tracking-widest uppercase text-[#dca74e]">
                {categoryLabel(announcement.category)}
              </span>
              <h3 className="mt-1.5 text-sm xs:text-base font-semibold text-white leading-snug">
                {announcement.title}
              </h3>
              {announcement.message && (
                <p className="mt-1.5 text-xs xs:text-[13px] leading-relaxed text-[#8ea499] line-clamp-2">
                  {announcement.message}
                </p>
              )}
              {announcement.author && (
                <p className="mt-2 text-[10px] xs:text-[11px] font-medium text-[#547365]">
                  {announcement.author}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
