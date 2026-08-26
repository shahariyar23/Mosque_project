"use client";

import { useState } from "react";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import { Panel, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { FinanceEmptyState, FinanceErrorState } from "@/components/finance/ui/states";
import { TableSkeleton } from "@/components/finance/ui/skeleton";
import { PersonCell } from "@/components/ui/avatar";
import { DetailDrawer, DetailField, DetailGrid, DetailSection } from "@/components/ui/detail-drawer";
import { StatGrid } from "@/components/ui/stat-card";
import { AvailabilityBadge, VolunteerStatusBadge } from "@/components/ui/status-badge";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { formatCount, formatMonthYear } from "@/lib/mosque/format";
import { volunteerAvailabilities, volunteerStatuses, type StatMetric } from "@/lib/mosque/types";
import { useApiList } from "@/hooks/use-api";
import { fetchVolunteers, type Volunteer } from "@/services/volunteersService";
import { Pagination } from "@/components/finance/ui/data-table";

/**
 * Volunteer coordination.
 * Rewired to live API.
 */
export function VolunteersView() {
  const { can } = useDashboardSession();
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Volunteer | null>(null);

  const query = {
    page,
    limit: 10,
    search: search || undefined,
    status: status !== "all" ? (status as any) : undefined,
  };

  const { rows, meta, loading, error, refetch } = useApiList(fetchVolunteers, query, {
    enabled: can("volunteer.view"),
  });

  const filters: SelectFilter[] = [
    {
      id: "status",
      label: "Status",
      value: status,
      onChange: (val) => { setStatus(val); setPage(1); },
      options: [{ value: "all", label: "Any status" }, ...volunteerStatuses.map((value) => ({ value, label: value }))],
    },
  ];

  const activeFilterCount = status !== "all" ? 1 : 0;

  const resetFilters = () => {
    setStatus("all");
    setPage(1);
  };

  const metrics: StatMetric[] = [
    {
      id: "total",
      label: "Total Volunteers",
      value: formatCount(meta?.total ?? 0),
      hint: "Enrolled in the roster",
      icon: "hands-heart",
      tone: "neutral",
    },
  ];

  const columns: Column<Volunteer>[] = [
    {
      key: "volunteer",
      header: "Volunteer",
      cell: (volunteer) => <PersonCell name={volunteer.user.fullName} meta={volunteer.id} />,
    },
    {
      key: "phone",
      header: "Phone",
      secondary: true,
      cell: (volunteer) => <span className="tabular-nums">{volunteer.user.phone || "—"}</span>,
    },
    {
      key: "availability",
      header: "Availability",
      cell: (volunteer) => (
        <span className="flex flex-col gap-1">
          <AvailabilityBadge availability={volunteer.availability || "Unknown" as any} />
          <span className="text-[11.5px] text-[#8b938d]">{volunteer.skills || "—"}</span>
        </span>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      cell: (volunteer) => <span className="tabular-nums">{formatMonthYear(volunteer.joinedAt)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (volunteer) => <VolunteerStatusBadge status={volunteer.status as any} />,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      align: "right",
      cell: (volunteer) => (
        <span className="flex items-center justify-end gap-1">
          <IconButton icon="eye" label={`View ${volunteer.user.fullName}`} onClick={() => setSelected(volunteer)} />
        </span>
      ),
    },
  ];

  if (loading && !rows.length) return <TableSkeleton />;
  if (error) return <FinanceErrorState description={error} onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <StatGrid metrics={metrics} />

      <Panel>
        <PanelHeader
          title="Volunteer Roster"
          description="Who is enrolled, when they are free and their skills."
          icon="list"
        />

        <FinanceFilters
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search volunteers…",
            label: "Search volunteers by name, email or phone",
          }}
          filters={filters}
          activeCount={activeFilterCount}
          onReset={resetFilters}
        />

        <DataTable
          rows={rows}
          columns={columns}
          getRowKey={(volunteer) => volunteer.id}
          caption="Mosque volunteers with availability, join date and status"
          pageSize={10}
          mobileTitle={(volunteer) => volunteer.user.fullName}
          mobileSubtitle={(volunteer) => volunteer.skills || "—"}
          mobileTrailing={(volunteer) => <VolunteerStatusBadge status={volunteer.status as any} />}
          mobileHiddenKeys={["volunteer", "status"]}
          footNote={meta ? `Showing page ${meta.page} of ${meta.totalPages}. ${formatCount(meta.total)} total volunteers.` : undefined}
          emptyState={
            <FinanceEmptyState
              icon="hands-heart"
              title="No volunteers registered yet."
              description={
                activeFilterCount > 0 || search
                  ? "Nothing matches the current search and filters. Try clearing them."
                  : "Nobody has been placed on the roster yet."
              }
              action={
                activeFilterCount > 0 || search ? (
                  <Button
                    variant="secondary"
                    icon="close"
                    onClick={() => {
                      resetFilters();
                      setSearch("");
                    }}
                  >
                    Clear search and filters
                  </Button>
                ) : undefined
              }
            />
          }
        />
        {meta && meta.totalPages > 1 && (
          <div className="border-t border-[#e7e6dc] px-5 py-4">
            <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
          </div>
        )}
      </Panel>

      {selected ? <VolunteerDetailDrawer volunteer={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Drawer
 * -------------------------------------------------------------------------- */

function VolunteerDetailDrawer({ volunteer, onClose }: { volunteer: Volunteer; onClose: () => void }) {
  return (
    <DetailDrawer
      open
      onClose={onClose}
      eyebrow={volunteer.id}
      title={volunteer.user.fullName}
      subtitle={volunteer.user.email}
      badge={<VolunteerStatusBadge status={volunteer.status as any} />}
      footer={
        <Button size="sm" variant="secondary" onClick={onClose} className="ml-auto">
          Close
        </Button>
      }
    >
      <div className="space-y-5">
        <DetailSection title="Record">
          <DetailGrid>
            <DetailField label="Joined" value={formatMonthYear(volunteer.joinedAt)} />
            <DetailField label="Phone" value={volunteer.user.phone || "—"} />
            <DetailField label="Availability" value={volunteer.availability || "—"} full />
            <DetailField label="Skills" value={volunteer.skills || "—"} full />
            <DetailField label="Notes" value={volunteer.notes || "—"} full />
          </DetailGrid>
        </DetailSection>
      </div>
    </DetailDrawer>
  );
}
