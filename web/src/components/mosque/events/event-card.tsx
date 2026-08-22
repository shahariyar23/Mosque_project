"use client";

import { Chip } from "@/components/finance/ui/badge";
import { Button } from "@/components/finance/ui/button";
import { Icon } from "@/components/finance/ui/icon";
import { Can } from "@/components/finance/ui/permission-gate";
import { ProgressBar } from "@/components/finance/ui/progress";
import { EventCategoryChip, EventStatusBadge } from "@/components/ui/status-badge";
import { capacityTone } from "@/lib/mosque/status";
import { formatClockTime, formatCount, formatLongDate, formatRelativeDay, formatWeekdayShort } from "@/lib/mosque/format";
import type { MosqueEvent } from "@/lib/mosque/types";

/**
 * One event as a card.
 *
 * The registration meter is only drawn for events that take registrations. Showing "0 of 120" against
 * a drop-in Qur'an study would read as nobody coming, when in fact nobody is asked to book.
 */
export function EventCard({ event, onOpen }: { event: MosqueEvent; onOpen: () => void }) {
  const share = event.capacity > 0 ? Math.min(100, (event.registered / event.capacity) * 100) : 0;
  const cancelled = event.status === "Cancelled";

  return (
    <li
      className={`flex flex-col rounded-lg border bg-white p-4 shadow-[0_1px_2px_rgba(7,58,45,.04),0_10px_28px_-24px_rgba(7,58,45,.3)] sm:p-5 ${
        cancelled ? "border-[#ebc8c4]" : "border-[#e2e1d6]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <EventCategoryChip category={event.category} />
          {event.registrationRequired ? null : <Chip>Drop-in</Chip>}
        </div>
        <EventStatusBadge status={event.status} />
      </div>

      <h3 className="mt-3.5 text-[16px] font-semibold leading-snug text-[#17211d]">{event.title}</h3>

      <dl className="mt-3 space-y-1.5 text-[12.5px] text-[#69726d]">
        <div className="flex items-center gap-2">
          <dt className="sr-only">Date</dt>
          <Icon name="calendar" size={14} className="shrink-0 text-[#a97b23]" />
          <dd className="min-w-0">
            {formatLongDate(event.date)}{" "}
            <span className="text-[#a9b0aa]">
              ({formatWeekdayShort(event.date)}
              {event.status === "Upcoming" ? ` · ${formatRelativeDay(event.date)}` : ""})
            </span>
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="sr-only">Time</dt>
          <Icon name="clock" size={14} className="shrink-0 text-[#a97b23]" />
          <dd className="min-w-0">
            {event.timeLabel ??
              `${formatClockTime(event.startTime)}${event.endTime ? ` – ${formatClockTime(event.endTime)}` : ""}`}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="sr-only">Location</dt>
          <Icon name="map-pin" size={14} className="shrink-0 text-[#a97b23]" />
          <dd className="min-w-0 truncate">{event.location}</dd>
        </div>
        {event.speaker ? (
          <div className="flex items-center gap-2">
            <dt className="sr-only">Speaker</dt>
            <Icon name="user" size={14} className="shrink-0 text-[#a97b23]" />
            <dd className="min-w-0 truncate">{event.speaker}</dd>
          </div>
        ) : null}
      </dl>

      <p className="mt-3.5 line-clamp-3 text-[12.5px] leading-5 text-[#69726d]">{event.description}</p>

      {event.registrationRequired ? (
        <div className="mt-4 border-t border-[#eceae0] pt-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[12.5px] text-[#69726d]">
              <span className="font-semibold tabular-nums text-[#17211d]">{formatCount(event.registered)}</span> /{" "}
              {formatCount(event.capacity)} registered
            </p>
            <p className="text-[12px] font-semibold tabular-nums text-[#3d453f]">{Math.round(share)}%</p>
          </div>
          <ProgressBar
            className="mt-2"
            value={event.registered}
            max={event.capacity}
            tone={capacityTone(event.registered, event.capacity)}
            label={`${formatCount(event.registered)} of ${formatCount(event.capacity)} places taken for ${event.title}`}
          />
        </div>
      ) : (
        <p className="mt-4 border-t border-[#eceae0] pt-3.5 text-[12.5px] text-[#69726d]">
          Open to everyone — no registration needed.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" icon="eye" onClick={onOpen}>
          Details
        </Button>
        <Can permission="event.update">
          <Button size="sm" variant="ghost" icon="pencil" onClick={onOpen}>
            Edit
          </Button>
        </Can>
      </div>
    </li>
  );
}
