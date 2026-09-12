"use client";

import { useEffect, useState } from "react";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { DashboardOverview } from "@/components/mosque/overview/overview-view";
import { PlatformDashboardView } from "@/components/mosque/admin/platform-dashboard-view";
import { SuperAdminMosqueBanner } from "@/components/dashboard/super-admin-banner";
import { getActiveMosqueId, subscribeTenantChange } from "@/services/tenantStore";

export function DashboardLanding() {
  const { user } = useDashboardSession();
  const [activeMosqueId, setActiveMosqueId] = useState<string | null>(() => getActiveMosqueId());
  const [mounted, setMounted] = useState(false);

  const isSuperAdmin =
    user?.role === "super_admin" ||
    (user?.permissions && user.permissions.includes("platform.manage"));

  useEffect(() => {
    const mountedTimer = window.setTimeout(() => setMounted(true), 0);
    const unsubscribe = subscribeTenantChange((id) => setActiveMosqueId(id));
    return () => {
      window.clearTimeout(mountedTimer);
      unsubscribe();
    };
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
      {/* A tenant change must discard the previous overview state before the next request.
          The API validates the selector, and this key prevents Noor's in-memory response from
          remaining visible while the Uttara request is in flight. */}
      <DashboardOverview key={activeMosqueId ?? "own-mosque"} />
    </div>
  );
}
