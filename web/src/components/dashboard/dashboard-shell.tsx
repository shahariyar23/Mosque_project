"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { ToastProvider } from "@/components/ui/toast";

/**
 * Sidebar + header frame shared by every dashboard route. Only the frame is a Client Component;
 * the pages inside stay Server Components so the whole dashboard is not one big client bundle.
 *
 * `ToastProvider` wraps the frame rather than each page: an action on one screen can navigate and its
 * acknowledgement should survive the transition, which it cannot if the provider unmounts with the page.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Close the mobile drawer on navigation — including browser back — so the new page is not
  // left hidden behind it. Adjusted during render rather than in an effect to avoid a second pass.
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (navOpen) setNavOpen(false);
  }

  return (
    <div className="min-h-dvh bg-[#f8f6ef] lg:flex">
      <a
        href="#dashboard-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[#0d4d3b] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>

      <DashboardSidebar open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader navOpen={navOpen} onOpenNav={() => setNavOpen(true)} />
        <main id="dashboard-main" className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-7">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
        <footer className="border-t border-[#e2e1d6] px-4 py-4 sm:px-6">
          <p className="text-[11.5px] text-[#8b938d]">
            Noor Mosque Management · Preview build. Figures and records shown are sample data.
          </p>
        </footer>
      </div>
    </div>
  );
}
