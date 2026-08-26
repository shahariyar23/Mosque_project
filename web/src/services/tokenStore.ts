/**
 * Where the access token lives between a sign-in and the next request.
 *
 * A module variable, and that is the whole design. The token is deliberately never written to
 * `localStorage` or `sessionStorage` — anything a script can read, an injected script can read too, and
 * a token in web storage survives the tab that earned it. The durable half of the session is the refresh
 * cookie, which is HttpOnly and scoped to `/api/v1/auth`, so no script here can touch it at all. After a
 * reload this store starts empty on purpose and `refreshSession()` is what fills it again.
 *
 * It exists because `apiClient` needs the token on every call and cannot read React state. Importing
 * `auth-provider` there would be circular — the provider imports services. So the provider *pushes* the
 * token here whenever it changes, and the client pulls it.
 *
 * **This is a convenience, not an authority.** Nothing is authorised because a token sits in this
 * variable; the server decides, from the token it receives, on every single request.
 */

let accessToken: string | null = null;

/** Called by `AuthProvider` wherever it sets its own token state, including clearing it on sign-out. */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * What to do when a session cannot be recovered — set by `AuthProvider`, run by `apiClient`.
 *
 * Registered as a callback rather than imported because the reaction is a UI concern (drop the session,
 * send the visitor to `/signin` with a way back) and the client has no router. A no-op default means an
 * unauthenticated response outside a mounted provider is simply an error the caller sees, not a crash.
 */
let onUnauthenticated: (() => void) | null = null;

export function setUnauthenticatedHandler(handler: (() => void) | null): void {
  onUnauthenticated = handler;
}

export function notifyUnauthenticated(): void {
  onUnauthenticated?.();
}
