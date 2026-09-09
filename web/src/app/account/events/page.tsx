"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Clock,
  User,
  Search,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Tag,
  CheckCircle2,
  Ticket,
} from "lucide-react";
import {
  fetchMyRegisteredEvents,
  type BackendMyRegistration,
} from "@/services/eventService";
import { useToast } from "@/components/ui/toast";
import type { MosqueEvent } from "@/lib/mosque/types";

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTimeRange(start: string, end?: string | null, label?: string | null): string {
  if (label) return label;
  if (!start) return "";
  if (end) return `${start} – ${end}`;
  return start;
}

export default function AccountEventsPage() {
  const { notify } = useToast();
  const [events, setEvents] = useState<MosqueEvent[]>([]);
  const [registrations, setRegistrations] = useState<Record<string, BackendMyRegistration>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "upcoming" | "past">("upcoming");

  const loadRegisteredEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMyRegisteredEvents({ all: true });
      setEvents(result.rows);
      setRegistrations(result.registrations);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load your registered events. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRegisteredEvents();
  }, []);

  // Use the backend-provided isPast flag (derived from mosque timezone) to split tabs.
  const upcomingEvents = useMemo(
    () => events.filter((e) => !registrations[e.id]?.isPast),
    [events, registrations],
  );

  const pastEvents = useMemo(
    () => events.filter((e) => registrations[e.id]?.isPast),
    [events, registrations],
  );

  const filteredEvents = useMemo(() => {
    let list = events;
    if (activeTab === "upcoming") list = upcomingEvents;
    if (activeTab === "past") list = pastEvents;

    if (!search.trim()) return list;

    const query = search.toLowerCase();
    return list.filter(
      (e) =>
        e.title.toLowerCase().includes(query) ||
        e.category.toLowerCase().includes(query) ||
        e.location.toLowerCase().includes(query) ||
        (e.speaker && e.speaker.toLowerCase().includes(query)),
    );
  }, [events, upcomingEvents, pastEvents, activeTab, search]);

  return (
    <div className="flex flex-col gap-8">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#17211d] tracking-tight">
            My Registered Events
          </h1>
          <p className="mt-1 text-sm text-[#69726d]">
            View and manage your personal event registrations, entrance passes, and attendance history.
          </p>
        </div>

        <Link
          href="/events"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#073a2d] px-4 py-2.5 text-sm font-semibold !text-white shadow-sm hover:bg-[#0b503f] transition-all"
        >
          <Sparkles className="h-4 w-4 text-[#c79a45]" />
          <span className="!text-white font-semibold">Browse Mosque Calendar</span>
        </Link>
      </div>

      {/* Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e2d8] pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "upcoming"
                ? "bg-[#073a2d] !text-white"
                : "bg-white text-[#69726d] hover:bg-[#faf9f4] border border-[#e5e2d8]"
            }`}
          >
            <span className={activeTab === "upcoming" ? "!text-white" : ""}>
              Upcoming Passes ({upcomingEvents.length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("past")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "past"
                ? "bg-[#073a2d] !text-white"
                : "bg-white text-[#69726d] hover:bg-[#faf9f4] border border-[#e5e2d8]"
            }`}
          >
            <span className={activeTab === "past" ? "!text-white" : ""}>
              Attended & Past ({pastEvents.length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "all"
                ? "bg-[#073a2d] !text-white"
                : "bg-white text-[#69726d] hover:bg-[#faf9f4] border border-[#e5e2d8]"
            }`}
          >
            <span className={activeTab === "all" ? "!text-white" : ""}>
              All Registrations ({events.length})
            </span>
          </button>
        </div>

        {events.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8d948f]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your registered events..."
              className="w-full rounded-lg border border-[#e5e2d8] pl-9 pr-4 py-1.5 text-xs focus:border-[#073a2d] focus:outline-none focus:ring-1 focus:ring-[#073a2d] bg-white"
            />
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid gap-6 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-[#e5e2d8] bg-white p-6 shadow-sm animate-pulse space-y-4"
            >
              <div className="h-36 rounded-xl bg-[#f2f0e8]" />
              <div className="h-6 w-3/4 rounded bg-[#f2f0e8]" />
              <div className="space-y-2">
                <div className="h-4 w-1/2 rounded bg-[#f2f0e8]" />
                <div className="h-4 w-2/3 rounded bg-[#f2f0e8]" />
              </div>
              <div className="h-9 rounded-lg bg-[#f2f0e8]" />
            </div>
          ))}
        </div>
      )}

      {/* Error View */}
      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-red-900">Failed to load registered events</h2>
          <p className="mt-1 text-xs text-red-700 max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={loadRegisteredEvents}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#073a2d] px-4 py-2 text-xs font-semibold !text-white shadow-sm hover:bg-[#0b503f]"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#c79a45]" />
            <span className="!text-white">Try Again</span>
          </button>
        </div>
      )}

      {/* Content Grid (User's Registered Events) */}
      {!loading && !error && filteredEvents.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2">
          {filteredEvents.map((event) => {
            const registration = registrations[event.id];
            const isPast = registration?.isPast ?? false;
            const dateText = formatDisplayDate(event.date);
            const timeText = formatTimeRange(event.startTime, event.endTime, event.timeLabel);

            return (
              <div
                key={event.id}
                className={`flex flex-col overflow-hidden rounded-2xl border border-[#e5e2d8] bg-white shadow-sm transition-all hover:shadow-md ${
                  isPast ? "opacity-85" : ""
                }`}
              >
                {/* Image Banner & Pass Header */}
                <div className="relative h-44 w-full bg-[#073a2d]/10 overflow-hidden">
                  {event.imageUrl ? (
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#073a2d]/15 to-[#c79a45]/15">
                      <CalendarDays className="h-16 w-16 text-[#073a2d]/30" />
                    </div>
                  )}

                  {/* Category Chip */}
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#073a2d]/90 px-3 py-1 text-xs font-bold !text-white shadow-sm backdrop-blur-md">
                      <Tag className="h-3 w-3 text-[#c79a45]" />
                      <span className="!text-white">{event.category}</span>
                    </span>
                  </div>

                  {/* Registration Status Badge */}
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold !text-white shadow-md">
                      <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                      <span className="!text-white">{isPast ? "Attended" : "Registered"}</span>
                    </span>
                  </div>
                </div>

                {/* Content Details */}
                <div className="flex flex-1 flex-col p-5 sm:p-6 justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#17211d] leading-snug line-clamp-2">
                      {event.title}
                    </h3>

                    {/* Metadata Items */}
                    <div className="mt-4 flex flex-col gap-2 text-xs text-[#52605a]">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-[#c79a45] shrink-0" />
                        <span className="font-semibold text-[#17211d]">{dateText}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[#c79a45] shrink-0" />
                        <span>{timeText}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-[#c79a45] shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>

                      {event.speaker && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-[#c79a45] shrink-0" />
                          <span className="truncate font-medium text-[#073a2d]">
                            Speaker: {event.speaker}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Registration Pass Ticket Box */}
                  {!isPast && registration && (
                    <div className="rounded-xl border border-[#073a2d]/15 bg-[#faf9f4] p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <Ticket className="h-8 w-8 text-[#073a2d] shrink-0" />
                        <div>
                          <p className="font-bold text-[#17211d]">Check-in Ticket</p>
                          <p className="font-mono text-[11px] text-[#69726d]">
                            Pass #{registration.registrationId.slice(0, 8).toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`/account/events/${event.id}`}
                        className="rounded-md bg-white border border-[#e5e2d8] px-2.5 py-1 text-[11px] font-semibold text-[#073a2d] hover:bg-[#073a2d] hover:!text-white transition-colors"
                      >
                        View Pass
                      </Link>
                    </div>
                  )}

                  {/* Card Footer Actions */}
                  <div className="border-t border-[#e5e2d8] pt-4 flex items-center justify-between gap-2">
                    <Link
                      href={`/account/events/${event.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#073a2d] hover:underline"
                    >
                      <Ticket className="h-3.5 w-3.5" />
                      <span>View Details</span>
                    </Link>

                    {registration && (
                      <span className="text-[11px] text-[#69726d]">
                        {registration.guests > 0 ? `+${registration.guests} guest${registration.guests > 1 ? "s" : ""}` : "Registered"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State (No Registered Events) */}
      {!loading && !error && filteredEvents.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#d2ccc0] bg-white p-10 text-center flex flex-col items-center justify-center max-w-md mx-auto shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#faf7f0] border border-[#e5e1d3] text-[#c79a45] mb-4">
            <Ticket className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-[#17211d]">
            {search
              ? "No matching registered events"
              : activeTab === "upcoming"
              ? "No upcoming event registrations"
              : "No registered events"}
          </h2>
          <p className="mt-1 text-xs text-[#69726d] max-w-sm leading-relaxed">
            {search
              ? "No registered event matches your query. Try clearing the search box."
              : "You have not registered for any mosque programs or events yet. Explore our community calendar to join upcoming gatherings, seminars, and Islamic classes."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5 justify-center">
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="rounded-lg border border-[#e5e2d8] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#17211d] hover:bg-[#faf9f4]"
              >
                Clear Search
              </button>
            )}
            <Link
              href="/events"
              className="inline-flex items-center gap-2 rounded-lg bg-[#073a2d] px-4 py-2 text-xs font-semibold !text-white shadow-sm hover:bg-[#0b503f] transition-all"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#c79a45]" />
              <span className="!text-white font-semibold">Explore & Register For Events</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
