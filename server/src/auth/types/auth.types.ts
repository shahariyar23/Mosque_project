import type { Prisma } from '@prisma/client';

/**
 * The shapes the auth module shares between its strategy, service, controller and tests.
 *
 * `AccessTokenPayload` is not here — it already exists in `access-token-payload.ts` and is the contract
 * the access-token strategy verifies. This file holds the refresh side of that contract and the two
 * internal selects that only this module is allowed to make.
 */

/**
 * What a refresh token carries.
 *
 * `jti` exists so that two tokens issued to the same person in the same second are different strings.
 * Without it the payload would be `{ sub, iat, exp }` for both, the signature would be identical, and
 * the second insert would collide on `RefreshToken.tokenHash` — a unique index doing the wrong job.
 *
 * Nothing about authority is in here for the same reason it is absent from the access token: a refresh
 * token is a claim to *be someone*, and what that someone may do is read from their row.
 */
export interface RefreshTokenPayload {
  /** The user id. */
  sub: string;
  /** A per-token random id, which is what makes each signed token unique. */
  jti: string;
  /**
   * Whether the browser was asked to keep the cookie across restarts.
   *
   * A UI preference, not authority — but it has to survive rotation, and a cookie cannot report its own
   * attributes back. Carrying it in the signed token is what stops "keep me signed in" from quietly
   * becoming "until you close the tab" the first time the token is refreshed, and signing it means a
   * client cannot extend its own cookie by editing one.
   */
  remember?: boolean;
  iat?: number;
  exp?: number;
}

/**
 * The only select in this codebase that reads `passwordHash`.
 *
 * The users module deliberately cannot do this: `USER_SELECT` omits the column so that no user
 * endpoint is in a position to return it even by accident. Verifying a password is the one operation
 * that genuinely needs it, so the read lives here, in the module that owns credentials, and the hash
 * never leaves `AuthService.login`.
 */
export const CREDENTIAL_SELECT = {
  id: true,
  mosqueId: true,
  email: true,
  isActive: true,
  passwordHash: true,
} satisfies Prisma.UserSelect;

export type CredentialRow = Prisma.UserGetPayload<{ select: typeof CREDENTIAL_SELECT }>;

/**
 * The columns a verified token turns into a request subject.
 *
 * The same set the access-token strategy reads, shared so the two strategies cannot drift into
 * answering different questions about the same person.
 */
export const SUBJECT_SELECT = {
  id: true,
  mosqueId: true,
  email: true,
  role: true,
  permissions: true,
  deniedPermissions: true,
  isActive: true,
} satisfies Prisma.UserSelect;

/** Where a session was created from. Recorded for the session list, never used for a decision. */
export interface SessionOrigin {
  userAgent?: string;
  ipAddress?: string;
}

/** A freshly signed refresh token and the row that now records it. */
export interface IssuedRefreshToken {
  /** The signed token. Goes into the cookie and nowhere else. */
  token: string;
  /** The `RefreshToken` row id, used to link a rotation chain. */
  id: string;
  /** When the token stops being valid, read back off the signed payload. */
  expiresAt: Date;
  /** Whether the cookie should outlive the browser session. Carried through rotation, not re-asked. */
  remember: boolean;
}
