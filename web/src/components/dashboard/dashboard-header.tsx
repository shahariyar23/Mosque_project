"use client";

import { useDashboardSession } from "@/components/dashboard/session-provider";
import { DashboardSearch } from "@/components/dashboard/dashboard-search";
import { DashboardUserMenu } from "@/components/dashboard/dashboard-user-menu";
import { NotificationPopover } from "@/components/dashboard/notification-popover";
import { Icon } from "@/components/finance/ui/icon";

type Props = { navOpen: boolean; onOpenNav: () => void };

export function DashboardHeader({ navOpen, onOpenNav }: Props) {
  const { user } = useDashboardSession();

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

        <DashboardSearch />

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <span className="hidden items-center gap-1.5 rounded-full border border-[#deddd3] bg-white px-3 py-1.5 text-[11.5px] text-[#4d564f] xl:inline-flex">
              <Icon name="mosque" size={14} className="text-[#c79a45]" />
              {user.mosqueName}
            </span>
          ) : null}
          <NotificationPopover />
          <DashboardUserMenu />
        </div>
      </div>
    </header>
  );
}
