import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { ClassesView } from "@/components/mosque/classes/classes-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Classes · Noor Mosque Management",
  description: "The mosque's teaching programme — the weekend madrasah, Hifz circle, Arabic ladder and adult courses.",
};

export default async function ClassesPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  const { action } = await searchParams;
  return (
    <div className="space-y-5">
      <PageHeader
        title="Classes"
        subtitle="The mosque's teaching programme — enrolment, teachers and the weekly timetable."
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Classes" }]}
      />
      <RequirePermission anyOf={["class.view"]} area="Classes">
        <ClassesView openAddOnMount={action === "add"} />
      </RequirePermission>
    </div>
  );
}
