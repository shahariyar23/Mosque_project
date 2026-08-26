"use client";

import { useState } from "react";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import { Panel, PanelHeader } from "@/components/finance/ui/panel";
import { FinanceEmptyState, FinanceErrorState } from "@/components/finance/ui/states";
import { TableSkeleton } from "@/components/finance/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { DetailDrawer, DetailField, DetailGrid, DetailSection } from "@/components/ui/detail-drawer";
import { StatGrid } from "@/components/ui/stat-card";
import { RoleBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/finance/ui/badge";
import { useDebouncedValue } from "@/components/ui/use-debounced-value";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { downloadCsv } from "@/lib/mosque/export";
import { formatCount, formatDayMonth, formatLongDate, formatRelativeTime } from "@/lib/mosque/format";
import type { StatMetric } from "@/lib/mosque/types";
import { roleLabels } from "@/lib/permissions";
import { useApiList } from "@/hooks/use-api";
import {
  fetchAuditLogs,
  auditActionLabels,
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
  type AuditLog,
} from "@/services/auditService";
import { Pagination } from "@/components/finance/ui/data-table";

/**
 * The activity trail — who did what, and when.
 *
 * Read-only on purpose: there is no add, edit or delete, because tampering with an audit log is
 * exactly what one is for catching.
 */

/** "23 August 2026, 09:12" — the absolute form used in the drawer and the CSV. */
function formatWhen(at: string): string {
  const [date, time] = at.split("T");
  return `${formatLongDate(date)}, ${time?.slice(0, 5) || ""}`;
}

export function AuditView() {
  const { can } = useDashboardSession();
  
  const [page, setPage] = useState(1);
  const [area, setArea] = useState("all");
  const [action, setAction] = useState("all");
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const query = {
    page,
    limit: 12,
    entity: area !== "all" ? (area as any) : undefined,
    action: action !== "all" ? (action as any) : undefined,
  };

  const { rows, meta, loading, error, refetch } = useApiList(fetchAuditLogs, query, {
    enabled: can("audit.view"),
  });

  const filters: SelectFilter[] = [
    {
      id: "area",
      label: "Area",
      value: area,
      onChange: (val) => { setArea(val); setPage(1); },
      options: [{ value: "all", label: "All areas" }, ...AUDIT_RESOURCES.map((value) => ({ value, label: value }))],
    },
    {
      id: "action",
      label: "Action",
      value: action,
      onChange: (val) => { setAction(val); setPage(1); },
      options: [{ value: "all", label: "Any action" }, ...AUDIT_ACTIONS.map((value) => ({ value, label: auditActionLabels[value] }))],
    },
  ];

  const activeFilterCount = (area !== "all" ? 1 : 0) + (action !== "all" ? 1 : 0);
  
  const resetFilters = () => {
    setArea("all");
    setAction("all");
    setPage(1);
  };

  const metrics: StatMetric[] = [
    {
      id: "total",
      label: "Logged events",
      value: formatCount(meta?.total ?? 0),
      hint: "Recent back-office activity",
      icon: "file-text",
      tone: "neutral",
    }
  ];

  const exportCsv = () => {
    downloadCsv("noor-mosque-audit-log.csv", rows, [
      { header: "Timestamp", value: (entry) => formatWhen(entry.createdAt) },
      { header: "Actor", value: (entry) => entry.actorName },
      { header: "Role", value: (entry) => entry.actorRole ? roleLabels[entry.actorRole as keyof typeof roleLabels] || entry.actorRole : "—" },
      { header: "Action", value: (entry) => auditActionLabels[entry.action] },
      { header: "Area", value: (entry) => entry.resource },
      { header: "Summary", value: (entry) => entry.note || "—" },
      { header: "Target", value: (entry) => entry.resourceId || "—" },
      { header: "Source", value: (entry) => entry.ipAddress || "—" },
    ]);
  };

  const columns: Column<AuditLog>[] = [
    {
      key: "time",
      header: "When",
      cell: (entry) => {
        const [date, time] = entry.createdAt.split("T");
        return (
          <span className="whitespace-nowrap">
            <span className="block text-[13px] text-[#17211d]">{formatDayMonth(date)}</span>
            <span className="block text-[11.5px] tabular-nums text-[#8b938d]">
              {time?.slice(0, 5)} · {formatRelativeTime(entry.createdAt)}
            </span>
          </span>
        );
      },
    },
    {
      key: "actor",
      header: "Actor",
      cell: (entry) => (
        <span className="flex items-center gap-2.5">
          <Avatar name={entry.actorName} size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-[#17211d]">{entry.actorName}</span>
            {entry.actorRole ? <RoleBadge role={entry.actorRole as any} /> : null}
          </span>
        </span>
      ),
    },
    {
      key: "activity",
      header: "Activity",
      cell: (entry) => (
        <span className="block min-w-0">
          <span className="block text-[13px] text-[#17211d]">{auditActionLabels[entry.action]}</span>
          <span className="block truncate text-[12px] text-[#8b938d]">{entry.note || entry.resourceId}</span>
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      cell: (entry) => <Badge tone="neutral">{auditActionLabels[entry.action]}</Badge>,
    },
    {
      key: "area",
      header: "Area",
      cell: (entry) => <Badge tone="neutral">{entry.resource}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      align: "right",
      cell: (entry) => (
        <IconButton icon="eye" label={`View ${entry.id}`} onClick={() => setSelected(entry)} />
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
          title="Activity"
          description="A read-only record of what was done in the back office. It cannot be edited — that is the point of keeping it."
          icon="lock"
          actions={
            <Button variant="secondary" size="sm" icon="download" onClick={exportCsv}>
              Export
            </Button>
          }
        />

        <FinanceFilters
          filters={filters}
          activeCount={activeFilterCount}
          onReset={resetFilters}
        />

        <DataTable
          rows={rows}
          columns={columns}
          getRowKey={(entry) => entry.id}
          caption="Back-office activity with actor, action, area and timestamp"
          pageSize={12}
          mobileTitle={(entry) => auditActionLabels[entry.action]}
          mobileSubtitle={(entry) => `${entry.actorName} · ${entry.resource}`}
          mobileTrailing={(entry) => <Badge tone="neutral">{auditActionLabels[entry.action]}</Badge>}
          mobileHiddenKeys={["actor", "activity", "action"]}
          footNote={meta ? `Showing page ${meta.page} of ${meta.totalPages}. ${formatCount(meta.total)} total records.` : undefined}
          emptyState={
            <FinanceEmptyState
              icon="lock"
              title="No matching activity."
              description={
                activeFilterCount > 0 
                  ? "Nothing matches the current search and filters. Try clearing them."
                  : "Nothing has been logged yet. Activity will appear here as the team uses the dashboard."
              }
              action={
                activeFilterCount > 0 ? (
                  <Button
                    variant="secondary"
                    icon="close"
                    onClick={resetFilters}
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

      {selected ? <AuditDetailDrawer entry={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Drawer
 * -------------------------------------------------------------------------- */

function AuditDetailDrawer({ entry, onClose }: { entry: AuditLog; onClose: () => void }) {
  return (
    <DetailDrawer
      open
      onClose={onClose}
      eyebrow={entry.id}
      title={auditActionLabels[entry.action]}
      subtitle={`${formatWhen(entry.createdAt)}`}
      avatarName={entry.actorName}
      badge={<Badge tone="neutral">{entry.resource}</Badge>}
      footer={
        <Button size="sm" variant="secondary" onClick={onClose} className="ml-auto">
          Close
        </Button>
      }
    >
      <div className="space-y-5">
        <DetailSection title="Record">
          <DetailGrid>
            <DetailField label="Actor" value={entry.actorName} />
            <DetailField label="Role" value={entry.actorRole ? roleLabels[entry.actorRole as keyof typeof roleLabels] || entry.actorRole : "—"} />
            <DetailField label="Area" value={entry.resource} />
            <DetailField label="Action" value={auditActionLabels[entry.action]} />
            <DetailField label="Summary" value={entry.note || "—"} full />
            <DetailField label="Target" value={entry.resourceId || "—"} />
            <DetailField label="Source IP" value={entry.ipAddress || "—"} />
          </DetailGrid>
        </DetailSection>
      </div>
    </DetailDrawer>
  );
}
