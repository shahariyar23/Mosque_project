"use client";

import Link from "next/link";
import { CalendarDays, HandCoins, Ticket, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

export default function AccountDashboard() {
  const { session } = useAuth();
  const name = session?.user.name.split(" ")[0] ?? "";
  return <div className="flex flex-col gap-8"><section className="rounded-2xl bg-[#0d4d3b] p-8 text-white shadow-sm sm:p-10"><h1 className="text-2xl font-semibold sm:text-3xl">Assalamu Alaikum, {name}</h1><p className="mt-2 text-lg text-white/80">Welcome to your mosque account.</p><p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70">Manage your own mosque activities using data from your authenticated account.</p></section><section className="rounded-xl border border-dashed border-[#e5e2d8] bg-white p-8 text-center"><h2 className="text-lg font-semibold text-[#17211d]">Your activity</h2><p className="mt-2 text-sm text-[#69726d]">Only information backed by the authenticated API is shown here.</p><div className="mt-6 grid gap-3 sm:grid-cols-3"><Link href="/account/donations" className="flex items-center justify-center gap-2 rounded-md border border-[#e5e2d8] p-4 text-sm font-semibold text-[#0d4d3b]"><HandCoins className="h-4 w-4" />Donations</Link><Link href="/account/events" className="flex items-center justify-center gap-2 rounded-md border border-[#e5e2d8] p-4 text-sm font-semibold text-[#0d4d3b]"><CalendarDays className="h-4 w-4" />Events</Link><Link href="/account/profile" className="flex items-center justify-center gap-2 rounded-md border border-[#e5e2d8] p-4 text-sm font-semibold text-[#0d4d3b]"><UserRound className="h-4 w-4" />Profile</Link></div></section><Link href="/account/bookings" className="inline-flex items-center gap-2 self-start text-sm font-semibold text-[#0d4d3b]"><Ticket className="h-4 w-4" />View my bookings</Link></div>;
}
