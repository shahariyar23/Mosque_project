"use client";

import { useState } from "react";
import { Icon } from "@/components/finance/ui/icon";
import { RequirePermission } from "@/components/finance/ui/permission-gate";
import { JummahCollectionsView } from "./jummah-collections-view";
import { JumuahView } from "./jumuah-view";

export function JumuahContainer() {
  const [activeTab, setActiveTab] = useState<"schedules" | "collections">("schedules");

  return (
    <div className="space-y-5">
      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e1e6df] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("schedules")}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "schedules"
              ? "bg-[#0d4d3b] text-white shadow-sm"
              : "text-[#3d453f] hover:bg-[#f6f5ee]"
          }`}
        >
          <Icon name="calendar" size={15} />
          Schedules & Timetable
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("collections")}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "collections"
              ? "bg-[#0d4d3b] text-white shadow-sm"
              : "text-[#3d453f] hover:bg-[#f6f5ee]"
          }`}
        >
          <Icon name="wallet" size={15} />
          Congregational Collections
        </button>
      </div>

      {/* Tab Content */}
      <RequirePermission
        anyOf={[
          "jumuah.manage",
          "jumuah_collection.view",
          "jumuah_collection.record",
          "prayer.view",
          "donation.view",
          "finance.view",
        ]}
        area="Jumu'ah"
      >
        {activeTab === "schedules" ? <JumuahView /> : <JummahCollectionsView />}
      </RequirePermission>
    </div>
  );
}
