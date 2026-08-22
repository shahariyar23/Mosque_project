/**
 * Skeletons for every finance surface. `.finance-shimmer` is defined in globals.css and is
 * disabled automatically under prefers-reduced-motion.
 */

import type { CSSProperties } from "react";

function Bar({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <span style={style} className={`finance-shimmer block rounded bg-[#eceadf] ${className}`} />;
}

export function FinanceCardSkeleton() {
  return (
    <div className="rounded-lg border border-[#deddd3] bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <Bar className="h-3.5 w-24" />
        <Bar className="h-9 w-9 rounded-md" />
      </div>
      <Bar className="mt-4 h-7 w-32" />
      <Bar className="mt-3 h-3 w-40" />
    </div>
  );
}

export function FinanceSummarySkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {Array.from({ length: count }, (_, index) => (
        <FinanceCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function FundCardSkeleton() {
  return (
    <div className="rounded-lg border border-[#deddd3] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <Bar className="h-4 w-36" />
          <Bar className="mt-2 h-3 w-24" />
        </div>
        <Bar className="h-5 w-16 rounded-full" />
      </div>
      <Bar className="mt-5 h-8 w-28" />
      <Bar className="mt-4 h-1.5 w-full rounded-full" />
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Bar className="h-9" />
        <Bar className="h-9" />
        <Bar className="h-9" />
      </div>
    </div>
  );
}

export function FundGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <FundCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 6, label = "Loading records" }: { rows?: number; columns?: number; label?: string }) {
  return (
    <div className="rounded-lg border border-[#deddd3] bg-white" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="flex items-center justify-between gap-3 border-b border-[#e7e6dc] px-4 py-4 sm:px-6">
        <Bar className="h-4 w-40" />
        <Bar className="h-9 w-28 rounded-md" />
      </div>
      <div className="hidden items-center gap-4 border-b border-[#e7e6dc] bg-[#faf9f4] px-6 py-3 md:flex">
        {Array.from({ length: columns }, (_, index) => (
          <Bar key={index} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-[#f0efe6]">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={rowIndex} className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:gap-4 md:px-6">
            {Array.from({ length: columns }, (_, columnIndex) => (
              <Bar key={columnIndex} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export const TransactionTableSkeleton = () => <TableSkeleton rows={8} columns={7} label="Loading transactions" />;
export const SalaryTableSkeleton = () => <TableSkeleton rows={6} columns={6} label="Loading salary payments" />;

export function ChartSkeleton() {
  return (
    <div className="rounded-lg border border-[#deddd3] bg-white p-5">
      <Bar className="h-4 w-44" />
      <div className="mt-8 flex h-56 items-end gap-3">
        {[62, 48, 76, 40, 84, 56, 68, 44].map((height, index) => (
          <div key={index} className="flex flex-1 items-end gap-1">
            <Bar className="w-full rounded-t" style={{ height: `${height}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FinancePageSkeleton() {
  return (
    <div className="space-y-4">
      <FinanceSummarySkeleton count={4} />
      <TableSkeleton />
    </div>
  );
}
