"use client";
import type { SigninPayload } from "@/components/signin/signin-validation";
import type { SignupPayload } from "@/components/signup/signup-validation";
import type { Permission, Role, SessionUser } from "@/lib/permissions";
import type { Session } from "@/lib/session";

/**
 * Frontend auth service.
 *
 * **Every response from this API is wrapped.** The shape is `{ success, message, data }` and the payload
 * is always under `data`. Reading a field off the envelope itself returns `undefined` silently, which is
 * how a login can appear to succeed while every later request goes out as `Bearer undefined`.
 *
 * **Two credentials are in play and they are not interchangeable.**
 *
 * The *access token* comes back in the body, is held in memory, and must be attached as
 * `Authorization: Bearer <token>`. `GET /auth/me` reads it from that header and from nowhere else — the
 * server's JWT strategy is configured `fromAuthHeaderAsBearerToken()`, so sending cookies alone to a
 * protected route is always a 401 no matter how recently the user signed in.
 *
 * The *refresh token* is an HttpOnly cookie scoped to `/api/v1/auth`. No script can read it, and its one
 * use is `POST /auth/refresh`. That is what recovers a session after a page reload, because the access
 * token was never persisted anywhere a reload could survive.
 *
 * Every call therefore sends `credentials: "include"` — the login and refresh responses set that cookie,
 * and the refresh request is the one that must present it.
 */

import { getApiBaseUrl } from "@/config/api";

const apiBase = getApiBaseUrl;

/** What the server returns from `/auth/login` and `/auth/refresh`, under `data`. */
type SessionPayload = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: AuthProfile;
};

/**
 * The profile `/auth/me` returns, and that rides along with a session.
 *
 * A subset of the server's `AuthProfileDto` — only the fields the frontend actually reads. The server
 * sends more; ignoring the rest is deliberate, so a new column there is not a breaking change here.
 */
export type AuthProfile = {
  id: string;
  mosqueId: string;
  fullName: string;
  email: string;
  role: Role;
  positions: SessionUser["positions"];
  permissions: string[];
  deniedPermissions: string[];
  isActive: boolean;
  /** Resolved server-side: base ∪ role ∪ granted − denied, and empty when the account is inactive. */
  effectivePermissions: string[];
};

/**
 * Pulls the payload out of the envelope, or throws with whatever the server said went wrong.
 *
 * The server's error bodies carry a readable `message`, so it is preferred over the generic fallback —
 * "Please sign in to continue." is more use to a caller than "LOGIN_FAILED". A 200 whose body has no
 * `data` is treated as a failure rather than returned as `undefined`, which is the class of bug this
 * helper exists to make impossible.
 */
async function unwrap<T>(response: Response, fallback: string): Promise<T> {
  const body = (await response.json().catch(() => null)) as
    | { message?: string; data?: T }
    | null;

  if (!response.ok) throw new Error(body?.message ?? fallback);
  if (!body || body.data === undefined) throw new Error(fallback);

  return body.data;
}

/**
 * The server profile, as the frontend's permission registry wants it.
 *
 * `effectivePermissions` is used exactly as sent rather than recomputed here. The server is the only
 * authority on what an account may do, and resolving it twice would mean two answers to one question.
 */
export function toSession(profile: AuthProfile): Session {
  const user: SessionUser = {
    id: profile.id,
    name: profile.fullName,
    mosqueId: profile.mosqueId,
    // Not carried on the auth profile. Left blank rather than invented; whatever renders the mosque
    // name reads it from the mosque.
    mosqueName: "",
    role: profile.role,
    positions: profile.positions ?? [],
    permissions: profile.permissions as Permission[],
    deniedPermissions: profile.deniedPermissions as Permission[],
    isActive: profile.isActive,
  };

  return { user, permissions: profile.effectivePermissions as Permission[] };
}

export type RegisteredUser = {
  id: string;
  fullName: string;
  email: string;
};

