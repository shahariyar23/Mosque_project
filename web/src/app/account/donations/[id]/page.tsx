"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  Building2,
  Tag,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  HandCoins,
  Receipt,
  Share2,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/ui/toast";
import { fetchDonation, type Donation } from "@/services/donationsService";
import type { DonationStatus, PaymentMethod } from "@/services/enums";
import { ServiceError } from "@/services/query";

function formatCurrency(amount: string | number, currency = "BDT"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return `৳0.00`;
  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (currency === "BDT" || !currency) {
    return `৳${formatted}`;
  }
  return `${currency} ${formatted}`;
}

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

function formatPaymentMethod(method: PaymentMethod | string): string {
  switch (method) {
    case "cash":
      return "Cash";
    case "bank_transfer":
      return "Bank Transfer";
    case "card":
      return "Credit / Debit Card";
    case "online":
      return "Online Payment";
    case "check":
      return "Bank Check / Cheque";
    default:
      return method ? method.replace(/_/g, " ") : "Unknown";
  }
}

export default function DonationDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const donationId = resolvedParams.id;

  const { user } = useAuth();
  const { notify } = useToast();

  const [donation, setDonation] = useState<Donation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadDonation = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDonation(donationId);
      setDonation(data);
    } catch (err) {
      const message =
        err instanceof ServiceError
          ? err.message
          : "Donation record could not be found or you do not have permission to view it.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDonation();
  }, [donationId]);

  const handleCopyId = () => {
    if (!donation) return;
    navigator.clipboard.writeText(donation.id).then(() => {
      setCopied(true);
      notify({ tone: "info", message: "Donation ID copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl flex flex-col gap-6 animate-pulse">
        <div className="h-6 w-36 rounded bg-[#f2f0e8]" />
        <div className="overflow-hidden rounded-2xl border border-[#e5e2d8] bg-white shadow-sm">
          <div className="h-44 bg-[#073a2d]/60" />
          <div className="p-8 space-y-4">
            <div className="h-4 w-40 rounded bg-[#f2f0e8]" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 rounded bg-[#f2f0e8]" />
              <div className="h-10 rounded bg-[#f2f0e8]" />
              <div className="h-10 rounded bg-[#f2f0e8]" />
              <div className="h-10 rounded bg-[#f2f0e8]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !donation) {
    return (
      <div className="mx-auto max-w-2xl flex flex-col gap-6">
        <Link
          href="/account/donations"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#69726d] hover:text-[#17211d]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Donations
        </Link>

        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-red-950">Donation Not Found</h2>
          <p className="mt-2 text-sm text-red-700 max-w-md mx-auto">
            {error || "The requested donation record is unavailable."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => void loadDonation()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#073a2d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b503f]"
            >
              <RefreshCw className="h-4 w-4" /> Try Again
            </button>
            <Link
              href="/account/donations"
              className="inline-flex items-center gap-2 rounded-lg border border-[#e5e2d8] bg-white px-4 py-2 text-sm font-semibold text-[#17211d] hover:bg-[#faf9f4]"
            >
              Go to Donation History
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isCompleted = donation.status === "completed";
  const isPending = donation.status === "pending";
  const isCancelled = donation.status === "cancelled";

  return (
    <div className="mx-auto max-w-2xl flex flex-col gap-6">
      {/* Navigation bar */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/account/donations"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#69726d] hover:text-[#17211d] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Donations
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e2d8] bg-white px-3 py-1.5 text-xs font-semibold text-[#17211d] shadow-sm hover:bg-[#faf9f4] transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Receipt
          </button>
        </div>
      </div>

      {/* Official Receipt Card */}
      <div className="overflow-hidden rounded-2xl border border-[#e5e2d8] bg-white shadow-md print:border-none print:shadow-none">
        {/* Receipt Header Banner */}
        <div
          className={`p-8 text-center text-white relative ${
            isCompleted
              ? "bg-[#073a2d]"
              : isPending
              ? "bg-amber-700"
              : isCancelled
              ? "bg-zinc-700"
              : "bg-purple-800"
          }`}
        >
          {/* Subtle gold glow accent */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#c79a45]/20 blur-2xl" />

          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm border border-white/20">
            {isCompleted && <CheckCircle2 className="h-8 w-8 text-emerald-300" />}
            {isPending && <Clock className="h-8 w-8 text-amber-200" />}
            {isCancelled && <XCircle className="h-8 w-8 text-zinc-300" />}
            {!isCompleted && !isPending && !isCancelled && (
              <RotateCcw className="h-8 w-8 text-purple-200" />
            )}
          </div>

          <span className="inline-block rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-white">
            {donation.status}
          </span>

          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
            {formatCurrency(donation.amount, donation.currency)}
          </h1>

          <p className="mt-2 text-sm text-white/90 font-medium">
            {donation.fund?.name || "General Mosque Fund"}
          </p>

          {donation.campaign && (
            <p className="mt-0.5 text-xs text-[#c79a45]">
              Campaign: {donation.campaign.title}
            </p>
          )}
        </div>

        {/* Receipt Body */}
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-[#e5e2d8] pb-4 mb-6">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#8d948f]">
                Official Donation Receipt
              </h2>
              <p className="text-xs text-[#69726d] mt-0.5">
                NOOR Central Mosque & Islamic Center
              </p>
            </div>
            <Receipt className="h-5 w-5 text-[#073a2d]" />
          </div>

          <dl className="grid gap-5 sm:grid-cols-2 text-sm">
            {/* Donation ID */}
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-[#8d948f]">
                Receipt / Donation ID
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 font-mono text-xs font-medium text-[#17211d]">
                <span className="truncate max-w-[200px]">{donation.id}</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="rounded p-1 text-[#8d948f] hover:bg-[#faf9f4] hover:text-[#17211d] print:hidden"
                  title="Copy ID"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </dd>
            </div>

            {/* Date */}
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-[#8d948f]">
                Date of Donation
              </dt>
              <dd className="mt-1 font-medium text-[#17211d]">
                {formatDate(donation.donatedAt || donation.createdAt)}
              </dd>
            </div>

            {/* Fund Name */}
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-[#8d948f]">
                Destination Fund
              </dt>
              <dd className="mt-1 font-medium text-[#17211d] flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-[#073a2d]" />
                {donation.fund?.name || "General Fund"}
              </dd>
            </div>

            {/* Payment Method */}
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-[#8d948f]">
                Payment Method
              </dt>
              <dd className="mt-1 font-medium text-[#17211d]">
                {formatPaymentMethod(donation.paymentMethod)}
              </dd>
            </div>

            {/* Donor Information */}
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wider text-[#8d948f]">
                Donor Details
              </dt>
              <dd className="mt-1 font-medium text-[#17211d]">
                {donation.donor?.fullName || donation.donorName || user?.name || "Anonymous Member"}
                {donation.donorEmail && (
                  <span className="text-[#69726d] font-normal block sm:inline sm:ml-2">
                    ({donation.donorEmail})
                  </span>
                )}
              </dd>
            </div>

            {/* Reference Number */}
            {donation.reference && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wider text-[#8d948f]">
                  Bank / Gateway Reference
                </dt>
                <dd className="mt-1 font-mono text-xs font-medium text-[#17211d]">
                  {donation.reference}
                </dd>
              </div>
            )}

            {/* Notes */}
            {donation.notes && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wider text-[#8d948f]">
                  Notes / Dedication
                </dt>
                <dd className="mt-1 text-xs text-[#69726d] italic bg-[#faf9f4] p-3 rounded-lg border border-[#e5e2d8]">
                  "{donation.notes}"
                </dd>
              </div>
            )}
          </dl>

          {/* Footer Bar */}
          <div className="mt-8 border-t border-[#e5e2d8] pt-6 flex flex-col sm:flex-row gap-3 print:hidden">
            <button
              onClick={handlePrint}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#073a2d] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0b503f] transition-colors"
            >
              <Download className="h-4 w-4" />
              Download / Print Receipt
            </button>

            <Link
              href="/donations"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#e5e2d8] bg-white px-4 py-2.5 text-sm font-semibold text-[#17211d] hover:bg-[#faf9f4] transition-colors"
            >
              <HandCoins className="h-4 w-4 text-[#c79a45]" />
              Make Another Donation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
