import { AccountGate } from "@/components/account/account-gate";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import {
  UserRound,
  Heart,
  HandCoins,
  Receipt,
  CalendarDays,
  Ticket,
  GraduationCap,
  Bookmark,
  Bell,
  Settings,
  LockKeyhole,
} from "lucide-react";

const accountLinks = [
  { href: "/account/profile", label: "Profile", icon: UserRound },
  { href: "/account/donations", label: "Donations", icon: HandCoins },
  { href: "/account/events", label: "Events", icon: CalendarDays },
  { href: "/account/bookings", label: "Bookings", icon: Ticket },
  { href: "/account/classes", label: "Classes", icon: GraduationCap },
  { href: "/account/saved", label: "Saved Content", icon: Bookmark },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
  { href: "/account/settings", label: "Settings", icon: Settings },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AccountGate>
      <div className="flex min-h-screen flex-col bg-[#faf9f4]">
      <div className="bg-[#073a2d]">
        <SiteHeader />
      </div>

      <main className="flex-1 px-5 py-12 pt-32 sm:py-16 sm:pt-36 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:gap-12">
            {/* Sidebar */}
            <aside className="hidden lg:block">
              <nav className="flex flex-col gap-1 rounded-xl border border-[#e5e2d8] bg-white p-3 shadow-sm">
                {accountLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-[#69726d] transition-colors hover:bg-[#faf9f4] hover:text-[#0d4d3b]"
                    >
                      <Icon className="h-5 w-5 opacity-70" />
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>

            {/* Mobile Nav */}
            <nav className="flex gap-2 overflow-x-auto pb-4 lg:hidden">
              {accountLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="whitespace-nowrap rounded-full border border-[#e5e2d8] bg-white px-4 py-2 text-sm font-medium text-[#69726d] shadow-sm hover:bg-[#faf9f4]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Content */}
            <div className="min-w-0">{children}</div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
    </AccountGate>
  );
}
