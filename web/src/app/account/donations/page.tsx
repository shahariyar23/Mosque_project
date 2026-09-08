"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  HandCoins,
  CalendarDays,
  Calendar,
  Repeat,
  Search,
  Receipt,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  Building2,
  Tag,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import {
  fetchDonations,
  type Donation,
  type DonationQuery,
  DEFAULT_DONATION_PAGE_SIZE,
} from "@/services/donationsService";
import {
  fetchContributionEnrollments,
  type ContributionEnrollment,
} from "@/services/contributionsService";
import type { DonationStatus, PaymentMethod } from "@/services/enums";
import { ServiceError } from "@/services/query";

const STATUS_OPTIONS: { label: string; value: DonationStatus | "all" }[] = [
  { label: "All Statuses", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Pending", value: "pending" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Failed", value: "failed" },
];

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
      month: "short",
      year: "numeric",
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
      return "Card";
    case "online":
      return "Online Payment";
    default:
      return method ? method.replace(/_/g, " ") : "Unknown";
  }
}

function renderStatusBadge(status: DonationStatus | string) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
          <Clock className="h-3 w-3" />
          Pending
        </span>
      );
    case "cancelled":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 ring-1 ring-inset ring-zinc-500/20">
          <XCircle className="h-3 w-3" />
          Cancelled
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/20">
          <RotateCcw className="h-3 w-3" />
          Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
          {status}
        </span>
      );
  }
}

