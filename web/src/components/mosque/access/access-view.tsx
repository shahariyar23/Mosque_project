"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/finance/ui/badge";
import { Button } from "@/components/finance/ui/button";
import { Icon } from "@/components/finance/ui/icon";
import { Panel, PanelBody, PanelHeader } from "@/components/finance/ui/panel";
import { InlineNotice } from "@/components/finance/ui/states";
import { DetailDrawer, DetailField, DetailGrid, DetailSection } from "@/components/ui/detail-drawer";
import { StatGrid } from "@/components/ui/stat-card";
import { RoleBadge } from "@/components/ui/status-badge";
import { groupPermissions, permissionGroups } from "@/lib/mosque/access";
import { formatCount } from "@/lib/mosque/format";
import { useApiList } from "@/hooks/use-api";
import { fetchUsers } from "@/services/userService";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import type { StatMetric } from "@/lib/mosque/types";
import {
  allPermissions,
  positionLabels,
  PLATFORM_ONLY,
  rolePermissions,
  roleDescriptions,
  roleLabels,
  roles,
  type Position,
  type Role,
} from "@/lib/permissions";

/**
 * The reference for how access is decided — read-only by design.
 *
 * Roles and their permission sets are defined in code (`lib/permissions.ts`), so there is nothing to
 * edit here: a role is assigned to a person on the Users page, and this page explains what each role
 * then means. Everything below is derived from the same registry the API will enforce — the catalogue
 * from `rolePermissions`, the matrix from folding each role through `permissionGroups`, the counts
 * from the real directory — so the page can never describe a role the system does not actually grant.
 */

/* -------------------------------------------------------------------------- *
 * Coverage cell
 * -------------------------------------------------------------------------- */

function CoverageCell({ held, total }: { held: number; total: number }) {
  if (held === 0) {
    return (
      <span className="text-[#c4c9c2]" aria-label="None">
        —
      </span>
    );
  }
  const full = held === total;
  return (
    <span
      title={`${held} of ${total} permissions`}
      className={`inline-flex min-w-11 items-center justify-center rounded-md px-2 py-0.5 text-[12px] font-semibold tabular-nums ${
        full ? "bg-[#eaf2ed] text-[#0b4634]" : "bg-[#f7efdc] text-[#8a6d24]"
      }`}
    >
      {full ? "All" : `${held}/${total}`}
    </span>
  );
}

/* -------------------------------------------------------------------------- *
 * View
 * -------------------------------------------------------------------------- */

const platformOnly = new Set<string>(PLATFORM_ONLY);

