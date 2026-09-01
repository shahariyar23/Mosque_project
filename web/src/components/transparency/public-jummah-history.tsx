"use client";

import { useLanguage } from "@/components/language-provider";
import { formatAmount, formatShortDate } from "@/lib/finance/format";
import type { PublicJummahCollection } from "@/services/publicTransparencyService";

export function PublicJummahHistoryList({
  collections,
  totalCollected,
}: {
  collections: PublicJummahCollection[];
  totalCollected?: number;
}) {
  const { language } = useLanguage();
  const bengali = language === "bn";

  const totalSum =
    totalCollected ??
    collections.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  if (collections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#deddd3] bg-[#fbfbf9] p-8 text-center">
        <p className="text-sm text-[#69726d]">
          {bengali
            ? "কোনো প্রকাশ্য জুমার কালেকশন তালিকা পাওয়া যায়নি।"
            : "No public Jummah collections have been published yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Total Aggregated Summary Banner */}
      <div className="flex flex-col gap-2 rounded-xl border border-[#e0be79]/40 bg-[#073a2d] p-5 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-[.2em] text-[#e0be79]">
            {bengali ? "জুমার মোট কালেকশন" : "TOTAL JUMMAH COLLECTIONS"}
          </span>
          <p className="text-2xl font-bold sm:text-3xl">৳{formatAmount(totalSum)}</p>
        </div>
        <div className="text-xs text-white/70 sm:text-right">
          <span>
            {bengali
              ? `${collections.length}টি ঐতিহাসিক জুমার রেকর্ড`
              : `${collections.length} historical Friday collection sessions`}
          </span>
        </div>
      </div>

      {/* Collection Cards List */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((item) => (
          <div
            key={item.id}
            className="flex flex-col justify-between rounded-lg border border-[#deddd3] bg-white p-4 shadow-sm transition hover:border-[#0d4d3b]"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded bg-[#f1f4ef] px-2 py-0.5 text-xs font-semibold text-[#0d4d3b]">
                  {formatShortDate(item.date)}
                </span>
                <span className="text-xs text-[#8b938d]">{item.date}</span>
              </div>

              <div className="mt-3">
                <span className="text-xl font-bold text-[#17211d]">
                  ৳{formatAmount(parseFloat(item.amount) || 0)}
                </span>
                <span className="ml-1 text-xs text-[#69726d]">{item.currency}</span>
              </div>

              <p className="mt-1 inline-flex items-center text-xs font-medium text-[#2d3732]">
                <span className="mr-1 text-[#c79a45]">◈</span> {item.fundName}
              </p>

              {item.notes ? (
                <p className="mt-2 text-xs italic text-[#69726d] line-clamp-2">
                  "{item.notes}"
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