export const registerUser = async (payload: SignupPayload): Promise<RegisteredUser> => {
  const response = await fetch(`${apiBase()}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  // Registration nests one level deeper than a session does: `data.user`, not `data`.
  const { user } = await unwrap<{ user: AuthProfile }>(response, "REGISTRATION_FAILED");

  return { id: user.id, fullName: user.fullName, email: user.email };
};

/**
 * Signs in.
 *
 * Returns the session alongside the token so the caller does not have to follow up with `/auth/me` — the
 * login response already carries the full profile.
 */
export const loginUser = async (
  payload: SigninPayload,
): Promise<{ token: string; session: Session }> => {
  const response = await fetch(`${apiBase()}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    // Required, and not incidental: this is the response that sets the refresh cookie.
    credentials: "include",
  });

  const session = await unwrap<SessionPayload>(response, "LOGIN_FAILED");

  return { token: session.accessToken, session: toSession(session.user) };
};

/**
 * One rotation of the refresh cookie. Call `refreshSession` instead — this is not safe to run twice.
 *
 * Sends no body and no bearer header: the cookie is the credential. Rejects when there is no live session,
 * which is the normal case for a first-time visitor and not an error.
 */
const rotateRefreshToken = async (): Promise<{ token: string; session: Session }> => {
  const response = await fetch(`${apiBase()}/api/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  const session = await unwrap<SessionPayload>(response, "SESSION_EXPIRED");

  return { token: session.accessToken, session: toSession(session.user) };
};

/** The rotation currently in flight, shared by everyone who asks while it is running. */
let recovery: Promise<{ token: string; session: Session }> | null = null;

/**
 * Exchanges the refresh cookie for a new access token.
 *
 * The only route back after a reload, and the only one that works with no access token in hand.
 *
 * **Overlapping calls must not become overlapping rotations.** A refresh token is spent by using it: the
 * server revokes the presented token, issues a replacement and re-sets the cookie. So of two concurrent
 * calls only the first can succeed — the second arrives holding a token that has just been revoked, and
 * being unable to tell a duplicated request from a stolen one, the server treats it as reuse and answers
 * 401. That is not a rare race. React invokes mount effects twice in development, which fires this twice
 * per page load, and the second call is the one the surviving component is waiting on: the 200 lands in the
 * network tab while the app concludes nobody is signed in.
 *
 * Handing every caller the same promise makes both of them read the same single rotation.
 */
export const refreshSession = (): Promise<{ token: string; session: Session }> => {
  // Cleared once settled, not cached: a later call means a genuinely new rotation is wanted, and a
  // resolved promise kept here would keep handing out an access token long after it expired.
  recovery ??= rotateRefreshToken().finally(() => {
    recovery = null;
  });

  return recovery;
};

/**
 * The signed-in person, read fresh from the database.
 *
 * Takes the token as an argument rather than reading it from context: a caller that has just received a
 * token has not yet re-rendered, so the value in state is a render behind.
 */
export const fetchMe = async (token: string): Promise<Session> => {
  const response = await fetch(`${apiBase()}/api/v1/auth/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });

  return toSession(await unwrap<AuthProfile>(response, "UNAUTHENTICATED"));
};

/**
 * Signs out.
 *
 * Authenticated with the access token, not the cookie: the route is not public, so omitting the header
 * gets a 401 and leaves the refresh token live on the server — signed out in this tab, still signed in
 * everywhere the cookie goes. Failures are swallowed because the local state is cleared regardless; a
 * server that cannot be reached must not strand the user in a session they have already left.
 */
export const logoutUser = async (token: string | null): Promise<void> => {
  try {
    await fetch(`${apiBase()}/api/v1/auth/logout`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });
  } catch {
    // Nothing to recover: the caller clears the session either way.
  }
};

/**
 * Requests a password recovery link.
 */
export const forgotPassword = async (payload: {
  email: string;
  mosqueSlug?: string;
}): Promise<void> => {
  const response = await fetch(`${apiBase()}/api/v1/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new Error(body?.message ?? "Failed to request password reset.");
  }
};

/**
 * Resets password using the one-time token.
 */
export const resetPassword = async (payload: {
  token: string;
  newPassword: string;
}): Promise<void> => {
  const response = await fetch(`${apiBase()}/api/v1/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new Error(
      body?.message ?? "Invalid or expired reset token. Please request a new link.",
    );
  }
};

/**
 * Changes password for the authenticated user.
 */
export const changePassword = async (
  token: string,
  payload: { currentPassword: string; newPassword: string },
): Promise<void> => {
  const response = await fetch(`${apiBase()}/api/v1/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new Error(
      body?.message ??
        "Failed to change password. Please check your current password.",
    );
  }
};