export function AccessView() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const { can } = useDashboardSession();

  // We fetch a large page of users to compute counts. Ideally the API would provide a stats endpoint.
  const { rows: users = [] } = useApiList(fetchUsers, { limit: 1000 }, { enabled: can("user.view") });

  const positionList = Object.keys(positionLabels) as Position[];
  
  const heldByRole = useMemo(() => {
    return roles.reduce<Record<Role, number>>(
      (counts, role) => {
        counts[role] = users.filter((user) => user.role === role).length;
        return counts;
      },
      {} as Record<Role, number>,
    );
  }, [users]);

  const metrics: StatMetric[] = [
    {
      id: "roles",
      label: "Roles",
      value: formatCount(roles.length),
      hint: "From super admin to member",
      icon: "shield",
      tone: "neutral",
    },
    {
      id: "permissions",
      label: "Permissions",
      value: formatCount(allPermissions.length),
      hint: `Across ${formatCount(permissionGroups.length)} areas`,
      icon: "key",
      tone: "gold",
    },
    {
      id: "posts",
      label: "Committee posts",
      value: formatCount(positionList.length),
      hint: "Labels — they grant nothing",
      icon: "user",
      tone: "neutral",
    },
    {
      id: "accounts",
      label: "Accounts governed",
      value: formatCount(users.filter(u => u.role !== "member").length),
      hint: "Hold one of these roles",
      icon: "users",
      tone: "positive",
    },
  ];

  // Precompute each role's permission set once for the matrix.
  const roleSets = useMemo(
    () => roles.map((role) => ({ role, set: new Set(rolePermissions[role]) })),
    [],
  );

  return (
    <div className="space-y-4">
      <StatGrid metrics={metrics} />

      <InlineNotice tone="gold" icon="info">
        Access is decided by <strong>role</strong>. A committee post is a label and grants nothing on its own, and one
        person can be adjusted with per-account exceptions on the Users page. Roles themselves are defined in the
        platform, so this page is a reference — assign a role to someone under Users.
      </InlineNotice>

      <Panel>
        <PanelHeader
          title="Roles"
          description="The seven roles an account can hold, what each is for and how many people hold it today."
          icon="shield"
        />
        <PanelBody>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {roles.map((role) => {
              const count = rolePermissions[role].length;
              const held = heldByRole[role];
              return (
                <li key={role}>
                  <button
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className="flex h-full w-full flex-col rounded-xl border border-[#e7e6dc] bg-white p-4 text-left transition-colors hover:border-[#0d4d3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <RoleBadge role={role} />
                      <Icon name="chevron-right" size={16} className="text-[#b7bcb4]" />
                    </div>
                    <p className="mt-2.5 flex-1 text-[12.5px] leading-5 text-[#69726d]">{roleDescriptions[role]}</p>
                    <p className="mt-3 border-t border-[#f0efe6] pt-2.5 text-[12px] font-medium text-[#4d564f]">
                      {formatCount(count)} permissions
                      <span className="mx-1.5 text-[#c4c9c2]">·</span>
                      {held > 0 ? `held by ${formatCount(held)}` : "not currently held"}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          title="Coverage by area"
          description="What each role can reach, area by area. “All” means every permission in that area; a fraction means some."
          icon="grid"
        />
        <PanelBody>
          <div className="overflow-x-auto">
            <table className="w-full min-w-180 border-collapse text-sm">
              <caption className="sr-only">Permission coverage of each role across every area of the platform</caption>
              <thead>
                <tr className="border-b border-[#e7e6dc]">
                  <th
                    scope="col"
                    className="sticky left-0 z-10 bg-white py-2.5 pr-4 text-left text-[11px] font-bold uppercase tracking-[.08em] text-[#8b938d]"
                  >
                    Area
                  </th>
                  {roles.map((role) => (
                    <th
                      key={role}
                      scope="col"
                      className="whitespace-nowrap px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d453f]"
                    >
                      {roleLabels[role as Role]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissionGroups.map((group) => (
                  <tr key={group.key} className="border-b border-[#f0efe6] last:border-0">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 bg-white py-2.5 pr-4 text-left align-middle font-normal"
                    >
                      <span className="block text-[13px] font-medium text-[#17211d]">{group.label}</span>
                      <span className="text-[11px] text-[#8b938d]">{formatCount(group.permissions.length)} permissions</span>
                    </th>
                    {roleSets.map(({ role, set }) => {
                      const held = group.permissions.filter((permission) => set.has(permission)).length;
                      return (
                        <td key={role} className="px-3 py-2.5 text-center">
                          <CoverageCell held={held} total={group.permissions.length} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          title="Committee posts"
          description="Honorary titles the mosque uses. A post describes what someone is called, never what their account can do — that is always the role."
          icon="user"
        />
        <PanelBody>
          <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {positionList.map((position) => (
              <li
                key={position}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#e7e6dc] bg-[#faf9f4] px-3.5 py-2.5"
              >
                <span className="text-[13px] font-medium text-[#17211d]">{positionLabels[position].en}</span>
                <span className="shrink-0 text-[12.5px] text-[#8b938d]">{positionLabels[position].bn}</span>
              </li>
            ))}
          </ul>
        </PanelBody>
      </Panel>

      {selectedRole ? <RoleDetailDrawer role={selectedRole} users={users} onClose={() => setSelectedRole(null)} /> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Role detail drawer
 * -------------------------------------------------------------------------- */

import type { User } from "@/services/userService";

function RoleDetailDrawer({ role, users, onClose }: { role: Role; users: User[]; onClose: () => void }) {
  const granted = rolePermissions[role];
  const groups = groupPermissions(granted);
  const holders = users.filter((user) => user.role === role);
  const withoutPlatform = granted.filter((permission) => platformOnly.has(permission)).length;

  return (
    <DetailDrawer
      open
      onClose={onClose}
      eyebrow="Role"
      title={roleLabels[role as Role]}
      subtitle={`${formatCount(granted.length)} permissions`}
      badge={<RoleBadge role={role} />}
      footer={
        <Button size="sm" variant="ghost" onClick={onClose} className="ml-auto">
          Close
        </Button>
      }
    >
      <div className="space-y-5">
        <DetailSection title="What it is for">
          <p className="text-[13px] leading-6 text-[#3d453f]">{roleDescriptions[role]}</p>
        </DetailSection>

        {withoutPlatform > 0 ? (
          <InlineNotice tone="gold" icon="star">
            This role carries platform-level permissions that manage the mosque itself. It is the most powerful role and
            should be held by very few people.
          </InlineNotice>
        ) : null}

        <DetailSection title={`Held by · ${formatCount(holders.length)}`}>
          {holders.length ? (
            <div className="flex flex-wrap gap-1.5">
              {holders.map((user) => (
                <span
                  key={user.id}
                  className="rounded-full border border-[#dcdacd] bg-[#f6f5ee] px-2.5 py-1 text-[12px] font-medium text-[#4d564f]"
                >
                  {user.fullName}
                  {user.status === "inactive" ? <span className="ml-1 text-[#a13228]">· suspended</span> : null}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-[#69726d]">No account currently holds this role.</p>
          )}
        </DetailSection>

        <DetailSection title={`Permissions · ${formatCount(granted.length)}`}>
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.key}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#8b938d]">{group.label}</p>
                  <Badge tone="neutral" dot={false}>
                    {formatCount(group.items.length)}
                  </Badge>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {group.items.map((permission) => (
                    <span
                      key={permission}
                      className="rounded-md border border-[#dcdacd] bg-[#f6f5ee] px-2 py-0.5 font-mono text-[11.5px] font-medium text-[#4d564f]"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DetailSection>

        <DetailSection title="Summary">
          <DetailGrid>
            <DetailField label="Role key" value={role} />
            <DetailField label="Permissions" value={formatCount(granted.length)} />
            <DetailField label="Areas reached" value={formatCount(groups.length)} />
            <DetailField label="Accounts" value={formatCount(holders.length)} />
          </DetailGrid>
        </DetailSection>
      </div>
    </DetailDrawer>
  );
}
