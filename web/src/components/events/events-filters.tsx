"use client";

import { useLanguage } from "@/components/language-provider";
import { eventCategories } from "@/lib/mosque/types";
import { Search, X } from "lucide-react";

type Props = {
  search: string;
  onSearchChange: (val: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  availableMonths: string[];
};

export function EventsFilters({
  search,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedMonth,
  onMonthChange,
  availableMonths,
}: Props) {
  const { language } = useLanguage();
  const bn = language === "bn";

  const getCategoryLabel = (cat: string) => {
    if (!bn) return cat === "all" ? "All" : cat;
    switch (cat) {
      case "all": return "সকল কার্যক্রম";
      case "Quran": return "কুরআন শিক্ষা";
      case "Education": return "দ্বীনি ইলম";
      case "Community": return "কমিউনিটি";
      case "Youth": return "যুব সমাজ";
      case "Charity": return "ত্রাণ ও সাহায্য";
      case "Ramadan": return "রমজান";
      case "Seminar": return "সেমিনার";
      default: return cat;
    }
  };

  const formatMonthLabel = (monthStr: string) => {
    if (monthStr === "all") {
      return bn ? "সব মাস" : "All Months";
    }
    const [year, month] = monthStr.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return new Intl.DateTimeFormat(bn ? "bn-BD" : "en-US", {
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const allCategories = ["all", ...eventCategories];

  return (
    <div className="space-y-4">
      {/* Search Bar + Month Dropdown Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#718079]">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={bn ? "অনুষ্ঠান বা স্থান খুঁজুন..." : "Search events by title, keyword, or venue..."}
            className="w-full pl-10 pr-9 py-3 rounded-2xl border border-[#dcd7cb] bg-white text-sm text-[#0e2a22] placeholder-[#8a9891] focus:outline-none focus:ring-2 focus:ring-[#c79a45] focus:border-transparent transition-all shadow-sm min-h-[46px]"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#718079] hover:text-[#0e2a22]"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Month Selector Pill */}
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="event-month-select" className="sr-only">
            {bn ? "মাস নির্বাচন করুন" : "Filter by month"}
          </label>
          <select
            id="event-month-select"
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="w-full sm:w-auto px-4 py-3 rounded-2xl border border-[#dcd7cb] bg-white text-xs sm:text-sm font-semibold text-[#0d4d3b] focus:outline-none focus:ring-2 focus:ring-[#c79a45] shadow-sm min-h-[46px] cursor-pointer"
          >
            <option value="all">{bn ? "সব মাসের অনুষ্ঠান" : "All Upcoming Months"}</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {formatMonthLabel(m)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Horizontal Scrollable Category Chips (Mobile-First touch targets) */}
      <div className="relative">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4 xs:mx-0 xs:px-0">
          {allCategories.map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => onCategoryChange(category)}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 min-h-[44px] flex items-center justify-center ${
                  isSelected
                    ? "bg-[#0d4d3b] text-white shadow-md shadow-[#0d4d3b]/20"
                    : "bg-white text-[#4a5852] border border-[#dcd7cb] hover:border-[#c79a45] hover:text-[#0e2a22]"
                }`}
              >
                <span>{getCategoryLabel(category)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

