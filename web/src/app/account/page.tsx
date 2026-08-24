import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  mockDashboardStats,
  mockRecentActivity,
} from "@/data/mock-user-data";
import {
  HandCoins,
  CalendarDays,
  Ticket,
  GraduationCap,
  Clock,
  ArrowRight,
  UserRound,
} from "lucide-react";

export default async function AccountDashboard() {
  const session = await getSession();

  if (!session) {
    redirect("/signin");
  }

  const { user } = session;
  const firstName = user.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-8">
      {/* Hero Section */}
      <section className="rounded-2xl bg-[#0d4d3b] p-8 text-white shadow-sm sm:p-10">
        <h1 className="text-2xl font-semibold sm:text-3xl">
          Assalamu Alaikum, {firstName} 👋
        </h1>
        <p className="mt-2 text-lg text-white/80">
          Welcome back to NOOR Mosque.
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70">
          Stay connected with your mosque, manage your donations, events, and
          personal activities from one place.
        </p>
      </section>

      {/* Stats Grid */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#e5e2d8] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 text-[#69726d]">
            <HandCoins className="h-5 w-5" />
            <h3 className="text-sm font-medium">Total Donations</h3>
          </div>
          <p className="mt-3 text-2xl font-bold text-[#17211d]">
            ৳{mockDashboardStats.totalDonations.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-[#e5e2d8] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 text-[#69726d]">
            <CalendarDays className="h-5 w-5" />
            <h3 className="text-sm font-medium">Upcoming Events</h3>
          </div>
          <p className="mt-3 text-2xl font-bold text-[#17211d]">
            {mockDashboardStats.upcomingEvents}
          </p>
        </div>
        <div className="rounded-xl border border-[#e5e2d8] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 text-[#69726d]">
            <Ticket className="h-5 w-5" />
            <h3 className="text-sm font-medium">Active Bookings</h3>
          </div>
          <p className="mt-3 text-2xl font-bold text-[#17211d]">
            {mockDashboardStats.activeBookings}
          </p>
        </div>
        <div className="rounded-xl border border-[#e5e2d8] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 text-[#69726d]">
            <GraduationCap className="h-5 w-5" />
            <h3 className="text-sm font-medium">Registered Classes</h3>
          </div>
          <p className="mt-3 text-2xl font-bold text-[#17211d]">
            {mockDashboardStats.registeredClasses}
          </p>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* Recent Activity */}
        <section className="rounded-xl border border-[#e5e2d8] bg-white shadow-sm">
          <div className="border-b border-[#e5e2d8] px-6 py-4">
            <h2 className="font-semibold text-[#17211d]">Recent Activity</h2>
          </div>
          <div className="divide-y divide-[#e5e2d8]">
            {mockRecentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-4 px-6 py-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#faf9f4] text-[#0d4d3b]">
                  {activity.icon === "donation" && <HandCoins className="h-5 w-5" />}
                  {activity.icon === "event" && <CalendarDays className="h-5 w-5" />}
                  {activity.icon === "booking" && <Ticket className="h-5 w-5" />}
                  {activity.icon === "class" && <GraduationCap className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#17211d]">
                    {activity.action}
                  </p>
                  <p className="text-xs text-[#69726d]">{activity.date}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="rounded-xl border border-[#e5e2d8] bg-white shadow-sm">
          <div className="border-b border-[#e5e2d8] px-6 py-4">
            <h2 className="font-semibold text-[#17211d]">Quick Actions</h2>
          </div>
          <div className="flex flex-col gap-2 p-4">
            <Link
              href="/donations"
              className="flex items-center justify-between rounded-lg p-3 text-sm font-medium text-[#0d4d3b] transition-colors hover:bg-[#faf9f4]"
            >
              <div className="flex items-center gap-3">
                <HandCoins className="h-4 w-4" />
                Make a Donation
              </div>
              <ArrowRight className="h-4 w-4 opacity-50" />
            </Link>
            <Link
              href="/account/events"
              className="flex items-center justify-between rounded-lg p-3 text-sm font-medium text-[#0d4d3b] transition-colors hover:bg-[#faf9f4]"
            >
              <div className="flex items-center gap-3">
                <CalendarDays className="h-4 w-4" />
                View Events
              </div>
              <ArrowRight className="h-4 w-4 opacity-50" />
            </Link>
            <Link
              href="/services"
              className="flex items-center justify-between rounded-lg p-3 text-sm font-medium text-[#0d4d3b] transition-colors hover:bg-[#faf9f4]"
            >
              <div className="flex items-center gap-3">
                <Ticket className="h-4 w-4" />
                Book a Service
              </div>
              <ArrowRight className="h-4 w-4 opacity-50" />
            </Link>
            <Link
              href="/prayer-times"
              className="flex items-center justify-between rounded-lg p-3 text-sm font-medium text-[#0d4d3b] transition-colors hover:bg-[#faf9f4]"
            >
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4" />
                Prayer Times
              </div>
              <ArrowRight className="h-4 w-4 opacity-50" />
            </Link>
            <Link
              href="/account/profile"
              className="flex items-center justify-between rounded-lg p-3 text-sm font-medium text-[#0d4d3b] transition-colors hover:bg-[#faf9f4]"
            >
              <div className="flex items-center gap-3">
                <UserRound className="h-4 w-4" />
                Edit Profile
              </div>
              <ArrowRight className="h-4 w-4 opacity-50" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
