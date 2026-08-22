import Link from "next/link";
import { ButtonLink } from "@/components/finance/ui/button";
import { Icon, type IconName } from "@/components/finance/ui/icon";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { FinanceEmptyState } from "@/components/finance/ui/states";
import { ActivityTimeline } from "@/components/ui/activity-timeline";
import { DonutChart, SplitBar } from "@/components/ui/charts";
import { EventCategoryChip } from "@/components/ui/status-badge";
import { InlineStat } from "@/components/ui/stat-card";
import { formatClockTime, formatCount, formatDayMonth, formatRelativeDay, formatWeekdayShort } from "@/lib/mosque/format";
import type { ActivityItem, CommunityBreakdown, MosqueEvent } from "@/lib/mosque/types";

/* -------------------------------------------------------------------------- *
 * Upcoming events
 * -------------------------------------------------------------------------- */

/**
 * The next few programmes. A calendar block on the left rather than a date string, because the thing
 * an administrator scans this list for is "when", and a two-line block reads faster than a sentence.
 */
export function UpcomingEventsPanel({ events, className = "" }: { events: MosqueEvent[]; className?: string }) {
  return (
    <Panel className={className}>
      <PanelHeader
        title="Upcoming Events"
        description="The next programmes on the mosque calendar."
        icon="calendar-days"
        actions={
          <ButtonLink href="/dashboard/events" size="sm" variant="secondary" iconAfter="arrow-right">
            All events
          </ButtonLink>
        }
      />
      {events.length === 0 ? (
        <FinanceEmptyState
          icon="calendar-days"
          title="No upcoming events."
          description="Nothing is scheduled yet. Create an event to open it for registration."
          action={<ButtonLink href="/dashboard/events" icon="plus">Create Event</ButtonLink>}
        />
      ) : (
        <ul className="divide-y divide-[#f0efe6]">
          {events.map((event) => (
            <li key={event.id} className="flex gap-3.5 px-4 py-4 transition-colors hover:bg-[#fbfaf5] sm:gap-4 sm:px-6">
              <div
                aria-hidden="true"
                className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border border-[#e3ce9d] bg-[#f7f0df] text-center"
              >
                <div>
                  <p className="text-[18px] font-semibold leading-none tabular-nums text-[#7d5f18]">
                    {event.date.slice(8, 10)}
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-[#a97b23]">
                    {formatWeekdayShort(event.date)}
                  </p>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                  <h3 className="min-w-0 text-[14px] font-semibold leading-5 text-[#17211d]">
                    <Link
                      href="/dashboard/events"
                      className="rounded underline-offset-2 transition-colors hover:text-[#0d4d3b] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
                    >
                      {event.title}
                    </Link>
                  </h3>
                  <EventCategoryChip category={event.category} />
                </div>

                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-[#69726d]">
                  <span className="inline-flex items-center gap-1">
                    <Icon name="calendar" size={13} />
                    {formatDayMonth(event.date)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="clock" size={13} />
                    {event.timeLabel ?? formatClockTime(event.startTime)}
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <Icon name="map-pin" size={13} />
                    <span className="truncate">{event.location}</span>
                  </span>
                </p>

                <p className="mt-1.5 text-[12px] text-[#8b938d]">
                  {event.registrationRequired ? (
                    <>
                      <span className="font-semibold tabular-nums text-[#3d453f]">
                        {formatCount(event.registered)}
                      </span>{" "}
                      of {formatCount(event.capacity)} places taken
                    </>
                  ) : (
                    <>Open to all — no registration needed</>
                  )}
                  <span aria-hidden="true"> · </span>
                  {formatRelativeDay(event.date)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- *
 * Community
 * -------------------------------------------------------------------------- */

export function CommunityPanel({ breakdown, className = "" }: { breakdown: CommunityBreakdown; className?: string }) {
  return (
    <Panel className={className}>
      <PanelHeader title="Community Overview" description="Who is on the register this month." icon="users" />
      <PanelBody className="space-y-5">
        <DonutChart
          centerValue={formatCount(breakdown.total)}
          centerLabel="Members"
          segments={[
            { label: "Male", value: breakdown.male },
            { label: "Female", value: breakdown.female },
          ]}
        />

        <div className="grid grid-cols-2 gap-2.5">
          <InlineStat
            label="New this month"
            value={formatCount(breakdown.newThisMonth)}
            icon="user-plus"
            tone="positive"
          />
          <InlineStat
            label="Active volunteers"
            value={formatCount(breakdown.activeVolunteers)}
            icon="hands-heart"
            tone="gold"
          />
        </div>

        <div className="border-t border-[#eceae0] pt-4">
          <h3 className="text-[11px] font-bold uppercase tracking-[.14em] text-[#8b938d]">By age</h3>
          <div className="mt-3">
            <SplitBar
              label="Members by age band"
              segments={breakdown.ageBands.map((band) => ({ label: band.label, value: band.count }))}
            />
          </div>
        </div>
      </PanelBody>
      <PanelFooter>
        <p className="text-[12px] text-[#69726d]">Register totals across the whole community.</p>
        <ButtonLink href="/dashboard/members" size="sm" variant="ghost" iconAfter="arrow-right">
          Open members
        </ButtonLink>
      </PanelFooter>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- *
 * Activity
 * -------------------------------------------------------------------------- */

export function ActivityPanel({ items, className = "" }: { items: ActivityItem[]; className?: string }) {
  return (
    <Panel className={className}>
      <PanelHeader title="Recent Activity" description="What has changed across the mosque lately." icon="list" />
      {items.length === 0 ? (
        <FinanceEmptyState
          icon="list"
          title="Nothing has happened yet."
          description="Activity from members, events, volunteers and the prayer schedule will appear here."
        />
      ) : (
        <PanelBody>
          <ActivityTimeline items={items} />
        </PanelBody>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- *
 * Quick actions
 * -------------------------------------------------------------------------- */

type QuickAction = { id: string; label: string; description: string; href: string; icon: IconName };

/**
 * Four shortcuts. Real links to the page that owns each action, carrying an `action` query parameter
 * the destination reads to open its own form — so there is exactly one "add member" dialog in the
 * codebase and this panel does not own a second copy of it.
 */
export function QuickActionsPanel({
  actions,
  className = "",
}: {
  actions: ReadonlyArray<QuickAction>;
  className?: string;
}) {
  return (
    <Panel className={className}>
      <PanelHeader title="Quick Actions" description="The things you came here to do." icon="sparkle" />
      <PanelBody>
        <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
          {actions.map((action) => (
            <li key={action.id}>
              <Link
                href={action.href}
                className="group flex items-center gap-3 rounded-lg border border-[#e2e1d6] bg-white px-3.5 py-3 transition-colors hover:border-[#0d4d3b] hover:bg-[#f7faf6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#c2d8cb] bg-[#eaf2ed] text-[#0d4d3b]">
                  <Icon name={action.icon} size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-[#17211d]">{action.label}</span>
                  <span className="block truncate text-[12px] text-[#69726d]">{action.description}</span>
                </span>
                <Icon
                  name="chevron-right"
                  size={16}
                  className="shrink-0 text-[#a9b0aa] transition-colors group-hover:text-[#0d4d3b]"
                />
              </Link>
            </li>
          ))}
        </ul>
      </PanelBody>
    </Panel>
  );
}
