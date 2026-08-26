import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardGate } from "@/components/dashboard/dashboard-gate";

export const metadata: Metadata = {
  title: "Dashboard · Noor Mosque Management",
  description: "Mosque administration dashboard — finance, community, prayer times and content.",
};

/**
 * Every dashboard route renders inside this layout, so the gate placed here covers all of them —
 * including any added later, which is the point of putting it in the layout rather than in each page.
 *
 * The layout itself stays a server component purely so it can export `metadata`; the access decision is
 * `DashboardGate`'s, and it has to be a client component. The session is an in-memory access token plus a
 * cookie the API scopes to its own path, so the server rendering this page genuinely cannot tell who is
 * asking. Only the browser can, by calling the API — which is also why there is no `middleware.ts` doing
 * a cookie check ahead of this: there is no cookie here to check.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardGate>{children}</DashboardGate>;
}
