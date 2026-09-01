"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { formatAmount } from "@/lib/finance/format";
import {
  DEFAULT_PUBLIC_MOSQUE_SLUG,
  fetchPublicFunds,
  fetchPublicJummahCollections,
  fetchPublicTransparencySummary,
  type PublicFundProgress,
  type PublicJummahCollection,
  type PublicTransparencySummary,
} from "@/services/publicTransparencyService";
import { PublicFundProgressCard } from "./public-fund-progress-card";
import { PublicJummahHistoryList } from "./public-jummah-history";

export function PublicTransparencySection({
  mosqueSlug = DEFAULT_PUBLIC_MOSQUE_SLUG,
  className = "",
}: {
  mosqueSlug?: string;
  className?: string;
}) {
  const { language } = useLanguage();
  const bengali = language === "bn";

  const [activeTab, setActiveTab] = useState<"funds" | "jummah">("funds");
  const [funds, setFunds] = useState<PublicFundProgress[]>([]);
  const [summary, setSummary] = useState<PublicTransparencySummary | null>(null);
  const [collections, setCollections] = useState<PublicJummahCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [fundsRes, summaryRes, collectionsRes] = await Promise.all([
          fetchPublicFunds(mosqueSlug).catch(() => []),
          fetchPublicTransparencySummary(mosqueSlug).catch(() => null),
          fetchPublicJummahCollections(mosqueSlug, { limit: 50 }).catch(() => ({
            rows: [],
            meta: { page: 1, limit: 50, total: 0, totalPages: 1 },
          })),
        ]);

        if (!mounted) return;

        setFunds(fundsRes);
        setSummary(summaryRes);
        setCollections(collectionsRes.rows || []);
      } catch (err: any) {
        if (mounted) {
          setError("Unable to load financial transparency figures at this time.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [mosqueSlug]);

  return (
    <section className={`mx-auto max-w-7xl px-5 py-12 lg:px-8 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[.22em] text-[#c79a45]">
          {bengali ? "আর্থিক স্বচ্ছতা ও জবাবদিহিতা" : "FINANCIAL TRANSPARENCY & ACCOUNTABILITY"}
        </p>
        <h2 className="mt-3 text-3xl font-bold text-[#17211d] sm:text-4xl">
          {bengali
            ? "সম্প্রদায়ের তহবিল ও জুমার কালেকশন অগ্রগতি"
            : "Community Funds & Jummah Collections"}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#69726d]">
          {bengali
            ? "সকল অনুদান এবং জুমার কালেকশন মসজিদের উন্নয়নমূলক তহবিলে সরাসরি স্বচ্ছভাবে ব্যবহার করা হয়।"
            : "We maintain complete public transparency. Every Friday congregational collection and community contribution is accounted for in our verified fund records."}
        </p>
      </div>

      {/* Overview Metric Banner (if summary loaded) */}
      {summary ? (
        <div className="mt-8 grid grid-cols-2 gap-4 rounded-xl border border-[#deddd3] bg-[#fbfbf9] p-6 sm:grid-cols-4">
          <div className="text-center">
            <span className="block text-xs font-semibold text-[#69726d]">
              {bengali ? "মোট সংগৃহীত" : "Total Collected"}
            </span>
            <span className="mt-1 block text-xl font-bold text-[#0d4d3b] sm:text-2xl">
              ৳{formatAmount(parseFloat(summary.totalCollectedAmount) || 0)}
            </span>
          </div>
          <div className="text-center">
            <span className="block text-xs font-semibold text-[#69726d]">
              {bengali ? "মোট লক্ষ্যমাত্রা" : "Total Target"}
            </span>
            <span className="mt-1 block text-xl font-bold text-[#17211d] sm:text-2xl">
              ৳{formatAmount(parseFloat(summary.totalTargetAmount) || 0)}
            </span>
          </div>
          <div className="text-center">
            <span className="block text-xs font-semibold text-[#69726d]">
              {bengali ? "মোট অবশিষ্ট" : "Total Remaining"}
            </span>
            <span className="mt-1 block text-xl font-bold text-[#a97b23] sm:text-2xl">
              ৳{formatAmount(parseFloat(summary.totalRemainingAmount) || 0)}
            </span>
          </div>
          <div className="text-center">
            <span className="block text-xs font-semibold text-[#69726d]">
              {bengali ? "সার্বিক অগ্রগতি" : "Overall Progress"}
            </span>
            <span className="mt-1 block text-xl font-bold text-[#0d4d3b] sm:text-2xl">
              {summary.overallProgressPercentage}%
            </span>
          </div>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="mt-8 flex justify-center border-b border-[#e1e6df]">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("funds")}
            className={`px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === "funds"
                ? "border-[#0d4d3b] text-[#0d4d3b]"
                : "border-transparent text-[#69726d] hover:text-[#17211d]"
            }`}
          >
            {bengali ? "জনকল্যাণমূলক তহবিলসমূহ" : "Public Community Funds"} ({funds.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("jummah")}
            className={`px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === "jummah"
                ? "border-[#0d4d3b] text-[#0d4d3b]"
                : "border-transparent text-[#69726d] hover:text-[#17211d]"
            }`}
          >
            {bengali ? "জুমার কালেকশন ইতিহাস" : "Friday Collections History"} (
            {collections.length})
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="mt-8">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-xl border border-[#deddd3] bg-[#fbfbf9]"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-[#ebc8c4] bg-[#fbeceb] p-6 text-center text-sm text-[#a13228]">
            {error}
          </div>
        ) : activeTab === "funds" ? (
          funds.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#deddd3] p-8 text-center text-sm text-[#69726d]">
              {bengali
                ? "বর্তমানে কোনো প্রকাশ্য তহবিল প্রকাশিত নেই।"
                : "No public community funds are currently published."}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {funds.map((f) => (
                <PublicFundProgressCard key={f.id} fund={f} />
              ))}
            </div>
          )
        ) : (
          <PublicJummahHistoryList collections={collections} />
        )}
      </div>
    </section>
  );
}
