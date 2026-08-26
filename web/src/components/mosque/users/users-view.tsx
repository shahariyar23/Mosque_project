"use client";

import { useMemo, useState, useEffect } from "react";
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
import { FinanceEmptyState, InlineNotice } from "@/components/finance/ui/states";
import { PersonCell } from "@/components/ui/avatar";
import { DetailDrawer, DetailField, DetailGrid, DetailSection } from "@/components/ui/detail-drawer";
import { StatGrid } from "@/components/ui/stat-card";
import { RoleBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { adminUsers as seedUsers, userStats } from "@/data/users";
import { useAuth } from "@/components/auth-provider";
import { fetchUsers } from "@/services/userService";
import { groupPermissions } from "@/lib/mosque/access";
import { SpinnerIcon } from "@/components/signup/icons";
import { downloadCsv } from "@/lib/mosque/export";
import { formatCount, formatLongDate, REFERENCE_DATE } from "@/lib/mosque/format";
import type { AdminUser, AdminUserDraft, StatMetric } from "@/lib/mosque/types";
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
 * The whole module hangs off `effectivePermissions()`: the drawer resolves a row through the exact
 * function the session uses, so what it shows a person can do is never a second opinion. Editing goes
 * through the same four permissions the API will enforce — `user.manage` to invite or suspend,
 * `role.assign` to change a role, `position.assign` for posts, `permission.assign` for the per-person
 * exceptions — each gated with `Can`, so previewing as a secretary shows the read-only directory the
 * secretary role actually grants (`user.view`) and none of the controls.
 */
const metrics: StatMetric[] = [
  {
    id: "total",
    label: "Accounts",
    value: formatCount(userStats.total),
    hint: "With back-office access",
    icon: "users",
    tone: "neutral",
  },
  {
    id: "active",
    label: "Active",
    value: formatCount(userStats.active),
    hint: "Able to sign in",
    icon: "check-circle",
    tone: "positive",
  },
  {
    id: "admins",
    label: "Administrators",
    value: formatCount(userStats.admins),
    hint: "Super & mosque admins",
    icon: "shield",
    tone: "gold",
  },
  {
    id: "suspended",
    label: "Suspended",
    value: formatCount(userStats.suspended),
    hint: "No access until restored",
    icon: "lock",
    tone: userStats.suspended > 0 ? "warning" : "neutral",
  },
];

const positionList = Object.keys(positionLabels) as Position[];
const roleOptions = roles.map((role) => ({ value: role, label: roleLabels[role] }));

const emptyDraft: AdminUserDraft = {
  name: "",
  email: "",
  phone: "",
  role: "secretary",
  positions: [],
};

/** Next USR-nnn id from the highest number in use, so gaps in the demo ids don't cause a clash. */
function nextUserId(users: AdminUser[]): string {
  const highest = users.reduce((max, user) => {
    const value = Number.parseInt(user.id.replace(/\D/g, ""), 10);
    return Number.isNaN(value) ? max : Math.max(max, value);
  }, 0);
  return `USR-${String(highest + 1).padStart(3, "0")}`;
}

function positionsLabel(positions: Position[]): string {
  return positions.length ? positions.map((position) => positionLabels[position].en).join(", ") : "—";
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
const { token } = useAuth();
  const [userList, setUserList] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(openAddOnMount);
  const [editing, setEditing] = useState<AdminUser | null>(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null);

useEffect(() => {
  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers(token);
      setUserList(data);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };
  loadUsers();
}, []);

  // Look the selection up by id every render so the drawer reflects an edit made behind it.
  const selected = selectedId ? (userList.find((user) => user.id === selectedId) ?? null) : null;

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return userList.filter((user) => {
      if (needle) {
        const haystack = `${user.name} ${user.email} ${user.id} ${roleLabels[user.role]}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (role !== "all" && user.role !== role) return false;
      if (status === "active" && !user.isActive) return false;
      if (status === "suspended" && user.isActive) return false;
      return true;
    });
  }, [role, search, status, userList]);

  const filters: SelectFilter[] = [
    {
      id: "role",
      label: "Role",
      value: role,
      onChange: setRole,
      options: [{ value: "all", label: "All roles" }, ...roleOptions],
    },
    {
      id: "status",
      label: "Status",
      value: status,
      onChange: setStatus,
      options: [
        { value: "all", label: "Any status" },
        { value: "active", label: "Active" },
        { value: "suspended", label: "Suspended" },
      ],
    },
  ];

  const activeFilterCount = (role !== "all" ? 1 : 0) + (status !== "all" ? 1 : 0);
  const resetFilters = () => {
    setRole("all");
    setStatus("all");
  };

  const inviteUser = (draft: AdminUserDraft) => {
    const user: AdminUser = {
      id: nextUserId(userList),
      name: draft.name.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      mosqueId: "MSQ-001",
      mosqueName: "Noor Community Mosque",
      role: draft.role,
      positions: draft.positions,
      permissions: [],
      deniedPermissions: [],
      isActive: true,
      joinedAt: REFERENCE_DATE,
      lastActiveAt: "",
    };
    setUserList((current) => [user, ...current]);
    setAdding(false);
    notify({
      message: "Invitation sent.",
      description: `${user.name} · ${roleLabels[user.role]} — added to this browser session only.`,
    });
  };

  const applyEdit = (id: string, patch: Partial<AdminUser>) => {
    setUserList((current) => current.map((user) => (user.id === id ? { ...user, ...patch } : user)));
  };

  const saveEdit = (id: string, patch: Partial<AdminUser>) => {
    applyEdit(id, patch);
    setEditing(null);
    notify({ message: "Account updated.", description: "Changes are held in this browser only — front-end preview." });
  };

  const setActive = (user: AdminUser, isActive: boolean) => {
    applyEdit(user.id, { isActive });
    notify({
      tone: isActive ? undefined : "info",
      message: isActive ? "Account reactivated." : "Account suspended.",
      description: isActive
        ? `${user.name} can sign in again.`
        : `${user.name} can no longer sign in — every permission is revoked while suspended.`,
    });
  };

  const exportCsv = () => {
    downloadCsv("noor-mosque-users.csv", filtered, [
      { header: "ID", value: (user) => user.id },
      { header: "Name", value: (user) => user.name },
      { header: "Email", value: (user) => user.email },
      { header: "Phone", value: (user) => user.phone },
      { header: "Role", value: (user) => roleLabels[user.role] },
      { header: "Positions", value: (user) => user.positions.map((position) => positionLabels[position].en).join(" / ") },
      { header: "Status", value: (user) => (user.isActive ? "Active" : "Suspended") },
      { header: "Extra permissions", value: (user) => user.permissions.join(" ") },
      { header: "Denied permissions", value: (user) => user.deniedPermissions.join(" ") },
      { header: "Joined", value: (user) => user.joinedAt },
      { header: "Last active", value: (user) => user.lastActiveAt || "Never" },
    ]);
    notify({
      tone: "info",
      message: "Export downloaded.",
      description: `${formatCount(filtered.length)} rows, matching the filters currently applied.`,
    });
  };

  const columns: Column<AdminUser>[] = [
    {
      key: "user",
      header: "User",
      cell: (user) => <PersonCell name={user.name} meta={user.email} />,
      sortValue: (user) => user.name,
    },
    {
      key: "role",
      header: "Role",
      cell: (user) => <RoleBadge role={user.role} />,
      sortValue: (user) => roleLabels[user.role],
    },
    {
      key: "positions",
      header: "Positions",
      cell: (user) => <span className="text-[#3d453f]">{positionsLabel(user.positions)}</span>,
      sortValue: (user) => user.positions.length,
    },
    {
      key: "status",
      header: "Status",
      cell: (user) => (
        <Badge tone={user.isActive ? "success" : "danger"}>{user.isActive ? "Active" : "Suspended"}</Badge>
      ),
      sortValue: (user) => (user.isActive ? 0 : 1),
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
      sortValue: (user) => user.lastActiveAt || "0000-00-00",
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

if (loading) {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <SpinnerIcon className="h-6 w-6 animate-spin" />
    </div>
  );
}
if (error) {
  return (
    <InlineNotice tone="danger" icon="alert" description={error} />
  );
}
return (
    <div className="space-y-4">
      <StatGrid metrics={metrics} />

      <Panel>
        <PanelHeader
          title="Users"
          description="The accounts that can sign in to run the mosque — their role, their committee posts and whether they are active."
          icon="users"
          actions={
            <>
              <Button variant="secondary" size="sm" icon="download" onClick={exportCsv}>
                Export
              </Button>
              <Can permission="user.manage">
                <Button size="sm" icon="user-plus" onClick={() => setAdding(true)}>
                  Invite User
                </Button>
              </Can>
            </>
          }
        />

        <FinanceFilters
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search by name, email, role or ID…",
            label: "Search users by name, email, role or ID",
          }}
          filters={filters}
          activeCount={activeFilterCount}
          onReset={resetFilters}
        />

        <DataTable
          rows={filtered}
          columns={columns}
          getRowKey={(user) => user.id}
          caption="Back-office accounts with role, positions, status and last activity"
          initialSort={{ key: "user", direction: "asc" }}
          pageSize={10}
          mobileTitle={(user) => user.name}
          mobileSubtitle={(user) => `${roleLabels[user.role]} · ${user.email}`}
          mobileTrailing={(user) => (
            <Badge tone={user.isActive ? "success" : "danger"}>{user.isActive ? "Active" : "Suspended"}</Badge>
          )}
          mobileHiddenKeys={["user", "role", "status"]}
          emptyState={
            <FinanceEmptyState
              icon="users"
              title="No users found."
              description={
                activeFilterCount > 0 || search
                  ? "Nothing matches the current search and filters. Try clearing them."
                  : "No accounts yet. Invite the first member of the back-office team."
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
                ) : (
                  <Can permission="user.manage">
                    <Button icon="user-plus" onClick={() => setAdding(true)}>
                      Invite User
                    </Button>
                  </Can>
                )
              }
            />
          }
        />
      </Panel>

      {selected ? (
        <UserDetailDrawer
          user={selected}
          onClose={() => setSelectedId(null)}
          onEdit={() => setEditing(selected)}
          onSuspend={() => setSuspendTarget(selected)}
          onReactivate={() => setActive(selected, true)}
        />
      ) : null}

      <InviteUserModal open={adding} onClose={() => setAdding(false)} onSave={inviteUser} />

      {editing ? (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => saveEdit(editing.id, patch)}
        />
      ) : null}

      <ConfirmDialog
        open={suspendTarget !== null}
        onClose={() => setSuspendTarget(null)}
        onConfirm={() => {
          if (suspendTarget) setActive(suspendTarget, false);
        }}
        title="Suspend this account?"
        description={
          suspendTarget
            ? `${suspendTarget.name} will be signed out and unable to sign in again. Every permission is revoked while the account is suspended. You can reactivate it at any time.`
            : ""
        }
        confirmLabel="Suspend account"
        icon="lock"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Detail drawer
 * -------------------------------------------------------------------------- */

function UserDetailDrawer({
  user,
  onClose,
  onEdit,
  onSuspend,
  onReactivate,
}: {
  user: AdminUser;
  onClose: () => void;
  onEdit: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
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
              <Button size="sm" variant="danger" icon="lock" onClick={onSuspend}>
                Suspend
              </Button>
            ) : (
              <Button size="sm" icon="check" onClick={onReactivate}>
                Reactivate
              </Button>
            )}
          </Can>
          <Button size="sm" variant="ghost" onClick={onClose} className="ml-auto">
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {!user.isActive ? (
          <InlineNotice tone="neutral" icon="lock">
            Suspended — this account cannot sign in, and resolves to no permissions until it is reactivated.
          </InlineNotice>
        ) : null}
        {user.isActive && user.lastActiveAt === "" ? (
          <InlineNotice tone="gold" icon="clock">
            Invited but has never signed in. The invitation is pending.
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
            <DetailField label="Phone" value={user.phone} />
            <DetailField label="Member record" value={user.memberId ?? "Not a member"} />
            <DetailField label="Staff record" value={user.staffId ?? "Not on payroll"} />
            <DetailField label="Joined" value={formatLongDate(user.joinedAt)} />
            <DetailField label="Last active" value={user.lastActiveAt ? formatLongDate(user.lastActiveAt) : "Never signed in"} />
            <DetailField label="Mosque" value={user.mosqueName} full />
          </DetailGrid>
        </DetailSection>
      </div>
    </DetailDrawer>
  );
}

/* -------------------------------------------------------------------------- *
 * Positions picker — shared by invite and edit
 * -------------------------------------------------------------------------- */

function PositionsPicker({
  value,
  onChange,
}: {
  value: Position[];
  onChange: (positions: Position[]) => void;
}) {
  const toggle = (position: Position) =>
    onChange(value.includes(position) ? value.filter((item) => item !== position) : [...value, position]);

  return (
    <div className="flex flex-wrap gap-2">
      {positionList.map((position) => {
        const active = value.includes(position);
        return (
          <button
            key={position}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(position)}
            className={`min-h-9 rounded-full border px-3 text-[12.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b] ${
              active
                ? "border-[#0d4d3b] bg-[#0d4d3b] text-white"
                : "border-[#cfd4cd] bg-white text-[#4d564f] hover:border-[#0d4d3b] hover:text-[#0d4d3b]"
            }`}
          >
            {positionLabels[position].en}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Invite user
 * -------------------------------------------------------------------------- */

function InviteUserModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (draft: AdminUserDraft) => void;
}) {
  const [draft, setDraft] = useState<AdminUserDraft>(emptyDraft);
  const [submitted, setSubmitted] = useState(false);

  const set = <Key extends keyof AdminUserDraft>(key: Key, value: AdminUserDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email.trim());
  const errors = {
    name: draft.name.trim().length === 0 ? "Enter the person's name." : undefined,
    email: draft.email.trim().length === 0 ? "Enter an email address." : !emailValid ? "Enter a valid email address." : undefined,
  };
  const valid = Object.values(errors).every((error) => error === undefined);
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  const close = () => {
    setDraft(emptyDraft);
    setSubmitted(false);
    onClose();
  };

  const submit = () => {
    setSubmitted(true);
    if (!valid) return;
    onSave(draft);
    setDraft(emptyDraft);
    setSubmitted(false);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Invite a user"
      description="Give them a role to start. Committee posts and per-person exceptions can be set afterwards."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button icon="user-plus" onClick={submit}>
            Send Invitation
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Full name"
          required
          value={draft.name}
          onChange={(event) => set("name", event.target.value)}
          error={show("name")}
          placeholder="Abdul Malik"
        />
        <TextField
          label="Email"
          required
          type="email"
          value={draft.email}
          onChange={(event) => set("email", event.target.value)}
          error={show("email")}
          placeholder="abdul.malik@noormosque.org"
        />
        <TextField
          label="Phone"
          value={draft.phone}
          onChange={(event) => set("phone", event.target.value)}
          placeholder="+880 1XXX-XXXXXX"
        />
        <SelectField
          label="Role"
          required
          value={draft.role}
          options={roleOptions}
          onChange={(event) => set("role", event.target.value as Role)}
          hint={roleDescriptions[draft.role]}
        />
        <fieldset className="sm:col-span-2">
          <legend className="text-[13px] font-semibold text-[#3d453f]">Committee posts</legend>
          <p className="mb-1.5 mt-0.5 text-[12px] text-[#69726d]">Optional. A post is a label and grants nothing on its own.</p>
          <PositionsPicker value={draft.positions} onChange={(positions) => set("positions", positions)} />
        </fieldset>
      </div>

      {submitted && !valid ? (
        <InlineNotice className="mt-4" tone="neutral" icon="alert">
          Some details still need attention — see the messages above.
        </InlineNotice>
      ) : (
        <InlineNotice className="mt-4" tone="gold">
          Front-end preview — no email is sent and the account lives in this browser session only.
        </InlineNotice>
      )}
    </Modal>
  );
}

/* -------------------------------------------------------------------------- *
 * Edit user — role, posts, exceptions, active state
 * -------------------------------------------------------------------------- */

const grantEffects = [
  { value: "grant", label: "Grant" },
  { value: "deny", label: "Deny" },
];

function EditUserModal({
  user,
  onClose,
  onSave,
}: {
  user: AdminUser;
  onClose: () => void;
  onSave: (patch: Partial<AdminUser>) => void;
}) {
  const [role, setRole] = useState<Role>(user.role);
  const [positions, setPositions] = useState<Position[]>(user.positions);
  const [permissions, setPermissions] = useState<Permission[]>(user.permissions);
  const [denied, setDenied] = useState<Permission[]>(user.deniedPermissions);
  const [isActive, setIsActive] = useState(user.isActive);
  const [exceptionPermission, setExceptionPermission] = useState<Permission>(allPermissions[0]);
  const [exceptionEffect, setExceptionEffect] = useState<"grant" | "deny">("grant");

  const addException = () => {
    if (exceptionEffect === "grant") {
      setPermissions((current) => (current.includes(exceptionPermission) ? current : [...current, exceptionPermission]));
      setDenied((current) => current.filter((permission) => permission !== exceptionPermission));
    } else {
      setDenied((current) => (current.includes(exceptionPermission) ? current : [...current, exceptionPermission]));
      setPermissions((current) => current.filter((permission) => permission !== exceptionPermission));
    }
  };

  const save = () => onSave({ role, positions, permissions, deniedPermissions: denied, isActive });

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${user.name}`}
      description="Changes take effect the next time the account's session is resolved."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button icon="check" onClick={save}>
            Save Changes
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Can
          permission="role.assign"
          fallback={
            <InlineNotice tone="neutral" icon="lock">
              You can edit this account, but changing its role needs the role.assign permission.
            </InlineNotice>
          }
        >
          <div>
            <SelectField
              label="Role"
              value={role}
              options={roleOptions}
              onChange={(event) => setRole(event.target.value as Role)}
              hint={roleDescriptions[role]}
            />
          </div>
        </Can>

        <Can permission="position.assign">
          <fieldset>
            <legend className="text-[13px] font-semibold text-[#3d453f]">Committee posts</legend>
            <p className="mb-1.5 mt-0.5 text-[12px] text-[#69726d]">Labels only — they never change what the account can do.</p>
            <PositionsPicker value={positions} onChange={setPositions} />
          </fieldset>
        </Can>

        <Can permission="permission.assign">
          <fieldset>
            <legend className="text-[13px] font-semibold text-[#3d453f]">Permission exceptions</legend>
            <p className="mb-2 mt-0.5 text-[12px] leading-5 text-[#69726d]">
              Adjust one person without widening their role. A grant adds a permission on top; a denial removes one the
              role would otherwise give. Denial always wins.
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
        </Can>

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
          <Button
            size="sm"
            variant={isActive ? "danger" : "secondary"}
            icon={isActive ? "lock" : "check"}
            onClick={() => setIsActive((value) => !value)}
          >
            {isActive ? "Suspend" : "Reactivate"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
