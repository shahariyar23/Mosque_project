"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { roleLabels } from "@/lib/permissions";
import {
  UserRound,
  Heart,
  HandCoins,
  Receipt,
  CalendarDays,
  Ticket,
  GraduationCap,
  Bookmark,
  Clock,
  Bell,
  Settings,
  LockKeyhole,
  CircleHelp,
  LogOut,
  ChevronDown,
} from "lucide-react";

export function UserMenu() {
  const { session, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  if (!session?.user) return null;

  const user = session.user;
  // Already resolved server-side — base ∪ role ∪ granted − denied, and empty for an inactive account.
  const canSeeDashboard = session.permissions.includes("dashboard.view");
  // Fallback initials
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "MS";

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 p-1.5 pr-3 transition-all hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e0be79]"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User account menu"
      >
        <div className="relative">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#c79a45] text-sm font-bold text-[#15251f]">
            {initials}
          </div>
          {/* Online Indicator */}
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#15251f] bg-green-500"></span>
        </div>
        <div className="hidden flex-col items-start lg:flex">
          <span className="text-sm font-medium text-white">
            {user.name.split(" ")[0]}
          </span>
          <span className="text-[10px] text-white/70">{roleLabels[user.role]}</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-white/70 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="fixed left-4 right-4 top-[80px] origin-top-right transform overflow-hidden rounded-xl border border-white/10 bg-[#073a2d] text-white shadow-2xl transition-all animate-in fade-in zoom-in-95 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[360px]"
          role="menu"
        >
          {/* Header */}
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#c79a45] text-lg font-bold text-[#15251f]">
                {initials}
              </div>
              <div>
                <h3 className="font-semibold">{user.name}</h3>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-medium text-[#e0be79]">
                    {roleLabels[user.role]}
                  </span>
                  {user.role === "super_admin" || user.role === "mosque_admin" ? (
                    <span className="rounded bg-red-900/40 px-2 py-0.5 text-xs font-medium text-red-200">
                      Admin
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="max-h-[calc(100vh-240px)] overflow-y-auto">
            {/* Admin Action — gated on the same permission the dashboard itself checks, so the link
                appears exactly when following it would work. Role is the wrong test: a treasurer and a
                secretary both hold `dashboard.view` and neither is an admin. */}
            {canSeeDashboard && (
              <div className="border-b border-white/10 p-2">
                <Link
                  href="/dashboard"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#e0be79] transition-colors hover:bg-white/10"
                  role="menuitem"
                >
                  <LockKeyhole className="h-4 w-4" />
                  Go to Admin Dashboard
                </Link>
              </div>
            )}

            {/* My Account */}
            <div className="border-b border-white/10 p-2">
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold tracking-wider text-white/50 uppercase">
                My Account
              </p>
              <Link href="/account/profile" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white" role="menuitem">
                <UserRound className="h-4 w-4 text-white/60" /> Profile
              </Link>
              <Link href="/account/donations" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white" role="menuitem">
                <HandCoins className="h-4 w-4 text-white/60" /> My Donations
              </Link>
              <Link href="/account/donations" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white" role="menuitem">
                <Receipt className="h-4 w-4 text-white/60" /> Donation History
              </Link>
              <Link href="/account/events" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white" role="menuitem">
                <CalendarDays className="h-4 w-4 text-white/60" /> My Events
              </Link>
              <Link href="/account/bookings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white" role="menuitem">
                <Ticket className="h-4 w-4 text-white/60" /> My Bookings
              </Link>
              <Link href="/account/classes" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white" role="menuitem">
                <GraduationCap className="h-4 w-4 text-white/60" /> My Classes
              </Link>
              <Link href="/account/saved" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white" role="menuitem">
                <Bookmark className="h-4 w-4 text-white/60" /> Saved Content
              </Link>
            </div>

            {/* Mosque & Community */}
            <div className="border-b border-white/10 p-2">
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold tracking-wider text-white/50 uppercase">
                Mosque & Community
              </p>
              <Link href="/prayer-times" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white" role="menuitem">
                <Clock className="h-4 w-4 text-white/60" /> Prayer Times
              </Link>
              <Link href="/jumuah" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white" role="menuitem">
                <Heart className="h-4 w-4 text-white/60" /> Jumu'ah
              </Link>
              <Link href="/account/notifications" className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white" role="menuitem">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-white/60" /> Notifications
                </div>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#c79a45] text-[10px] font-bold text-[#15251f]">3</span>
              </Link>
            </div>

            {/* Account */}
            <div className="p-2">
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold tracking-wider text-white/50 uppercase">
                Account
              </p>
              <Link href="/account/settings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white" role="menuitem">
                <Settings className="h-4 w-4 text-white/60" /> Settings
              </Link>
              <Link href="/account/settings/password" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white" role="menuitem">
                <LockKeyhole className="h-4 w-4 text-white/60" /> Change Password
              </Link>
              <Link href="/help" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white" role="menuitem">
                <CircleHelp className="h-4 w-4 text-white/60" /> Help & Support
              </Link>
            </div>

            {/* Sign Out */}
            <div className="border-t border-white/10 bg-black/20 p-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-white/10 hover:text-red-300"
                role="menuitem"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
