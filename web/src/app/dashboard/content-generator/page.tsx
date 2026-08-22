import { ContentGenerator } from "@/components/dashboard/content-generator";
import { PageHeader } from "@/components/dashboard/page-header";
import { getSession } from "@/lib/session";

export default async function ContentGeneratorPage() {
  const session = await getSession();
  if (!session?.permissions.includes("article.manage")) {
    return (
      <div className="rounded-xl border border-[#e2e1d6] bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-[#17211d]">
          Content generator unavailable
        </h1>
        <p className="mt-2 text-sm text-[#69726d]">
          Your account does not have permission to generate content.
        </p>
      </div>
    );
  }

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
      <ContentGenerator />
    </div>
  );
}
