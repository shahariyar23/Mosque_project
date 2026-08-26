"use client";

import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/finance/ui/badge";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { ConfirmDialog } from "@/components/finance/ui/dialogs";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import { SelectField, TextField } from "@/components/finance/ui/form-field";
import { Icon } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { Panel, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { FinanceSummarySkeleton, TableSkeleton } from "@/components/finance/ui/skeleton";
import { FinanceEmptyState, FinanceErrorState, InlineNotice } from "@/components/finance/ui/states";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import {
  CreateAccountModal,
  PositionsPicker,
  emailPattern,
  fieldMessage,
  isValidPhone,
  phoneValue,
  roleOptions,
  sameSet,
  type NewUserDraft,
} from "@/components/mosque/users/account-form";
import { PersonCell } from "@/components/ui/avatar";
import { DetailDrawer, DetailField, DetailGrid, DetailSection } from "@/components/ui/detail-drawer";
import { StatGrid } from "@/components/ui/stat-card";
import { RoleBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { useDebouncedValue } from "@/components/ui/use-debounced-value";
import { useMutation, useResource } from "@/components/ui/use-resource";
import { ServiceError } from "@/services/query";
import type { UserStatus } from "@/services/enums";
import {
  createUser,
  deleteUser,
  fetchUsers,
  mapBackendUserToAdminUser,
  updateUser,
  updateUserPermissions,
  updateUserPositions,
  updateUserRole,
  updateUserStatus,
  type UpdateUserInput,
  type User,
} from "@/services/userService";
import { groupPermissions } from "@/lib/mosque/access";
import { downloadCsv } from "@/lib/mosque/export";
import { formatCount, formatLongDate } from "@/lib/mosque/format";
import type { AdminUser, StatMetric } from "@/lib/mosque/types";
import {
  allPermissions,
  effectivePermissions,
  positionLabels,
  roleDescriptions,
  roleLabels,
  roles,
  type Permission,
  type Position,
  type Role,
} from "@/lib/permissions";

/**
 * The back-office directory — who can sign in, as which role, holding which posts.
 *
 * Reads `GET /users` a page at a time. Search, role and status are request parameters rather than a filter
 * over rows already on screen, because the API only ever sends one page: filtering here would search
 * twenty accounts and quietly call it the whole directory.
 *
 * Editing is the part worth reading before changing anything. One account's fields live behind five
 * separate routes, each with its own permission — `PATCH /users/:id` for contact details (`user.manage`),
 * then `/role` (`role.assign`), `/positions` (`position.assign`), `/permissions` (`permission.assign`) and
 * `/status` (`user.manage`). `PATCH /users/:id` answers a 400 if a role, a status or a password is sent to
 * it, so the bundled patch this modal used to produce cannot be posted anywhere. Instead the form diffs
 * itself against the row and issues only the sub-requests whose fields actually changed. That is a
 * correctness requirement, not an optimisation: sending all five unconditionally would 403 for a secretary
 * who holds `user.manage` alone, on an edit that never touched a role.
 *
 * The drawer still resolves a row through `effectivePermissions()` — the same function the session uses —
 * so what it says a person can do is never a second opinion. And every gate here is UX only: the
 * `PermissionsGuard` on each route is what actually refuses.
 */

/** Every module's list DTO defaults `limit` to 20; matching it keeps the first request cache-friendly. */
const PAGE_SIZE = 20;
/** `MAX_PAGE_SIZE` on the server. One request cannot return more, and the export says so when it bites. */
const EXPORT_LIMIT = 100;

type StatusFilter = "all" | UserStatus | "deleted";
type RoleFilter = "all" | Role;

/** Only the sub-requests an edit actually needs. An absent key means "that route is not called". */
type UserEditPatch = {
  profile?: UpdateUserInput;
  role?: Role;
  positions?: Position[];
  permissions?: { permissions?: string[]; deniedPermissions?: string[] };
  status?: UserStatus;
};

function positionsLabel(positions: Position[]): string {
  return positions.length ? positions.map((position) => positionLabels[position]?.en ?? position).join(", ") : "—";
}

/**
 * Runs an edit's sub-requests in order and reports how far it got.
 *
 * Any one of them can fail on its own, and the ones before it are already saved. "Could not save" on its
 * own would leave the person guessing which half landed, so a failure states what was written first.
 */
async function applyUserEdit(id: string, patch: UserEditPatch): Promise<void> {
  const steps: Array<[string, () => Promise<unknown>]> = [];

  const profile = patch.profile;
  if (profile) steps.push(["contact details", () => updateUser(id, profile)]);
  const role = patch.role;
  if (role) steps.push(["the role", () => updateUserRole(id, role)]);
  const positions = patch.positions;
  if (positions) steps.push(["committee posts", () => updateUserPositions(id, positions)]);
  const permissions = patch.permissions;
  if (permissions) steps.push(["permission exceptions", () => updateUserPermissions(id, permissions)]);
  const status = patch.status;
  if (status) steps.push(["the account status", () => updateUserStatus(id, status)]);

  const done: string[] = [];
  for (const [label, run] of steps) {
    try {
      await run();
      done.push(label);
    } catch (cause) {
      if (!(cause instanceof ServiceError) || done.length === 0) throw cause;
      throw new ServiceError(cause.code, `${cause.message} Saved before this failed: ${done.join(", ")}.`, {
        status: cause.status,
        fieldErrors: cause.fieldErrors,
      });
    }
  }
}

/* -------------------------------------------------------------------------- *
 * Small building blocks
 * -------------------------------------------------------------------------- */

const permPillStyles = {
  neutral: "border-[#dcdacd] bg-[#f6f5ee] text-[#4d564f]",
  grant: "border-[#c2d8cb] bg-[#eaf2ed] text-[#0b4634]",
  deny: "border-[#ebc8c4] bg-[#fbeceb] text-[#a13228]",
} as const;

function PermPill({
  label,
  tone = "neutral",
  onRemove,
}: {
  label: string;
  tone?: keyof typeof permPillStyles;
  onRemove?: () => void;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11.5px] font-medium ${permPillStyles[tone]}`}
    >
      {label}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="-mr-0.5 grid h-4 w-4 place-items-center rounded-sm hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0d4d3b]"
        >
          <Icon name="close" size={11} />
        </button>
      ) : null}
    </span>
  );
}

/** The effective set, folded into the registry's groups. */
function EffectivePermissions({ user }: { user: AdminUser }) {
  const granted = effectivePermissions(user);
  const groups = groupPermissions(granted);

  if (granted.length === 0) {
    return (
      <InlineNotice tone="neutral" icon="lock">
        This account is suspended, so it resolves to no permissions at all — not even the base access
        every signed-in person otherwise has.
      </InlineNotice>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.key}>
          <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#8b938d]">{group.label}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {group.items.map((permission) => (
              <PermPill key={permission} label={permission} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * View
 * -------------------------------------------------------------------------- */

export function UsersView({ openAddOnMount = false }: { openAddOnMount?: boolean }) {
  const { notify } = useToast();
  const { user: viewer, can } = useDashboardSession();

  const canView = can("user.view");
  const canManage = can("user.manage");
  const canAssignRole = can("role.assign");
  const canAssignPositions = can("position.assign");
  const canAssignPermissions = can("permission.assign");
  // `GET /users?deleted=true` is *ignored* rather than refused without this, so an ungated toggle would
  // look broken: the filter would appear to do nothing.
  const canViewDeleted = can("user.viewDeleted");

  const [rawSearch, setRawSearch] = useState("");
  const search = useDebouncedValue(rawSearch);
  const [role, setRole] = useState<RoleFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(openAddOnMount);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  /** Everything the list request needs except the page, so the export can reuse it verbatim. */
  const criteria = useMemo(
    () => ({
      search: search.trim() || undefined,
      role: role === "all" ? undefined : role,
      // The backend knows two statuses. "Deleted" is not one of them — it is the `deleted` flag, and it
      // replaces the status filter rather than joining it.
      status: status === "active" || status === "inactive" ? status : undefined,
      deleted: status === "deleted" ? true : undefined,
    }),
    [search, role, status],
  );

  const load = useCallback(() => fetchUsers({ ...criteria, page, limit: PAGE_SIZE }), [criteria, page]);
  const { data, error, initialising, reload } = useResource(load, { enabled: canView });

  /**
   * The three headline counts, each its own `limit=1` request read for its `meta.total`.
   *
   * `GET /users` returns no status facet, so there is no single response to read them from — and counting
   * the twenty rows on screen would print "20 accounts" for a mosque with four hundred. Three totals from
   * the database beat one invented number. "Administrators" is deliberately absent: `role` takes a single
   * value, so it would cost two more requests to say something no one asked for.
   */
  const loadCounts = useCallback(
    () =>
      Promise.all([
        fetchUsers({ limit: 1 }),
        fetchUsers({ limit: 1, status: "active" }),
        fetchUsers({ limit: 1, status: "inactive" }),
      ]),
    [],
  );
  const counts = useResource(loadCounts, { enabled: canView });

  const rows = useMemo(
    () => (data ? data.rows.map((row) => mapBackendUserToAdminUser(row, viewer?.mosqueName ?? "")) : []),
    [data, viewer],
  );

  const metrics: StatMetric[] = useMemo(() => {
    if (!counts.data) return [];
    const [all, active, inactive] = counts.data;
    return [
      {
        id: "total",
        label: "Accounts",
        value: formatCount(all.meta.total),
        hint: "With back-office access",
        icon: "users",
        tone: "neutral",
      },
      {
        id: "active",
        label: "Active",
        value: formatCount(active.meta.total),
        hint: "Able to sign in",
        icon: "check-circle",
        tone: "positive",
      },
      {
        id: "suspended",
        label: "Suspended",
        value: formatCount(inactive.meta.total),
        hint: "No access until restored",
        icon: "lock",
        tone: inactive.meta.total > 0 ? "warning" : "neutral",
      },
    ];
  }, [counts.data]);

  // Look the selection up by id every render so the drawer reflects a change made behind it. A row that
  // left the page — suspended while the status filter reads "Active", say — closes the drawer, which is
  // honest: there is nothing left on screen to be looking at.
  const selected = selectedId ? (rows.find((user) => user.id === selectedId) ?? null) : null;

  const refresh = useCallback(() => {
    reload();
    counts.reload();
  }, [reload, counts]);

  /* ---------------------------------------------------------------- *
   * Filters. Each setter returns to page 1: keeping page 3 while the
   * result set shrinks to one page lands on an empty table.
   * ---------------------------------------------------------------- */

  const changeSearch = (value: string) => {
    setRawSearch(value);
    setPage(1);
  };

  const filters: SelectFilter[] = [
    {
      id: "role",
      label: "Role",
      value: role,
      onChange: (value) => {
        setRole(value as RoleFilter);
        setPage(1);
      },
      options: [{ value: "all", label: "All roles" }, ...roleOptions],
    },
    {
      id: "status",
      label: "Status",
      value: status,
      onChange: (value) => {
        setStatus(value as StatusFilter);
        setPage(1);
      },
      options: [
        { value: "all", label: "Any status" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Suspended" },
        ...(canViewDeleted ? [{ value: "deleted", label: "Deleted" }] : []),
      ],
    },
  ];

  const activeFilterCount = (role !== "all" ? 1 : 0) + (status !== "all" ? 1 : 0);
  const resetFilters = () => {
    setRole("all");
    setStatus("all");
    setPage(1);
  };

  /* ---------------------------------------------------------------- *
   * Mutations
   * ---------------------------------------------------------------- */

  /**
   * Create, then grant.
   *
   * `CreateUserDto` accepts neither `role` nor `positions` — granting authority is its own operation with
   * its own permission, so a create request cannot be used to mint an administrator. A new account lands
   * on the schema default, `member`, and anything beyond that is a second and third request.
   *
   * Which makes partial success a real state: the account exists as a member even when the role change is
   * refused. Those failures are collected rather than thrown, so the toast can say exactly what was and
   * was not applied instead of reporting a failure that created a person.
   */
  const createMutation = useMutation<NewUserDraft, { user: User; warnings: string[] }>(async (draft) => {
    const mosqueId = viewer?.mosqueId;
    if (!mosqueId) {
      throw new ServiceError("session.incomplete", "Your session has not finished loading. Reload the page and try again.");
    }

    const phone = draft.phone.trim();
    const city = draft.city.trim();
    let user = await createUser({
      mosqueId,
      fullName: draft.fullName.trim(),
      email: draft.email.trim(),
      password: draft.password,
      ...(phone ? { phone } : {}),
      ...(city ? { city } : {}),
    });

    const warnings: string[] = [];

    if (canAssignRole && draft.role !== user.role) {
      try {
        user = await updateUserRole(user.id, draft.role);
      } catch (cause) {
        warnings.push(
          `the role stayed ${roleLabels[user.role]} (${cause instanceof ServiceError ? cause.message : "the request failed"})`,
        );
      }
    }

    if (canAssignPositions && draft.positions.length > 0) {
      try {
        user = await updateUserPositions(user.id, draft.positions);
      } catch (cause) {
        warnings.push(
          `no committee posts were applied (${cause instanceof ServiceError ? cause.message : "the request failed"})`,
        );
      }
    }

    return { user, warnings };
  });

  const editMutation = useMutation<{ id: string; patch: UserEditPatch }, void>(({ id, patch }) =>
    applyUserEdit(id, patch),
  );

  const statusMutation = useMutation<{ user: AdminUser; status: UserStatus }, User>(({ user, status: next }) =>
    updateUserStatus(user.id, next),
  );

  const deleteMutation = useMutation<AdminUser, void>((user) => deleteUser(user.id));

  const exportMutation = useMutation<void, { rows: AdminUser[]; total: number }>(async () => {
    const result = await fetchUsers({ ...criteria, page: 1, limit: EXPORT_LIMIT });
    return {
      rows: result.rows.map((row) => mapBackendUserToAdminUser(row, viewer?.mosqueName ?? "")),
      total: result.meta.total,
    };
  });

  const submitNewUser = async (draft: NewUserDraft): Promise<boolean> => {
    const result = await createMutation.run(draft);
    if (!result.ok) return false;

    const { user, warnings } = result.data;
    setAdding(false);
    refresh();
    notify({
      tone: warnings.length > 0 ? "warning" : "success",
      message: warnings.length > 0 ? "Account created, partly." : "Account created.",
      description:
        warnings.length > 0
          ? `${user.fullName} can sign in, but ${warnings.join("; ")}.`
          : `${user.fullName} · ${roleLabels[user.role]} — they can sign in with the password you set.`,
    });
    return true;
  };

  const submitEdit = async (id: string, patch: UserEditPatch): Promise<boolean> => {
    const result = await editMutation.run({ id, patch });
    if (!result.ok) return false;

    setEditing(null);
    refresh();
    notify({
      tone: "success",
      message: "Account updated.",
      description: "The changes take effect the next time this account's session is resolved.",
    });
    return true;
  };

  /**
   * Suspend and reactivate.
   *
   * `ConfirmDialog` runs its confirm handler and closes itself in the same tick, so it cannot await this.
   * The request therefore reports through the toast rather than through the dialog.
   */
  const changeStatus = (user: AdminUser, next: UserStatus) => {
    void statusMutation.run({ user, status: next }).then((result) => {
      if (!result.ok) {
        notify({ tone: "danger", message: "Could not change the account status.", description: result.error });
        return;
      }
      refresh();
      notify({
        tone: next === "active" ? "success" : "info",
        message: next === "active" ? "Account reactivated." : "Account suspended.",
        description:
          next === "active"
            ? `${user.name} can sign in again.`
            : `${user.name} can no longer sign in — every permission is revoked while suspended.`,
      });
    });
  };

  const removeUser = (user: AdminUser) => {
    void deleteMutation.run(user).then((result) => {
      if (!result.ok) {
        notify({ tone: "danger", message: "Could not delete the account.", description: result.error });
        return;
      }
      setSelectedId(null);
      refresh();
      notify({
        tone: "info",
        message: "Account deleted.",
        description: canViewDeleted
          ? `${user.name} is hidden from the directory. Filter by "Deleted" to find the record again.`
          : `${user.name} is hidden from the directory.`,
      });
    });
  };

  /**
   * Exports the current filters, not the current page.
   *
   * Its own request, because the table only holds twenty rows and a file called "users" that contained
   * twenty of four hundred would be worse than no export. One request cannot exceed `MAX_PAGE_SIZE`, so
   * when the filters match more than that the toast says how many of how many were written rather than
   * letting the file imply it is complete.
   */
  const exportCsv = () => {
    void exportMutation.run(undefined).then((result) => {
      if (!result.ok) {
        notify({ tone: "danger", message: "Could not build the export.", description: result.error });
        return;
      }

      const { rows: exportRows, total } = result.data;
      downloadCsv("noor-mosque-users.csv", exportRows, [
        { header: "ID", value: (user) => user.id },
        { header: "Name", value: (user) => user.name },
        { header: "Email", value: (user) => user.email },
        { header: "Phone", value: (user) => phoneValue(user) },
        { header: "Role", value: (user) => roleLabels[user.role] },
        { header: "Positions", value: (user) => user.positions.map((position) => positionLabels[position].en).join(" / ") },
        { header: "Status", value: (user) => (user.deletedAt ? "Deleted" : user.isActive ? "Active" : "Suspended") },
        { header: "Extra permissions", value: (user) => user.permissions.join(" ") },
        { header: "Denied permissions", value: (user) => user.deniedPermissions.join(" ") },
        { header: "Joined", value: (user) => user.joinedAt },
        { header: "Last active", value: (user) => user.lastActiveAt || "Never" },
      ]);

      notify({
        tone: "info",
        message: "Export downloaded.",
        description:
          total > exportRows.length
            ? `${formatCount(exportRows.length)} of ${formatCount(total)} matching accounts — one export is capped at ${EXPORT_LIMIT} rows. Narrow the filters to capture the rest.`
            : `${formatCount(exportRows.length)} rows, matching the filters currently applied.`,
      });
    });
  };

  /* ---------------------------------------------------------------- *
   * Table
   * ---------------------------------------------------------------- */

  // No `sortValue` anywhere: `GET /users` accepts no sort parameter, so a sortable header would reorder
  // the twenty rows on screen and imply it had ordered the directory.
  const columns: Column<AdminUser>[] = [
    {
      key: "user",
      header: "User",
      cell: (user) => <PersonCell name={user.name} meta={user.email} />,
    },
    {
      key: "role",
      header: "Role",
      cell: (user) => <RoleBadge role={user.role} />,
    },
    {
      key: "positions",
      header: "Positions",
      cell: (user) => <span className="text-[#3d453f]">{positionsLabel(user.positions)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (user) => {
        if (user.deletedAt) {
          return <Badge tone="neutral">Deleted</Badge>;
        }
        return <Badge tone={user.isActive ? "success" : "danger"}>{user.isActive ? "Active" : "Suspended"}</Badge>;
      },
    },
    {
      key: "lastActive",
      header: "Last active",
      align: "right",
      cell: (user) => (
        <span className="whitespace-nowrap tabular-nums text-[#4d564f]">
          {user.lastActiveAt ? formatLongDate(user.lastActiveAt) : <span className="text-[#8b938d]">Never</span>}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      align: "right",
      cell: (user) => (
        <span className="flex items-center justify-end gap-1">
          <IconButton icon="eye" label={`View ${user.name}`} onClick={() => setSelectedId(user.id)} />
          <Can permission="user.manage">
            <IconButton icon="pencil" label={`Edit ${user.name}`} onClick={() => setEditing(user)} />
          </Can>
        </span>
      ),
    },
  ];

  const meta = data?.meta;
  const searching = Boolean(criteria.search) || activeFilterCount > 0;

  const clearEverything = () => {
    setRawSearch("");
    resetFilters();
  };

  return (
    <div className="space-y-4">
      {counts.initialising ? (
        <FinanceSummarySkeleton count={3} />
      ) : counts.data ? (
        <StatGrid metrics={metrics} />
      ) : counts.error ? (
        <InlineNotice tone="danger" icon="alert">
          {counts.error}
        </InlineNotice>
      ) : null}

      <Panel>
        <PanelHeader
          title="Users"
          description="The accounts that can sign in to run the mosque — their role, their committee posts and whether they are active."
          icon="users"
          actions={
            <>
              <Button
                variant="secondary"
                size="sm"
                icon="download"
                onClick={exportCsv}
                disabled={exportMutation.pending || !canView}
              >
                {exportMutation.pending ? "Preparing…" : "Export"}
              </Button>
              <Can permission="user.manage">
                <Button size="sm" icon="user-plus" onClick={() => setAdding(true)}>
                  Add User
                </Button>
              </Can>
            </>
          }
        />

        <FinanceFilters
          search={{
            value: rawSearch,
            onChange: changeSearch,
            placeholder: "Search by name, email or phone…",
            label: "Search users by name, email or phone",
          }}
          filters={filters}
          activeCount={activeFilterCount}
          onReset={resetFilters}
        />

        {error && data ? (
          <div className="px-4 pt-3 sm:px-6">
            <InlineNotice tone="danger" icon="alert">
              {error} The rows below are from the last successful load.
            </InlineNotice>
          </div>
        ) : null}

        {initialising ? (
          <TableSkeleton rows={8} columns={6} label="Loading accounts" />
        ) : error && !data ? (
          <FinanceErrorState title="Unable to load the user directory." description={error} onRetry={reload} />
        ) : (
          <DataTable
            rows={rows}
            columns={columns}
            getRowKey={(user) => user.id}
            caption="Back-office accounts with role, positions, status and last activity"
            pageSize={PAGE_SIZE}
            serverPage={
              meta
                ? {
                    page: meta.page,
                    pageSize: meta.limit,
                    total: meta.total,
                    totalPages: meta.totalPages,
                    onPageChange: setPage,
                  }
                : undefined
            }
            mobileTitle={(user) => user.name}
            mobileSubtitle={(user) => `${roleLabels[user.role]} · ${user.email}`}
            mobileTrailing={(user) => {
              if (user.deletedAt) return <Badge tone="neutral">Deleted</Badge>;
              return <Badge tone={user.isActive ? "success" : "danger"}>{user.isActive ? "Active" : "Suspended"}</Badge>;
            }}
            mobileHiddenKeys={["user", "role", "status"]}
            emptyState={
              <FinanceEmptyState
                icon="users"
                title="No users found."
                description={
                  searching
                    ? "Nothing matches the current search and filters. Try clearing them."
                    : page > 1
                      ? "This page is past the end of the directory."
                      : "No accounts yet. Add the first member of the back-office team."
                }
                action={
                  searching ? (
                    <Button variant="secondary" icon="close" onClick={clearEverything}>
                      Clear search and filters
                    </Button>
                  ) : page > 1 ? (
                    <Button variant="secondary" icon="chevron-left" onClick={() => setPage(1)}>
                      Back to the first page
                    </Button>
                  ) : (
                    <Can permission="user.manage">
                      <Button icon="user-plus" onClick={() => setAdding(true)}>
                        Add User
                      </Button>
                    </Can>
                  )
                }
              />
            }
          />
        )}
      </Panel>

      {selected ? (
        <UserDetailDrawer
          user={selected}
          busy={statusMutation.pending || deleteMutation.pending}
          onClose={() => setSelectedId(null)}
          onEdit={() => setEditing(selected)}
          onSuspend={() => setSuspendTarget(selected)}
          onReactivate={() => changeStatus(selected, "active")}
          onDelete={() => setDeleteTarget(selected)}
        />
      ) : null}

      <CreateAccountModal
        open={adding}
        title="Add a user"
        description="Creates the account straight away with the password you set here. Tell them the password over a channel you trust — it is never shown again."
        canAssignRole={canAssignRole}
        canAssignPositions={canAssignPositions}
        pending={createMutation.pending}
        error={createMutation.error}
        fieldErrors={createMutation.fieldErrors}
        onClose={() => {
          setAdding(false);
          createMutation.reset();
        }}
        onSave={submitNewUser}
      />

      {editing ? (
        <EditUserModal
          user={editing}
          canAssignRole={canAssignRole}
          canAssignPositions={canAssignPositions}
          canAssignPermissions={canAssignPermissions}
          canManage={canManage}
          pending={editMutation.pending}
          error={editMutation.error}
          fieldErrors={editMutation.fieldErrors}
          onClose={() => {
            setEditing(null);
            editMutation.reset();
          }}
          onSave={(patch) => submitEdit(editing.id, patch)}
        />
      ) : null}

      <ConfirmDialog
        open={suspendTarget !== null}
        onClose={() => setSuspendTarget(null)}
        onConfirm={() => {
          if (suspendTarget) changeStatus(suspendTarget, "inactive");
        }}
        title="Suspend this account?"
        description={
          suspendTarget
            ? `${suspendTarget.name} will be unable to sign in. Every permission is revoked while the account is suspended. You can reactivate it at any time.`
            : ""
        }
        confirmLabel="Suspend account"
        icon="lock"
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) removeUser(deleteTarget);
        }}
        title="Delete this account?"
        description={
          deleteTarget
            ? `${deleteTarget.name} is removed from the directory and can no longer sign in. The record itself is kept.`
            : ""
        }
        details={
          canViewDeleted
            ? ["Deleted accounts stay visible to you under the \"Deleted\" status filter."]
            : ["Only an administrator with permission to view deleted accounts can find the record afterwards."]
        }
        confirmLabel="Delete account"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Detail drawer
 * -------------------------------------------------------------------------- */

function UserDetailDrawer({
  user,
  busy,
  onClose,
  onEdit,
  onSuspend,
  onReactivate,
  onDelete,
}: {
  user: AdminUser;
  busy: boolean;
  onClose: () => void;
  onEdit: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}) {
  const grantedCount = effectivePermissions(user).length;

  return (
    <DetailDrawer
      open
      onClose={onClose}
      eyebrow={user.id}
      title={user.name}
      subtitle={user.email}
      avatarName={user.name}
      badge={
        <>
          <RoleBadge role={user.role} />
          <Badge tone={user.isActive ? "success" : "danger"}>{user.isActive ? "Active" : "Suspended"}</Badge>
        </>
      }
      footer={
        <>
          <Can permission="user.manage">
            <Button size="sm" variant="secondary" icon="pencil" onClick={onEdit}>
              Edit
            </Button>
          </Can>
          <Can permission="user.manage">
            {user.isActive ? (
              <Button size="sm" variant="danger" icon="lock" onClick={onSuspend} disabled={busy}>
                Suspend
              </Button>
            ) : (
              <Button size="sm" icon="check" onClick={onReactivate} disabled={busy}>
                Reactivate
              </Button>
            )}
          </Can>
          {user.deletedAt ? null : (
            <Can permission="user.manage">
              <Button size="sm" variant="ghost" icon="trash" onClick={onDelete} disabled={busy}>
                Delete
              </Button>
            </Can>
          )}
          <Button size="sm" variant="ghost" onClick={onClose} className="ml-auto">
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {user.deletedAt ? (
          <InlineNotice tone="neutral" icon="trash">
            Deleted on {formatLongDate(user.deletedAt)}. The record is kept but the account cannot sign in and
            no longer appears in the directory.
          </InlineNotice>
        ) : null}
        {!user.isActive ? (
          <InlineNotice tone="neutral" icon="lock">
            Suspended — this account cannot sign in, and resolves to no permissions until it is reactivated.
          </InlineNotice>
        ) : null}
        {user.isActive && user.lastActiveAt === "" ? (
          <InlineNotice tone="gold" icon="clock">
            This account has never signed in.
          </InlineNotice>
        ) : null}

        <DetailSection title="Role">
          <p className="text-[13.5px] font-semibold text-[#17211d]">{roleLabels[user.role]}</p>
          <p className="mt-0.5 text-[12.5px] leading-5 text-[#69726d]">{roleDescriptions[user.role]}</p>
        </DetailSection>

        <DetailSection title="Committee posts">
          {user.positions.length ? (
            <div className="flex flex-wrap gap-1.5">
              {user.positions.map((position) => (
                <span
                  key={position}
                  className="rounded-full border border-[#dcdacd] bg-[#f6f5ee] px-2.5 py-1 text-[12px] font-medium text-[#4d564f]"
                >
                  {positionLabels[position].en}
                  <span className="ml-1 text-[#8b938d]">{positionLabels[position].bn}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-[#69726d]">
              No committee post. Posts are labels only — they never affect what an account can do.
            </p>
          )}
        </DetailSection>

        {user.permissions.length || user.deniedPermissions.length ? (
          <DetailSection title="Exceptions">
            <div className="space-y-2.5">
              {user.permissions.length ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#0b4634]">Granted on top</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {user.permissions.map((permission) => (
                      <PermPill key={permission} label={permission} tone="grant" />
                    ))}
                  </div>
                </div>
              ) : null}
              {user.deniedPermissions.length ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#a13228]">Denied</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {user.deniedPermissions.map((permission) => (
                      <PermPill key={permission} label={permission} tone="deny" />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </DetailSection>
        ) : null}

        <DetailSection title={`Effective permissions · ${formatCount(grantedCount)}`}>
          <EffectivePermissions user={user} />
        </DetailSection>

        <DetailSection title="Details">
          <DetailGrid>
            <DetailField label="Account ID" value={user.id} />
            <DetailField label="Phone" value={phoneValue(user) || "—"} />
            {user.gender ? <DetailField label="Gender" value={user.gender} /> : null}
            {user.city ? <DetailField label="City" value={user.city} /> : null}
            {user.dateOfBirth ? <DetailField label="Date of birth" value={formatLongDate(user.dateOfBirth)} /> : null}
            <DetailField
              label="Email verified"
              value={user.emailVerifiedAt ? formatLongDate(user.emailVerifiedAt) : "Not verified"}
            />
            <DetailField label="Joined" value={user.joinedAt ? formatLongDate(user.joinedAt) : "—"} />
            <DetailField label="Last active" value={user.lastActiveAt ? formatLongDate(user.lastActiveAt) : "Never signed in"} />
            {user.mosqueName ? <DetailField label="Mosque" value={user.mosqueName} full /> : null}
          </DetailGrid>
        </DetailSection>
      </div>
    </DetailDrawer>
  );
}

/* -------------------------------------------------------------------------- *
 * Edit user — details, role, posts, exceptions, active state
 * -------------------------------------------------------------------------- */

const grantEffects = [
  { value: "grant", label: "Grant" },
  { value: "deny", label: "Deny" },
];

function EditUserModal({
  user,
  canAssignRole,
  canAssignPositions,
  canAssignPermissions,
  canManage,
  pending,
  error,
  fieldErrors,
  onClose,
  onSave,
}: {
  user: AdminUser;
  canAssignRole: boolean;
  canAssignPositions: boolean;
  canAssignPermissions: boolean;
  canManage: boolean;
  pending: boolean;
  error: string | undefined;
  fieldErrors: Record<string, string[]> | undefined;
  onClose: () => void;
  onSave: (patch: UserEditPatch) => Promise<boolean>;
}) {
  const original = useMemo(
    () => ({
      fullName: user.fullName ?? user.name,
      email: user.email,
      phone: phoneValue(user),
      city: user.city ?? "",
      status: user.status ?? (user.isActive ? "active" : ("inactive" as UserStatus)),
    }),
    [user],
  );

  const [fullName, setFullName] = useState(original.fullName);
  const [email, setEmail] = useState(original.email);
  const [phone, setPhone] = useState(original.phone);
  const [city, setCity] = useState(original.city);
  const [role, setRole] = useState<Role>(user.role);
  const [positions, setPositions] = useState<Position[]>(user.positions);
  const [permissions, setPermissions] = useState<Permission[]>(user.permissions);
  const [denied, setDenied] = useState<Permission[]>(user.deniedPermissions);
  const [isActive, setIsActive] = useState(user.isActive);
  const [exceptionPermission, setExceptionPermission] = useState<Permission>(allPermissions[0]);
  const [exceptionEffect, setExceptionEffect] = useState<"grant" | "deny">("grant");
  const [submitted, setSubmitted] = useState(false);

  const addException = () => {
    if (exceptionEffect === "grant") {
      setPermissions((current) => (current.includes(exceptionPermission) ? current : [...current, exceptionPermission]));
      setDenied((current) => current.filter((permission) => permission !== exceptionPermission));
    } else {
      setDenied((current) => (current.includes(exceptionPermission) ? current : [...current, exceptionPermission]));
      setPermissions((current) => current.filter((permission) => permission !== exceptionPermission));
    }
  };

  const trimmedPhone = phone.trim();
  const errors = {
    fullName: fullName.trim().length < 2 ? "Enter a name of at least two characters." : undefined,
    email: !email.trim()
      ? "Enter an email address."
      : !emailPattern.test(email.trim())
        ? "Enter a valid email address."
        : undefined,
    phone: trimmedPhone && !/^\+[1-9]\d{7,14}$/.test(trimmedPhone.replace(/[\s-]/g, ""))
      ? "Use the international format, starting with + and the country code."
      : undefined,
  };
  const valid = Object.values(errors).every((message) => message === undefined);
  const show = (key: keyof typeof errors) =>
    (submitted ? errors[key] : undefined) ?? fieldMessage(fieldErrors, key);

  /**
   * Only what changed, and only what this viewer is allowed to change.
   *
   * Each key here is one request against one route with one permission, so an unchanged field must not
   * produce one: patching the role of someone whose role you did not touch is a 403 for anyone holding
   * `user.manage` without `role.assign`. The permission flags are checked here as well as around the
   * fields, so a section that is not on screen can never contribute a request even if its state drifts.
   *
   * `phone` and `city` are nullable columns, which is why clearing them sends an explicit `null` rather
   * than an empty string — `null` is what the backend reads as "clear this".
   */
  const patch: UserEditPatch = {};
  const profile: UpdateUserInput = {};
  if (canManage) {
    if (fullName.trim() !== original.fullName) profile.fullName = fullName.trim();
    if (email.trim() !== original.email) profile.email = email.trim();
    if (trimmedPhone !== original.phone) profile.phone = trimmedPhone || null;
    if (city.trim() !== original.city) profile.city = city.trim() || null;
  }
  if (Object.keys(profile).length > 0) patch.profile = profile;

  if (canAssignRole && role !== user.role) patch.role = role;
  if (canAssignPositions && !sameSet(positions, user.positions)) patch.positions = positions;
  if (canAssignPermissions && (!sameSet(permissions, user.permissions) || !sameSet(denied, user.deniedPermissions))) {
    // Both arrays go together: each is a replace, and sending one alone would leave the other as it was
    // on the server, which is not what the form on screen says.
    patch.permissions = { permissions, deniedPermissions: denied };
  }
  const nextStatus: UserStatus = isActive ? "active" : "inactive";
  if (canManage && nextStatus !== original.status) patch.status = nextStatus;

  const dirty = Object.keys(patch).length > 0;

  const submit = async () => {
    setSubmitted(true);
    if (!valid || !dirty || pending) return;
    await onSave(patch);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${user.name}`}
      description="Changes take effect the next time the account's session is resolved."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            icon="check"
            onClick={() => {
              void submit();
            }}
            disabled={pending || !dirty}
          >
            {pending ? "Saving…" : "Save Changes"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {canManage ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Full name"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              error={show("fullName")}
            />
            <TextField
              label="Email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={show("email")}
            />
            <TextField
              label="Phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              error={show("phone")}
              placeholder="+8801711223344"
              inputMode="tel"
            />
            <TextField label="City" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Dhaka" />
          </div>
        ) : null}

        {canAssignRole ? (
          <div>
            <SelectField
              label="Role"
              value={role}
              options={roleOptions}
              onChange={(event) => setRole(event.target.value as Role)}
              hint={roleDescriptions[role]}
            />
          </div>
        ) : (
          <InlineNotice tone="neutral" icon="lock">
            You can edit this account, but changing its role needs the role.assign permission.
          </InlineNotice>
        )}

        {canAssignPositions ? (
          <fieldset>
            <legend className="text-[13px] font-semibold text-[#3d453f]">Committee posts</legend>
            <p className="mb-1.5 mt-0.5 text-[12px] text-[#69726d]">Labels only — they never change what the account can do.</p>
            <PositionsPicker value={positions} onChange={setPositions} />
          </fieldset>
        ) : null}

        {canAssignPermissions ? (
          <fieldset>
            <legend className="text-[13px] font-semibold text-[#3d453f]">Permission exceptions</legend>
            <p className="mb-2 mt-0.5 text-[12px] leading-5 text-[#69726d]">
              Adjust one person without widening their role. A grant adds a permission on top; a denial removes one the
              role would otherwise give. Denial always wins. Saving replaces both lists with what you see here.
            </p>

            {permissions.length || denied.length ? (
              <div className="mb-3 space-y-2.5">
                {permissions.length ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#0b4634]">Granted on top</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {permissions.map((permission) => (
                        <PermPill
                          key={permission}
                          label={permission}
                          tone="grant"
                          onRemove={() => setPermissions((current) => current.filter((item) => item !== permission))}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
                {denied.length ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#a13228]">Denied</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {denied.map((permission) => (
                        <PermPill
                          key={permission}
                          label={permission}
                          tone="deny"
                          onRemove={() => setDenied((current) => current.filter((item) => item !== permission))}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mb-3 text-[12.5px] text-[#8b938d]">No exceptions — this account has exactly what its role grants.</p>
            )}

            <div className="grid gap-2 rounded-lg border border-[#e7e6dc] bg-[#faf9f4] p-3 sm:grid-cols-[1fr_auto_auto]">
              <SelectField
                label="Permission"
                value={exceptionPermission}
                options={allPermissions.map((permission) => ({ value: permission, label: permission }))}
                onChange={(event) => setExceptionPermission(event.target.value as Permission)}
              />
              <SelectField
                label="Effect"
                value={exceptionEffect}
                options={grantEffects}
                onChange={(event) => setExceptionEffect(event.target.value as "grant" | "deny")}
              />
              <div className="flex items-end">
                <Button variant="secondary" icon="plus" onClick={addException} className="w-full sm:w-auto">
                  Add
                </Button>
              </div>
            </div>
          </fieldset>
        ) : null}

        <div className="flex items-start gap-3 rounded-lg border border-[#e7e6dc] bg-[#faf9f4] px-3.5 py-3">
          <span
            className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border ${
              isActive ? "border-[#c2d8cb] bg-[#eaf2ed] text-[#0b4634]" : "border-[#ebc8c4] bg-[#fbeceb] text-[#a13228]"
            }`}
          >
            <Icon name={isActive ? "check-circle" : "lock"} size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[#17211d]">Account is {isActive ? "active" : "suspended"}</p>
            <p className="mt-0.5 text-[12px] leading-5 text-[#69726d]">
              {isActive
                ? "The account can sign in and use everything its role and exceptions allow."
                : "The account is suspended and resolves to no permissions until reactivated."}
            </p>
          </div>
          {canManage ? (
            <Button
              size="sm"
              variant={isActive ? "danger" : "secondary"}
              icon={isActive ? "lock" : "check"}
              onClick={() => setIsActive((value) => !value)}
            >
              {isActive ? "Suspend" : "Reactivate"}
            </Button>
          ) : null}
        </div>

        {error ? (
          <InlineNotice tone="danger" icon="alert">
            {error}
          </InlineNotice>
        ) : submitted && !valid ? (
          <InlineNotice tone="neutral" icon="alert">
            Some details still need attention — see the messages above.
          </InlineNotice>
        ) : !dirty ? (
          <InlineNotice tone="neutral" icon="info">
            Nothing has changed yet. Only the fields you edit are sent, each to the route that owns it.
          </InlineNotice>
        ) : null}
      </div>
    </Modal>
  );
}