export default function DonationsPage() {
  const { session } = useAuth();

  const [donations, setDonations] = useState<Donation[]>([]);
  const [allDonationsForStats, setAllDonationsForStats] = useState<Donation[]>([]);
  const [activeEnrollments, setActiveEnrollments] = useState<ContributionEnrollment[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<DonationStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Load paginated list
  const loadDonations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: DonationQuery = {
        page,
        limit: DEFAULT_DONATION_PAGE_SIZE,
        search: searchTerm.trim() || undefined,
        status: selectedStatus === "all" ? undefined : selectedStatus,
      };

      const [donationsRes, enrollmentsRes] = await Promise.all([
        fetchDonations(query),
        fetchContributionEnrollments({ status: "active" }).catch(() => ({
          rows: [] as ContributionEnrollment[],
          meta: { total: 0, page: 1, limit: 20, totalPages: 1 },
        })),
      ]);

      setDonations(donationsRes.rows);
      setTotalPages(donationsRes.meta.totalPages || 1);
      setTotalCount(donationsRes.meta.total || donationsRes.rows.length);
      setActiveEnrollments(enrollmentsRes.rows || []);
    } catch (err) {
      const message =
        err instanceof ServiceError
          ? err.message
          : "Failed to load donations. Please check your connection.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, selectedStatus]);

  // Load user donations once to calculate lifetime and periodic stats
  useEffect(() => {
    let isMounted = true;
    async function loadStatsData() {
      try {
        const res = await fetchDonations({ limit: 100 });
        if (isMounted) {
          setAllDonationsForStats(res.rows);
        }
      } catch {
        // Fallback silently if stats fetch fails
      }
    }
    void loadStatsData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    void loadDonations();
  }, [loadDonations]);

  // Calculated Real Lifetime & Periodic Stats
  const stats = useMemo(() => {
    const list = allDonationsForStats.length > 0 ? allDonationsForStats : donations;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let totalDonated = 0;
    let thisYearDonated = 0;
    let thisMonthDonated = 0;

    for (const d of list) {
      if (d.status === "completed") {
        const val = parseFloat(d.amount) || 0;
        totalDonated += val;

        const date = new Date(d.donatedAt || d.createdAt);
        if (!isNaN(date.getTime())) {
          if (date.getFullYear() === currentYear) {
            thisYearDonated += val;
            if (date.getMonth() === currentMonth) {
              thisMonthDonated += val;
            }
          }
        }
      }
    }

    // Calculate recurring pledges per month
    let monthlyRecurring = 0;
    for (const en of activeEnrollments) {
      const val = parseFloat(en.amount) || 0;
      if (en.frequency === "monthly") {
        monthlyRecurring += val;
      } else if (en.frequency === "quarterly") {
        monthlyRecurring += val / 3;
      } else if (en.frequency === "yearly") {
        monthlyRecurring += val / 12;
      }
    }

    return {
      totalDonated,
      thisYearDonated,
      thisMonthDonated,
      monthlyRecurring,
      activeRecurringCount: activeEnrollments.length,
    };
  }, [allDonationsForStats, donations, activeEnrollments]);

  return (
    <div className="flex flex-col gap-8">
      {/* Top Banner Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#17211d] tracking-tight">
            My Donations
          </h1>
          <p className="mt-1 text-sm text-[#69726d]">
            View your giving history, contributions, and download official receipts.
          </p>
        </div>

        <Link
          href="/donations"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#073a2d] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#0b503f] hover:shadow-md self-start sm:self-auto"
        >
          <HandCoins className="h-4 w-4 text-[#c79a45]" />
          Make a Donation
        </Link>
      </div>

      {/* Summary Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Donated */}
        <div className="rounded-xl border border-[#e5e2d8] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8d948f]">
              Total Donated
            </h3>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#073a2d]/10 text-[#073a2d]">
              <HandCoins className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-[#17211d]">
            {formatCurrency(stats.totalDonated)}
          </p>
          <p className="mt-1 text-xs text-[#69726d]">Lifetime completed gifts</p>
        </div>

        {/* This Year */}
        <div className="rounded-xl border border-[#e5e2d8] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8d948f]">
              This Year ({new Date().getFullYear()})
            </h3>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#c79a45]/15 text-[#7d5f18]">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-[#17211d]">
            {formatCurrency(stats.thisYearDonated)}
          </p>
          <p className="mt-1 text-xs text-[#69726d]">Year-to-date contribution</p>
        </div>

        {/* This Month */}
        <div className="rounded-xl border border-[#e5e2d8] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8d948f]">
              This Month
            </h3>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-[#17211d]">
            {formatCurrency(stats.thisMonthDonated)}
          </p>
          <p className="mt-1 text-xs text-[#69726d]">
            {new Date().toLocaleDateString("en-US", { month: "long" })} giving
          </p>
        </div>

        {/* Recurring Contributions */}
        <div className="rounded-xl border border-[#e5e2d8] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8d948f]">
              Recurring Pledges
            </h3>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-800">
              <Repeat className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-[#17211d]">
            {formatCurrency(stats.monthlyRecurring)}
            <span className="text-xs font-normal text-[#69726d]">/mo</span>
          </p>
          <p className="mt-1 text-xs text-[#69726d]">
            {stats.activeRecurringCount} active{" "}
            {stats.activeRecurringCount === 1 ? "pledge" : "pledges"}
          </p>
        </div>
      </section>

      {/* Donation History Table / Section */}
      <section className="rounded-xl border border-[#e5e2d8] bg-white shadow-sm overflow-hidden">
        {/* Controls Bar */}
        <div className="flex flex-col border-b border-[#e5e2d8] p-4 sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#faf9f4]/50">
          <div>
            <h2 className="font-bold text-[#17211d]">Donation Records</h2>
            <p className="text-xs text-[#69726d]">
              {totalCount} {totalCount === 1 ? "record" : "records"} found
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d948f]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Search reference, fund..."
                className="w-full rounded-lg border border-[#e5e2d8] bg-white py-1.5 pl-9 pr-3 text-sm focus:border-[#073a2d] focus:outline-none focus:ring-1 focus:ring-[#073a2d]"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value as DonationStatus | "all");
                  setPage(1);
                }}
                className="rounded-lg border border-[#e5e2d8] bg-white px-3 py-1.5 text-sm text-[#17211d] focus:border-[#073a2d] focus:outline-none focus:ring-1 focus:ring-[#073a2d]"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => void loadDonations()}
              title="Refresh Donations"
              className="rounded-lg border border-[#e5e2d8] bg-white p-2 text-[#69726d] hover:bg-[#faf9f4] hover:text-[#17211d] transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Content Body: Loading / Error / Empty / Table */}
        {loading && (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-12 w-full animate-pulse rounded-lg bg-[#f2f0e8]/80"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-red-900">
              Failed to load donations
            </h3>
            <p className="mt-1 text-sm text-red-700 max-w-sm mx-auto">{error}</p>
            <button
              onClick={() => void loadDonations()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#073a2d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b503f]"
            >
              <RefreshCw className="h-4 w-4" /> Try Again
            </button>
          </div>
        )}

        {!loading && !error && donations.length === 0 && (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#faf9f4] border border-[#e5e2d8] text-[#073a2d] mb-4">
              <HandCoins className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-[#17211d]">No donations found</h3>
            <p className="mt-1 text-sm text-[#69726d] max-w-md mx-auto">
              {searchTerm || selectedStatus !== "all"
                ? "No donation records matched your search filters. Try adjusting your criteria."
                : "You haven't recorded any donations yet. Support your mosque by making your first contribution."}
            </p>
            <div className="mt-5">
              <Link
                href="/donations"
                className="inline-flex items-center gap-2 rounded-lg bg-[#073a2d] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0b503f]"
              >
                <HandCoins className="h-4 w-4 text-[#c79a45]" />
                Make a Donation Now
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && donations.length > 0 && (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#faf9f4] text-[#69726d] border-b border-[#e5e2d8]">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">Date</th>
                    <th className="px-6 py-3.5 font-semibold">Fund / Purpose</th>
                    <th className="px-6 py-3.5 font-semibold">Amount</th>
                    <th className="px-6 py-3.5 font-semibold">Payment Method</th>
                    <th className="px-6 py-3.5 font-semibold">Status</th>
                    <th className="px-6 py-3.5 font-semibold">Reference</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e2d8]">
                  {donations.map((donation) => (
                    <tr
                      key={donation.id}
                      className="transition-colors hover:bg-[#faf9f4]/60"
                    >
                      {/* Date */}
                      <td className="px-6 py-4 text-[#17211d] font-medium whitespace-nowrap">
                        {formatDate(donation.donatedAt || donation.createdAt)}
                      </td>

                      {/* Fund / Campaign */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#17211d] flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-[#073a2d] shrink-0" />
                            {donation.fund?.name || "General Fund"}
                          </span>
                          {donation.campaign && (
                            <span className="text-xs text-[#7d5f18] mt-0.5 flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {donation.campaign.title}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 font-bold text-[#17211d] whitespace-nowrap">
                        {formatCurrency(donation.amount, donation.currency)}
                      </td>

                      {/* Payment Method */}
                      <td className="px-6 py-4 text-[#69726d] whitespace-nowrap">
                        {formatPaymentMethod(donation.paymentMethod)}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderStatusBadge(donation.status)}
                      </td>

                      {/* Reference */}
                      <td className="px-6 py-4 text-xs font-mono text-[#69726d] whitespace-nowrap">
                        {donation.reference || "—"}
                      </td>

                      {/* Receipt Action */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <Link
                          href={`/account/donations/${donation.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-[#e5e2d8] bg-white px-3 py-1.5 text-xs font-semibold text-[#073a2d] shadow-sm hover:bg-[#faf9f4] hover:border-[#073a2d]/30 transition-colors"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Cards View */}
            <div className="flex flex-col divide-y divide-[#e5e2d8] lg:hidden">
              {donations.map((donation) => (
                <div key={donation.id} className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-medium text-[#69726d]">
                        {formatDate(donation.donatedAt || donation.createdAt)}
                      </span>
                      <h4 className="font-bold text-[#17211d] text-base mt-0.5">
                        {donation.fund?.name || "General Fund"}
                      </h4>
                      {donation.campaign && (
                        <span className="text-xs text-[#7d5f18] block mt-0.5">
                          Campaign: {donation.campaign.title}
                        </span>
                      )}
                    </div>
                    {renderStatusBadge(donation.status)}
                  </div>

                  <div className="flex items-center justify-between mt-1 pt-2 border-t border-[#f2f0e8]">
                    <div>
                      <p className="text-xs text-[#8d948f]">Amount</p>
                      <p className="font-bold text-[#17211d] text-base">
                        {formatCurrency(donation.amount, donation.currency)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-[#8d948f]">Method</p>
                      <p className="text-xs font-medium text-[#17211d]">
                        {formatPaymentMethod(donation.paymentMethod)}
                      </p>
                    </div>

                    <Link
                      href={`/account/donations/${donation.id}`}
                      className="inline-flex items-center gap-1 rounded-md bg-[#073a2d] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#0b503f]"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      Receipt
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#e5e2d8] px-6 py-4 bg-[#faf9f4]/40">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 rounded-md border border-[#e5e2d8] bg-white px-3 py-1.5 text-xs font-semibold text-[#17211d] shadow-sm hover:bg-[#faf9f4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>

                <p className="text-xs font-medium text-[#69726d]">
                  Page <span className="font-bold text-[#17211d]">{page}</span> of{" "}
                  <span className="font-bold text-[#17211d]">{totalPages}</span>
                </p>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 rounded-md border border-[#e5e2d8] bg-white px-3 py-1.5 text-xs font-semibold text-[#17211d] shadow-sm hover:bg-[#faf9f4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
