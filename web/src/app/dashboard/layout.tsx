import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardSessionProvider } from "@/components/dashboard/session-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Dashboard · Noor Mosque Management",
  description: "Mosque administration dashboard — finance, community, prayer times and content.",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardSessionProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardSessionProvider>
  );
}
