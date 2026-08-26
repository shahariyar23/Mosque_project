"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { fetchMe, logoutUser, refreshSession } from "@/services/authService";
import { setAccessToken, setUnauthenticatedHandler } from "@/services/tokenStore";
import type { Session } from "@/lib/session";

/**
 * Holds the signed-in session for the app.
 *
 * **The access token lives in memory only** — never in `localStorage`, where any script on the page could
 * read it. The cost of that choice is that a reload loses it, so the session is recovered on mount by
 * `POST /auth/refresh`, which authenticates with the HttpOnly refresh cookie instead. That is the one
 * credential a reload survives, and minting a fresh access token from it is exactly what it is for.
 *
 * Consumers must read `token` from here and send it as `Authorization: Bearer <token>`. Protected routes
 * read the token from that header and nowhere else; `credentials: "include"` alone carries only the
 * refresh cookie, which is scoped to `/api/v1/auth` and is not accepted anywhere else.
 */
interface AuthContextValue {
  token: string | null;
  session: Session | null;
  /**
   * True until the mount-time recovery settles.
   *
   * Worth waiting on: before it clears, "no session" and "not yet known" look identical, so a guard that
   * redirects on a null session will bounce a signed-in user off the page they asked for.
   */
  loading: boolean;
  login: (token: string, session?: Session | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  session: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

/**
 * There is deliberately no way to seed a session in from the outside.
 *
 * A `session` prop here would be read as "start signed in as this person", and the only thing available
 * to fill it on the server is the demo profile — which is how every visitor came to look signed in. The
 * signed-in state has exactly one source: the API.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Whether a real sign-in has happened.
   *
   * Guards a race: recovery is already in flight when the provider mounts, and someone can sign in before
   * it comes back. A failed recovery means "there was no previous session", which says nothing about the
   * one just established — so it must not clear it.
   */
  const signedIn = useRef(false);

  /**
   * Sets the token in both places it has to live.
   *
   * React state is what re-renders the app; the module-level store in `tokenStore` is what `apiClient`
   * reads on every request, since a plain function cannot call `useContext`. Two homes for one value is a
   * hazard, so nothing in this file assigns `setToken` directly — they only ever move together.
   */
  const applyToken = useCallback((value: string | null) => {
    setAccessToken(value);
    setToken(value);
  }, []);

  /**
   * What `apiClient` calls when a session cannot be recovered.
   *
   * Only clears state. Redirecting is left to the route guards, which are already watching for a null
   * session and know which page the visitor is on — a redirect fired from here would also yank someone
   * off a public page because a background request happened to expire.
   */
  useEffect(() => {
    setUnauthenticatedHandler(() => {
      signedIn.current = false;
      applyToken(null);
      setSession(null);
      setLoading(false);
    });

    return () => setUnauthenticatedHandler(null);
  }, [applyToken]);

  useEffect(() => {
    let cancelled = false;

    // Recovery goes through `/auth/refresh`, not `/auth/me`. There is no access token yet at this point,
    // so `/auth/me` could only answer 401.
    refreshSession()
      .then(({ token: fresh, session: recovered }) => {
        if (cancelled || signedIn.current) return;
        applyToken(fresh);
        setSession(recovered);
        signedIn.current = true;
      })
      .catch(() => {
        // No live session. The ordinary state for a visitor who has not signed in — not an error, and
        // nothing to clear.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applyToken]);

  /**
   * Records a completed sign-in.
   *
   * The login response already carries the profile, so a session passed in is used as-is and no second
   * round trip happens. When one is not supplied, `fetchMe` is given the token explicitly — reading it
   * back from state here would read the previous render's value, which is still `null`.
   */
  const login = (newToken: string, newSession?: Session | null) => {
    signedIn.current = true;
    applyToken(newToken);
    setLoading(false);

    if (newSession) {
      setSession(newSession);
      return;
    }

    setSession(null);
    void fetchMe(newToken)
      .then(setSession)
      .catch(() => {
        // The token is still good; only the profile is missing. Consumers that need the profile can
        // retry, and clearing the token here would sign the user out over a failed detail fetch.
      });
  };

  const logout = () => {
    // Local state is cleared first and unconditionally: the user asked to leave, so the UI should not
    // depend on the server answering. `logoutUser` revokes the refresh token so the session cannot be
    // recovered on the next load.
    signedIn.current = false;
    const current = token;
    applyToken(null);
    setSession(null);
    void logoutUser(current);
  };

  return (
    <AuthContext.Provider value={{ token, session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
