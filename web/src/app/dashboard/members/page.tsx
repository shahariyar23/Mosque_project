import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { MembersView } from "@/components/mosque/members/members-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Members · Noor Mosque Management",
  description: "The mosque member register — contact details, membership standing and event history.",
};

/**
 * `searchParams` is read here rather than with `useSearchParams()` in the view.
 *
 * The overview's "Add Member" shortcut links to `?action=add`, and reading that on the server means the
 * dialog is open on the first paint with no client-side hook and no Suspense boundary to arrange.
 */
export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const { action } = await searchParams;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Members"
        subtitle="Manage mosque members and community profiles."
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Members" }]}
      />
      <RequirePermission anyOf={["member.view"]} area="Members">
        <MembersView openAddOnMount={action === "add"} />
      </RequirePermission>
    </div>
  );
}
