import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { ArticlesView } from "@/components/mosque/articles/articles-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Articles · Noor Mosque Management",
  description: "The mosque's written content — reminders, explainers and seasonal pieces published to the community.",
};

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const { action } = await searchParams;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Articles"
        subtitle="Reminders, explainers and seasonal pieces the mosque publishes."
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Articles" }]}
      />
      <RequirePermission anyOf={["article.view"]} area="Articles">
        <ArticlesView openAddOnMount={action === "add"} />
      </RequirePermission>
    </div>
  );
}
