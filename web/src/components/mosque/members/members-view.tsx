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
import { DetailDrawer, DetailField, DetailGrid, DetailSection, DetailStats } from "@/components/ui/detail-drawer";
import { StatGrid } from "@/components/ui/stat-card";
import { MemberStatusBadge } from "@/components/ui/status-badge";
import { TabPanel, Tabs, useTabIds, type TabItem } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { useDebouncedValue } from "@/components/ui/use-debounced-value";
import { useApiList } from "@/hooks/use-api";
import { fetchUsers, type User } from "@/services/userService";
import {
  ageGroupOf,
  ageOf,
  formatCount,
  formatLongDate,
} from "@/lib/mosque/format";
import {
  memberStatuses,
  type StatMetric,
} from "@/lib/mosque/types";
import { Pagination } from "@/components/finance/ui/data-table";

/**
 * The member register.
 *
 * Wired to `/api/v1/users` since a member is simply a user in the backend.
 * Pagination is server-side. Sorting by clicking columns is removed because the backend doesn't support list sorting.
 */
export function MembersView({ openAddOnMount = false }: { openAddOnMount?: boolean }) {
  const { notify } = useToast();
  const { can } = useDashboardSession();

  const [rawSearch, setSearch] = useState("");
  const search = useDebouncedValue(rawSearch);
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<User | null>(null);

  const query = {
    page,
    limit: 10,
    search: search || undefined,
    status: status !== "all" ? (status as string).toLowerCase() : undefined,
  };

  const { rows, meta, loading, error, refetch } = useApiList(fetchUsers, query, {
    enabled: can("user.view"),
  });

  const filters: SelectFilter[] = [
    {
      id: "status",
      label: "Status",
      value: status,
      onChange: (val) => { setStatus(val); setPage(1); },
      options: [{ value: "all", label: "Any status" }, ...memberStatuses.map((value) => ({ value, label: value }))],
    }
  ];

  const activeFilterCount = (status !== "all" ? 1 : 0);

  const resetFilters = () => {
    setStatus("all");
    setPage(1);
    setSearch("");
  };

  // User stats are computed from meta.total if available.
  const metrics: StatMetric[] = [
    {
      id: "total",
      label: "Total Members",
      value: formatCount(meta?.total ?? 0),
      hint: "On the register today",
      icon: "users",
      tone: "neutral",
    }
  ];

  const columns: Column<User>[] = [
    {
      key: "member",
      header: "Member",
      cell: (user) => <PersonCell name={user.fullName} meta={user.id} />,
    },
    {
      key: "phone",
      header: "Phone",
      cell: (user) => <span className="tabular-nums">{user.phone ?? "—"}</span>,
    },
    {
      key: "email",
      header: "Email",
      secondary: true,
      cell: (user) => <span className="truncate">{user.email}</span>,
    },
    {
      key: "gender",
      header: "Gender",
      cell: (user) => user.gender ?? "—",
    },
    {
      key: "joined",
      header: "Join Date",
      cell: (user) => <span className="tabular-nums">{formatLongDate(user.createdAt)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (user) => {
        const capitalized = user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : "Pending";
        return <MemberStatusBadge status={capitalized as any} />;
      },
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      align: "right",
      cell: (user) => (
        <span className="flex items-center justify-end gap-1">
          <IconButton icon="eye" label={`View ${user.fullName}`} onClick={() => setSelected(user)} />
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
          title="Member Register"
          description="Everyone on the community roll, with their contact details and membership standing."
          icon="users"
        />

        <FinanceFilters
          search={{
            value: rawSearch,
            onChange: setSearch,
            placeholder: "Search members…",
            label: "Search members by name, phone, email",
          }}
          filters={filters}
          activeCount={activeFilterCount}
          onReset={resetFilters}
        />

        <DataTable
          rows={rows}
          columns={columns}
          getRowKey={(user) => user.id}
          caption="Mosque members with contact details, join date and membership status"
          pageSize={10}
          mobileTitle={(user) => user.fullName}
          mobileSubtitle={(user) => `${user.id}`}
          mobileTrailing={(user) => {
            const capitalized = user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : "Pending";
            return <MemberStatusBadge status={capitalized as any} />;
          }}
          mobileHiddenKeys={["member", "status"]}
          footNote={meta ? `Showing page ${meta.page} of ${meta.totalPages}. ${formatCount(meta.total)} total records.` : undefined}
          emptyState={
            <FinanceEmptyState
              icon="users"
              title="No members found."
              description={
                activeFilterCount > 0 || search
                  ? "Nothing matches the current search and filters. Try clearing them."
                  : "The register is empty."
              }
              action={
                (activeFilterCount > 0 || search) ? (
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

      {selected ? <MemberDetailDrawer user={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Detail drawer
 * -------------------------------------------------------------------------- */

const detailTabs: ReadonlyArray<TabItem<"profile" | "contact">> = [
  { id: "profile", label: "Profile" },
  { id: "contact", label: "Contact" },
];

function MemberDetailDrawer({ user, onClose }: { user: User; onClose: () => void }) {
  const [tab, setTab] = useState<(typeof detailTabs)[number]["id"]>("profile");
  const idBase = useTabIds();

  return (
    <DetailDrawer
      open
      onClose={onClose}
      eyebrow={user.id}
      title={user.fullName}
      subtitle={user.gender ? `${user.gender}` : undefined}
      avatarName={user.fullName}
      badge={
        <>
          <MemberStatusBadge status={(user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : "Pending") as any} />
        </>
      }
      tabs={
        <Tabs items={detailTabs} active={tab} onChange={setTab} label={`${user.fullName} details`} idBase={idBase} />
      }
      footer={
        <Button size="sm" variant="secondary" onClick={onClose} className="ml-auto">
          Close
        </Button>
      }
    >
      <TabPanel base={idBase} id="profile" active={tab === "profile"}>
        <div className="space-y-5">
          <DetailStats
            items={[
              { label: "Member since", value: formatLongDate(user.createdAt).slice(-4), hint: formatLongDate(user.createdAt) },
            ]}
          />
          <DetailSection title="Profile">
            <DetailGrid>
              <DetailField label="Full name" value={user.fullName} />
              <DetailField label="Member ID" value={user.id} />
              <DetailField label="Gender" value={user.gender ?? "—"} />
              <DetailField label="Date of birth" value={user.dateOfBirth ? formatLongDate(user.dateOfBirth) : "—"} />
              <DetailField label="Age" value={user.dateOfBirth ? `${ageOf(user.dateOfBirth)} years` : "—"} />
              <DetailField label="Age group" value={user.dateOfBirth ? ageGroupOf(user.dateOfBirth) : "—"} />
            </DetailGrid>
          </DetailSection>
        </div>
      </TabPanel>

      <TabPanel base={idBase} id="contact" active={tab === "contact"}>
        <div className="space-y-5">
          <DetailSection title="Contact">
            <DetailGrid>
              <DetailField label="Phone" value={<span className="tabular-nums">{user.phone ?? "—"}</span>} />
              <DetailField label="Email" value={<span className="break-all">{user.email}</span>} />
              <DetailField label="City" value={user.city ?? "—"} full />
            </DetailGrid>
          </DetailSection>
        </div>
      </TabPanel>
    </DetailDrawer>
  );
}
