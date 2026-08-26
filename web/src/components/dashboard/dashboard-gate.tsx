"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { DashboardSessionProvider } from "@/components/dashboard/session-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { useRequireAuth } from "@/components/auth/route-guards";

/**
 * The gate every dashboard route passes through.
 *
 * Two separate questions, answered in order, because they have different answers:
 *
 *  1. *Is anyone signed in?* If not there is nothing to show and nowhere to appeal — off to `/signin`,
 *     carrying the requested path so the visitor lands where they were headed.
 *  2. *Does this account hold `dashboard.view`?* If not, they are signed in perfectly legitimately and
 *     simply do not work here. That is an explanation, not a redirect loop back to a form they have
 *     already filled in correctly.
 *
 * This runs on the client because the session does. The old version of this gate resolved a demo profile
 * on the server, which meant it always found a session and never turned anyone away.
 *
 * It decides what renders, and it is not what keeps the mosque's data safe. Every request the dashboard
 * makes carries the bearer token and is authorized server-side against that account's permissions. A
 * visitor who forced their way past this gate would get a shell full of 401s.
 */
export function DashboardGate({ children }: { children: ReactNode }) {
  const gate = useRequireAuth();

  // `denied` renders the same holding screen as `pending`: the redirect is already in flight, and
  // flashing "you must sign in" at someone who is about to be shown a sign-in form is noise.
  if (gate.state !== "granted") return <DashboardPending />;

  const { session } = gate;

  if (!session.permissions.includes("dashboard.view")) {
    return <NoDashboardAccess name={session.user.name} isActive={session.user.isActive} />;
  }

  return (
    <DashboardSessionProvider session={session}>
      <DashboardShell>{children}</DashboardShell>
    </DashboardSessionProvider>
  );
}

/**
 * Shown while the session is being recovered from the refresh cookie.
 *
 * Says nothing about the outcome, because at this point the outcome is not known. Anything more
 * confident would be wrong half the time.
 */
function DashboardPending() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f8f6ef] px-4 py-10">
      <div
        className="flex flex-col items-center gap-3 text-[#69726d]"
        role="status"
        aria-live="polite"
      >
        <span
          aria-hidden="true"
          className="h-7 w-7 animate-spin rounded-full border-2 border-[#d8dcd5] border-t-[#0d4d3b]"
        />
        <p className="text-[13px]">Checking your session…</p>
      </div>
    </main>
  );
}

/**
 * For someone signed in who holds no `dashboard.view`.
 *
 * Deliberately outside the dashboard shell — a person without dashboard access should not see the
 * dashboard's navigation, even emptied out. The two wordings split on `isActive` because a deactivated
 * account resolves no permissions at all, so "this area is for staff" would be the wrong explanation for
 * a staff member whose account was switched off.
 */
function NoDashboardAccess({ name, isActive }: { name: string; isActive: boolean }) {
  const firstName = name.split(" ")[0];

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f8f6ef] px-4 py-10">
      <div className="w-full max-w-[440px] rounded-xl border border-[#e2e1d6] bg-white p-6 text-center shadow-[0_18px_44px_-28px_rgba(7,58,45,.3)] sm:p-8">
        <span
          aria-hidden="true"
          className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#f1f4ef] text-[#0d4d3b]"
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3M12 15v2.5" />
          </svg>
        </span>
        <h1 className="mt-4 text-[19px] font-semibold text-[#17211d]">
          {isActive ? "This area is for mosque staff" : "This account is not active"}
        </h1>
        <p className="mt-2 text-[13.5px] leading-6 text-[#69726d]">
          {isActive ? (
            <>
              Salaam {firstName} — your account does not include dashboard access. Your donations,
              bookings and receipts live in your account area.
            </>
          ) : (
            <>
              Salaam {firstName} — this account has been deactivated, so no permissions resolve for
              it. Please contact the mosque office.
            </>
          )}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <Link
            href="/account"
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#0d4d3b] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#073a2d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
          >
            Go to my account
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#d8dcd5] px-4 text-[13px] font-semibold text-[#17211d] transition-colors hover:bg-[#f1f4ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
          >
            Back to the website
          </Link>
        </div>
      </div>
    </main>
  );
}
