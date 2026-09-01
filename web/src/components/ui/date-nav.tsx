"use client";

import { useId } from "react";
import { Button, IconButton } from "@/components/finance/ui/button";
import { Icon } from "@/components/finance/ui/icon";
import { formatLongDate, formatWeekday, getTodayInTimezone, shiftDate } from "@/lib/mosque/format";
import type { IsoDate } from "@/lib/mosque/types";

/**
 * Date selector for a day-at-a-time screen (the prayer schedule).
 *
 * A native `<input type="date">` rather than a hand-built calendar popover. It is one tab stop, it
 * already speaks every language and locale the browser does, mobile keyboards give it a proper date
 * wheel, and it is announced correctly without any ARIA. A custom picker would be a great deal of
 * code to arrive somewhere worse.
 *
 * The visible long-form date sits beside it because the input itself renders in the browser's locale
 * order, which may not be the mosque's.
 */
export function DateNav({
  value,
  onChange,
  label = "Schedule date",
  location,
  today,
}: {
  value: IsoDate;
  onChange: (next: IsoDate) => void;
  label?: string;
  /** Shown as a secondary line — prayer times are meaningless without a place. */
  location?: string;
  today?: IsoDate;
}) {
  const currentToday = today || getTodayInTimezone("Asia/Dhaka");
  const inputId = useId();
  const isToday = value === currentToday;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[#deddd3] bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <IconButton
          icon="chevron-left"
          label="Previous day"
          onClick={() => onChange(shiftDate(value, -1))}
          className="border-[#cfd4cd]"
        />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-[#17211d]">{formatLongDate(value)}</p>
          <p className="truncate text-[12px] text-[#69726d]">
            {formatWeekday(value)}
            {location ? (
              <>
                <span aria-hidden="true"> · </span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="map-pin" size={12} />
                  {location}
                </span>
              </>
            ) : null}
          </p>
        </div>
        <IconButton
          icon="chevron-right"
          label="Next day"
          onClick={() => onChange(shiftDate(value, 1))}
          className="border-[#cfd4cd]"
        />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
        <input
          id={inputId}
          name={inputId}
          type="date"
          value={value}
          onChange={(event) => {
            if (event.target.value) onChange(event.target.value);
          }}
          className="min-h-10 rounded-md border border-[#cfd4cd] bg-white px-3 text-[13px] tabular-nums text-[#17211d] focus:border-[#0d4d3b] focus:outline-2 focus:outline-offset-1 focus:outline-[#0d4d3b]/40"
        />
        <Button variant="secondary" size="sm" onClick={() => onChange(currentToday)} disabled={isToday}>
          Today
        </Button>
      </div>
    </div>
  );
}
