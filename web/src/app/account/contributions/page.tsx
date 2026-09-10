"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Clock3,
  HandCoins,
  RefreshCw,
} from "lucide-react";
import {
  fetchContributionDue,
  fetchContributionEnrollments,
  type ContributionEnrollment,
  type ContributionPeriod,
} from "@/services/contributionsService";
import { useAuth } from "@/components/auth-provider";

const statusStyles: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  paused: "bg-amber-50 text-amber-800 ring-amber-600/20",
  cancelled: "bg-stone-100 text-stone-700 ring-stone-500/20",
  paid: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  pending: "bg-amber-50 text-amber-800 ring-amber-600/20",
  partial: "bg-sky-50 text-sky-800 ring-sky-600/20",
  overdue: "bg-rose-50 text-rose-800 ring-rose-600/20",
  waived: "bg-stone-100 text-stone-700 ring-stone-500/20",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatPeriod(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatAmount(amount: string, currency: string): string {
  const value = Number(amount);
  if (currency === "BDT") return `৳${value.toLocaleString("en-BD")}`;
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(value);
}

function labelStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[status] ?? "bg-stone-100 text-stone-700 ring-stone-500/20"}`}>
      {labelStatus(status)}
    </span>
  );
}

function PaymentHistory({ enrollmentId }: { enrollmentId: string }) {
  const [periods, setPeriods] = useState<ContributionPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    void fetchContributionDue({ enrollmentId, page: 1, limit: 12 })
      .then((result) => {
        if (active) setPeriods(result.rows);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enrollmentId]);

  if (loading) {
    return <div className="mt-5 space-y-3 border-t border-[#e5e2d8] pt-5" aria-label="Loading payment history"><div className="h-14 animate-pulse rounded-lg bg-[#f2f0e8]" /><div className="h-14 animate-pulse rounded-lg bg-[#f2f0e8]" /></div>;
  }

  if (error) {
    return <p className="mt-5 border-t border-[#e5e2d8] pt-5 text-sm text-[#a13b32]" role="alert">Could not load payment history. Please try again later.</p>;
  }

  if (periods.length === 0) {
    return <p className="mt-5 border-t border-[#e5e2d8] pt-5 text-sm text-[#69726d]">No payment periods have been recorded for this contribution yet.</p>;
  }

  return (
    <div className="mt-5 border-t border-[#e5e2d8] pt-5">
      <h3 className="text-sm font-semibold text-[#17211d]">Payment history</h3>
      <ul className="mt-3 divide-y divide-[#e5e2d8] rounded-lg border border-[#e5e2d8]">
        {periods.map((period) => (
          <li key={period.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[#17211d]">{formatPeriod(period.periodStart)}</p>
              <p className="mt-0.5 text-xs text-[#69726d]">
                {formatAmount(period.expectedAmount, period.currency)} expected
                {period.status === "paid" && period.paidAt ? `, paid on ${formatDate(period.paidAt)}` : ""}
              </p>
            </div>
            <StatusBadge status={period.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContributionCard({ enrollment }: { enrollment: ContributionEnrollment }) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
    <article className="rounded-2xl border border-[#e5e2d8] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-[#9b7739] uppercase">{enrollment.plan.name}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[#17211d]">
            {formatAmount(enrollment.amount, enrollment.currency)}
            <span className="ml-1 text-base font-medium text-[#69726d]">/ {enrollment.frequency}</span>
          </p>
        </div>
        <StatusBadge status={enrollment.status} />
      </div>

      <dl className="mt-6 grid gap-4 border-y border-[#e5e2d8] py-5 text-sm sm:grid-cols-2">
        <div className="flex items-start gap-3">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#9b7739]" aria-hidden="true" />
          <div><dt className="text-xs text-[#69726d]">Contribution started</dt><dd className="mt-1 font-medium text-[#17211d]">{formatDate(enrollment.startDate)}</dd></div>
        </div>
        <div className="flex items-start gap-3">
          <CircleDollarSign className="mt-0.5 h-4 w-4 shrink-0 text-[#9b7739]" aria-hidden="true" />
          <div><dt className="text-xs text-[#69726d]">Contribution plan</dt><dd className="mt-1 font-medium text-[#17211d]">{enrollment.plan.name}</dd></div>
        </div>
      </dl>

      <button
        type="button"
        onClick={() => setIsHistoryOpen((open) => !open)}
        aria-expanded={isHistoryOpen}
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm font-semibold text-[#0d4d3b] transition-colors hover:text-[#073a2d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9b7739]"
      >
        {isHistoryOpen ? "Hide payment history" : "View payment history"}
        {isHistoryOpen ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
      </button>
      {isHistoryOpen ? <PaymentHistory enrollmentId={enrollment.id} /> : null}
    </article>
  );
}

export default function AccountContributionsPage() {
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user?.id;

  const [enrollments, setEnrollments] = useState<ContributionEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadContributions = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(false);
    try {
      const result = await fetchContributionEnrollments({ page: 1, limit: 20, userId });
      setEnrollments(result.rows);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      void loadContributions();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [loadContributions, userId, authLoading]);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-[#9b7739] uppercase"><HandCoins className="h-4 w-4" aria-hidden="true" /> Account</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#17211d]">My Contributions</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#69726d]">Manage your recurring mosque contributions and view your payment history.</p>
      </header>

      {authLoading || loading ? (
        <div className="grid gap-5 lg:grid-cols-2" aria-label="Loading contributions">
          {[0, 1].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl border border-[#e5e2d8] bg-white p-6"><div className="h-4 w-1/3 rounded bg-[#f2f0e8]" /><div className="mt-5 h-10 w-1/2 rounded bg-[#f2f0e8]" /><div className="mt-8 h-20 rounded bg-[#f2f0e8]" /></div>)}
        </div>
      ) : error ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6" role="alert">
          <AlertCircle className="h-6 w-6 text-[#a13b32]" aria-hidden="true" />
          <h2 className="mt-3 font-semibold text-[#17211d]">Couldn&apos;t load your contributions.</h2>
          <p className="mt-1 text-sm text-[#69726d]">Please check your connection and try again.</p>
          <button type="button" onClick={() => void loadContributions()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#073a2d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b503f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9b7739]"><RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again</button>
        </section>
      ) : enrollments.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-[#d9d4c7] bg-white px-6 py-14 text-center">
          <Clock3 className="mx-auto h-8 w-8 text-[#9b7739]" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold text-[#17211d]">No contributions yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#69726d]">When you enroll in a mosque contribution program, your contribution will appear here.</p>
        </section>
      ) : (
        <section aria-label="Your contribution enrollments" className="grid gap-5 lg:grid-cols-2">
          {enrollments.map((enrollment) => <ContributionCard key={enrollment.id} enrollment={enrollment} />)}
        </section>
      )}
    </div>
  );
}
