"use client";

import { useDashboardSession } from "@/components/dashboard/session-provider";
import { ProfileSwitcher } from "@/components/dashboard/profile-switcher";
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
          {user ? (
            <span className="hidden items-center gap-1.5 rounded-full border border-[#deddd3] bg-white px-3 py-1.5 text-[11.5px] text-[#4d564f] xl:inline-flex">
              <Icon name="mosque" size={14} className="text-[#c79a45]" />
              {user.mosqueName}
            </span>
          ) : null}
          <button
            type="button"
            aria-label="Notifications"
            className="relative grid h-10 w-10 place-items-center rounded-md border border-[#deddd3] bg-white text-[#4d564f] transition-colors hover:border-[#0d4d3b] hover:text-[#0d4d3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
          >
            <Icon name="inbox" size={17} />
            <span aria-hidden="true" className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#c79a45]" />
          </button>
          <ProfileSwitcher />
        </div>
      </div>
    </header>
  );
}
