"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/finance/ui/icon";
import { GirihWatermark, PrayerCard } from "@/components/mosque/prayer/prayer-card";
import {
  formatClockTime,
  formatDuration,
  minutesOfDay,
  resolveNextPrayer,
  toMinutes,
} from "@/lib/mosque/format";
import type { PrayerId, PrayerSlot } from "@/lib/mosque/types";

/**
 * Today's prayers, with the next congregation called out and counting down.
 *
 * The countdown is the only thing on the dashboard that needs the viewer's actual clock, and that
 * makes it the one place a hydration mismatch is easy to cause: a server rendering "in 1h 24m" and a
 * browser rendering "in 1h 23m" a second later is a warning on every page load.
 *
 * So the first paint uses `fallbackNextId` — the prayer the schedule says is next, decided on the
 * server — and shows no duration at all. `nowMinutes` is filled in after mount, at which point the
 * highlight is recomputed against the real clock and the countdown appears. Nothing shifts position
 * when it does, because the line is reserved either way.
 */
export function PrayerStrip({
  slots,
  timeFormat = "12h",
  fallbackNextId,
  showIqamah = true,
}: {
  slots: PrayerSlot[];
  timeFormat?: "12h" | "24h";
  /** Highlighted until the client clock is available. */
  fallbackNextId: PrayerId;
  showIqamah?: boolean;
}) {
  const [nowMinutes, setNowMinutes] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNowMinutes(minutesOfDay(new Date()));
    tick();
    // Half a minute keeps the countdown honest to the minute without a timer per second.
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, []);

  const resolved = nowMinutes === null ? null : resolveNextPrayer(slots, nowMinutes);
  const nextId = resolved?.slot.id ?? fallbackNextId;
  const nextSlot = slots.find((slot) => slot.id === nextId);

  const elapsedShare = (() => {
    if (nowMinutes === null || !resolved) return 0;
    const previous = [...slots]
      .filter((slot) => slot.isCongregation && toMinutes(slot.adhan) <= nowMinutes)
      .pop();
    const from = previous ? toMinutes(previous.adhan) : 0;
    const to = resolved.tomorrow ? 1440 : toMinutes(resolved.slot.adhan);
    const span = to - from;
    return span > 0 ? Math.min(100, Math.max(0, ((nowMinutes - from) / span) * 100)) : 0;
  })();

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
      {/* Next prayer */}
      <div className="relative overflow-hidden rounded-lg border border-[#0b4634] bg-[#073a2d] px-5 py-5 text-white">
        <GirihWatermark className="-right-8 -top-8 h-40 w-40 text-[#e0be79] opacity-[.14]" />
        <div className="relative">
          <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[.18em] text-[#e0be79]">
            <Icon name="moon-star" size={13} />
            Next Prayer
          </p>
          {nextSlot ? (
            <>
              <p className="mt-2.5 text-[24px] font-semibold leading-tight">{nextSlot.name}</p>
              <p aria-hidden="true" className="text-[14px] text-white/55">
                {nextSlot.arabic}
              </p>
              <p className="mt-2 text-[22px] font-semibold tabular-nums text-white">
                {formatClockTime(nextSlot.adhan, timeFormat)}
              </p>

              {/*
                `aria-live="polite"` and not "assertive": the countdown changing every minute must not
                interrupt whatever the person is reading. `role="timer"` is what names it.
              */}
              <p role="timer" aria-live="polite" className="mt-1 min-h-5 text-[13px] text-white/75">
                {resolved
                  ? resolved.tomorrow
                    ? `tomorrow · in ${formatDuration(resolved.minutesAway)}`
                    : `in ${formatDuration(resolved.minutesAway)}`
                  : null}
              </p>

              {nextSlot.iqamah ? (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[.08] px-2.5 py-1 text-[11.5px] text-white/85">
                  <Icon name="clock" size={12} />
                  Iqamah {formatClockTime(nextSlot.iqamah, timeFormat)}
                </p>
              ) : null}

              <div
                aria-hidden="true"
                className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/15"
                title="Time elapsed since the previous prayer"
              >
                <div className="h-full rounded-full bg-[#c79a45]" style={{ width: `${elapsedShare}%` }} />
              </div>
            </>
          ) : (
            <p className="mt-3 text-[13px] leading-6 text-white/75">
              No congregation is scheduled. Add prayer times to see the next one here.
            </p>
          )}
        </div>
      </div>

      {/* The full day */}
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        {slots.map((slot) => (
          <li key={slot.id}>
            <PrayerCard slot={slot} timeFormat={timeFormat} next={slot.id === nextId} showIqamah={showIqamah} />
          </li>
        ))}
      </ul>
    </div>
  );
}
