import { Injectable, Logger } from '@nestjs/common';
import { ApprovalStatus } from '@prisma/client';

import type { Permission } from '../common/constants/permissions';
import { effectivePermissions, hasPermission } from '../common/constants/roles';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { toDateOnly } from '../common/utils/date-only';
import type { FinancialSummaryDto } from '../financial-reports/dto/financial-report-response.dto';
import { JumuahDto } from '../jumuah/dto/jumuah.dto';
import { todayInZone } from '../prayer-times/prayer-time.utils';
import { PrayerTimesService } from '../prayer-times/prayer-times.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from '../reports/reports.service';
import {
  DashboardContentDto,
  DashboardEventsDto,
  DashboardOverviewDto,
  DashboardPrayerDto,
} from './dto/dashboard-response.dto';

/**
 * The overview.
 *
 * **There is no dashboard table.** Every figure is read at request time from the module that owns it. A stored
 * overview would be a cache with no invalidation story: correct at write time, quietly stale afterwards, and the
 * first number anyone stops believing.
 *
 * **Nothing here loads rows to count them.** People and money come from `ReportsService`, which aggregates in the
 * database; the two figures queried directly — pending approvals and the next Jumu'ah — are one indexed `count` and
 * one indexed `findFirst` with `take` implied. There is no `findMany` in this file.
 *
 * **Every block is gated, and an ungated block is never queried.** `dashboard.view` is the entitlement to see *a*
 * dashboard; it is not an entitlement to the mosque's finances. The shipped role map makes that concrete — an `imam`
 * and a `cashier` both hold `dashboard.view`, neither holds `user.view`, and the imam holds no finance grant at all.
 * A single overview that returned everything to anyone who could reach the route would be the shortest path in this
 * codebase from "can see a dashboard" to "can read the payroll". So the permission decides whether the query runs,
 * not whether the answer is stripped afterwards: a block that is never fetched cannot leak through a log line, a
 * response-shaping mistake or a later refactor.
 *
 * **Mosque isolation comes from the token.** `actor.mosqueId` goes into every predicate and the route takes no mosque
 * parameter, so there is no shape of request that reads another mosque. No `platform.manage` exception is made, which
 * matches `FinancialReportsService` and `ReportsService`: an overview is a statement about one mosque, and a
 * cross-mosque overview is not a thing anyone has asked for.
 *
 * **Prayer times are best-effort.** `PrayerTimesService` calls a third party on a cache miss, so a failure there
 * yields `prayer: null` and a warning rather than a 500. An outage at AlAdhan must not take the mosque's dashboard
 * down with it — and the blocking external call is the one part of this response worth being defensive about.
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
    private readonly prayerTimes: PrayerTimesService,
  ) {}

  /**
   * One mosque, right now.
   *
   * Sequential rather than a `Promise.all`. How many blocks there are depends on the caller, and the database work
   * is a handful of indexed counts against one connection pool; firing every block at once would trade a few
   * milliseconds for pool contention under load, on a route a whole organisation loads at nine in the morning.
   */
  async overview(actor: AuthenticatedUser): Promise<DashboardOverviewDto> {
    const granted = effectivePermissions(actor);

    const users = this.may(granted, 'user.view') ? await this.reports.headcount(actor) : null;

    const finance = this.may(granted, 'finance.view') ? await this.finance(actor) : null;

    // `prayer.view` sits in the `base` group, so in practice everyone signed in holds it. The check is still made:
    // it is what makes the gate correct if the grant is ever moved out of `base`, and it is what makes a per-user
    // entry in `deniedPermissions` actually deny.
    const readsPrayer = this.may(granted, 'prayer.view');

    const prayer = readsPrayer ? await this.prayer(actor.mosqueId) : null;
    const jumuah = readsPrayer ? await this.nextJumuah(actor.mosqueId) : null;

    const approvals = this.may(granted, 'workflow.review')
      ? { pending: await this.pendingApprovals(actor.mosqueId) }
      : null;

    return {
      generatedAt: new Date().toISOString(),
      users,
      finance,
      prayer,
      jumuah,
      events: this.events(),
      content: this.content(),
      approvals,
    };
  }

  // ---- internals ------------------------------------------------------------

  /** Narrowed to `Permission` so a typo in a permission string is a compile error, not a silent `false`. */
  private may(granted: Permission[], permission: Permission): boolean {
    return hasPermission(granted, permission);
  }

  /**
   * Donations, expenses, salaries, budget and net balance — all time.
   *
   * `{}` is the whole point: the dashboard asks "where does the mosque stand", which has no window. Delegated to
   * `ReportsService`, which delegates to `FinancialReportsService`, so these are the same four aggregates in one
   * transaction that `/financial-reports/summary` returns. Recomputing them here would be a second answer to the
   * same question.
   */
  private async finance(actor: AuthenticatedUser): Promise<FinancialSummaryDto> {
    return this.reports.finance(actor, {});
  }

  /**
   * Today's five obligatory prayers, or `null`.
   *
   * Trimmed from the nine timings `/prayer-times` returns, and the *adjusted* time is taken — `time` is what the
   * mosque publishes, `calculated` is what the almanac said before the mosque's own offset was applied. A dashboard
   * that showed the almanac would contradict the sign on the door.
   *
   * The `catch` is not defensive padding. A cache miss makes `getPrayerTimes` wait on an external HTTP call, so
   * without this an upstream outage turns the whole overview into a 500 and every other figure on it becomes
   * unreadable for the sake of one card.
   */
  private async prayer(mosqueId: string): Promise<DashboardPrayerDto | null> {
    try {
      const times = await this.prayerTimes.getPrayerTimes(mosqueId);

      return {
        date: times.date,
        timezone: times.timezone,
        timings: {
          fajr: times.timings.fajr.time,
          dhuhr: times.timings.dhuhr.time,
          asr: times.timings.asr.time,
          maghrib: times.timings.maghrib.time,
          isha: times.timings.isha.time,
        },
      };
    } catch (error) {
      this.logger.warn(
        `Prayer times unavailable for mosque ${mosqueId}; omitting from the overview: ${reasonOf(error)}`,
      );

      return null;
    }
  }

  /**
   * The next Jumu'ah, or the standing weekly arrangement, or nothing.
   *
   * `date` is nullable on this table and a null means "this is the standing weekly schedule" rather than "unknown",
   * so the ordering asks for nulls last: the soonest dated Friday wins, and the standing row is the fallback when no
   * Friday is dated. One query, one `@@index([mosqueId, date])`, no rows loaded to be filtered afterwards.
   *
   * "Soonest" is measured in the mosque's own timezone, which costs one indexed read of `Mosque.timezone`. Using the
   * server's day instead would drop this Friday's entry from the dashboard for part of the day in any mosque whose
   * clock is not UTC — which is all of them.
   *
   * `isActive: false` is excluded. The table keeps cancelled arrangements, and a dashboard advertising a cancelled
   * jamaat sends people to a locked door.
   */
  private async nextJumuah(mosqueId: string): Promise<JumuahDto | null> {
    const mosque = await this.prisma.mosque.findUnique({
      where: { id: mosqueId },
      select: { timezone: true },
    });

    const today = toDateOnly(todayInZone(mosque?.timezone));

    const next = await this.prisma.jumuahSchedule.findFirst({
      where: {
        mosqueId,
        isActive: true,
        OR: [{ date: { gte: today } }, { date: null }],
      },
      orderBy: [{ date: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
    });

    return next ? JumuahDto.from(next) : null;
  }

  /** How much is waiting for somebody. One `count` on `@@index([mosqueId, status, createdAt])`. */
  private async pendingApprovals(mosqueId: string): Promise<number> {
    return this.prisma.approvalRequest.count({
      where: { mosqueId, status: ApprovalStatus.pending },
    });
  }

  /**
   * Events — declared, untracked.
   *
   * No `Event` model exists in this schema, and adding one would be a new business feature rather than a dashboard.
   * `tracked: false` with null figures is returned instead of zeroes: a `0` asserts "this mosque has no events
   * coming up", which is a claim about the mosque, when the truth is a claim about the software. When the model
   * lands this method gains real counts **and a permission gate**; there is nothing to gate while there is nothing
   * to disclose.
   */
  private events(): DashboardEventsDto {
    return { tracked: false, upcoming: null, registrations: null };
  }

  /** Published content — declared, untracked. Same reasoning as `events`, for `Article` and `Khutbah`. */
  private content(): DashboardContentDto {
    return { tracked: false, publishedArticles: null, publishedKhutbahs: null };
  }
}

/** Why the prayer lookup failed, for the log line, without assuming what was thrown. */
function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : 'unrecognised failure';
}
