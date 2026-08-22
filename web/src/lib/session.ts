import { cookies } from "next/headers";
import {
  effectivePermissions,
  type Permission,
  type Role,
  type SessionUser,
} from "@/lib/permissions";
import { DEFAULT_PROFILE, DEMO_PROFILE_COOKIE, demoProfiles, isProfileKey } from "@/lib/demo-profiles";

/**
 * How the frontend reads a session. Server-only — it touches `next/headers`.
 *
 * Spec 0003 AC-7 requires that the permission list come from one server-side resolution per request
 * in the dashboard layout, and that no permission is ever read from browser storage or decoded on
 * the client. That is why this module is server-only and why the role switcher writes a *cookie*
 * rather than to `localStorage`: the server resolves the permission set, the browser only ever
 * receives the already-resolved list as props.
 *
 * Until the API exists, `getSession()` resolves a demo profile from that cookie. When auth lands,
 * this is the one file that changes — the body becomes a `GET /api/auth/me` with the incoming cookie
 * forwarded, and everything downstream keeps working because the return shape is the same.
 */

export type Session = {
  user: SessionUser;
  /** Already resolved: base + role + permissions − deniedPermissions, empty when inactive. */
  permissions: Permission[];
};

/**
 * Resolves the current session on the server. Returns `null` for "no session", which is the branch
 * the real implementation will use once `/signin` exists — the demo always has one.
 */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const key = store.get(DEMO_PROFILE_COOKIE)?.value;
  const user = demoProfiles[isProfileKey(key) ? key : DEFAULT_PROFILE];

  return { user, permissions: effectivePermissions(user) };
}

/** Convenience for reading the role label without importing the registry at a call site. */
export function roleOf(session: Session): Role {
  return session.user.role;
}
