"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { positionLabels, roleLabels } from "@/lib/permissions";
import { Icon } from "@/components/finance/ui/icon";
import {
  UserRound,
  Settings,
  LockKeyhole,
  Globe,
  LogOut,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function DashboardUserMenu() {
  const { logout } = useAuth();
  const { user } = useDashboardSession();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const positions = user.positions.map((p) => positionLabels[p]?.en || p).join(", ");
  const roleLabel = roleLabels[user.role] || user.role;
  const userInitials = initials(user.name);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((val) => !val)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="User account menu"
        className="flex min-h-10 items-center gap-2.5 rounded-full border border-[#deddd3] bg-white px-2 py-1 pr-3 text-left transition-colors hover:border-[#c79a45] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
      >
        <span
          aria-hidden="true"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0d4d3b] text-[11px] font-bold tracking-wide text-white"
        >
          {userInitials}
        </span>
        <span className="hidden min-w-0 leading-tight sm:block">
          <span className="block truncate text-[12.5px] font-semibold text-[#17211d]">
            {user.name}
          </span>
          <span className="block truncate text-[11px] text-[#69726d]">
            {positions ? `${positions} · ${roleLabel}` : roleLabel}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[#69726d] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="User menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[280px] max-w-[calc(100vw-2rem)] rounded-xl border border-[#deddd3] bg-white shadow-[0_20px_50px_-20px_rgba(7,58,45,.25)] overflow-hidden animate-in fade-in zoom-in-95"
        >
          {/* Header */}
          <div className="border-b border-[#e5e4da] bg-[#fbfbf9] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0d4d3b] text-sm font-bold text-white shadow-sm">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#17211d]">{user.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded bg-[#0d4d3b]/10 px-2 py-0.5 text-[10.5px] font-semibold text-[#0d4d3b]">
                    <ShieldCheck className="h-3 w-3" />
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="p-1.5 space-y-0.5">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-[#4d564f] transition-colors hover:bg-[#faf9f4] hover:text-[#0d4d3b]"
              role="menuitem"
            >
              <Globe className="h-4 w-4 text-[#8b938d]" />
              View Public Website
            </Link>

            <Link
              href="/account/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-[#4d564f] transition-colors hover:bg-[#faf9f4] hover:text-[#0d4d3b]"
              role="menuitem"
            >
              <UserRound className="h-4 w-4 text-[#8b938d]" />
              My Profile
            </Link>

            <Link
              href="/account/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-[#4d564f] transition-colors hover:bg-[#faf9f4] hover:text-[#0d4d3b]"
              role="menuitem"
            >
              <Settings className="h-4 w-4 text-[#8b938d]" />
              Account Settings
            </Link>

            <Link
              href="/account/settings/password"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-[#4d564f] transition-colors hover:bg-[#faf9f4] hover:text-[#0d4d3b]"
              role="menuitem"
            >
              <LockKeyhole className="h-4 w-4 text-[#8b938d]" />
              Change Password
            </Link>
          </div>

          {/* Sign Out */}
          <div className="border-t border-[#e5e4da] bg-[#fbfbf9] p-1.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-[#a13228] transition-colors hover:bg-red-50 hover:text-red-700"
              role="menuitem"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
