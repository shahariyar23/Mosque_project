import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { mockMyEvents } from "@/data/mock-user-data";
import { CalendarDays, MapPin, Clock } from "lucide-react";

export default async function EventsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/signin");
  }

  const upcomingEvents = mockMyEvents.filter((e) => !e.isPast);
  const pastEvents = mockMyEvents.filter((e) => e.isPast);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#17211d]">My Events</h1>
        <p className="mt-1 text-sm text-[#69726d]">
          View and manage your registered mosque events.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <section>
          <h2 className="text-lg font-semibold text-[#17211d] mb-4">Upcoming Events</h2>
          {upcomingEvents.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="flex flex-col overflow-hidden rounded-xl border border-[#e5e2d8] bg-white shadow-sm transition-shadow hover:shadow-md">
                  <div className="h-32 bg-[#073a2d]/10 relative">
                    {/* Placeholder image */}
                    <div className="absolute inset-0 flex justify-center items-center opacity-20">
                       <CalendarDays className="h-12 w-12 text-[#0d4d3b]"/>
                    </div>
                  </div>
                  <div className="flex flex-col p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-[#17211d]">{event.title}</h3>
                      <span className="inline-flex shrink-0 items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        {event.status}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 text-sm text-[#69726d]">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        <span>{event.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{event.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location}</span>
                      </div>
                    </div>
                    <div className="mt-5 border-t border-[#e5e2d8] pt-4">
                      <Link
                        href={`/account/events/${event.id}`}
                        className="inline-flex w-full items-center justify-center rounded-md bg-[#faf9f4] px-4 py-2 text-sm font-medium text-[#0d4d3b] transition-colors hover:bg-[#e5e2d8]"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[#e5e2d8] border-dashed p-8 text-center bg-[#faf9f4]/50">
               <p className="text-[#69726d]">You don't have any registered events yet.</p>
               <Link href="/events" className="mt-4 inline-block font-medium text-[#0d4d3b] hover:underline">Explore Events</Link>
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-[#17211d] mb-4">Past Events</h2>
          {pastEvents.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {pastEvents.map((event) => (
                <div key={event.id} className="flex flex-col rounded-xl border border-[#e5e2d8] bg-white p-5 opacity-75 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-[#17211d]">{event.title}</h3>
                    <span className="inline-flex shrink-0 items-center rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                      {event.status}
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-[#69726d]">
                    {event.date} • {event.location}
                  </div>
                  <div className="mt-4">
                    <Link
                      href={`/account/events/${event.id}`}
                      className="text-sm font-medium text-[#0d4d3b] hover:underline"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="rounded-xl border border-[#e5e2d8] p-8 text-center text-sm text-[#69726d]">
                No past events found.
             </div>
          )}
        </section>
      </div>
    </div>
  );
}
