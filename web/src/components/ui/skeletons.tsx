import type { CSSProperties } from "react";

/**
 * Skeletons for the community modules.
 *
 * The finance kit already covers summary strips and tables (`FinanceSummarySkeleton`, `TableSkeleton`)
 * and those are reused as-is — nothing here duplicates them. What is added is the shapes the finance
 * module has no equivalent for: the prayer strip, the event grid, the team cards and the two-column
 * settings frame.
 *
 * Each one mirrors the real layout closely enough that nothing jumps when the content arrives.
 * `.finance-shimmer` is switched off under `prefers-reduced-motion` in globals.css.
 */

function Bar({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <span style={style} className={`finance-shimmer block rounded bg-[#eceadf] ${className}`} />;
}

export function StatStripSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" role="status" aria-live="polite">
      <span className="sr-only">Loading summary figures</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-lg border border-[#deddd3] bg-white p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <Bar className="h-3.5 w-24" />
            <Bar className="h-9 w-9 rounded-md" />
          </div>
          <Bar className="mt-4 h-7 w-28" />
          <Bar className="mt-3 h-3 w-36" />
        </div>
      ))}
    </div>
  );
}

export function PrayerStripSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6" role="status" aria-live="polite">
      <span className="sr-only">Loading prayer times</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-lg border border-[#deddd3] bg-white px-3.5 py-4">
          <Bar className="mx-auto h-8 w-8 rounded-md" />
          <Bar className="mx-auto mt-3 h-3 w-14" />
          <Bar className="mx-auto mt-2.5 h-5 w-20" />
          <Bar className="mx-auto mt-2 h-2.5 w-16" />
        </div>
      ))}
    </div>
  );
}

export function EventGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" role="status" aria-live="polite">
      <span className="sr-only">Loading events</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-lg border border-[#deddd3] bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <Bar className="h-5 w-20 rounded-full" />
            <Bar className="h-5 w-16 rounded-full" />
          </div>
          <Bar className="mt-4 h-4.5 w-4/5" />
          <Bar className="mt-2 h-3 w-3/5" />
          <div className="mt-4 space-y-2">
            <Bar className="h-3 w-2/3" />
            <Bar className="h-3 w-1/2" />
            <Bar className="h-3 w-3/5" />
          </div>
          <Bar className="mt-4 h-1.5 w-full rounded-full" />
          <div className="mt-4 flex gap-2">
            <Bar className="h-9 w-24 rounded-md" />
            <Bar className="h-9 w-20 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TeamGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-live="polite">
      <span className="sr-only">Loading volunteer teams</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-lg border border-[#deddd3] bg-white p-4">
          <div className="flex items-start gap-3">
            <Bar className="h-10 w-10 rounded-md" />
            <div className="flex-1">
              <Bar className="h-4 w-32" />
              <Bar className="mt-2 h-3 w-24" />
            </div>
          </div>
          <Bar className="mt-4 h-3 w-full" />
          <Bar className="mt-2 h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

/** Two-column settings frame: navigation rail plus the open panel. */
export function SettingsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]" role="status" aria-live="polite">
      <span className="sr-only">Loading settings</span>
      <div className="rounded-lg border border-[#deddd3] bg-white p-3">
        {Array.from({ length: 5 }, (_, index) => (
          <Bar key={index} className="mb-1.5 h-10 w-full rounded-md last:mb-0" />
        ))}
      </div>
      <div className="rounded-lg border border-[#deddd3] bg-white">
        <div className="border-b border-[#e7e6dc] px-6 py-4">
          <Bar className="h-4 w-40" />
          <Bar className="mt-2 h-3 w-64" />
        </div>
        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index}>
              <Bar className="h-3 w-24" />
              <Bar className="mt-2 h-11 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Profile page frame: hero card over two stacked form panels. */
export function ProfileSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <span className="sr-only">Loading mosque profile</span>
      <div className="rounded-lg border border-[#deddd3] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Bar className="h-20 w-20 rounded-xl" />
          <div className="flex-1">
            <Bar className="h-5 w-56" />
            <Bar className="mt-2.5 h-3 w-72" />
            <div className="mt-4 flex flex-wrap gap-3">
              {Array.from({ length: 4 }, (_, index) => (
                <Bar key={index} className="h-3 w-32" />
              ))}
            </div>
          </div>
        </div>
      </div>
      {Array.from({ length: 2 }, (_, panel) => (
        <div key={panel} className="rounded-lg border border-[#deddd3] bg-white">
          <div className="border-b border-[#e7e6dc] px-6 py-4">
            <Bar className="h-4 w-36" />
          </div>
          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index}>
                <Bar className="h-3 w-20" />
                <Bar className="mt-2 h-11 w-full rounded-md" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
