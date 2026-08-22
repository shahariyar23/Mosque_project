"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  scopeFor,
  type DataScope,
  type Permission,
  type Position,
  type SessionUser,
} from "@/lib/permissions";
import type { Session } from "@/lib/session";

/**
 * Carries the already-resolved session down to the interactive parts of the shell.
 *
 * Spec 0003 AC-7: the permission list is resolved once per request on the server, in the dashboard
 * layout, and handed here as props. Nothing in this file reads a cookie, decodes a token, or touches
 * `localStorage` — a client that can edit its own permission list is not a permission check.
 *
 * The value survives the arrival of real authentication unchanged. Only the layout's `getSession()`
 * call changes.
 */
type SessionValue = {
  /** `null` only when a component renders outside the provider, which is a wiring bug. */
  user: SessionUser | null;
  permissions: Permission[];
  positions: Position[];
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  /** Resolves a page to "all" / "own" / "none" — see `scopeFor` in the registry. */
  scope: (all: Permission, own: Permission) => DataScope;
};

/**
 * Context default, used only outside the provider. It grants nothing: a missing provider is a
 * wiring bug, and the safe reading of a wiring bug is "deny", not "fall back to some default role".
 */
const SessionContext = createContext<SessionValue>({
  user: null,
  permissions: [],
  positions: [],
  can: () => false,
  canAny: () => false,
  canAll: () => false,
  scope: () => "none",
});

export function DashboardSessionProvider({
  session,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  const { user, permissions } = session;

  const value = useMemo<SessionValue>(
    () => ({
      user,
      permissions,
      positions: user.positions,
      can: (permission) => permissions.includes(permission),
      canAny: (list) => list.some((permission) => permissions.includes(permission)),
      canAll: (list) => list.every((permission) => permissions.includes(permission)),
      scope: (all, own) => scopeFor(permissions, all, own),
    }),
    [user, permissions],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useDashboardSession() {
  return useContext(SessionContext);
}
