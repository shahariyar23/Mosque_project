"use client";

import { useEffect, useRef, useState } from "react";
import { useFinanceSession } from "@/components/dashboard/session-provider";
import { Icon } from "@/components/finance/ui/icon";
import { roleDescriptions, roleLabels, type Role } from "@/lib/finance/permissions";

const roleOrder: Role[] = [
  "super_admin",
  "mosque_admin",
  "president",
  "secretary",
  "treasurer",
  "cashier",
  "imam",
  "member",
];

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Role switcher. This is demo scaffolding in place of real authentication — it lets the team
 * check the permission-driven UI for every role from one shared dashboard.
 */
function RoleSwitcher() {
  const { role, setRole, user } = useFinanceSession();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
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

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex min-h-10 items-center gap-2.5 rounded-full border border-[#deddd3] bg-white px-2 py-1 pr-3 text-left transition-colors hover:border-[#c79a45] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
      >
        <span
          aria-hidden="true"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0d4d3b] text-[11px] font-bold tracking-wide text-white"
        >
          {initials(user.name)}
        </span>
        <span className="hidden min-w-0 leading-tight sm:block">
          <span className="block truncate text-[12.5px] font-semibold text-[#17211d]">{user.name}</span>
          <span className="block truncate text-[11px] text-[#69726d]">{roleLabels[role]}</span>
        </span>
        <Icon name="chevron-down" size={15} className="text-[#69726d]" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Switch role"
          className="finance-enter absolute right-0 top-[calc(100%+8px)] z-50 w-[290px] rounded-lg border border-[#deddd3] bg-white p-2 shadow-[0_20px_50px_-20px_rgba(7,58,45,.32)]"
        >
          <p className="px-2 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[.16em] text-[#c79a45]">
            Preview as role
          </p>
          <p className="px-2 pb-2 text-[11.5px] leading-5 text-[#69726d]">
            Demo only — the API will supply the real session and enforce access.
          </p>
          <ul className="max-h-[300px] overflow-y-auto finance-scroll">
            {roleOrder.map((option) => {
              const active = option === role;
              return (
                <li key={option}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => {
                      setRole(option);
                      setOpen(false);
                    }}
                    className={`flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-[#f4f6f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b] ${
                      active ? "bg-[#f1f4ef]" : ""
                    }`}
                  >
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border border-[#0d4d3b] text-[#0d4d3b]">
                      {active ? <Icon name="check" size={11} /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-[#17211d]">{roleLabels[option]}</span>
                      <span className="block text-[11.5px] leading-4 text-[#69726d]">{roleDescriptions[option]}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

type Props = { navOpen: boolean; onOpenNav: () => void };

export function DashboardHeader({ navOpen, onOpenNav }: Props) {
  const { user } = useFinanceSession();

  return (
    <header className="sticky top-0 z-20 border-b border-[#e2e1d6] bg-[#f8f6ef]/95 backdrop-blur">
      <div className="flex items-center gap-2 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={onOpenNav}
          aria-label="Open navigation"
          aria-expanded={navOpen}
          aria-controls="dashboard-sidebar"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[#deddd3] bg-white text-[#0d4d3b] transition-colors hover:border-[#0d4d3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b] lg:hidden"
        >
          <Icon name="menu" size={18} />
        </button>

        <form
          role="search"
          className="relative min-w-0 flex-1 md:max-w-sm"
          onSubmit={(event) => event.preventDefault()}
        >
          <label htmlFor="dashboard-search" className="sr-only">
            Search the dashboard
          </label>
          <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b938d]">
            <Icon name="search" size={16} />
          </span>
          <input
            id="dashboard-search"
            name="dashboard-search"
            type="search"
            placeholder="Search transactions, members, funds…"
            className="min-h-10 w-full rounded-md border border-[#deddd3] bg-white pl-9 pr-3 text-[13px] text-[#17211d] placeholder:text-[#9aa19c] focus:border-[#0d4d3b] focus:outline-2 focus:outline-offset-1 focus:outline-[#0d4d3b]/40"
          />
        </form>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-[#deddd3] bg-white px-3 py-1.5 text-[11.5px] text-[#4d564f] xl:inline-flex">
            <Icon name="mosque" size={14} className="text-[#c79a45]" />
            {user.mosqueName}
          </span>
          <button
            type="button"
            aria-label="Notifications"
            className="relative grid h-10 w-10 place-items-center rounded-md border border-[#deddd3] bg-white text-[#4d564f] transition-colors hover:border-[#0d4d3b] hover:text-[#0d4d3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
          >
            <Icon name="inbox" size={17} />
            <span aria-hidden="true" className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#c79a45]" />
          </button>
          <RoleSwitcher />
        </div>
      </div>
    </header>
  );
}
