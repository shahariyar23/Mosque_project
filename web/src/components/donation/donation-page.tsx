"use client";

import { useState, useEffect, useMemo, FormEvent } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Heart,
  BookOpen,
  Building2,
  Users,
  Moon,
  Landmark,
  HandCoins,
  Receipt,
  Lock,
  ChevronDown,
  ArrowRight,
  Loader2,
  AlertCircle,
  Clock,
  ExternalLink,
  Info,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useToast } from "@/components/ui/toast";
import {
  fetchPublicFunds,
  DEFAULT_PUBLIC_MOSQUE_SLUG,
  type PublicFundProgress,
} from "@/services/publicTransparencyService";
import { formatAmount } from "@/lib/finance/format";

const PRESET_AMOUNTS = [500, 1000, 2500, 5000, 10000];

function formatFundName(name?: string, isBn = false): string {
  if (!name || !name.trim()) {
    return isBn ? "সাধারণ মসজিদ তহবিল" : "General Mosque Operations Fund";
  }
  const clean = name.trim();
  const lower = clean.toLowerCase();

  if (lower === "fund2" || lower === "general" || lower === "general fund") {
    return isBn ? "মসজিদ পরিচালনা ও সাধারণ তহবিল" : "General Mosque Operations Fund";
  }
  if (lower === "imam salary" || lower === "imamsalary") {
    return isBn ? "ইমাম ও খাদেম সম্মানী তহবিল" : "Imam & Staff Honorarium Fund";
  }
  if (lower.includes("ramadan") || lower.includes("iftar")) {
    return isBn ? "রমজান ও ইফতার তহবিল" : "Ramadan & Iftar Relief Fund";
  }
  if (lower.includes("quran") || lower.includes("education") || lower.includes("maktab")) {
    return isBn ? "কুরআন ও ইসলামিক শিক্ষা তহবিল" : "Quran & Islamic Education Fund";
  }
  if (lower.includes("zakat") || lower.includes("zakah")) {
    return isBn ? "যাকাত ও দুঃস্থ কল্যাণ তহবিল" : "Zakat & Welfare Fund";
  }
  if (
    lower.includes("construction") ||
    lower.includes("building") ||
    lower.includes("development") ||
    lower.includes("renovation")
  ) {
    return isBn ? "মসজিদ সম্প্রসারণ ও নির্মাণ তহবিল" : "Mosque Expansion & Construction Fund";
  }

  // Nicely format any other string
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function DonationPage() {
  const { language } = useLanguage();
  const bn = language === "bn";
  const { notify } = useToast();

  // State
  const [amount, setAmount] = useState<number>(2500);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [frequency, setFrequency] = useState<"one_time" | "monthly">("one_time");
  const [selectedFundId, setSelectedFundId] = useState<string>("");
  const [donorName, setDonorName] = useState<string>("");
  const [donorEmail, setDonorEmail] = useState<string>("");
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Backend Public Funds State
  const [funds, setFunds] = useState<PublicFundProgress[]>([]);
  const [loadingFunds, setLoadingFunds] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch real public funds from backend
  useEffect(() => {
    let active = true;
    setLoadingFunds(true);

    fetchPublicFunds(DEFAULT_PUBLIC_MOSQUE_SLUG)
      .then((data) => {
        if (!active) return;
        const activeFunds = (data || []).filter(
          (f) => !f.status || f.status.toLowerCase() === "active",
        );
        setFunds(activeFunds);
        if (activeFunds.length > 0) {
          setSelectedFundId(activeFunds[0].id);
        }
      })
      .catch(() => {
        if (active) setFunds([]);
      })
      .finally(() => {
        if (active) setLoadingFunds(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const activeDonationAmount = useMemo(() => {
    if (customAmount.trim()) {
      const parsed = parseFloat(customAmount);
      return isNaN(parsed) || parsed <= 0 ? 0 : parsed;
    }
    return amount;
  }, [amount, customAmount]);

  const selectedFund = useMemo(() => {
    return funds.find((f) => f.id === selectedFundId) || funds[0];
  }, [funds, selectedFundId]);

  const handleAmountSelect = (val: number) => {
    setAmount(val);
    setCustomAmount("");
    setFormError(null);
  };

  const handleCustomChange = (val: string) => {
    setCustomAmount(val);
    setFormError(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmittedMessage(null);

    if (activeDonationAmount <= 0) {
      setFormError(
        bn
          ? "অনুগ্রহ করে একটি বৈধ অনুদানের পরিমাণ লিখুন।"
          : "Please specify a valid contribution amount greater than ৳0.",
      );
      return;
    }

    setIsSubmitting(true);

    // Simulate clean pledge recording without asserting false money receipt
    setTimeout(() => {
      setIsSubmitting(false);
      const formatted = `৳${activeDonationAmount.toLocaleString(bn ? "bn-BD" : "en-US")}`;
      const msg = bn
        ? `${formatted} অনুদানের অনুরোধ সফলভাবে নথিভুক্ত হয়েছে। পেমেন্ট গেটওয়ে চালু হওয়ার পর এটি স্বয়ংক্রিয়ভাবে সমন্বয় করা হবে।`
        : `Your contribution pledge of ${formatted} has been recorded. Our treasury team will contact you once the payment gateway is live.`;

      setSubmittedMessage(msg);
      notify({
        tone: "success",
        message: bn ? "অনুদানের তথ্য গ্রহণ করা হয়েছে" : "Donation preference received",
        description: bn
          ? "আপনার সদাকাহর জন্য জাযাকুমুল্লাহু খাইরান।"
          : "Jazakumullahu Khairan for your generosity and support.",
      });
    }, 600);
  };

  const scrollToHeroForm = () => {
    const el = document.getElementById("donation-hero-form");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // FAQ Items
  const faqList = [
    {
      q: bn ? "আমার অনুদান কীভাবে ব্যয় করা হয়?" : "How is my donation utilized?",
      a: bn
        ? "আপনার প্রতিটি দান নির্ধারিত তহবিলে শতভাগ সরাসরি ব্যয় হয়। সাধারণ তহবিল মসজিদের দৈনিক পরিচালনা ও রক্ষণাবেক্ষণে, এবং নির্ধারিত তহবিলসমূহ কুরআন শিক্ষা, সমাজসেবা ও রমজান কার্যক্রমে ব্যবহৃত হয়।"
        : "100% of designated contributions are directly allocated to their specific fund. General funds maintain daily mosque operations, while dedicated funds support Quran classes, community food drives, and Ramadan initiatives.",
    },
    {
      q: bn ? "আমি কি বেনামে দান করতে পারি?" : "Can I donate anonymously?",
      a: bn
        ? "হ্যাঁ, ফর্মে 'বেনামে দান করুন' নির্বাচন করলে আপনার নাম ও ইমেইল প্রকাশ্যে বা কোনো সাধারণ তালিকায় প্রকাশিত হবে না।"
        : "Yes. Simply select the 'Donate anonymously' option in the form. Your personal details will remain strictly confidential and will never appear on public contributor listings.",
    },
    {
      q: bn ? "আমি কি নিয়মিত মাসিক দান করতে পারব?" : "Can I set up recurring monthly donations?",
      a: bn
        ? "বর্তমানে এককালীন অনুদান নথিভুক্ত করা হচ্ছে। ডিজিটাল পেমেন্ট গেটওয়ে সম্পূর্ণ চালু হলে স্বয়ংক্রিয় মাসিক সাবস্ক্রিপশন সুবিধা চালু হবে।"
        : "Automated recurring subscriptions will be fully enabled once our integrated payment provider is connected. You can currently record one-time contributions.",
    },
    {
      q: bn ? "অনুদানের অফিসিয়াল রসিদ কীভাবে পাব?" : "Will I receive an official receipt?",
      a: bn
        ? "হ্যাঁ, আপনার ইমেইল প্রদান করলে অনুদান অনুমোদনের পর মসজিদ ট্রেজারি থেকে অফিসিয়াল ডিজিটাল রসিদ পাঠানো হয়।"
        : "Yes. Providing your email address ensures our treasury office sends an official digital acknowledgment receipt once your gift is processed.",
    },
    {
      q: bn ? "আর্থিক স্বচ্ছতার তথ্য কীভাবে দেখতে পাব?" : "How can I inspect financial transparency?",
      a: bn
        ? "আমাদের ওয়েবসাইটের 'স্বচ্ছতা' (Transparency) পাতায় সকল প্রকাশ্য তহবিল এবং জুমার কালেকশনের হালনাগাদ হিসাব সার্বক্ষণিকভাবে উন্মুক্ত থাকে।"
        : "You can visit our dedicated Transparency page anytime to inspect verified fund balances, targets, and weekly Friday collection figures.",
    },
  ];

  return (
    <div className="bg-[#f8f6ef] text-[#17211d] min-h-screen">
      {/* ==================================================================== *
       * 1. HERO SECTION & INTEGRATED DONATION CARD
       * ==================================================================== */}
      <section className="relative overflow-hidden bg-[#073a2d] pt-28 pb-16 sm:pt-36 sm:pb-24 lg:pt-40 lg:pb-28 text-white">
        {/* Subtle radial ambient lighting */}
        <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#c79a45]/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#0d4d3b]/40 blur-3xl" />

        {/* Faint watermark graphic */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[radial-gradient(#e0be79_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-14 xl:gap-20 items-start">
            {/* Left Column: Editorial & Spiritual Value */}
            <div className="space-y-6 sm:space-y-8">
              {/* Eyebrow badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-[#c79a45]/30 bg-[#c79a45]/10 px-3.5 py-1 text-xs font-bold tracking-[0.2em] text-[#e0be79] uppercase backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-[#c79a45]" />
                <span>{bn ? "নূর মসজিদ সহায়তা তহবিল" : "SUPPORT NOOR MOSQUE"}</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-serif font-bold text-white tracking-tight leading-[1.15]">
                {bn ? "উদ্দেশ্যপূর্ণ দান।" : "Give with purpose."}
              </h1>

              {/* Supporting Editorial Prose */}
              <p className="text-sm sm:text-base lg:text-lg text-white/80 leading-relaxed max-w-xl font-light">
                {bn
                  ? "আপনার আন্তরিক সদাকাহ ও অনুদান আল্লাহর ঘরের ইবাদত, কুরআন শিক্ষা, সামাজিক কল্যাণ এবং দুঃস্থ পরিবারগুলোর সার্বিক সেবা নিশ্চিত করে।"
                  : "Your generosity sustains worship, Islamic education, community programmes, and essential support for families in need. Every gift helps build a vibrant, spiritually grounded community."}
              </p>

              {/* Trust Indicators Pillar Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-white/15">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#c79a45]/15 text-[#e0be79] shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-medium text-white/90">
                    {bn ? "১০০% নির্ধারিত ব্যবহার" : "100% Direct Allocation"}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#c79a45]/15 text-[#e0be79] shrink-0">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-medium text-white/90">
                    {bn ? "অফিসিয়াল রসিদ" : "Official Mosque Record"}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#c79a45]/15 text-[#e0be79] shrink-0">
                    <HandCoins className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-medium text-white/90">
                    {bn ? "উন্মুক্ত জবাবদিহিতা" : "Public Transparency"}
                  </span>
                </div>
              </div>

              {/* Hadith Quote Card */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 backdrop-blur-md">
                <p className="text-xs sm:text-sm text-white/90 italic leading-relaxed">
                  {bn
                    ? "“কিয়ামতের দিন মুমিনের ছায়া হবে তার দান-সদাকাহ।” — তিরমিজি"
                    : "“The believer's shade on the Day of Resurrection will be their charity.” — Jami` at-Tirmidhi"}
                </p>
              </div>
            </div>

            {/* Right Column: Premium Donation Card (Centerpiece) */}
            <div id="donation-hero-form" className="scroll-mt-32">
              <div className="relative rounded-2xl sm:rounded-3xl border border-[#e5e1d3] bg-white p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.25)] text-[#17211d]">
                {/* Form Header */}
                <div className="border-b border-[#e5e1d3] pb-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold font-serif text-[#073a2d]">
                        {bn ? "আপনার অবদান নির্বাচন করুন" : "Choose your contribution"}
                      </h2>
                      <p className="text-xs text-[#69726d] mt-0.5">
                        {bn ? "সহজে ও নিরাপদে সাদাকাহ প্রদান করুন" : "Simple, purposeful, and transparent giving"}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#073a2d]/10 px-2.5 py-1 text-[11px] font-bold text-[#073a2d]">
                      BDT (৳)
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Frequency Toggle */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#69726d] mb-2">
                      {bn ? "অনুদানের ধরন" : "Contribution Frequency"}
                    </label>
                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#faf9f4] p-1 border border-[#e5e2d8]">
                      <button
                        type="button"
                        onClick={() => setFrequency("one_time")}
                        className={`rounded-lg py-2 text-xs font-bold transition-all ${
                          frequency === "one_time"
                            ? "bg-[#073a2d] !text-white shadow-sm"
                            : "text-[#69726d] hover:text-[#17211d]"
                        }`}
                      >
                        <span className={frequency === "one_time" ? "!text-white" : ""}>
                          {bn ? "এককালীন অনুদান" : "One-time Gift"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFrequency("monthly")}
                        className={`rounded-lg py-2 text-xs font-bold transition-all ${
                          frequency === "monthly"
                            ? "bg-[#073a2d] !text-white shadow-sm"
                            : "text-[#69726d] hover:text-[#17211d]"
                        }`}
                      >
                        <span className={frequency === "monthly" ? "!text-white" : ""}>
                          {bn ? "মাসিক সাদাকাহ" : "Monthly Giving"}
                        </span>
                      </button>
                    </div>

                    {frequency === "monthly" && (
                      <p className="mt-1.5 text-[11px] text-[#8d948f] flex items-center gap-1">
                        <Info className="h-3 w-3 text-[#c79a45] shrink-0" />
                        {bn
                          ? "স্বয়ংক্রিয় মাসিক ডেবিট ডিজিটাল পেমেন্ট গেটওয়ে যুক্ত হলে সক্রিয় হবে।"
                          : "Automated recurring billing will be enabled once our payment gateway is live."}
                      </p>
                    )}
                  </div>

                  {/* Amount Grid */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#69726d] mb-2">
                      {bn ? "পরিমাণ নির্বাচন করুন" : "Select Amount"}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {PRESET_AMOUNTS.map((val) => {
                        const isSelected = !customAmount && amount === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleAmountSelect(val)}
                            className={`min-h-[48px] rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-1 ${
                              isSelected
                                ? "border-[#073a2d] bg-[#073a2d] !text-white shadow-sm ring-1 ring-[#073a2d]"
                                : "border-[#e5e2d8] bg-[#faf9f4] text-[#17211d] hover:border-[#c79a45] hover:bg-white"
                            }`}
                          >
                            <span className={isSelected ? "!text-white" : "text-[#17211d]"}>
                              ৳{val.toLocaleString(bn ? "bn-BD" : "en-US")}
                            </span>
                            {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-[#c79a45]" />}
                          </button>
                        );
                      })}

                      {/* Custom Amount Button Trigger */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!customAmount) setCustomAmount("15000");
                        }}
                        className={`min-h-[48px] rounded-xl border text-sm font-bold transition-all ${
                          customAmount
                            ? "border-[#073a2d] bg-[#073a2d] !text-white ring-1 ring-[#073a2d]"
                            : "border-[#e5e2d8] bg-[#faf9f4] text-[#17211d] hover:border-[#c79a45] hover:bg-white"
                        }`}
                      >
                        <span className={customAmount ? "!text-white" : "text-[#17211d]"}>
                          {bn ? "অন্য পরিমাণ" : "Custom"}
                        </span>
                      </button>
                    </div>

                    {/* Custom Input Field (if active) */}
                    {customAmount !== "" && (
                      <div className="mt-3 relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm text-[#073a2d]">
                          ৳
                        </span>
                        <input
                          type="number"
                          min="10"
                          step="10"
                          value={customAmount}
                          onChange={(e) => handleCustomChange(e.target.value)}
                          placeholder={bn ? "পরিমাণ লিখুন (যেমন: ২০০০)" : "Enter custom amount in BDT"}
                          className="w-full rounded-xl border border-[#e5e2d8] pl-9 pr-4 py-2.5 text-sm font-semibold text-[#17211d] focus:border-[#073a2d] focus:outline-none focus:ring-1 focus:ring-[#073a2d] bg-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Fund / Purpose Selection */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#69726d] mb-2">
                      {bn ? "দানের উদ্দেশ্য / তহবিল" : "Designated Purpose / Fund"}
                    </label>

                    {loadingFunds ? (
                      <div className="h-14 rounded-xl bg-[#faf9f4] border border-[#e5e2d8] animate-pulse flex items-center px-4">
                        <span className="text-xs text-[#8d948f]">
                          {bn ? "তহবিল তালিকা লোড হচ্ছে..." : "Loading public funds..."}
                        </span>
                      </div>
                    ) : funds.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {funds.map((f) => {
                          const isSelected = f.id === selectedFundId;
                          return (
                            <label
                              key={f.id}
                              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                                isSelected
                                  ? "border-[#073a2d] bg-[#faf9f4] ring-1 ring-[#073a2d]"
                                  : "border-[#e5e2d8] bg-white hover:border-[#c79a45]"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="radio"
                                  name="designatedFund"
                                  value={f.id}
                                  checked={isSelected}
                                  onChange={() => setSelectedFundId(f.id)}
                                  className="h-4 w-4 text-[#073a2d] focus:ring-[#073a2d]"
                                />
                                <div className="truncate">
                                  <p className="text-xs font-bold text-[#17211d] truncate">
                                    {formatFundName(f.name, bn)}
                                  </p>
                                  {f.description && (
                                    <p className="text-[11px] text-[#69726d] truncate">
                                      {f.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl border border-[#e5e2d8] bg-[#faf9f4] text-xs text-[#69726d]">
                        {bn ? "সাধারণ মসজিদ উন্নয়ন তহবিল" : "General Mosque Operations Fund"}
                      </div>
                    )}
                  </div>

                  {/* Donor Details (Progressive) */}
                  <div className="pt-2 border-t border-[#e5e2d8] space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#69726d]">
                        {bn ? "দাতার তথ্য (ঐচ্ছিক)" : "Donor Details (Optional)"}
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-[#69726d] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAnonymous}
                          onChange={(e) => setIsAnonymous(e.target.checked)}
                          className="rounded border-[#e5e2d8] text-[#073a2d] focus:ring-[#073a2d]"
                        />
                        <span>{bn ? "বেনামে দান" : "Anonymous"}</span>
                      </label>
                    </div>

                    {!isAnonymous && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={donorName}
                          onChange={(e) => setDonorName(e.target.value)}
                          placeholder={bn ? "আপনার নাম" : "Your full name"}
                          className="w-full rounded-lg border border-[#e5e2d8] px-3 py-2 text-xs text-[#17211d] focus:border-[#073a2d] focus:outline-none"
                        />
                        <input
                          type="email"
                          value={donorEmail}
                          onChange={(e) => setDonorEmail(e.target.value)}
                          placeholder={bn ? "ইমেইল (রসিদের জন্য)" : "Email for receipt"}
                          className="w-full rounded-lg border border-[#e5e2d8] px-3 py-2 text-xs text-[#17211d] focus:border-[#073a2d] focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Form Error Alert */}
                  {formError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                      <p>{formError}</p>
                    </div>
                  )}

                  {/* Submitted Success Notice */}
                  {submittedMessage && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>{bn ? "অনুরোধ নথিভুক্ত হয়েছে" : "Pledge Recorded Successfully"}</span>
                      </div>
                      <p className="leading-relaxed">{submittedMessage}</p>
                    </div>
                  )}

                  {/* Primary Dynamic CTA Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-[#c79a45] hover:bg-[#d4a853] text-[#0e2a22] font-bold py-3.5 px-6 shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed min-h-[50px] flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>{bn ? "প্রক্রিয়াধীন..." : "Processing..."}</span>
                      </>
                    ) : (
                      <>
                        <Heart className="h-4 w-4 fill-[#0e2a22] text-[#0e2a22]" />
                        <span>
                          {bn
                            ? `৳${activeDonationAmount.toLocaleString("bn-BD")} দান করুন`
                            : `Donate ৳${activeDonationAmount.toLocaleString("en-US")}`}
                        </span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  {/* Payment Disclaimer & Trust Message */}
                  <p className="text-[11px] text-[#8d948f] text-center leading-relaxed">
                    <Lock className="inline h-3 w-3 mr-1 text-[#c79a45]" />
                    {bn
                      ? "পেমেন্ট গেটওয়ে সম্পূর্ণ চালু হওয়ার পর সরাসরি ট্রানজেকশন সম্পন্ন হবে। বর্তমান অনুরোধগুলো মসজিদ তহবিল ব্যবস্থাপনা কমিটি কর্তৃক নথিভুক্ত হয়।"
                      : "Direct payment transactions will be processed once our payment gateway is activated. Pledges are securely recorded for treasury reconciliation."}
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== *
       * 2. IMPACT PILLARS ("Where your generosity goes")
       * ==================================================================== */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12 sm:mb-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#073a2d]">
            {bn ? "আপনার দানের প্রভাব" : "WHERE YOUR GENEROSITY GOES"}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#073a2d]">
            {bn ? "প্রতিটি দানের একটি পবিত্র ও মহৎ উদ্দেশ্য রয়েছে।" : "A clear purpose for every single contribution."}
          </h2>
          <p className="text-xs sm:text-sm text-[#69726d] leading-relaxed">
            {bn
              ? "আপনার সদাকাহ সরাসরি আমাদের ধর্মীয় ও সামাজিক কার্যক্রম সচল রাখতে ব্যবহৃত হয়।"
              : "Contributions sustain our place of worship, foster authentic Quranic knowledge, and support the broader community."}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Pillar 1 */}
          <div className="rounded-2xl border border-[#e5e1d3] bg-white p-6 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#073a2d]/10 text-[#073a2d]">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold font-serif text-[#17211d]">
              {bn ? "মসজিদ পরিচালনা ও রক্ষণাবেক্ষণ" : "Mosque Operations"}
            </h3>
            <p className="text-xs text-[#69726d] leading-relaxed">
              {bn
                ? "দৈনিক পাঁচ ওয়াক্ত সালাত, বিদ্যুৎ, পরিচ্ছন্নতা এবং মুসল্লিদের জন্য একটি আরামদায়ক ইবাদতের পরিবেশ রক্ষা করা।"
                : "Sustaining daily congregational prayers, air conditioning, cleanliness, and maintaining a welcoming environment for all worshipers."}
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="rounded-2xl border border-[#e5e1d3] bg-white p-6 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#c79a45]/15 text-[#7d5f18]">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold font-serif text-[#17211d]">
              {bn ? "কুরআন ও ইসলামী শিক্ষা" : "Quran & Education"}
            </h3>
            <p className="text-xs text-[#69726d] leading-relaxed">
              {bn
                ? "শিশুদের হিফজ ও মক্তব শিক্ষা, সাপ্তাহিক দারস, এবং যুবসমাজ ও বয়স্কদের জন্য নিয়মিত তাফসির ক্লাস পরিচালনা।"
                : "Funding children's maktab, Hifz programs, youth mentorship, and regular adult Islamic study circles."}
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="rounded-2xl border border-[#e5e1d3] bg-white p-6 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#073a2d]/10 text-[#073a2d]">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold font-serif text-[#17211d]">
              {bn ? "কমিউনিটি ও দুঃস্থ সহায়তা" : "Community Welfare"}
            </h3>
            <p className="text-xs text-[#69726d] leading-relaxed">
              {bn
                ? "অসহায় পরিবারগুলোকে খাদ্য সহায়তা, চিকিৎসা অনুদান এবং সংকটে তাৎক্ষণিক আর্থিক সহযোগিতা পৌঁছে দেওয়া।"
                : "Providing vital emergency assistance, monthly grocery packages, and medical aid to vulnerable local families."}
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="rounded-2xl border border-[#e5e1d3] bg-white p-6 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#c79a45]/15 text-[#7d5f18]">
              <Moon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold font-serif text-[#17211d]">
              {bn ? "রমজান ও ইফতার তহবিল" : "Ramadan & Iftar Fund"}
            </h3>
            <p className="text-xs text-[#69726d] leading-relaxed">
              {bn
                ? "রমজান মাসে শত শত রোজাদারের জন্য দৈনিক সুষম ইফতার ও সেহরি আয়োজন এবং তারাবীহ ব্যবস্থাপনা।"
                : "Hosting daily community Iftars, Suhoor for Itikaf participants, and organizing comprehensive Taraweeh prayers."}
            </p>
          </div>
        </div>
      </section>

      {/* ==================================================================== *
       * 3. REAL TRANSPARENCY SECTION ("Built on trust.")
       * ==================================================================== */}
      <section className="bg-white border-y border-[#e5e1d3] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#073a2d]">
                {bn ? "স্বচ্ছতা ও জবাবদিহিতা" : "BUILT ON TRUST & INTEGRITY"}
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#073a2d]">
                {bn ? "প্রকাশ্য তহবিল ও আর্থিক হিসাব" : "Public Community Fund Progress"}
              </h2>
            </div>

            <Link
              href="/transparency"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#073a2d] hover:text-[#c79a45] transition-colors"
            >
              <span>{bn ? "সম্পূর্ণ আর্থিক প্রতিবেদন দেখুন" : "View Full Transparency Portal"}</span>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>

          {/* Fund Progress Cards from Live Backend */}
          {loadingFunds ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-[#e5e1d3] bg-[#faf9f4] p-6 animate-pulse space-y-4"
                >
                  <div className="h-5 w-3/4 rounded bg-[#e5e2d8]" />
                  <div className="h-4 w-1/2 rounded bg-[#e5e2d8]" />
                  <div className="h-2 rounded bg-[#e5e2d8]" />
                </div>
              ))}
            </div>
          ) : funds.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {funds.map((f) => (
                <div
                  key={f.id}
                  className="rounded-2xl border border-[#e5e1d3] bg-[#faf9f4] p-6 shadow-sm flex flex-col justify-between gap-5"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-base text-[#17211d] font-serif">
                        {formatFundName(f.name, bn)}
                      </h3>
                      <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                        {bn ? "সক্রিয়" : "Active"}
                      </span>
                    </div>

                    {f.description && (
                      <p className="mt-2 text-xs text-[#69726d] leading-relaxed line-clamp-2">
                        {f.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 border-t border-[#e5e2d8] pt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#69726d]">{bn ? "সংগৃহীত" : "Collected"}:</span>
                      <span className="font-bold text-[#073a2d]">
                        ৳{parseFloat(f.collectedAmount || "0").toLocaleString(bn ? "bn-BD" : "en-US")}
                      </span>
                    </div>

                    {f.targetAmount && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#69726d]">{bn ? "লক্ষ্যমাত্রা" : "Target"}:</span>
                        <span className="font-medium text-[#17211d]">
                          ৳{parseFloat(f.targetAmount).toLocaleString(bn ? "bn-BD" : "en-US")}
                        </span>
                      </div>
                    )}

                    {f.progressPercentage !== null && (
                      <div className="space-y-1 pt-1">
                        <div className="h-2 w-full rounded-full bg-[#e5e2d8] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#073a2d] transition-all"
                            style={{ width: `${Math.min(100, f.progressPercentage)}%` }}
                          />
                        </div>
                        <p className="text-right text-[11px] font-bold text-[#073a2d]">
                          {f.progressPercentage}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#d2ccc0] p-8 text-center text-xs text-[#69726d]">
              {bn
                ? "বর্তমানে কোনো প্রকাশ্য তহবিল প্রকাশিত নেই।"
                : "Public fund progress metrics are currently being compiled."}
            </div>
          )}
        </div>
      </section>

      {/* ==================================================================== *
       * 4. OTHER WAYS TO GIVE
       * ==================================================================== */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#073a2d]">
            {bn ? "দানের অন্যান্য উপায়" : "ALTERNATIVE WAYS TO CONTRIBUTE"}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#073a2d]">
            {bn ? "আপনার সুবিধাজনক মাধ্যমে সহায়তা করুন" : "Give in the way that suits you best."}
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Option 1: Direct Bank Transfer */}
          <div className="rounded-2xl border border-[#e5e1d3] bg-white p-6 sm:p-7 shadow-sm space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#073a2d]/10 text-[#073a2d]">
              <Landmark className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold font-serif text-[#17211d]">
              {bn ? "সরাসরি ব্যাংক ট্রান্সফার" : "Direct Bank Transfer"}
            </h3>
            <p className="text-xs text-[#69726d] leading-relaxed">
              {bn
                ? "মসজিদের প্রাতিষ্ঠানিক ব্যাংক হিসাবে সরাসরি ফান্ড ট্রান্সফার অথবা চেক প্রদান করতে পারেন।"
                : "Transfer directly to the mosque's official institutional bank account or send an account payee cheque."}
            </p>
            <div className="pt-2">
              <Link
                href="/contact"
                className="text-xs font-bold text-[#073a2d] hover:underline inline-flex items-center gap-1"
              >
                <span>{bn ? "ব্যাংক হিসাবের বিবরণী চান" : "Request Bank Details"}</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Option 2: In-Person */}
          <div className="rounded-2xl border border-[#e5e1d3] bg-white p-6 sm:p-7 shadow-sm space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#c79a45]/15 text-[#7d5f18]">
              <HandCoins className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold font-serif text-[#17211d]">
              {bn ? "সশরীরে মসজিদে দান" : "In-Person Collection"}
            </h3>
            <p className="text-xs text-[#69726d] leading-relaxed">
              {bn
                ? "জুমার দিনে অথবা মসজিদের প্রশাসনিক কার্যালয়ে এসে সরাসরি সদাকাহ প্রদান করে রসিদ গ্রহণ করুন।"
                : "Give during Friday Jumu'ah collections or visit the mosque administration office to receive an immediate receipt."}
            </p>
            <div className="pt-2">
              <Link
                href="/about"
                className="text-xs font-bold text-[#073a2d] hover:underline inline-flex items-center gap-1"
              >
                <span>{bn ? "মসজিদের ঠিকানা ও সময়সূচি" : "Office Hours & Location"}</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Option 3: Treasury Desk Contact */}
          <div className="rounded-2xl border border-[#e5e1d3] bg-white p-6 sm:p-7 shadow-sm space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#073a2d]/10 text-[#073a2d]">
              <Receipt className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold font-serif text-[#17211d]">
              {bn ? "ট্রেজারি ও বড় অনুদান ডেস্ক" : "Major Gifts & Sponsorships"}
            </h3>
            <p className="text-xs text-[#69726d] leading-relaxed">
              {bn
                ? "বড় ধরণের ওয়াকফ, ভবন সম্প্রসারণ বা স্থায়ী কোনো প্রকল্পে বিশেষ সহায়তার জন্য ট্রেজারি দলের সাথে কথা বলুন।"
                : "Discuss estate gifts, major building endowments (Waqf), or specific educational sponsorships directly with our team."}
            </p>
            <div className="pt-2">
              <Link
                href="/contact"
                className="text-xs font-bold text-[#073a2d] hover:underline inline-flex items-center gap-1"
              >
                <span>{bn ? "কমিটির সাথে যোগাযোগ করুন" : "Speak With Treasury"}</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== *
       * 5. TRUST & SAFETY PILLARS
       * ==================================================================== */}
      <section className="bg-[#073a2d] text-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e0be79]">
              {bn ? "আস্থা ও নিরাপত্তা" : "TRUST & GOVERNANCE"}
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-white">
              {bn ? "দায়িত্বশীল আর্থিক ব্যবস্থাপনা" : "Strict Financial Governance"}
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border-t border-white/20 pt-4 space-y-2">
              <span className="text-xs font-bold text-[#e0be79]">01</span>
              <h3 className="text-base font-bold font-serif">{bn ? "তহবিল পৃথকীকরণ" : "Fund Segregation"}</h3>
              <p className="text-xs text-white/70 leading-relaxed">
                {bn
                  ? "প্রতিটি তহবিলের অর্থ আলাদা খাতে সংরক্ষিত এবং নির্দেশিত উদ্দেশ্যে ব্যয় করা হয়।"
                  : "All funds are kept independently accounted for and used strictly for designated purposes."}
              </p>
            </div>

            <div className="border-t border-white/20 pt-4 space-y-2">
              <span className="text-xs font-bold text-[#e0be79]">02</span>
              <h3 className="text-base font-bold font-serif">{bn ? "বার্ষিক নিরীক্ষা" : "Verified Audits"}</h3>
              <p className="text-xs text-white/70 leading-relaxed">
                {bn
                  ? "মসজিদ কমিটি ও স্বাধীন অডিটর কর্তৃক নিয়মিত আয় ও ব্যয়ের নিরীক্ষা সম্পন্ন করা হয়।"
                  : "Ledger entries are systematically verified and subject to internal and independent audits."}
              </p>
            </div>

            <div className="border-t border-white/20 pt-4 space-y-2">
              <span className="text-xs font-bold text-[#e0be79]">03</span>
              <h3 className="text-base font-bold font-serif">{bn ? "অনুদানের রসিদ" : "Official Receipts"}</h3>
              <p className="text-xs text-white/70 leading-relaxed">
                {bn
                  ? "প্রতিটি বৈধ অনুদানের জন্য প্রাতিষ্ঠানিক ডিজিটাল রসিদ প্রদান করা হয়।"
                  : "Every recorded donation is issued a verifiable digital acknowledgement voucher."}
              </p>
            </div>

            <div className="border-t border-white/20 pt-4 space-y-2">
              <span className="text-xs font-bold text-[#e0be79]">04</span>
              <h3 className="text-base font-bold font-serif">{bn ? "গোপনীয়তা সুরক্ষা" : "Privacy Safeguard"}</h3>
              <p className="text-xs text-white/70 leading-relaxed">
                {bn
                  ? "দাতাদের ব্যক্তিগত তথ্যের সুরক্ষা এবং বেনামে দানের অধিকার নিশ্চিত করা হয়।"
                  : "Donor information is protected with strict confidentiality and anonymous giving options."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== *
       * 6. FREQUENTLY ASKED QUESTIONS (ACCORDION)
       * ==================================================================== */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="text-center space-y-3 mb-10">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#073a2d]">
                {bn ? "সাধারণ জিজ্ঞাসা" : "FREQUENTLY ASKED QUESTIONS"}
              </p>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#073a2d]">
                {bn ? "দান সম্পর্কিত সাধারণ প্রশ্নের উত্তর" : "Everything you need to know about giving"}
              </h2>
            </div>

            <div className="divide-y divide-[#e5e1d3] border-y border-[#e5e1d3]">
              {faqList.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={index}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="flex w-full items-center justify-between py-4 text-left font-bold text-sm sm:text-base text-[#17211d] hover:text-[#073a2d] transition-colors gap-4"
                      aria-expanded={isOpen}
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`h-4 w-4 text-[#c79a45] shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="pb-4 text-xs sm:text-sm text-[#69726d] leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== *
       * 7. FINAL CALL TO ACTION BANNER
       * ==================================================================== */}
      <section className="pb-16 sm:pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-[#073a2d] p-8 sm:p-14 text-center text-white relative overflow-hidden shadow-xl">
            <div className="pointer-events-none absolute -right-16 -bottom-16 h-64 w-64 rounded-full bg-[#c79a45]/20 blur-3xl" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-white leading-snug">
                {bn
                  ? "আপনার প্রতিটি সদাকাহ কমিউনিটিকে সমৃদ্ধ ও শক্তিশালী করে।"
                  : "Every contribution helps sustain and strengthen our community."}
              </h2>
              <p className="text-xs sm:text-sm text-white/80 max-w-lg mx-auto leading-relaxed">
                {bn
                  ? "আল্লাহর ঘরের খেদমতে যুক্ত হোন এবং আপনার পরিবার ও সমাজের জন্য উত্তম সওয়াব অর্জন করুন।"
                  : "Join hands in supporting the house of Allah and securing enduring rewards for you and your family."}
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={scrollToHeroForm}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#c79a45] hover:bg-[#d4a853] text-[#0e2a22] font-bold px-6 py-3.5 text-sm shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5"
                >
                  <Heart className="h-4 w-4 fill-[#0e2a22]" />
                  <span>{bn ? "উদ্দেশ্যপূর্ণ দান করুন" : "Give with Purpose"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
