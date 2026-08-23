import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { UsersView } from "@/components/mosque/users/users-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Users · Noor Mosque Management",
  description: "The back-office directory — every account that can sign in, its role, committee posts and status.",
};

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  const { action } = await searchParams;
  return (
    <div className="space-y-5">
      <PageHeader
        title="Users"
        subtitle="Everyone who can sign in to run the mosque — the role each holds, the committee posts they are known by and whether their account is active."
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Users" }]}
      />
      <RequirePermission anyOf={["user.view"]} area="Users">
        <UsersView openAddOnMount={action === "add"} />
      </RequirePermission>
    </div>
  );
}
