"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Clock,
  User,
  Users,
  QrCode,
  CalendarPlus,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Tag,
  CheckCircle2,
} from "lucide-react";
import {
  fetchEvent,
  fetchMyRegistration,
  toFrontendEvent,
  type BackendMyRegistration,
} from "@/services/eventService";
import { QRCode } from "@/components/ui/qr-code";
import type { MosqueEvent } from "@/lib/mosque/types";

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function AccountEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [event, setEvent] = useState<MosqueEvent | null>(null);
  const [registration, setRegistration] = useState<BackendMyRegistration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvent = async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventResult, regResult] = await Promise.allSettled([
        fetchEvent(resolvedParams.id),
        fetchMyRegistration(resolvedParams.id),
      ]);

      if (regResult.status === "fulfilled" && regResult.value) {
        setRegistration(regResult.value);
        if (regResult.value.event) {
          setEvent(toFrontendEvent(regResult.value.event));
        }
      }

      if (eventResult.status === "fulfilled" && eventResult.value) {
        setEvent(eventResult.value);
      } else if (regResult.status === "rejected" && eventResult.status === "rejected") {
        throw eventResult.reason || new Error("Event not found or failed to load.");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Event not found or failed to load. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvent();
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl flex flex-col gap-6 animate-pulse">
        <div className="h-6 w-32 rounded bg-[#f2f0e8]" />
        <div className="overflow-hidden rounded-2xl border border-[#e5e2d8] bg-white shadow-sm p-8 space-y-6">
          <div className="h-56 rounded-xl bg-[#f2f0e8]" />
          <div className="h-8 w-2/3 rounded bg-[#f2f0e8]" />
          <div className="h-20 rounded bg-[#f2f0e8]" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-2xl flex flex-col gap-6">
        <Link
          href="/account/events"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#073a2d] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Events
        </Link>
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-red-900">Event Not Found</h2>
          <p className="mt-1 text-xs text-red-700 max-w-md mx-auto">
            {error || "Could not retrieve details for this event."}
          </p>
          <button
            type="button"
            onClick={loadEvent}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#073a2d] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0b503f]"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try Again
          </button>
        </div>
      </div>
    );
  }

  const isPast = event.status === "Completed" || event.status === "Cancelled";
  const dateFormatted = formatDisplayDate(event.date);
  const timeFormatted = event.timeLabel || (event.endTime ? `${event.startTime} – ${event.endTime}` : event.startTime);

  const startDateTime = `${event.date.replaceAll("-", "")}T${event.startTime.replace(":", "")}00`;
  const endDateTime = event.endTime
    ? `${event.date.replaceAll("-", "")}T${event.endTime.replace(":", "")}00`
    : startDateTime;
  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    event.title,
  )}&dates=${startDateTime}/${endDateTime}&details=${encodeURIComponent(
    event.description || "",
  )}&location=${encodeURIComponent(event.location)}`;

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-6">
      {/* Back Link */}
      <div>
        <Link
          href="/account/events"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#073a2d] hover:text-[#c79a45] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to My Events</span>
        </Link>
      </div>

      {/* Main Card */}
      <div className="overflow-hidden rounded-2xl border border-[#e5e2d8] bg-white shadow-sm">
        {/* Banner */}
        <div className="relative h-56 sm:h-64 w-full bg-[#073a2d]/10 overflow-hidden">
          {event.imageUrl ? (
            <img
              src={event.imageUrl}
              alt={event.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#073a2d]/20 to-[#c79a45]/20">
              <CalendarDays className="h-20 w-20 text-[#073a2d]/40" />
            </div>
          )}

          {/* Category Chip */}
          <div className="absolute bottom-4 left-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#073a2d]/90 px-3.5 py-1 text-xs font-bold text-white shadow-md backdrop-blur-md">
              <Tag className="h-3 w-3 text-[#c79a45]" />
              {event.category}
            </span>
          </div>

          {/* Status */}
          <div className="absolute top-4 right-4">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold shadow-md ${
                event.status === "Upcoming"
                  ? "bg-emerald-500 text-white"
                  : event.status === "Ongoing"
                  ? "bg-amber-500 text-white animate-pulse"
                  : "bg-gray-600 text-white"
              }`}
            >
              {event.status}
            </span>
          </div>
        </div>

        {/* Details Content */}
        <div className="p-6 sm:p-8 flex flex-col gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#17211d] leading-tight">
              {event.title}
            </h1>

            {/* Quick Metadata Bar */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-[#faf9f4] p-4 border border-[#e5e2d8]">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#073a2d] text-[#c79a45] shrink-0">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#8d948f]">
                    Date & Time
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-[#17211d]">{dateFormatted}</p>
                  <p className="text-xs text-[#69726d]">{timeFormatted}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#073a2d] text-[#c79a45] shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#8d948f]">
                    Location / Venue
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-[#17211d]">{event.location}</p>
                  {event.speaker && (
                    <p className="text-xs text-[#073a2d] font-medium">Speaker: {event.speaker}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8d948f] mb-2">
                Event Overview
              </h2>
              <p className="text-sm text-[#52605a] leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </div>
          )}

          {/* Ticket / Check-in QR pass for active events */}
          {!isPast && (() => {
            const registrationId = registration?.registrationId;
            const verificationId = registrationId || event.id;
            const refDisplay = registrationId
              ? `REG-${registrationId.slice(0, 8).toUpperCase()}`
              : event.id.slice(0, 13);

            return (
              <div className="rounded-2xl border border-[#073a2d]/20 bg-[#073a2d]/5 p-6 flex flex-col sm:flex-row items-center gap-6">
                <div className="rounded-xl bg-white p-3 shadow-sm shrink-0 border border-[#e5e2d8] flex items-center justify-center">
                  <QRCode
                    value={verificationId}
                    size={180}
                    fgColor="#073a2d"
                    bgColor="#ffffff"
                    ariaLabel="Entrance Ticket QR Code"
                  />
                </div>
                <div className="text-center sm:text-left flex-1">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#073a2d] uppercase tracking-wider">
                    <Sparkles className="h-3.5 w-3.5 text-[#c79a45]" />
                    <span>Entry Pass & Verification</span>
                  </div>
                  <h3 className="mt-1 font-bold text-[#17211d] text-base">Mosque Check-in Ticket</h3>
                  <p className="mt-1 text-xs text-[#69726d] leading-relaxed">
                    Present this QR code or Ref ID at the mosque registration desk upon arrival.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="font-mono text-xs bg-white px-2.5 py-1 rounded border border-[#e5e2d8] text-[#17211d]">
                      Ref ID: {refDisplay}
                    </span>
                    {registration?.isCheckedIn ? (
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>
                          Checked In
                          {registration.checkedInAt
                            ? ` (${new Date(registration.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`
                            : ""}
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Confirmed
                      </span>
                    )}
                    {event.contribution && (
                      <span className="text-xs font-bold text-[#073a2d] bg-white px-2.5 py-1 rounded border border-[#e5e2d8]">
                        Fee: ৳{event.contribution.toLocaleString()}
                      </span>
                    )}
                    {registration && registration.guests > 0 && (
                      <span className="text-xs text-[#69726d] bg-white px-2 py-0.5 rounded border border-[#e5e2d8]">
                        +{registration.guests} guest{registration.guests > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Action Buttons */}
          <div className="border-t border-[#e5e2d8] pt-5 flex flex-col sm:flex-row gap-3">
            <Link
              href={`/events/${event.slug || event.id}`}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#073a2d] px-5 py-2.5 text-sm font-semibold !text-white shadow-sm hover:bg-[#0b503f] transition-all"
            >
              <span className="!text-white font-semibold">Public Event Page</span>
              <ExternalLink className="h-4 w-4 text-[#c79a45]" />
            </Link>

            <a
              href={calendarUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-[#e5e2d8] bg-white px-5 py-2.5 text-sm font-semibold text-[#17211d] shadow-sm hover:bg-[#faf9f4] hover:text-[#073a2d] transition-all"
            >
              <CalendarPlus className="h-4 w-4 text-[#c79a45]" />
              <span>Add to Google Calendar</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
