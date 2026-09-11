import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardGate } from "@/components/dashboard/dashboard-gate";

export const metadata: Metadata = {
  title: "Mosque Dashboard · Noor Platform Administration",
  description: "Mosque-specific administrative view for Super Admin.",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <DashboardGate>{children}</DashboardGate>;
}
