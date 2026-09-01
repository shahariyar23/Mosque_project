"use client";

import { ButtonLink } from "@/components/finance/ui/button";
import { DecimalNetMoney } from "@/components/finance/ui/money";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { FinanceCardSkeleton, FinanceSummarySkeleton } from "@/components/finance/ui/skeleton";
import { FinanceErrorState, InlineNotice } from "@/components/finance/ui/states";
import { MiniStat } from "@/components/finance/ui/summary-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { QuickActionsPanel } from "@/components/mosque/overview/overview-panels";
import { PrayerStrip } from "@/components/mosque/prayer/prayer-strip";
import { InlineStat, StatGrid } from "@/components/ui/stat-card";
import { useResource } from "@/components/ui/use-resource";
import type { IconName } from "@/components/finance/ui/icon";
import { formatDecimal, isNegativeDecimal } from "@/lib/finance/decimal";
import { formatClockTime, formatCount, formatLongDate, getTodayInTimezone, pluralise } from "@/lib/mosque/format";
import { DAILY_PRAYER_IDS, toPrayerSlot } from "@/lib/mosque/prayer-display";
import type { StatMetric } from "@/lib/mosque/types";
import type { Permission } from "@/lib/permissions";
import { fetchDashboardOverview, type DashboardOverview as OverviewData } from "@/services/dashboardService";
import type { FinancialSummary, ReportRange } from "@/services/financialReportsService";
import type { Jumuah } from "@/services/jumuahService";
import { fetchRamadanSchedules } from "@/services/ramadanService";

/**
 * The dashboard landing page.
 *
 * One `GET /dashboard/overview` for the whole page. It is a client component because the access token
 * lives in React memory — the server rendering this route cannot authenticate, so it cannot fetch.
 *
 * **The rule this page is built around: a block the response returns as `null` is one this person may not
 * see, and is never rendered as `0`.** Most of the figures here are money and headcounts; a zero in place
 * of "you don't have access to this" is a wrong fact, not a neutral placeholder. `events` and `content`
 * are the same case one step further out — they come back `tracked: false` because there are no event,
 * article or khutbah tables in this schema, so they say so rather than showing "0 upcoming".
 *
 * Everything on screen is a figure the database computed. Nothing is summed here, and there are no
 * period-on-period deltas: the response has no previous-period field, so a "+8.4% this month" badge could
 * only be invented.
 */
