import {
  effectivePermissions,
  type Permission,
  type Role,
  type SessionUser,
} from "@/lib/permissions";
import { DEFAULT_PROFILE, demoProfiles } from "@/lib/demo-profiles";

/**
 * How the frontend reads a session.
 *
 * For static export (Cloudflare Pages), we cannot use `next/headers` or cookies
 * at build time. This returns the default demo profile synchronously.
 *
 * When a real auth API lands, this becomes a client-side fetch to
 * `GET /api/auth/me` and the return shape stays the same.
 */

export type Session = {
  user: SessionUser;
  /** Already resolved: base + role + permissions − deniedPermissions, empty when inactive. */
  permissions: Permission[];
};

/**
 * Returns the default demo session synchronously.
 * Compatible with both server components and static export.
 */
export function getSession(): Session | null {
  const user = demoProfiles[DEFAULT_PROFILE];
  return { user, permissions: effectivePermissions(user) };
}

/** Convenience for reading the role label without importing the registry at a call site. */
export function roleOf(session: Session): Role {
  return session.user.role;
}
