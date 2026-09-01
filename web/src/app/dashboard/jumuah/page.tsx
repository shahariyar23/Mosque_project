import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { JumuahContainer } from "@/components/mosque/jumuah/jumuah-container";

export const metadata: Metadata = {
  title: "Jumu'ah · Noor Mosque Management",
  description: "Friday prayer schedules, khutbahs, attendance and congregational collections.",
};

export default function JumuahPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Jumu'ah"
        subtitle="Manage Friday prayer schedules, khutbahs, attendance and congregational collections."
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Prayer Times", href: "/dashboard/prayer-times" },
          { label: "Jumu'ah" },
        ]}
      />
      <JumuahContainer />
    </div>
  );
}
