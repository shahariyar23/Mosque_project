"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import {
  Calendar,
  User,
  Star,
  AlertTriangle,
  ArrowLeft,
  Share2,
  Check,
  Megaphone,
  Radio,
  Clock,
} from "lucide-react";
import type { Announcement } from "@/lib/mosque/types";
import { fetchPublicAnnouncementById } from "@/services/announcementsService";
import { DEFAULT_PUBLIC_MOSQUE_SLUG } from "@/services/publicHomeService";
import { useMosqueBranding } from "@/components/mosque-branding-provider";

export function AnnouncementDetailView({ idOrSlug }: { idOrSlug: string }) {
  const { language } = useLanguage();
  const bn = language === "bn";
  const { activeSlug } = useMosqueBranding();
  const mosqueSlug = activeSlug || DEFAULT_PUBLIC_MOSQUE_SLUG;

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetchPublicAnnouncementById(mosqueSlug, idOrSlug)
      .then((res: Announcement) => {
        if (mounted) setAnnouncement(res);
      })
      .catch((err: any) => {
        if (!mounted) return;
        console.error("Failed to load announcement details:", err);
        setError(
          bn
            ? "এই ঘোষণাটি খুঁজে পাওয়া যায়নি অথবা এটি এখন সক্রিয় নেই।"
            : "This announcement could not be found or is no longer active.",
        );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [idOrSlug, bn, mosqueSlug]);

  const handleShare = async () => {
    try {
      if (typeof window !== "undefined") {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback ignore
    }
  };

  const formatDate = (isoDate?: string | null) => {
    if (!isoDate) return "";
    try {
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) return isoDate;
      return new Intl.DateTimeFormat(bn ? "bn-BD" : "en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
    } catch {
      return isoDate;
    }
  };

  const categoryBadgeStyles = (cat?: string) => {
    switch (cat?.toLowerCase()) {
      case "urgent":
        return "text-[#f87171] border-[#ef4444]/40 bg-[#7f1d1d]/30";
      case "prayer":
        return "text-[#34d399] border-[#059669]/40 bg-[#064e3b]/30";
      case "ramadan":
        return "text-[#f5d78e] border-[#dca74e]/40 bg-[#dca74e]/15";
      case "fundraising":
        return "text-[#38bdf8] border-[#0284c7]/40 bg-[#075985]/30";
      case "event":
        return "text-[#a78bfa] border-[#7c3aed]/40 bg-[#5b21b6]/30";
      case "closure":
        return "text-[#fb923c] border-[#ea580c]/40 bg-[#9a3412]/30";
      default:
        return "text-[#cbd5e1] border-[#475569]/40 bg-[#334155]/30";
    }
  };

  const categoryLabel = (cat?: string) => {
    if (!cat) return "";
    const map: Record<string, { en: string; bn: string }> = {
      urgent: { en: "Urgent", bn: "জরুরি" },
      prayer: { en: "Prayer", bn: "নামাজ" },
      event: { en: "Event", bn: "অনুষ্ঠান" },
      ramadan: { en: "Ramadan", bn: "রমজান" },
      fundraising: { en: "Fundraising", bn: "তহবিল সংগ্রহ" },
      closure: { en: "Closure", bn: "ছুটি/বন্ধ" },
      general: { en: "General", bn: "সাধারণ" },
    };
    const found = map[cat.toLowerCase()];
    if (found) return bn ? found.bn : found.en;
    return cat;
  };

  if (loading) {
    return (
      <div className="flex-1 bg-[#040e0b] text-[#f6f5ee] py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="h-4 w-32 bg-[#143d2f] rounded-full" />
          <div className="h-10 w-3/4 bg-[#143d2f] rounded" />
          <div className="h-5 w-1/2 bg-[#143d2f]/70 rounded" />
          <div className="h-64 w-full bg-[#072018]/50 border border-[#1b4334]/50 rounded-xl mt-8" />
        </div>
      </div>
    );
  }

  if (error || !announcement) {
    return (
      <div className="flex-1 bg-[#040e0b] text-[#f6f5ee] py-20 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full text-center rounded-2xl border border-[#1b4334] bg-[#072018]/60 p-8 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-[#143d2f] border border-[#1b4334] flex items-center justify-center mx-auto mb-4 text-[#dca74e]">
            <Megaphone className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">
            {bn ? "ঘোষণাটি পাওয়া যায়নি" : "Announcement Not Found"}
          </h2>
          <p className="text-xs sm:text-sm text-[#8ea499] mb-6 leading-relaxed">
            {error || (bn ? "অনুরোধকৃত ঘোষণাটি সরানো হয়েছে বা এর মেয়াদ শেষ হয়েছে।" : "The requested notice may have expired or been removed.")}
          </p>
          <Link
            href="/announcements"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#dca74e] text-[#040e0b] text-xs font-bold hover:bg-[#f5d78e] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{bn ? "সকল ঘোষণায় ফিরে যান" : "Back to Announcements"}</span>
          </Link>
        </div>
      </div>
    );
  }

  const isUrgent = announcement.category?.toLowerCase() === "urgent";

  return (
    <div className="flex-1 bg-[#040e0b] text-[#f6f5ee] relative overflow-hidden">
      {/* Sanctuary background lighting */}
      <div className="absolute -top-32 left-1/3 w-[600px] h-[600px] bg-[#0c382b]/25 rounded-full blur-[170px] pointer-events-none" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative z-10">
        {/* Back Link Breadcrumb */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/announcements"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#8ea499] hover:text-[#f5d78e] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{bn ? "সকল ঘোষণা" : "All Announcements"}</span>
          </Link>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1b4334] bg-[#07221a] hover:border-[#dca74e] text-xs text-[#8ea499] hover:text-white transition-all"
            title={bn ? "লিংক কপি করুন" : "Copy notice link"}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#34d399]" />
                <span className="text-[#34d399] font-medium">{bn ? "কপি হয়েছে!" : "Copied!"}</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-[#dca74e]" />
                <span>{bn ? "শেয়ার করুন" : "Share"}</span>
              </>
            )}
          </button>
        </div>

        {/* Notice Header Container */}
        <article className="rounded-2xl border border-[#1b4334] bg-gradient-to-b from-[#0a271e] via-[#082019] to-[#061913] p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          {/* Status and Category Chips */}
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${categoryBadgeStyles(
                announcement.category,
              )}`}
            >
              {categoryLabel(announcement.category)}
            </span>

            {announcement.pinned && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#f5d78e] bg-[#dca74e]/15 border border-[#dca74e]/40 px-3 py-1 rounded-full">
                <Star className="w-3.5 h-3.5 fill-[#f5d78e]" />
                <span>{bn ? "পিন করা নোটিশ" : "Pinned Bulletin"}</span>
              </span>
            )}

            {announcement.audience && (
              <span className="text-xs text-[#547365] bg-[#061e16] border border-[#133c2e] px-2.5 py-1 rounded-full">
                {announcement.audience}
              </span>
            )}
          </div>

          {/* Announcement Headline */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-white leading-tight tracking-tight">
            {announcement.title}
          </h1>

          {/* Metadata Row */}
          <div className="mt-4 pt-4 border-t border-[#133c2e] flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-[#8ea499]">
            {announcement.publishedAt && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#dca74e]" />
                <span>{formatDate(announcement.publishedAt)}</span>
              </div>
            )}

            {announcement.author && (
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#dca74e]" />
                <span className="font-medium text-white">{announcement.author}</span>
              </div>
            )}

            {announcement.channels && announcement.channels.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-[#547365]" />
                <span className="text-[#547365]">
                  {announcement.channels.join(" • ")}
                </span>
              </div>
            )}
          </div>

          {/* Urgent Warning Callout */}
          {isUrgent && (
            <div className="mt-6 rounded-xl border border-[#ef4444]/40 bg-[#3f0f0f]/40 p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#f87171] shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-[#fca5a5]">
                <strong className="block font-bold mb-0.5">
                  {bn ? "জরুরি নির্দেশনা:" : "Priority Attention Required:"}
                </strong>
                {bn
                  ? "এই নোটিশটি অত্যন্ত গুরুত্বপূর্ণ। অনুগ্রহ করে সতর্কতার সাথে পড়ুন এবং সংশ্লিষ্ট নির্দেশনা অনুসরণ করুন।"
                  : "This notice carries critical community instructions. Please review carefully."}
              </div>
            </div>
          )}

          {/* Summary Callout (if available) */}
          {announcement.summary && (
            <div className="mt-6 rounded-xl border-l-4 border-[#dca74e] bg-[#0c3327]/60 p-4 text-[#f5d78e] font-serif text-sm sm:text-base italic leading-relaxed">
              &ldquo;{announcement.summary}&rdquo;
            </div>
          )}

          {/* Full Announcement Body */}
          <div className="mt-8 text-[#d1d5db] text-sm sm:text-base leading-relaxed sm:leading-loose whitespace-pre-line space-y-4">
            {announcement.message || announcement.content}
          </div>

          {/* Expiration Note (if present) */}
          {announcement.expiresAt && (
            <div className="mt-10 pt-4 border-t border-[#133c2e] flex items-center gap-2 text-xs text-[#547365]">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {bn
                  ? `এই নোটিশটি ${formatDate(announcement.expiresAt)} পর্যন্ত কার্যকর থাকবে।`
                  : `This announcement remains active until ${formatDate(announcement.expiresAt)}.`}
              </span>
            </div>
          )}
        </article>

        {/* Back Link Footer */}
        <div className="mt-8 text-center">
          <Link
            href="/announcements"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-[#1b4334] bg-[#07221a] hover:border-[#dca74e] text-xs font-semibold text-white hover:text-[#f5d78e] transition-all shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{bn ? "সকল ঘোষণায় ফিরে যান" : "Back to All Announcements"}</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
