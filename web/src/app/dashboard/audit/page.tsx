import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { AuditView } from "@/components/mosque/audit/audit-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Audit Log · Noor Mosque Management",
  description: "A read-only record of back-office activity — who did what, in which area, and when.",
};

export default function AuditPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit Log"
        subtitle="A read-only trail of everything done in the back office — each entry shows the person, the action, the area it touched and when it happened."
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Audit Log" }]}
      />
      <RequirePermission anyOf={["audit.view"]} area="Audit Log">
        <AuditView />
      </RequirePermission>
    </div>
  );
}
