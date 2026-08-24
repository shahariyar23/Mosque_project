import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { mockMyEvents } from "@/data/mock-user-data";
import { ArrowLeft, CalendarDays, MapPin, Clock, QrCode } from "lucide-react";

export default async function EventDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/signin");
  }

  const resolvedParams = await params;
  const event = mockMyEvents.find((e) => e.id === resolvedParams.id) || mockMyEvents[0];

  return (
    <div className="mx-auto max-w-2xl flex flex-col gap-6">
      <Link
        href="/account/events"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#69726d] hover:text-[#17211d]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </Link>

      <div className="overflow-hidden rounded-2xl border border-[#e5e2d8] bg-white shadow-sm">
        <div className="h-48 bg-[#073a2d]/10 relative">
          <div className="absolute inset-0 flex justify-center items-center opacity-20">
             <CalendarDays className="h-16 w-16 text-[#0d4d3b]"/>
          </div>
        </div>
        
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#17211d]">{event.title}</h1>
              <div className="mt-4 flex flex-col gap-3 text-[#69726d]">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-[#c79a45]" />
                  <span>{event.date}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-[#c79a45]" />
                  <span>{event.time}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-[#c79a45]" />
                  <span>{event.location}</span>
                </div>
              </div>
            </div>
            
            <div className="shrink-0 flex flex-col items-center gap-2 rounded-xl border border-[#e5e2d8] p-4 bg-[#faf9f4]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8d948f]">Registration</span>
              <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${event.isPast ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}`}>
                {event.status}
              </span>
            </div>
          </div>

          {!event.isPast && (
            <div className="mt-8 rounded-xl border border-[#0d4d3b]/20 bg-[#073a2d]/5 p-6 flex flex-col sm:flex-row items-center gap-6">
              <div className="rounded-lg bg-white p-2 shadow-sm shrink-0">
                <QrCode className="h-24 w-24 text-[#0d4d3b]" />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="font-semibold text-[#17211d]">Your Event Ticket</h3>
                <p className="mt-1 text-sm text-[#69726d]">Show this QR code at the entrance to check in.</p>
                <p className="mt-3 text-xs font-medium text-[#8d948f]">Registration ID: {event.id}</p>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/events"
              className="flex flex-1 items-center justify-center rounded-md bg-[#0d4d3b] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#073a2d]"
            >
              View Event Page
            </Link>
            {!event.isPast && (
              <button className="flex flex-1 items-center justify-center rounded-md border border-[#e5e2d8] bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50">
                Cancel Registration
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
