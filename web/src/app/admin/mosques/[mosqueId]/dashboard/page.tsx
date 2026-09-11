"use client";

import { use, useEffect } from "react";
import { RequirePermission } from "@/components/finance/ui/permission-gate";
import { DashboardOverview } from "@/components/mosque/overview/overview-view";
import { SuperAdminMosqueBanner } from "@/components/dashboard/super-admin-banner";
import { setActiveMosqueId, getActiveMosqueId } from "@/services/tenantStore";

export default function MosqueSpecificDashboardPage({
  params,
}: {
  params: Promise<{ mosqueId: string }>;
}) {
  const { mosqueId } = use(params);

  useEffect(() => {
    if (mosqueId && getActiveMosqueId() !== mosqueId) {
      setActiveMosqueId(mosqueId);
    }
  }, [mosqueId]);

  return (
    <RequirePermission
      anyOf={["platform.manage"]}
      area="the mosque dashboard"
      description="You need platform management authority to enter this mosque's dashboard."
    >
      <div className="space-y-4">
        <SuperAdminMosqueBanner />
        <DashboardOverview />
      </div>
    </RequirePermission>
  );
}
