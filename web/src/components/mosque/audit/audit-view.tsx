"use client";

import { useMemo, useState } from "react";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import { Panel, PanelHeader } from "@/components/finance/ui/panel";
import { FinanceEmptyState, InlineNotice } from "@/components/finance/ui/states";
import { Avatar } from "@/components/ui/avatar";
import { DetailDrawer, DetailField, DetailGrid, DetailSection } from "@/components/ui/detail-drawer";
import { StatGrid } from "@/components/ui/stat-card";
import { AuditActionBadge, AuditAreaChip, RoleBadge } from "@/components/ui/status-badge";
import { auditEntries, auditStats } from "@/data/audit";
import { downloadCsv } from "@/lib/mosque/export";
import { formatCount, formatDayMonth, formatLongDate, formatRelativeTime } from "@/lib/mosque/format";
import { auditActions, auditAreas, type AuditEntry, type StatMetric } from "@/lib/mosque/types";
import { roleLabels } from "@/lib/permissions";

/**
 * The activity trail — who did what, and when.
 *
 * Read-only on purpose: there is no add, edit or delete, because tampering with an audit log is
 * exactly what one is for catching. The page filters and exports the record and opens one entry at a
 * time; everything it shows comes from `data/audit.ts`, which stands in for an append-only server log.
 * Gated by `audit.view`, so only the roles trusted to review activity ever reach it.
 */

const metrics: StatMetric[] = [
  {
    id: "total",
    label: "Logged events",
    value: formatCount(auditStats.total),
    hint: "Recent back-office activity",
    icon: "file-text",
    tone: "neutral",
  },
  {
    id: "today",
    label: "Today",
    value: formatCount(auditStats.today),
    hint: "Recorded so far today",
    icon: "clock",
    tone: "positive",
  },
  {
    id: "actors",
    label: "People active",
    value: formatCount(auditStats.actors),
    hint: "Distinct accounts",
    icon: "users",
    tone: "neutral",
  },
  {
    id: "access",
    label: "Access changes",
    value: formatCount(auditStats.accessChanges),
    hint: "Roles & permissions",
    icon: "shield",
    tone: auditStats.accessChanges > 0 ? "gold" : "neutral",
  },
];

/** "23 August 2026, 09:12" — the absolute form used in the drawer and the CSV. */
function formatWhen(at: string): string {
  const [date, time] = at.split("T");
  return `${formatLongDate(date)}, ${time}`;
}

