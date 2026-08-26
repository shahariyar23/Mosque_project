import { ContentGenerator } from "@/components/dashboard/content-generator";
import { PageHeader } from "@/components/dashboard/page-header";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

/**
 * The permission check here used to read `getSession()` — the hard-coded demo profile — so it granted or
 * refused access on invented permissions rather than the signed-in account's own. `RequirePermission`
 * reads the real session, and renders the same no-access panel every other gated page uses instead of a
 * one-off card written for this route.
 *
 * Nothing behind this page is a backend call: the generator has no controller, so the gate is purely
 * about not offering a tool the person's role does not include.
 */
export default function ContentGeneratorPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Content generator"
        subtitle="Create a first draft for mosque announcements, articles, khutbahs, and events. Review every detail before publishing."
        crumbs={[
          { label: "Islamic Content", href: "/dashboard/articles" },
          { label: "Content generator" },
        ]}
      />
      <RequirePermission
        anyOf={["article.manage"]}
        area="the content generator"
        description="Drafting mosque content needs permission to manage articles. Ask an administrator if you need it."
      >
        <ContentGenerator />
      </RequirePermission>
    </div>
  );
}
