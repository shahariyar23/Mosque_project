import type { Permission, SessionUser } from "@/lib/permissions";

/**
 * The authenticated session shape returned by the API.
 *
 * This module intentionally contains no session lookup. Authentication is resolved by
 * `AuthProvider` from the real login or refresh response, then made available through
 * `useAuth`. A browser must never obtain an identity or permissions from demo data.
 */

export type Session = {
  user: SessionUser;
  /** Already resolved: base + role + permissions − deniedPermissions, empty when inactive. */
  permissions: Permission[];
};