export function DashboardOverview() {
  const { user, can } = useDashboardSession();

  // `fetchDashboardOverview` takes no arguments and is a module function, so its identity is already
  // stable — no `useCallback` needed for the hook's dependency on it.
  const { data, error, initialising, reload } = useResource(fetchDashboardOverview);

  const firstName = user?.name.split(" ")[0] ?? "there";
  const mosqueName = user?.mosqueName ?? "the mosque";

  const header = (
    <PageHeader
      title="Overview"
      subtitle={`Welcome back, ${firstName}. Here's what's happening at ${mosqueName}.`}
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Overview" }]}
      actions={
        <>
          <ButtonLink href="/dashboard/users" variant="secondary" icon="users">
            Users
          </ButtonLink>
          <ButtonLink href="/dashboard/finance" variant="primary" icon="wallet">
            Finance
          </ButtonLink>
        </>
      }
    />
  );

  if (initialising) {
    return (
      <div className="space-y-4 sm:space-y-5">
        {header}
        <OverviewSkeleton />
      </div>
    );
  }

  // Only when there is nothing to show. A failed *reload* keeps the last good figures on screen and
  // reports the failure above them, because blanking a page that was working is the worse outcome.
  if (!data) {
    return (
      <div className="space-y-4 sm:space-y-5">
        {header}
        <Panel>
          <FinanceErrorState
            title="Unable to load the overview."
            description={error ?? "Something went wrong while loading this page. Please try again."}
            onRetry={reload}
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {header}

      {error ? (
        <InlineNotice icon="alert" tone="danger">
          {error} The figures below are the last ones that loaded.
        </InlineNotice>
      ) : null}

      {data.users ? (
        <StatGrid metrics={userMetrics(data.users)} />
      ) : null}

      {data.finance ? <FinancePanel finance={data.finance} /> : null}

      {data.prayer ? (
        <PrayerPanel prayer={data.prayer} canManage={can("prayer.manage")} />
      ) : can("prayer.view") ? (
        <InlineNotice icon="alert" tone="gold">
          Today&apos;s prayer times could not be calculated. They need the mosque&apos;s coordinates on its
          profile, and the calculation service has to be reachable — the prayer times screen explains which
          of the two is missing.
        </InlineNotice>
      ) : null}

      {can("prayer.view") ? <JumuahPanel jumuah={data.jumuah} /> : null}

      {can("prayer.view") ? <RamadanPanel timezone={data.prayer?.timezone} /> : null}

      <div className="grid gap-4 xl:grid-cols-3">
        {data.approvals ? (
          <Panel className="xl:col-span-2">
            <PanelHeader
              title="Approvals"
              description="Requests waiting on a decision."
              icon="clipboard-check"
              actions={
                <ButtonLink href="/dashboard/finance" size="sm" variant="secondary" iconAfter="arrow-right">
                  Open the queue
                </ButtonLink>
              }
            />
            <PanelBody>
              {data.approvals.pending === 0 ? (
                <p className="text-[13.5px] leading-6 text-[#69726d]">
                  Nothing is waiting. New requests appear here as they are raised.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <InlineStat
                    label="Pending"
                    value={formatCount(data.approvals.pending)}
                    hint={`${pluralise(data.approvals.pending, "request")} raised and not yet decided`}
                    icon="clipboard-check"
                    tone="warning"
                  />
                  {/*
                    Deciding needs `workflow.approve`; the treasurer and secretary hold `workflow.review`,
                    which raises requests but cannot approve them. So the count is shown to everyone who
                    may see the queue, and the wording does not promise a decision they cannot make.
                  */}
                  <p className="max-w-sm text-[13px] leading-6 text-[#69726d]">
                    {can("workflow.approve")
                      ? "Open the queue to approve or reject each one."
                      : "An approver has to decide these — you can follow their progress in the queue."}
                  </p>
                </div>
              )}
            </PanelBody>
          </Panel>
        ) : null}

        <QuickActionsPanel
          actions={quickActions.filter((action) => can(action.permission))}
          className={data.approvals ? "" : "xl:col-span-3"}
        />
      </div>

      {data.events.tracked || data.content.tracked ? <TrackedCountsPanel data={data} /> : null}

      <UntrackedNotice events={data.events.tracked} content={data.content.tracked} />

      <HiddenBlocksNotice data={data} />

      <p className="text-[12px] leading-5 text-[#8b938d]">
        Every figure on this page was calculated by the server at {formatInstant(data.generatedAt)}.{" "}
        <button
          type="button"
          onClick={reload}
          className="font-semibold text-[#0d4d3b] underline decoration-dotted underline-offset-2 hover:text-[#073a2d]"
        >
          Refresh
        </button>
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Community
 * -------------------------------------------------------------------------- */

/**
 * Three counts, no deltas.
 *
 * `StatMetric.change` is left off on purpose: the response has one number per figure and no previous
 * period to compare it against, so a trend badge here would be decoration standing in for data.
 */
function userMetrics(users: NonNullable<OverviewData["users"]>): StatMetric[] {
  return [
    {
      id: "accounts",
      label: "Accounts",
      value: formatCount(users.total),
      hint: "Everyone who can sign in to run the mosque",
      icon: "users",
      tone: "neutral",
    },
    {
      id: "active",
      label: "Active accounts",
      value: formatCount(users.active),
      hint: "Not suspended, and not deleted",
      icon: "user",
      tone: "positive",
    },
    {
      id: "volunteers",
      label: "Volunteers",
      value: formatCount(users.volunteers),
      hint: "On a service team",
      icon: "hands-heart",
      tone: "gold",
    },
  ];
}

/* -------------------------------------------------------------------------- *
 * Finance
 * -------------------------------------------------------------------------- */

/**
 * The same object `/financial-reports/summary` returns.
 *
 * Every amount is a decimal string printed by `formatDecimal`, which groups digits without parsing them.
 * Nothing is added up here — a headline total is the server's aggregate, so the panel cannot disagree with
 * the ledger it describes.
 *
 * The currency comes from the mosque's settings and is stated once in the panel description, which is why
 * the figures are printed with `currency: false` rather than stamped with ৳.
 */
function FinancePanel({ finance }: { finance: FinancialSummary }) {
  const money = (value: string | null) => formatDecimal(value, { currency: false });

  return (
    <Panel>
      <PanelHeader
        title="Finances"
        description={`${describeRange(finance.range)} · all figures in ${finance.currency}`}
        icon="wallet"
        actions={
          <ButtonLink href="/dashboard/finance/reports" size="sm" variant="secondary" iconAfter="arrow-right">
            Reports
          </ButtonLink>
        }
      />
      <PanelBody>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat
            label="Donations received"
            value={money(finance.donations.total)}
            hint={`${formatCount(finance.donations.count)} completed`}
            icon="gift"
            tone="positive"
          />
          <MiniStat
            label="Expenses paid"
            value={money(finance.expenses.total)}
            hint={`${formatCount(finance.expenses.count)} paid`}
            icon="receipt"
            tone="negative"
          />
          <MiniStat
            label="Salaries paid"
            value={money(finance.salaries.total)}
            hint={`${formatCount(finance.salaries.count)} paid`}
            icon="banknote"
            tone="neutral"
          />
          <MiniStat
            label="Budgeted"
            value={money(finance.budget.total)}
            hint={describeRemaining(finance.budget.remaining)}
            icon="scale"
            tone="gold"
          />
        </div>
      </PanelBody>
      <PanelFooter>
        <p className="text-[13px] leading-6 text-[#69726d]">
          Net balance — donations less expenses and salaries.
        </p>
        <p className="text-[20px]">
          <DecimalNetMoney value={finance.netBalance} currency={false} />{" "}
          <span className="text-[13px] font-normal text-[#69726d]">{finance.currency}</span>
        </p>
      </PanelFooter>
    </Panel>
  );
}

/** `null` at either end is unbounded, so the window is described rather than printed as a date pair. */
function describeRange(range: ReportRange): string {
  const from = range.from ? formatLongDate(range.from) : null;
  const to = range.to ? formatLongDate(range.to) : null;

  if (from && to) return `${from} – ${to}`;
  if (from) return `Since ${from}`;
  if (to) return `Up to ${to}`;
  return "All time";
}

/**
 * What is left of the plan.
 *
 * `null` means no active budget overlaps the window — there is nothing to have a remainder of, and
 * `"0.00"` would read as "fully spent". Negative means the plan has been overspent, so the figure is
 * printed unsigned against the word "over" instead of as a minus.
 */
function describeRemaining(remaining: string | null): string {
  if (remaining === null) return "No active budget for this period";

  const amount = formatDecimal(remaining, { currency: false });
  return isNegativeDecimal(remaining) ? `${amount} over the plan` : `${amount} left to spend`;
}

/* -------------------------------------------------------------------------- *
 * Prayer times
 * -------------------------------------------------------------------------- */

/**
 * Today's five adhan times.
 *
 * The overview sends `{ fajr: "04:18", … }` and no more — no iqamah, and no "next prayer", since the
 * server has no way to know what time it is where the reader is sitting. So the labels come from the
 * shared display map and `PrayerStrip` works the highlight out from the client clock on mount.
 */
function PrayerPanel({
  prayer,
  canManage,
}: {
  prayer: NonNullable<OverviewData["prayer"]>;
  canManage: boolean;
}) {
  return (
    <Panel>
      <PanelHeader
        title="Today's prayer times"
        description={`${formatLongDate(prayer.date)} · ${prayer.timezone} · adhan times only`}
        icon="moon"
        actions={
          <ButtonLink href="/dashboard/prayer-times" size="sm" variant="secondary" iconAfter="arrow-right">
            {canManage ? "Manage schedule" : "Full schedule"}
          </ButtonLink>
        }
      />
      <PanelBody>
        {/*
          `showIqamah={false}` because this response carries the calculated adhan times and nothing else.
          Iqamah is a time the mosque decides and lives on the prayer-times screen; rendering the row here
          would leave five empty lines.

          `fallbackNextId` is the first prayer of the day. It highlights something on the first frame,
          before the client clock is available, and `PrayerStrip` replaces it with the real answer on mount.
        */}
        <PrayerStrip
          slots={DAILY_PRAYER_IDS.map((id) => toPrayerSlot(id, prayer.timings[id]))}
          fallbackNextId="fajr"
          showIqamah={false}
        />
      </PanelBody>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- *
 * Jumu'ah
 * -------------------------------------------------------------------------- */

/**
 * The Friday khutbah and jamaat.
 *
 * `date: null` is not a missing value — it is the standing weekly schedule, the one that holds for every
 * Friday without an entry of its own. `imam` and `location` are genuinely nullable, and an unrecorded
 * imam is shown as unrecorded rather than filled in with a plausible name.
 */
function JumuahPanel({ jumuah }: { jumuah: Jumuah | null }) {
  return (
    <Panel>
      <PanelHeader
        title="Jumu'ah"
        description={jumuah ? (jumuah.date ? formatLongDate(jumuah.date) : "Standing weekly schedule") : undefined}
        icon="mosque"
        actions={
          <ButtonLink href="/dashboard/jumuah" size="sm" variant="secondary" iconAfter="arrow-right">
            Jumu&apos;ah schedule
          </ButtonLink>
        }
      />
      <PanelBody>
        {jumuah ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <InlineStat label="Khutbah" value={formatClockTime(jumuah.khutbahTime)} icon="book" />
              <InlineStat label="Jamaat" value={formatClockTime(jumuah.prayerTime)} icon="mosque" tone="positive" />
              <InlineStat label="Imam" value={jumuah.imam ?? "Not recorded"} icon="user" />
              <InlineStat label="Location" value={jumuah.location ?? "Not recorded"} icon="map-pin" />
            </div>
            {jumuah.notes ? (
              <p className="mt-3 text-[13px] leading-6 text-[#69726d]">{jumuah.notes}</p>
            ) : null}
          </>
        ) : (
          <p className="text-[13.5px] leading-6 text-[#69726d]">
            No Jumu&apos;ah schedule has been recorded yet. Add one and it will show here and on the public
            site.
          </p>
        )}
      </PanelBody>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- *
 * Ramadan
 * -------------------------------------------------------------------------- */

/**
 * Fasting and prayer schedule for Ramadan.
 *
 * Uses `useResource` with `fetchRamadanSchedules` to fetch the real backend data unpaginated.
 * Resolves today's schedule against the mosque's configured timezone, or displays the next upcoming fast.
 */
function RamadanPanel({ timezone = "Asia/Dhaka" }: { timezone?: string }) {
  const { data: schedules, error, initialising, reload } = useResource(fetchRamadanSchedules);

  if (initialising) {
    return (
      <Panel>
        <PanelHeader title="Ramadan" description="Loading daily schedule..." icon="moon" />
        <PanelBody>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FinanceCardSkeleton />
            <FinanceCardSkeleton />
            <FinanceCardSkeleton />
            <FinanceCardSkeleton />
          </div>
        </PanelBody>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel>
        <PanelHeader
          title="Ramadan"
          icon="moon"
          actions={
            <ButtonLink href="/dashboard/ramadan" size="sm" variant="secondary" iconAfter="arrow-right">
              Ramadan schedule
            </ButtonLink>
          }
        />
        <PanelBody>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-[#991b1b]">Unable to load Ramadan schedule.</p>
            <button
              type="button"
              onClick={reload}
              className="text-[12.5px] font-medium text-[#0d4d3b] underline decoration-dotted underline-offset-2 hover:text-[#073a2d]"
            >
              Try again
            </button>
          </div>
        </PanelBody>
      </Panel>
    );
  }

  const sorted = [...(schedules || [])].sort((a, b) => a.date.localeCompare(b.date));
  const schedulesWithDay = sorted.map((item, idx) => ({ ...item, dayNumber: idx + 1 }));

  const todayMosque = getTodayInTimezone(timezone);
  const todaySchedule = schedulesWithDay.find((s) => s.date === todayMosque);
  const nextSchedule = schedulesWithDay.find((s) => s.date >= todayMosque) || schedulesWithDay[0];
  const activeSchedule = todaySchedule || nextSchedule;

  const titleDescription = activeSchedule
    ? `${todaySchedule ? "Today's fast" : "Upcoming fast"} · ${formatLongDate(activeSchedule.date)} · ${activeSchedule.year} AH`
    : schedulesWithDay.length > 0
    ? `${schedulesWithDay.length} days configured`
    : undefined;

  return (
    <Panel>
      <PanelHeader
        title="Ramadan"
        description={titleDescription}
        icon="moon"
        actions={
          <ButtonLink href="/dashboard/ramadan" size="sm" variant="secondary" iconAfter="arrow-right">
            Full timetable
          </ButtonLink>
        }
      />
      <PanelBody>
        {activeSchedule ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <InlineStat
                label="Day"
                value={`Day ${activeSchedule.dayNumber}`}
                hint={todaySchedule ? "Today" : formatLongDate(activeSchedule.date)}
                icon="calendar"
                tone="gold"
              />
              <InlineStat
                label="Sehri / Imsak"
                value={formatClockTime(activeSchedule.fastingStart)}
                hint={activeSchedule.suhoorTime ? `Suhoor: ${formatClockTime(activeSchedule.suhoorTime)}` : "Fast starts"}
                icon="sun"
              />
              <InlineStat
                label="Iftar"
                value={formatClockTime(activeSchedule.fastingEnd)}
                hint="Fast ends (Maghrib)"
                icon="sunset"
                tone="positive"
              />
              <InlineStat
                label="Taraweeh"
                value={activeSchedule.taraweehTime ? formatClockTime(activeSchedule.taraweehTime) : "Not announced"}
                icon="book"
              />
            </div>
            {activeSchedule.notes ? (
              <p className="mt-3 text-[13px] leading-6 text-[#69726d]">{activeSchedule.notes}</p>
            ) : null}
          </>
        ) : (
          <p className="text-[13.5px] leading-6 text-[#69726d]">
            No Ramadan schedule has been recorded yet. Add one and it will show here and on the public timetable.
          </p>
        )}
      </PanelBody>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- *
 * Events and content
 * -------------------------------------------------------------------------- */

/**
 * Only reachable if the backend starts tracking events or content.
 *
 * Both blocks are `tracked: false` today, so this renders nothing — it exists so that the day a table
 * lands behind either one, the counts appear rather than the notice below staying up for a figure the API
 * has begun returning. A `null` count while `tracked` is true means the number was not supplied, which is
 * why it reads `—` and not `0`.
 */
function TrackedCountsPanel({ data }: { data: OverviewData }) {
  return (
    <Panel>
      <PanelHeader title="Programmes and content" icon="calendar-days" />
      <PanelBody>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.events.tracked ? (
            <>
              <InlineStat label="Upcoming events" value={countOrDash(data.events.upcoming)} icon="calendar-days" />
              <InlineStat label="Registrations" value={countOrDash(data.events.registrations)} icon="clipboard-check" />
            </>
          ) : null}
          {data.content.tracked ? (
            <>
              <InlineStat label="Published articles" value={countOrDash(data.content.publishedArticles)} icon="file-text" />
              <InlineStat label="Published khutbahs" value={countOrDash(data.content.publishedKhutbahs)} icon="book" />
            </>
          ) : null}
        </div>
      </PanelBody>
    </Panel>
  );
}

function countOrDash(value: number | null): string {
  return value === null ? "—" : formatCount(value);
}

/**
 * What this system does not record.
 *
 * `tracked: false` is a statement about the schema, not about the mosque: there is no events table, so
 * "0 upcoming events" would be a claim the database cannot support. Saying so here is also what keeps the
 * sample data on those pages from being read as real.
 */
function UntrackedNotice({ events, content }: { events: boolean; content: boolean }) {
  const missing: string[] = [];
  if (!events) missing.push("events and registrations");
  if (!content) missing.push("articles and khutbahs");

  if (missing.length === 0) return null;

  return (
    <InlineNotice icon="info" tone="neutral">
      Not recorded by this system yet: {joinWords(missing)}. Those screens show sample data, so nothing is
      counted for them here — which is different from counting none.
    </InlineNotice>
  );
}

/* -------------------------------------------------------------------------- *
 * Hidden blocks
 * -------------------------------------------------------------------------- */

/**
 * One line for everything this person's role does not include.
 *
 * Gathered into a single notice rather than a placeholder card per block: someone with a narrow role
 * would otherwise meet four separate "not available to you" panels before reaching anything useful, and
 * the point of saying it at all is only so an absent section does not look like a broken one.
 */
function HiddenBlocksNotice({ data }: { data: OverviewData }) {
  const hidden: string[] = [];
  if (!data.users) hidden.push("community figures");
  if (!data.finance) hidden.push("finances");
  // `prayer` is also null when the times cannot be calculated, which has its own notice above — so this
  // only counts the permission case.
  if (!data.prayer && !data.jumuah) hidden.push("prayer times");
  if (!data.approvals) hidden.push("approvals");

  if (hidden.length === 0) return null;

  return (
    <InlineNotice icon="lock" tone="neutral">
      Not shown for your role: {joinWords(hidden)}. Nothing is missing from the mosque&apos;s records — your
      account does not include access to these, so they were never sent to this page.
    </InlineNotice>
  );
}

function joinWords(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/* -------------------------------------------------------------------------- *
 * Quick actions
 * -------------------------------------------------------------------------- */

/**
 * Shortcuts, filtered to what this person may actually do.
 *
 * Every one of these points at a page that is wired to the API, and the two carrying `?action=` point at
 * pages that read it — `/dashboard/users` and `/dashboard/volunteers` both take it and open their own add
 * form. A shortcut to a screen that ignores the parameter would look like a broken button, so those link
 * plainly instead.
 *
 * The permission on each is a UX filter and nothing more: hiding a shortcut does not protect the route it
 * points at. The backend guard on every one of those endpoints is what does.
 */
const quickActions: ReadonlyArray<{
  id: string;
  label: string;
  description: string;
  href: string;
  icon: IconName;
  permission: Permission;
}> = [
  {
    id: "add-user",
    label: "Add a user",
    description: "Give someone an account to sign in with",
    href: "/dashboard/users?action=add",
    icon: "user-plus",
    permission: "user.manage",
  },
  {
    id: "add-volunteer",
    label: "Add a volunteer",
    description: "Place someone on a service team",
    href: "/dashboard/volunteers?action=add",
    icon: "hands-heart",
    permission: "volunteer.manage",
  },
  {
    id: "record-donation",
    label: "Record a donation",
    description: "Enter money received into the ledger",
    href: "/dashboard/finance/donations",
    icon: "gift",
    permission: "donation.record",
  },
  {
    id: "prayer-times",
    label: "Adjust prayer times",
    description: "Set the calculation and per-prayer offsets",
    href: "/dashboard/prayer-times",
    icon: "moon",
    permission: "prayer.manage",
  },
];

/* -------------------------------------------------------------------------- *
 * Loading
 * -------------------------------------------------------------------------- */

/** Mirrors the real layout — three counts, a finance panel, the prayer strip — so nothing jumps. */
function OverviewSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <FinanceSummarySkeleton count={3} />
      <FinanceCardSkeleton />
      <FinanceCardSkeleton />
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Formatting
 * -------------------------------------------------------------------------- */

const instant = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

/**
 * `generatedAt`, in the reader's own timezone.
 *
 * Safe to format against the local clock because this page fetches after mount — the server never renders
 * this string, so there is no hydration mismatch to cause.
 */
function formatInstant(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : instant.format(date);
}
