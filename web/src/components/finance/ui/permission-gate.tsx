"use client";

import type { ReactNode } from "react";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { NoAccessState } from "@/components/finance/ui/states";
import type { Permission } from "@/lib/permissions";

/**
 * Renders children only when the signed-in person holds the permission. Use for actions —
 * buttons, menu items, table columns — so nothing appears that the person cannot do.
 */
export function Can({
  permission,
  anyOf,
  allOf,
  fallback = null,
  children,
}: {
  permission?: Permission;
  anyOf?: Permission[];
  allOf?: Permission[];
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { can, canAny, canAll } = useDashboardSession();

  // Fail closed. A gate with no criteria — or with `anyOf={[]}` because a filtered list came back
  // empty — is a call-site mistake, and the safe reading of a mistake is "deny", not "show it to
  // everyone". Collecting the checks first is what makes an empty gate distinguishable from a
  // satisfied one; `&&` over three defaulted trues cannot tell them apart.
  const checks: boolean[] = [];
  if (permission) checks.push(can(permission));
  if (anyOf && anyOf.length > 0) checks.push(canAny(anyOf));
  if (allOf && allOf.length > 0) checks.push(canAll(allOf));

  const allowed = checks.length > 0 && checks.every(Boolean);
  return <>{allowed ? children : fallback}</>;
}

/**
 * Page-level guard. Renders the no-access panel instead of the page body when the viewer holds
 * none of the listed permissions. The real check happens on the API — this is for UX.
 */
export function RequirePermission({
  anyOf,
  area,
  description,
  children,
}: {
  anyOf: Permission[];
  area: string;
  description?: string;
  children: ReactNode;
}) {
  const { canAny } = useDashboardSession();
  if (!canAny(anyOf)) return <NoAccessState area={area} description={description} />;
  return <>{children}</>;
}
