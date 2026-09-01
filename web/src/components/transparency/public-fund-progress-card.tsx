"use client";

import { useLanguage } from "@/components/language-provider";
import { formatAmount } from "@/lib/finance/format";
import type { PublicFundProgress } from "@/services/publicTransparencyService";

export function PublicFundProgressCard({ fund }: { fund: PublicFundProgress }) {
  const { language } = useLanguage();
  const bengali = language === "bn";

  const targetNum = fund.targetAmount ? parseFloat(fund.targetAmount) : null;
  const collectedNum = parseFloat(fund.collectedAmount) || 0;
  const remainingNum = fund.remainingAmount ? parseFloat(fund.remainingAmount) : null;
  const progressPercent = fund.progressPercentage !== null ? Math.min(100, Math.max(0, fund.progressPercentage)) : null;

  return (
    <div className="flex flex-col justify-between rounded-xl border border-[#deddd3] bg-white p-6 shadow-[0_4px_20px_rgba(7,58,45,0.04)] transition-all hover:border-[#c79a45] hover:shadow-[0_8px_30px_rgba(7,58,45,0.08)]">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-bold text-[#17211d]">{fund.name}</h3>
          <span className="inline-flex items-center rounded-full bg-[#eaf2ed] px-2.5 py-1 text-xs font-semibold text-[#0b4634]">
            {fund.status === "active" ? (bengali ? "চলমান তহবিল" : "Active Fund") : (bengali ? "সম্পূর্ণ" : "Completed")}
          </span>
        </div>

        {fund.description ? (
          <p className="mt-2 text-sm leading-relaxed text-[#69726d]">{fund.description}</p>
        ) : null}

        {/* Progress Bar (if target is set) */}
        {progressPercent !== null ? (
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-[#69726d]">{bengali ? "সংগৃহীত অগ্রগতি" : "Fundraising Progress"}</span>
              <span className="text-[#0d4d3b] font-bold">{progressPercent}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-[#f1f4ef]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#0d4d3b] to-[#c79a45] transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-lg bg-[#f8f7f1] p-3 text-xs text-[#69726d]">
            {bengali ? "উন্মুক্ত চলমান অনুদান তহবিল" : "Open-ended community fund"}
          </div>
        )}
      </div>

      {/* Financial Metrics Breakdown */}
      <div className="mt-6 grid grid-cols-3 gap-2 border-t border-[#e7e6dc] pt-4 text-center">
        <div>
          <span className="block text-[11px] font-medium text-[#69726d]">
            {bengali ? "সংগৃহীত" : "Collected"}
          </span>
          <span className="mt-0.5 block text-sm font-bold text-[#0d4d3b]">
            ৳{formatAmount(collectedNum)}
          </span>
        </div>
        <div>
          <span className="block text-[11px] font-medium text-[#69726d]">
            {bengali ? "লক্ষ্যমাত্রা" : "Target"}
          </span>
          <span className="mt-0.5 block text-sm font-bold text-[#17211d]">
            {targetNum !== null ? `৳${formatAmount(targetNum)}` : "—"}
          </span>
        </div>
        <div>
          <span className="block text-[11px] font-medium text-[#69726d]">
            {bengali ? "অবশিষ্ট" : "Remaining"}
          </span>
          <span className="mt-0.5 block text-sm font-bold text-[#a97b23]">
            {remainingNum !== null ? `৳${formatAmount(remainingNum)}` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
