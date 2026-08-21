"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import {
  demoUsers,
  permissionsForRole,
  scopeFor,
  type DataScope,
  type FinanceUser,
  type Permission,
  type Role,
} from "@/lib/finance/permissions";

const STORAGE_KEY = "noor-dashboard-role";
const DEFAULT_ROLE: Role = "treasurer";

type SessionValue = {
  user: FinanceUser;
  role: Role;
  permissions: Permission[];
  setRole: (role: Role) => void;
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  scope: (all: Permission, self: Permission) => DataScope;
};

/* ------------------------------------------------------------------------- *
 * The selected role lives in localStorage so a page refresh keeps the review
 * context. It is read through useSyncExternalStore rather than an effect, which
 * keeps the server render and the first client render in agreement.
 * ------------------------------------------------------------------------- */

const listeners = new Set<() => void>();
let cachedRole: Role | null = null;

function isRole(value: string | null): value is Role {
  return value !== null && value in demoUsers;
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      cachedRole = null;
      onStoreChange();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): Role {
  if (cachedRole) return cachedRole;
  let saved: string | null = null;
  try {
    saved = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private browsing or blocked storage — fall back to the default role.
  }
  cachedRole = isRole(saved) ? saved : DEFAULT_ROLE;
  return cachedRole;
}

/**
 * The server cannot read localStorage, so it renders the default role and the first client paint
 * matches it — a saved non-default role only appears once the store is read. That flicker is
 * acceptable here because the role switcher is demo scaffolding; the real session will arrive from
 * the API on the server, where the correct role is known before the first byte is sent.
 */
function getServerSnapshot(): Role {
  return DEFAULT_ROLE;
}

function writeRole(role: Role) {
  cachedRole = role;
  try {
    window.localStorage.setItem(STORAGE_KEY, role);
  } catch {
    // Ignore write failures; the in-memory value still drives this session.
  }
  listeners.forEach((listener) => listener());
}

/**
 * Context default, used only when a component is rendered outside the provider. It grants nothing:
 * a missing provider is a wiring bug, and a wiring bug should hide finance controls rather than
 * quietly hand out the default role's permissions to whatever rendered without a session.
 */
const SessionContext = createContext<SessionValue>({
  user: demoUsers[DEFAULT_ROLE],
  role: DEFAULT_ROLE,
  permissions: [],
  setRole: () => {},
  can: () => false,
  canAny: () => false,
  canAll: () => false,
  scope: () => "none",
});

/**
 * Stands in for real authentication. The role switcher in the header lets the team review the
 * permission-driven UI for every role; swapping this provider for the real session payload is
 * the only change needed once auth is connected.
 */
export function DashboardSessionProvider({ children }: { children: React.ReactNode }) {
  const role = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setRole = useCallback((next: Role) => writeRole(next), []);

  const value = useMemo<SessionValue>(() => {
    const permissions = permissionsForRole(role);
    return {
      user: demoUsers[role],
      role,
      permissions,
      setRole,
      can: (permission) => permissions.includes(permission),
      canAny: (list) => list.some((permission) => permissions.includes(permission)),
      canAll: (list) => list.every((permission) => permissions.includes(permission)),
      scope: (all, self) => scopeFor(permissions, all, self),
    };
  }, [role, setRole]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useFinanceSession() {
  return useContext(SessionContext);
}
