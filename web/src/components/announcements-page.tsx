"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import {
  Megaphone,
  Search,
  Calendar,
  User,
  Star,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  X,
  Radio,
} from "lucide-react";
import type { Announcement } from "@/lib/mosque/types";
import {
  fetchPublicAnnouncements,
  type PublicAnnouncementsResult,
} from "@/services/announcementsService";
import { DEFAULT_PUBLIC_MOSQUE_SLUG } from "@/services/publicHomeService";

export function AnnouncementsPage() {
  const { language } = useLanguage();
  const bn = language === "bn";

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search input by 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Load announcements from public API
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetchPublicAnnouncements(DEFAULT_PUBLIC_MOSQUE_SLUG, {
      page,
      limit: 9,
      category: category !== "all" ? category : undefined,
      search: debouncedSearch || undefined,
    })
      .then((res: PublicAnnouncementsResult) => {
        if (!mounted) return;
        setAnnouncements(res.data || []);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
      })
      .catch((err: any) => {
        if (!mounted) return;
        console.error("Failed to load announcements:", err);
        setError(bn ? "ঘোষণা লোড করতে ব্যর্থ হয়েছে।" : "Unable to load announcements at this moment.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [page, category, debouncedSearch, bn]);

  // Find any urgent announcement for the top highlight
  const urgentAnnouncement = useMemo(() => {
    return announcements.find(
      (a) => a.category?.toLowerCase() === "urgent",
    );
  }, [announcements]);

  const categories = [
    { id: "all", labelEn: "All Notices", labelBn: "সকল ঘোষণা" },
    { id: "urgent", labelEn: "Urgent", labelBn: "জরুরি" },
    { id: "prayer", labelEn: "Prayer", labelBn: "নামাজ" },
    { id: "event", labelEn: "Events", labelBn: "অনুষ্ঠান" },
    { id: "ramadan", labelEn: "Ramadan", labelBn: "রমজান" },
    { id: "fundraising", labelEn: "Fundraising", labelBn: "তহবিল সংগ্রহ" },
    { id: "closure", labelEn: "Closures", labelBn: "ছুটি/বন্ধ" },
    { id: "general", labelEn: "General", labelBn: "সাধারণ" },
  ];

  const categoryBadgeStyles = (cat: string) => {
    switch (cat.toLowerCase()) {
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

  const categoryLabel = (cat: string) => {
    const found = categories.find((c) => c.id === cat.toLowerCase());
    if (found) return bn ? found.labelBn : found.labelEn;
    return cat;
  };

  const formatDate = (isoDate?: string | null) => {
    if (!isoDate) return "";
    try {
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) return isoDate;
      return new Intl.DateTimeFormat(bn ? "bn-BD" : "en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
    } catch {
      return isoDate;
    }
  };

  const resetFilters = () => {
    setCategory("all");
    setSearch("");
    setPage(1);
  };

  return (
    <div className="flex-1 bg-[#040e0b] text-[#f6f5ee] relative overflow-hidden">
      {/* Ambient background sanctuary glows */}
      <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-[#0c382b]/25 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/2 right-10 w-[500px] h-[500px] bg-[#072a20]/30 rounded-full blur-[180px] pointer-events-none" />

      {/* Hero Header */}
      <header className="relative pt-16 pb-12 sm:pt-20 sm:pb-16 px-4 sm:px-6 lg:px-8 border-b border-[#13382c]/80 bg-gradient-to-b from-[#061812] to-[#040e0b]">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          {/* Sacred Bismillah */}
          <div className="inline-block text-[#dca74e]/70 font-serif text-sm sm:text-base tracking-widest mb-3">
            بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#dca74e]/30 bg-[#dca74e]/10 text-[#f5d78e] text-[11px] sm:text-xs font-semibold uppercase tracking-wider mb-4">
            <Radio className="w-3.5 h-3.5 animate-pulse text-[#dca74e]" />
            {bn ? "মসজিদের জরুরি নোটিশ বোর্ড" : "Official Community Dispatches"}
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white tracking-tight">
            {bn ? "মসজিদের ঘোষণা ও খবরাখবর" : "Mosque Announcements"}
          </h1>

          <p className="mt-4 max-w-2xl mx-auto text-sm sm:text-base text-[#8ea499] leading-relaxed">
            {bn
              ? "নূর জামে মসজিদের দৈনন্দিন কার্যক্রম, জামাত পরিবর্তনের সময়সূচি, বিশেষ ইসলামি অনুষ্ঠান এবং জরুরি নোটিশ সম্পর্কে অবগত থাকুন।"
              : "Stay informed with official updates, congregation time adjustments, seasonal programs, and essential bulletins from Noor Community Mosque."}
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 relative z-10">
        {/* Urgent Bulletin Banner (if active) */}
        {urgentAnnouncement && (
          <div className="mb-10 rounded-xl border border-[#ef4444]/40 bg-gradient-to-r from-[#3f0f0f] via-[#2a0b0b] to-[#1a0707] p-4 sm:p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-36 h-36 bg-[#ef4444]/10 rounded-full blur-2xl" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-start gap-3.5">
                <span className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-[#ef4444]/20 border border-[#ef4444]/50 text-[#f87171] mt-0.5">
                  <AlertTriangle className="h-5 w-5 animate-bounce" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#f87171]">
                      {bn ? "জরুরি বিজ্ঞপ্তি" : "Urgent Community Notice"}
                    </span>
                    {urgentAnnouncement.publishedAt && (
                      <span className="text-[10px] text-[#9ca3af]">
                        • {formatDate(urgentAnnouncement.publishedAt)}
                      </span>
                    )}
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                    {urgentAnnouncement.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#fca5a5] line-clamp-2 mt-1 max-w-3xl">
                    {urgentAnnouncement.summary || urgentAnnouncement.message || urgentAnnouncement.content}
                  </p>
                </div>
              </div>
              <Link
                href={`/announcements/${urgentAnnouncement.id}`}
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ef4444] hover:bg-[#dc2626] text-white text-xs font-semibold transition-colors shadow-md"
              >
                <span>{bn ? "বিস্তারিত দেখুন" : "Read Notice"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Search and Filter Controls */}
        <div className="space-y-4 mb-8">
          {/* Search bar */}
          <div className="relative max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#547365]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={bn ? "শিরোনাম বা বিষয়বস্তু দিয়ে খুঁজুন..." : "Search announcements by keyword, topic or author..."}
              className="w-full rounded-xl border border-[#1b4334] bg-[#07221a]/80 pl-10 pr-10 py-3 text-sm text-white placeholder-[#547365] focus:border-[#dca74e] focus:outline-none focus:ring-1 focus:ring-[#dca74e]/50 transition-all shadow-inner"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8ea499] hover:text-white p-0.5"
                title={bn ? "মুছে ফেলুন" : "Clear search"}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
              {categories.map((cat) => {
                const active = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setCategory(cat.id);
                      setPage(1);
                    }}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                      active
                        ? "bg-[#dca74e] text-[#040e0b] font-bold shadow-md shadow-[#dca74e]/20"
                        : "border border-[#1b4334] bg-[#07221a]/60 text-[#8ea499] hover:text-white hover:border-[#2a634e]"
                    }`}
                  >
                    {bn ? cat.labelBn : cat.labelEn}
                  </button>
                );
              })}
            </div>

            {(category !== "all" || search) && (
              <button
                onClick={resetFilters}
                className="text-xs text-[#dca74e] hover:underline flex items-center gap-1 shrink-0 ml-auto"
              >
                <X className="w-3.5 h-3.5" />
                {bn ? "ফিল্টার মুছুন" : "Reset filters"}
              </button>
            )}
          </div>
        </div>

        {/* Results Section */}
        {loading ? (
          /* Loading Skeletons */
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[#1b4334]/60 bg-[#072018]/50 p-5 h-64 animate-pulse flex flex-col justify-between"
              >
                <div>
                  <div className="h-4 w-20 bg-[#143d2f] rounded-full mb-3" />
                  <div className="h-6 w-3/4 bg-[#143d2f] rounded mb-3" />
                  <div className="space-y-2">
                    <div className="h-3.5 w-full bg-[#143d2f]/70 rounded" />
                    <div className="h-3.5 w-5/6 bg-[#143d2f]/70 rounded" />
                    <div className="h-3.5 w-2/3 bg-[#143d2f]/70 rounded" />
                  </div>
                </div>
                <div className="h-4 w-1/3 bg-[#143d2f] rounded mt-4" />
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error state */
          <div className="rounded-xl border border-[#ef4444]/30 bg-[#2b1010]/30 p-10 text-center max-w-md mx-auto">
            <AlertTriangle className="h-8 w-8 text-[#f87171] mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">
              {bn ? "ত্রুটি ঘটেছে" : "Notice Board Unavailable"}
            </h3>
            <p className="text-xs text-[#8ea499] mb-4">{error}</p>
            <button
              onClick={() => setPage(1)}
              className="px-4 py-2 rounded-lg bg-[#143d2f] text-white text-xs font-semibold hover:bg-[#1b4e3c]"
            >
              {bn ? "পুনরায় চেষ্টা করুন" : "Try Again"}
            </button>
          </div>
        ) : announcements.length === 0 ? (
          /* Empty state */
          <div className="rounded-xl border border-[#1b4334]/50 bg-[#072018]/30 p-12 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-[#143d2f]/50 border border-[#1b4334] flex items-center justify-center mx-auto mb-3 text-[#dca74e]">
              <Megaphone className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              {bn ? "কোনো ঘোষণা পাওয়া যায়নি" : "No Announcements Found"}
            </h3>
            <p className="text-xs text-[#8ea499] mb-4">
              {category !== "all" || search
                ? bn
                  ? "আপনার অনুসন্ধানের সাথে কোনো ঘোষণা মেলেনি। ফিল্টার পরিষ্কার করে পুনরায় চেষ্টা করুন।"
                  : "No announcements matched your search or category filter. Try clearing filters."
                : bn
                  ? "বর্তমানে এই মসজিদে কোনো সক্রিয় ঘোষণা প্রকাশিত হয়নি।"
                  : "There are currently no active announcements posted on the board."}
            </p>
            {(category !== "all" || search) && (
              <button
                onClick={resetFilters}
                className="px-4 py-2 rounded-lg bg-[#dca74e] text-[#040e0b] text-xs font-bold hover:bg-[#f5d78e] transition-colors"
              >
                {bn ? "সব ফিল্টার মুছুন" : "Clear Search & Filters"}
              </button>
            )}
          </div>
        ) : (
          /* Cards Grid */
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {announcements.map((announcement) => (
                <article
                  key={announcement.id}
                  className="rounded-xl border border-[#1b4334] bg-gradient-to-b from-[#0a271e] via-[#082019] to-[#061913] p-5 sm:p-6 transition-all duration-300 hover:border-[#dca74e]/50 hover:shadow-lg hover:shadow-[#0c382b]/30 flex flex-col justify-between group"
                >
                  <div>
                    {/* Header tags: Category & Pinned */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${categoryBadgeStyles(
                          announcement.category,
                        )}`}
                      >
                        {categoryLabel(announcement.category)}
                      </span>

                      {announcement.pinned && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-[#f5d78e] bg-[#dca74e]/15 border border-[#dca74e]/40 px-2 py-0.5 rounded-full">
                          <Star className="w-2.5 h-2.5 fill-[#f5d78e]" />
                          {bn ? "পিন করা" : "Pinned"}
                        </span>
                      )}
                    </div>

                    {/* Announcement Title */}
                    <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-[#f5d78e] transition-colors leading-snug line-clamp-2">
                      <Link href={`/announcements/${announcement.id}`}>
                        {announcement.title}
                      </Link>
                    </h3>

                    {/* Announcement Summary or Excerpt */}
                    <p className="mt-2 text-xs sm:text-[13px] leading-relaxed text-[#8ea499] line-clamp-3">
                      {announcement.summary || announcement.message || announcement.content}
                    </p>

                    {/* Channel tags */}
                    {announcement.channels && announcement.channels.length > 0 && (
                      <div className="mt-3.5 flex flex-wrap gap-1.5">
                        {announcement.channels.map((ch) => (
                          <span
                            key={ch}
                            className="text-[9px] font-medium text-[#547365] bg-[#061e16] border border-[#133c2e] px-2 py-0.5 rounded"
                          >
                            {ch}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Metadata & Link */}
                  <div className="mt-5 pt-4 border-t border-[#133c2e] flex items-center justify-between text-[11px] text-[#547365]">
                    <div className="flex items-center gap-3">
                      {announcement.publishedAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#547365]" />
                          <span>{formatDate(announcement.publishedAt)}</span>
                        </span>
                      )}
                      {announcement.author && (
                        <span className="hidden xs:flex items-center gap-1 truncate max-w-[110px]">
                          <User className="w-3.5 h-3.5 text-[#547365]" />
                          <span className="truncate">{announcement.author}</span>
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/announcements/${announcement.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-[#f5d78e] group-hover:text-white transition-colors ml-auto"
                    >
                      <span>{bn ? "বিস্তারিত" : "Read details"}</span>
                      <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 pt-6 border-t border-[#1b4334] flex items-center justify-between">
                <p className="text-xs text-[#547365]">
                  {bn
                    ? `মোট ${total} টির মধ্যে পৃষ্ঠা ${page} এর ${totalPages}`
                    : `Showing page ${page} of ${totalPages} (${total} total notices)`}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#1b4334] bg-[#07221a] text-xs font-semibold text-white hover:border-[#dca74e] disabled:opacity-40 disabled:pointer-events-none transition-all"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>{bn ? "পূর্ববর্তী" : "Previous"}</span>
                  </button>

                  <span className="text-xs font-bold text-[#f5d78e] px-2">
                    {page} / {totalPages}
                  </span>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#1b4334] bg-[#07221a] text-xs font-semibold text-white hover:border-[#dca74e] disabled:opacity-40 disabled:pointer-events-none transition-all"
                  >
                    <span>{bn ? "পরবর্তী" : "Next"}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
