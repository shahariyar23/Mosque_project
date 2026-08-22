import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardSessionProvider } from "@/components/dashboard/session-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ResetDemoProfile } from "@/components/dashboard/profile-switcher";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Dashboard · Noor Mosque Management",
  description: "Mosque administration dashboard — finance, community, prayer times and content.",
};

/**
 * The single gate for every dashboard route.
 *
 * Spec 0003 puts the permission resolution here and nowhere else: one server-side call per request,
 * the result passed down as props. Reading the session cookie makes these routes dynamic, which is
 * correct — a per-request dashboard cannot be statically cached.
 *
 * Two branches are stubs by necessity, because the brief for this branch forbids implementing
 * authentication and neither destination route exists yet:
 *
 *  - no session → AC-4 sends the visitor to `/signin?next=…`. Until `/signin` exists, the demo
 *    always resolves a session, so this branch is unreachable rather than wrong.
 *  - no `dashboard.view` → AC-3 sends them to `/account`. Until the member area exists, the panel
 *    below explains it in place. The suspended-treasurer profile lands here, which is how the
 *    `isActive` rule stays visible rather than theoretical.
 *
 * The spec also asks for a `middleware.ts` doing the cookie check before the layout renders. That is
 * an auth concern, so it lands with `/signin`; this gate is what enforces access in the meantime.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect(`/signin?next=${encodeURIComponent("/dashboard")}`);
  }

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
 * Stands in for the `/account` redirect. Deliberately outside the dashboard shell — someone without
 * `dashboard.view` should not see the dashboard's own navigation, even emptied out.
 */
function NoDashboardAccess({ name, isActive }: { name: string; isActive: boolean }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f8f6ef] px-4 py-10">
      <div className="w-full max-w-[440px] rounded-xl border border-[#e2e1d6] bg-white p-6 text-center shadow-[0_18px_44px_-28px_rgba(7,58,45,.3)] sm:p-8">
        <span
          aria-hidden="true"
          className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#f1f4ef] text-[#0d4d3b]"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3M12 15v2.5" />
          </svg>
        </span>
        <h1 className="mt-4 text-[19px] font-semibold text-[#17211d]">
          {isActive ? "This area is for mosque staff" : "This account is not active"}
        </h1>
        <p className="mt-2 text-[13.5px] leading-6 text-[#69726d]">
          {isActive ? (
            <>
              Salaam {name.split(" ")[0]} — your account does not include dashboard access. Your
              donations, bookings and receipts will live in your account area.
            </>
          ) : (
            <>
              Salaam {name.split(" ")[0]} — this account has been deactivated, so no permissions
              resolve for it. Please contact the mosque office.
            </>
          )}
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex min-h-10 items-center justify-center rounded-md bg-[#0d4d3b] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#073a2d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
        >
          Back to the website
        </Link>

        <div className="mt-6 border-t border-[#eceae0] pt-4">
          <p className="text-[11px] leading-5 text-[#8b938d]">
            Demo only — you are previewing the permission model, not signed in.
          </p>
          <div className="mt-2.5">
            <ResetDemoProfile />
          </div>
        </div>
      </div>
    </main>
  );
}
