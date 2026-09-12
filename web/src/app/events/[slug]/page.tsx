"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { InnerPage } from "@/components/inner-page";
import { EventDetail } from "@/components/events/event-detail";
import { useMosqueBranding } from "@/components/mosque-branding-provider";
import { fetchEvent } from "@/services/eventService";
import type { MosqueEvent } from "@/lib/mosque/types";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const { activeSlug } = useMosqueBranding();
  const [event, setEvent] = useState<MosqueEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvent = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEvent(slug, activeSlug);
      setEvent(data);
    } catch {
      setError("Event not found for this mosque. It may have been removed or the link is incorrect.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvent();
  }, [slug, activeSlug]);

  if (loading) {
    return (
      <InnerPage eyebrow="EVENT DETAILS" title="Loading Event...">
        <div className="mx-auto max-w-4xl flex flex-col gap-6 animate-pulse">
          <div className="h-6 w-32 rounded bg-[#e5e2d8]" />
          <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
            <div className="h-72 rounded-3xl bg-[#e5e2d8]" />
            <div className="h-72 rounded-3xl bg-[#e5e2d8]" />
          </div>
        </div>
      </InnerPage>
    );
  }

  if (error || !event) {
    return (
      <InnerPage eyebrow="EVENT NOT FOUND" title="Event Not Found">
        <div className="mx-auto max-w-xl text-center py-12 px-6 rounded-3xl border border-dashed border-[#d2ccc0] bg-white shadow-sm space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 border border-red-200 text-red-600 mb-2">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#0e2a22]">Event Not Found</h2>
          <p className="text-sm text-[#69726d] leading-relaxed max-w-md mx-auto">
            {error || "We couldn't find the event details you are looking for."}
          </p>
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={loadEvent}
              className="inline-flex items-center gap-2 rounded-xl bg-[#073a2d] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#0b503f] transition"
            >
              <RefreshCw className="h-4 w-4 text-[#c79a45]" />
              <span>Try Again</span>
            </button>
            <Link
              href="/events"
              className="inline-flex items-center gap-2 rounded-xl border border-[#d2ccc0] bg-white px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#073a2d] hover:bg-[#faf8f4] transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to All Events</span>
            </Link>
          </div>
        </div>
      </InnerPage>
    );
  }

  return (
    <InnerPage eyebrow="EVENT DETAILS" title={event.title}>
      <EventDetail event={event} />
    </InnerPage>
  );
}