export function AuditView() {
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("all");
  const [action, setAction] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = selectedId ? (auditEntries.find((entry) => entry.id === selectedId) ?? null) : null;

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return auditEntries.filter((entry) => {
      if (needle) {
        const haystack = `${entry.actor} ${entry.summary} ${entry.target} ${entry.id}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (area !== "all" && entry.area !== area) return false;
      if (action !== "all" && entry.action !== action) return false;
      return true;
    });
  }, [action, area, search]);

  const filters: SelectFilter[] = [
    {
      id: "area",
      label: "Area",
      value: area,
      onChange: setArea,
      options: [{ value: "all", label: "All areas" }, ...auditAreas.map((value) => ({ value, label: value }))],
    },
    {
      id: "action",
      label: "Action",
      value: action,
      onChange: setAction,
      options: [{ value: "all", label: "Any action" }, ...auditActions.map((value) => ({ value, label: value }))],
    },
  ];

  const activeFilterCount = (area !== "all" ? 1 : 0) + (action !== "all" ? 1 : 0);
  const resetFilters = () => {
    setArea("all");
    setAction("all");
  };

  const exportCsv = () => {
    downloadCsv("noor-mosque-audit-log.csv", filtered, [
      { header: "Timestamp", value: (entry) => formatWhen(entry.at) },
      { header: "Actor", value: (entry) => entry.actor },
      { header: "Role", value: (entry) => roleLabels[entry.actorRole] },
      { header: "Action", value: (entry) => entry.action },
      { header: "Area", value: (entry) => entry.area },
      { header: "Summary", value: (entry) => entry.summary },
      { header: "Target", value: (entry) => entry.target },
      { header: "Source", value: (entry) => entry.source },
    ]);
  };

  const columns: Column<AuditEntry>[] = [
    {
      key: "time",
      header: "When",
      cell: (entry) => {
        const [date, time] = entry.at.split("T");
        return (
          <span className="whitespace-nowrap">
            <span className="block text-[13px] text-[#17211d]">{formatDayMonth(date)}</span>
            <span className="block text-[11.5px] tabular-nums text-[#8b938d]">
              {time} · {formatRelativeTime(entry.at)}
            </span>
          </span>
        );
      },
      sortValue: (entry) => entry.at,
    },
    {
      key: "actor",
      header: "Actor",
      cell: (entry) => (
        <span className="flex items-center gap-2.5">
          <Avatar name={entry.actor} size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-[#17211d]">{entry.actor}</span>
            <RoleBadge role={entry.actorRole} />
          </span>
        </span>
      ),
      sortValue: (entry) => entry.actor,
    },
    {
      key: "activity",
      header: "Activity",
      cell: (entry) => (
        <span className="block min-w-0">
          <span className="block text-[13px] text-[#17211d]">{entry.summary}</span>
          <span className="block truncate text-[12px] text-[#8b938d]">{entry.target}</span>
        </span>
      ),
      sortValue: (entry) => entry.summary,
    },
    {
      key: "action",
      header: "Action",
      cell: (entry) => <AuditActionBadge action={entry.action} />,
      sortValue: (entry) => entry.action,
    },
    {
      key: "area",
      header: "Area",
      cell: (entry) => <AuditAreaChip area={entry.area} />,
      sortValue: (entry) => entry.area,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      align: "right",
      cell: (entry) => (
        <IconButton icon="eye" label={`View ${entry.id}`} onClick={() => setSelectedId(entry.id)} />
      ),
    },
  ];

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
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search by actor, activity or target…",
            label: "Search the audit log by actor, activity or target",
          }}
          filters={filters}
          activeCount={activeFilterCount}
          onReset={resetFilters}
        />

        <DataTable
          rows={filtered}
          columns={columns}
          getRowKey={(entry) => entry.id}
          caption="Back-office activity with actor, action, area and timestamp"
          initialSort={{ key: "time", direction: "desc" }}
          pageSize={12}
          mobileTitle={(entry) => entry.summary}
          mobileSubtitle={(entry) => `${entry.actor} · ${entry.area}`}
          mobileTrailing={(entry) => <AuditActionBadge action={entry.action} />}
          mobileHiddenKeys={["actor", "activity", "action"]}
          emptyState={
            <FinanceEmptyState
              icon="lock"
              title="No matching activity."
              description={
                activeFilterCount > 0 || search
                  ? "Nothing matches the current search and filters. Try clearing them."
                  : "Nothing has been logged yet. Activity will appear here as the team uses the dashboard."
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
      </Panel>

      {selected ? <AuditDetailDrawer entry={selected} onClose={() => setSelectedId(null)} /> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Detail drawer — read-only
 * -------------------------------------------------------------------------- */

function AuditDetailDrawer({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  return (
    <DetailDrawer
      open
      onClose={onClose}
      eyebrow={entry.id}
      title={entry.summary}
      subtitle={formatWhen(entry.at)}
      badge={
        <>
          <AuditActionBadge action={entry.action} />
          <AuditAreaChip area={entry.area} />
        </>
      }
      footer={
        <Button size="sm" variant="ghost" onClick={onClose} className="ml-auto">
          Close
        </Button>
      }
    >
      <div className="space-y-5">
        <DetailSection title="What happened">
          <p className="text-[13px] leading-6 text-[#3d453f]">{entry.detail}</p>
        </DetailSection>

        <DetailSection title="Target">
          <p className="rounded-md border border-[#e7e6dc] bg-[#faf9f4] px-3 py-2 font-mono text-[12.5px] text-[#17211d]">
            {entry.target}
          </p>
        </DetailSection>

        <DetailSection title="Actor">
          <div className="flex items-center gap-3">
            <Avatar name={entry.actor} size="md" />
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold text-[#17211d]">{entry.actor}</p>
              <div className="mt-1">
                <RoleBadge role={entry.actorRole} />
              </div>
            </div>
          </div>
        </DetailSection>

        <DetailSection title="Details">
          <DetailGrid>
            <DetailField label="When" value={formatWhen(entry.at)} />
            <DetailField label="Relative" value={formatRelativeTime(entry.at)} />
            <DetailField label="Area" value={entry.area} />
            <DetailField label="Action" value={entry.action} />
            <DetailField label="Source" value={entry.source} full />
          </DetailGrid>
        </DetailSection>

        <InlineNotice tone="neutral" icon="info">
          Audit entries are a permanent record and cannot be edited or removed from this screen.
        </InlineNotice>
      </div>
    </DetailDrawer>
  );
}
