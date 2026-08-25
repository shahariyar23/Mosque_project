import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { mockMyBookings } from "@/data/mock-user-data";
import { Ticket, CalendarDays, Clock, MapPin } from "lucide-react";

export default async function BookingsPage() {
  const session = getSession();

  if (!session) {
    redirect("/signin");
  }

  const upcomingBookings = mockMyBookings.filter((b) => b.status === "Upcoming");
  const pastBookings = mockMyBookings.filter((b) => b.status !== "Upcoming");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#17211d]">My Service Bookings</h1>
        <p className="mt-1 text-sm text-[#69726d]">
          Manage your appointments and requests for mosque services.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <section>
          <h2 className="text-lg font-semibold text-[#17211d] mb-4">Upcoming Bookings</h2>
          {upcomingBookings.length > 0 ? (
            <div className="grid gap-4">
              {upcomingBookings.map((booking) => (
                <div key={booking.id} className="flex flex-col sm:flex-row rounded-xl border border-[#e5e2d8] bg-white p-5 shadow-sm sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#faf9f4] text-[#0d4d3b]">
                      <Ticket className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[#17211d]">{booking.service}</h3>
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                          {booking.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#8d948f]">Booking ID: {booking.id}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#69726d]">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="h-4 w-4" />
                          <span>{booking.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          <span>{booking.time}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          <span>{booking.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2 sm:flex-col">
                    <button className="flex-1 rounded-md border border-[#e5e2d8] bg-white px-3 py-2 text-sm font-medium text-[#17211d] hover:bg-[#faf9f4]">
                      Reschedule
                    </button>
                    <button className="flex-1 rounded-md border border-[#e5e2d8] bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[#e5e2d8] border-dashed p-8 text-center bg-[#faf9f4]/50">
               <p className="text-[#69726d]">You don't have any upcoming service bookings.</p>
               <Link href="/services" className="mt-4 inline-block font-medium text-[#0d4d3b] hover:underline">Book a Service</Link>
            </div>
          )}
        </section>

        <section className="mt-4">
          <h2 className="text-lg font-semibold text-[#17211d] mb-4">Past Bookings</h2>
          {pastBookings.length > 0 ? (
            <div className="grid gap-4">
              {pastBookings.map((booking) => (
                <div key={booking.id} className="flex flex-col sm:flex-row rounded-xl border border-[#e5e2d8] bg-white p-5 opacity-75 shadow-sm sm:items-center sm:justify-between gap-4">
                   <div className="flex items-start gap-4">
                    <div className="mt-1 hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-400">
                      <Ticket className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[#17211d]">{booking.service}</h3>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          booking.status === 'Completed' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-gray-50 text-gray-600 ring-gray-500/10'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#69726d]">
                        <span>{booking.date}</span>
                        <span>{booking.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[#e5e2d8] p-8 text-center text-sm text-[#69726d]">
               No past bookings found.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
