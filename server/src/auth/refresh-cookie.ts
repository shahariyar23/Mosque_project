import type { CookieOptions, Request, Response } from 'express';

import { env, type AppConfig } from '../config/app.config';
import type { IssuedRefreshToken } from './types/auth.types';

/**
 * Where the refresh token lives on the wire.
 *
 * One place, so that setting the cookie and clearing it cannot disagree. A browser matches
 * `Set-Cookie` deletions on name, path and domain: get any of the three wrong on the way out and the
 * old cookie survives the sign-out, sitting in the jar until it expires. Every write goes through
 * `setRefreshCookie`, every deletion through `clearRefreshCookie`, and both read the same options from
 * the same function.
 */

/**
 * The cookie is scoped to the auth routes, not to the whole API.
 *
 * `/api/v1/auth` means the browser attaches the refresh token to exactly the three requests that need
 * it — sign-in, refresh, sign-out — and to nothing else. Every other endpoint authenticates with the
 * bearer header, so a wider path would ship the most valuable credential in the system alongside every
 * ordinary read for no benefit. The cost is that this string encodes the global prefix and the version:
 * a future `v2` of the auth routes needs its own path, and this constant is where that shows up.
 */
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

/** Express types `cookies` as `any`; this is the narrow view of it that the reader below needs. */
interface RequestWithCookies {
  cookies?: Record<string, unknown>;
}

/**
 * The attributes, minus the value.
 *
 * `httpOnly` is the whole point: no script can read the token, so an XSS bug cannot walk off with a
 * long-lived credential the way it can with anything kept in `localStorage`.
 *
 * `secure` and `sameSite` move together, and have to. In production the frontend is on its own origin,
 * so the cookie has to survive a cross-site request, and a browser only accepts `SameSite=None` when
 * the cookie is also `Secure` — set one without the other and the cookie is silently dropped. In
 * development both live on `localhost`, which is same-site, so `Lax` works over plain HTTP and no
 * certificate is needed to sign in.
 */
export function refreshCookieOptions(config: AppConfig, maxAgeMs?: number): CookieOptions {
  const production = env.isProduction(config);
  const domain = env.cookieDomain(config);

  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? 'none' : 'lax',
    path: REFRESH_COOKIE_PATH,
    // Only when configured. An explicit `undefined` is fine, but an empty string is not: it would be
    // sent as `Domain=`, which browsers reject.
    ...(domain ? { domain } : {}),
    ...(maxAgeMs === undefined ? {} : { maxAge: maxAgeMs }),
  };
}

/**
 * Sends a freshly issued refresh token to the browser.
 *
 * `issued.remember` decides only how long the browser *keeps* the cookie, not how long the token is
 * valid for. With it, the cookie expires when the token does — derived from the token's own `exp`, so
 * the two cannot drift apart, and so a cookie is never left behind pointing at something already dead.
 * Without it, no `Max-Age` is sent at all, which makes it a session cookie: it goes away when the
 * browser does. Either way the row in `refresh_tokens` expires on its own schedule, and the server is
 * the one that decides.
 *
 * The flag is read off the issued token rather than taken as an argument so that a caller cannot forget
 * to pass it through a rotation. The service is the only thing that knows whether this was a sign-in or
 * a refresh; by the time a token exists, the answer is already baked into it.
 */
export function setRefreshCookie(
  response: Response,
  config: AppConfig,
  issued: IssuedRefreshToken,
): void {
  const maxAgeMs = issued.remember
    ? Math.max(0, issued.expiresAt.getTime() - Date.now())
    : undefined;

  response.cookie(
    env.refreshCookieName(config),
    issued.token,
    refreshCookieOptions(config, maxAgeMs),
  );
}

/**
 * Removes the cookie.
 *
 * Unconditional, and called on every sign-out whether or not a token was found to revoke. Clearing the
 * browser's copy and revoking the server's record are two different jobs, and the one that can fail is
 * not this one — if the presented token was already spent there is nothing to revoke, but the cookie
 * still has to go.
 */
export function clearRefreshCookie(response: Response, config: AppConfig): void {
  response.clearCookie(env.refreshCookieName(config), refreshCookieOptions(config));
}

/**
 * Reads the token out of the cookie jar.
 *
 * Shared by the refresh strategy, which needs it to verify a signature, and the service, which needs it
 * to find the matching row. Deliberately the only way either gets at the raw token: it is never copied
 * onto `request.user`, so nothing downstream — a controller, an interceptor, the logger — is in a
 * position to serialise it by accident.
 *
 * Returns `null` rather than throwing. A missing cookie is an unauthenticated request, which the guard
 * turns into a 401; it is not an error this function knows how to describe.
 */
export function refreshTokenFrom(request: Request, cookieName: string): string | null {
  const jar = (request as RequestWithCookies).cookies;
  const value = jar?.[cookieName];

  return typeof value === 'string' && value.length > 0 ? value : null;
}
