import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/finance/ui/panel";
import { ButtonLink } from "@/components/finance/ui/button";
import {
  ActivityPanel,
  CommunityPanel,
  QuickActionsPanel,
  UpcomingEventsPanel,
} from "@/components/mosque/overview/overview-panels";
import { PrayerStrip } from "@/components/mosque/prayer/prayer-strip";
import { StatGrid } from "@/components/ui/stat-card";
import { activities } from "@/data/activities";
import { upcomingEvents } from "@/data/events";
import { communityBreakdown, overviewMetrics, quickActions } from "@/data/overview";
import { todaySchedule } from "@/data/prayer-times";
import { mosqueSettings } from "@/data/settings";
import { formatLongDate } from "@/lib/mosque/format";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Overview · Noor Mosque Management",
  description: "Members, volunteers, prayer times, events and recent activity at a glance.",
};

/**
 * The dashboard landing page.
 *
 * A Server Component. Everything on it is static except the prayer countdown, which is the only piece
 * that needs the viewer's own clock — so that one strip is a Client Component and nothing else here
 * ships JavaScript.
 *
 * `/dashboard` had no `page.tsx` before this: the `[...rest]` catch-all is a required catch-all, so it
 * matches `/dashboard/anything` but not `/dashboard` itself, and the index route fell through to a 404.
 */
export default async function OverviewPage() {
  const session = getSession();
  const firstName = session?.user.name.split(" ")[0] ?? "there";
  const mosqueName = session?.user.mosqueName ?? "the mosque";

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Overview"
        subtitle={`Welcome back, ${firstName}. Here's what's happening at ${mosqueName}.`}
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Overview" }]}
        actions={
          <>
            <ButtonLink href="/dashboard/events" variant="secondary" icon="calendar-days">
              Events
            </ButtonLink>
            <ButtonLink href="/dashboard/members" variant="primary" icon="users">
              Members
            </ButtonLink>
          </>
        }
      />

      <StatGrid metrics={overviewMetrics} />

      <Panel>
        <PanelHeader
          title="Today's Prayer Times"
          description={`${formatLongDate(todaySchedule.date)} · ${todaySchedule.hijriDate} · ${todaySchedule.location}`}
          icon="moon"
          actions={
            <ButtonLink href="/dashboard/prayer-times" size="sm" variant="secondary" iconAfter="arrow-right">
              Manage schedule
            </ButtonLink>
          }
        />
        <PanelBody>
          <PrayerStrip
            slots={todaySchedule.slots}
            timeFormat={mosqueSettings.prayer.timeFormat}
            fallbackNextId="asr"
          />
        </PanelBody>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-3">
        <UpcomingEventsPanel events={upcomingEvents(4)} className="xl:col-span-2" />
        <CommunityPanel breakdown={communityBreakdown} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ActivityPanel items={activities.slice(0, 6)} className="xl:col-span-2" />
        <QuickActionsPanel actions={quickActions} />
      </div>
    </div>
  );
}
