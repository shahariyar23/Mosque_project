"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import type { Session } from "@/lib/session";

/**
 * Client-side route guards.
 *
 * These have to run on the client, and that is a consequence of where the session lives rather than a
 * shortcut. The access token is held in memory and the refresh token is an HttpOnly cookie scoped to the
 * API's own `/api/v1/auth` path — so nothing on the web origin, middleware included, can see whether the
 * visitor is signed in. Only the browser can, by asking the API.
 *
 * **This is navigation, not authorization.** A guard here decides what to render; it cannot decide what
 * the visitor is allowed to have. Every protected read is authorized on the server, by the bearer token,
 * against that account's permissions. Someone who edits their way past one of these guards reaches a page
 * whose requests all answer 401 — which is the point. Treating a client-side check as the security
 * boundary would be the mistake; treating it as the reason a signed-out visitor sees a sign-in form
 * instead of a broken dashboard is what it is for.
 */

/**
 * Narrows a redirect target to something that cannot leave the app.
 *
 * `next` comes from the query string, which is to say from whoever wrote the link. Handing it to
 * `router.replace` unchecked is an open redirect, and a `javascript:` URL there executes in the page —
 * Next's own router reference warns about exactly this. So the bar is: one leading slash, and nothing a
 * browser would resolve as a new origin. `//evil.test` and `/\evil.test` both read as protocol-relative
 * URLs, so both are refused.
 */
export function safeInternalPath(candidate: string | null): string | null {
  if (!candidate || !candidate.startsWith("/")) return null;
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return null;
  return candidate;
}

/** Where the visitor is now, query and fragment included, ready to hand back as `?next=`. */
function currentPath(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

/** The routes a signed-in visitor is bounced off, and therefore may never be bounced *to*. */
const GUEST_ONLY = ["/signin", "/signup"];

/**
 * The vetted `next` target, read straight from `window.location`.
 *
 * Deliberately not `useSearchParams`: that hook marks the tree as reading URL data, so a prerendered
 * route needs a `Suspense` boundary around it or Next complains at build time. This is only ever called
 * from inside an effect, where `window` exists and no boundary is needed.
 *
 * A target pointing back at a guest-only route is dropped. `/signin?next=/signin` would otherwise redirect
 * a signed-in visitor to the page they were just sent away from, over and over.
 */
function readNextParam(): string | null {
  const target = safeInternalPath(new URLSearchParams(window.location.search).get("next"));
  if (target === null) return null;

  const path = target.split(/[?#]/)[0];

  return GUEST_ONLY.includes(path) ? null : target;
}

export type AuthGate =
  | { state: "pending"; session: null }
  | { state: "denied"; session: null }
  | { state: "granted"; session: Session };

/**
 * Requires a signed-in visitor, sending anyone else to `/signin` with a way back.
 *
 * Returns a three-state answer rather than a boolean, because "not signed in" and "we do not know yet"
 * are different and collapsing them is what makes guards flicker. Recovery from the refresh cookie is a
 * round trip; until it settles the honest answer is `pending`, and a caller that rendered a sign-in
 * prompt during it would bounce a signed-in visitor off the page they asked for.
 */
export function useRequireAuth(): AuthGate {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || session) return;
    router.replace(`/signin?next=${encodeURIComponent(currentPath())}`);
  }, [loading, session, router]);

  if (loading) return { state: "pending", session: null };
  if (!session) return { state: "denied", session: null };

  return { state: "granted", session };
}

/**
 * Shown while the answer to "is anyone signed in" is still a round trip away.
 *
 * A page reload starts with no access token in memory — it was deliberately never persisted — so for the
 * length of one `/auth/refresh` call the app genuinely does not know. Rendering the sign-in form during
 * that window tells a signed-in visitor they are signed out and then yanks the page out from under them.
 */
function SessionPending() {
  return (
    <div
      className="grid min-h-screen place-items-center bg-[#0b2b22] px-6 text-white"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <span
          className="h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-[#e0be79]"
          aria-hidden="true"
        />
        <p className="text-sm text-white/70">Checking your session…</p>
      </div>
    </div>
  );
}

/**
 * Keeps a signed-in visitor off the sign-in and sign-up pages.
 *
 * Waits for the session to settle before rendering anything, and renders nothing but the pending state for
 * as long as a session exists. The alternative — show the form at once and redirect a beat later — is what
 * let a signed-in visitor sit on `/signin` looking at a form they had no business seeing, so the brief wait
 * is the requirement rather than a cost.
 *
 * One consequence worth knowing: this also fires for a sign-in completed *on this page*, so the form's
 * success screen is passed over and the visitor lands on `next` (or the homepage) already signed in. The
 * navbar changing to their avatar is the confirmation. Distinguishing "arrived signed in" from "just signed
 * in" would need a value latched across renders, and a ref cannot be read during render.
 */
export function RequireGuest({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !session) return;
    router.replace(readNextParam() ?? "/");
  }, [loading, session, router]);

  if (loading || session) return <SessionPending />;

  return <>{children}</>;
}
