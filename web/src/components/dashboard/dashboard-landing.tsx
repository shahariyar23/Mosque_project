"use client";

import { useEffect, useState } from "react";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { DashboardOverview } from "@/components/mosque/overview/overview-view";
import { PlatformDashboardView } from "@/components/mosque/admin/platform-dashboard-view";
import { SuperAdminMosqueBanner } from "@/components/dashboard/super-admin-banner";
import { getActiveMosqueId, subscribeTenantChange } from "@/services/tenantStore";

export function DashboardLanding() {
  const { user } = useDashboardSession();
  const [activeMosqueId, setActiveMosqueId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const isSuperAdmin =
    user?.role === "super_admin" ||
    (user?.permissions && user.permissions.includes("platform.manage"));

  useEffect(() => {
    setActiveMosqueId(getActiveMosqueId());
    setMounted(true);
    return subscribeTenantChange((id) => setActiveMosqueId(id));
  }, []);

  if (!mounted) {
    return null;
  }

  // Level 1: If Super Admin has no specific mosque selected, show Global Platform Dashboard
  if (isSuperAdmin && !activeMosqueId) {
    return <PlatformDashboardView />;
  }

  // Level 2: Scoped mosque dashboard (or regular Mosque Admin)
  return (
    <div className="space-y-4">
      {isSuperAdmin && activeMosqueId && <SuperAdminMosqueBanner />}
      <DashboardOverview />
    </div>
  );
}
