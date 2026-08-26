import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, VolunteerStatus } from '@prisma/client';

import { effectivePermissions, hasPermission } from '../common/constants/roles';
import type { Permission } from '../common/constants/permissions';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { dayAfter, toDateOnly } from '../common/utils/date-only';
import { FinancialReportQueryDto } from '../financial-reports/dto/financial-report-query.dto';
import type {
  DonationReportDto,
  ExpenseReportDto,
  FinancialSummaryDto,
  ReportRangeDto,
} from '../financial-reports/dto/financial-report-response.dto';
import { FinancialReportsService } from '../financial-reports/financial-reports.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  EventReportDto,
  ReportHeadcountDto,
  ReportRoleCountDto,
  ReportSummaryDto,
  ReportUserSummaryDto,
  ReportVolunteerStatusCountDto,
  ReportVolunteerSummaryDto,
  UserReportDto,
  VolunteerReportDto,
} from './dto/report-response.dto';

/**
 * The centralised read-only reports.
 *
 * **This service aggregates two things and delegates the rest.** People and volunteers are counted here, because
 * nothing else counts them. Money is not: `FinancialReportsService` already produces every financial figure the
 * brief asks for, over the same `?from&to` window, with the per-table date semantics and the "money that actually
 * moved" status filters already worked out and already under test. So `/reports/finance`, `/reports/donations` and
 * `/reports/expenses` call it. A second implementation would be a second set of answers to the same question, and
 * the day they disagreed the mosque would have no way to tell which one was lying.
 *
 * **Nothing loads rows.** Every figure below is a `count` or a `groupBy` — the database counts, and this service
 * carries the results. There is no `findMany` in this file, and there should not be one: a report that reads every
 * donation to add them up gets slower every month the mosque operates.
 *
 * **Mosque isolation comes from the token, never from the request.** `actor.mosqueId` goes into every `where`
 * clause and no route accepts a mosque parameter, so there is no shape of request that reads another mosque's
 * figures. This matches `FinancialReportsService`, which does the same and makes no `platform.manage` exception: a
 * report is a statement about one mosque, and a cross-mosque total is not a report anyone here has asked for.
 *
 * **The per-subject permission checks in `summary` are the security boundary of this module.** They are explained
 * where they are made.
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financial: FinancialReportsService,
  ) {}

  /**
   * Everything the caller is entitled to see, over one window.
   *
   * Each block is queried **only** if the caller holds the permission for that subject. This is not cosmetic
   * filtering after the fact: a block the caller cannot see is never fetched, so it cannot leak through a log, a
   * timing difference or a future change that forgets to strip it.
   *
   * The reason it has to work this way is in the shipped role map. `report.view` is the entitlement to ask for a
   * report; it is not an entitlement to the mosque's finances. An `imam` holds `report.view` and holds neither
   * `finance.view` nor `user.view` nor `volunteer.view`. If this method returned every block to anyone who could
   * reach the route, `/reports/summary` would be a way for any imam to read the payroll totals and the size of the
   * member directory — a privilege escalation created by a convenience endpoint, which is the usual way they
   * happen.
   */
  async summary(
    actor: AuthenticatedUser,
    query: FinancialReportQueryDto,
  ): Promise<ReportSummaryDto> {
    this.assertRange(query);

    const granted = effectivePermissions(actor);

    // Sequential rather than a `Promise.all`, because how many blocks there are depends on the caller and the
    // combined cost is a handful of indexed counts. Each block is its own transaction, so its own parts agree with
    // each other; the blocks are independent figures and do not need to agree across subjects.
    const users = this.may(granted, 'user.view') ? await this.userSummary(actor, query) : null;

    const volunteers = this.may(granted, 'volunteer.view')
      ? await this.volunteerSummary(actor, query)
      : null;

    const finance = this.may(granted, 'finance.view')
      ? await this.financial.summary(actor, query)
      : null;

    return {
      range: this.rangeOf(query),
      users,
      volunteers,
      finance,
      // Not gated. It carries no figures at all — see `EventReportDto`.
      events: this.events(query),
    };
  }

  /** The people report. Requires `report.view` and `user.view`, both declared on the route. */
  async users(actor: AuthenticatedUser, query: FinancialReportQueryDto): Promise<UserReportDto> {
    this.assertRange(query);

    const where = this.userWhere(actor.mosqueId);

    const [total, active, volunteers, joined] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.count({ where: { ...where, isActive: true } }),
      this.prisma.volunteer.count({ where: this.volunteerWhere(actor.mosqueId) }),
      this.prisma.user.count({ where: { ...where, ...this.createdWithin(query) } }),
    ]);

    // Outside the transaction, and not by preference: Prisma's `groupBy` return type is derived from the literal
    // args object, and putting the call inside a `$transaction([...])` array widens `_count` to a union the
    // compiler will not index. One extra round trip is the cost of not asserting a shape onto the result.
    const byRole = await this.prisma.user.groupBy({
      by: ['role'],
      where,
      _count: { _all: true },
    });

    return {
      range: this.rangeOf(query),
      total,
      active,
      // Derived rather than counted. One fewer query, and it cannot disagree with `total` and `active`, which a
      // third `count` run a millisecond later could.
      inactive: total - active,
      volunteers,
      joined,
      byRole: byRole
        .map((group): ReportRoleCountDto => ({ role: group.role, count: group._count._all }))
        // Largest first, sorted here rather than in SQL: there are seven roles at most, so this is free, and an
        // `orderBy` on an aggregate is the part of the query most likely to break the inference above.
        .sort((a, b) => b.count - a.count),
    };
  }

  /** The volunteer report. Requires `report.view` and `volunteer.view`, both declared on the route. */
  async volunteers(
    actor: AuthenticatedUser,
    query: FinancialReportQueryDto,
  ): Promise<VolunteerReportDto> {
    this.assertRange(query);

    const where = this.volunteerWhere(actor.mosqueId);

    const [total, joined] = await this.prisma.$transaction([
      this.prisma.volunteer.count({ where }),
      this.prisma.volunteer.count({ where: { ...where, ...this.joinedWithin(query) } }),
    ]);

    // Separate for the same reason as the role breakdown above — see `users`.
    const byStatus = await this.prisma.volunteer.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });

    return {
      range: this.rangeOf(query),
      total,
      joined,
      byStatus: byStatus
        .map((group): ReportVolunteerStatusCountDto => ({
          status: group.status,
          count: group._count._all,
        }))
        .sort((a, b) => b.count - a.count),
    };
  }

  /**
   * Donations over the window. Delegated whole.
   *
   * The route requires `donation.view` on top of `report.view`, which is why this is a separate endpoint from
   * `/financial-reports/donations` rather than a duplicate of it: that one is gated on `finance.view`, held only by
   * people already trusted with budgets and payroll, and a fundraising volunteer who needs donation figures should
   * not have to be given the payroll grant to see them.
   */
  async donations(
    actor: AuthenticatedUser,
    query: FinancialReportQueryDto,
  ): Promise<DonationReportDto> {
    return this.financial.donations(actor, query);
  }

  /** Expenses over the window. Delegated whole; the route adds `expense.view`. */
  async expenses(
    actor: AuthenticatedUser,
    query: FinancialReportQueryDto,
  ): Promise<ExpenseReportDto> {
    return this.financial.expenses(actor, query);
  }

  /**
   * The whole financial picture over the window. Delegated whole.
   *
   * This is the brief's "financial reports should reuse Donations, Expenses, Budgets, Salaries", and it does:
   * `FinancialSummaryDto` carries all four plus the net balance, from four aggregates in one transaction.
   */
  async finance(
    actor: AuthenticatedUser,
    query: FinancialReportQueryDto,
  ): Promise<FinancialSummaryDto> {
    return this.financial.summary(actor, query);
  }

  /**
   * The events report.
   *
   * Synchronous and queries nothing, because there is nothing to query — no `Event` model exists in this schema.
   * The route is still guarded and still mosque-scoped by the same rules as the others, so that when the model
   * lands the only change is inside this method.
   */
  events(query: FinancialReportQueryDto): EventReportDto {
    this.assertRange(query);

    return {
      range: this.rangeOf(query),
      tracked: false,
      total: null,
      upcoming: null,
      registrations: null,
    };
  }

  /**
   * Headcount now — total, active, volunteers. No window, because a headcount has none.
   *
   * Public because the dashboard needs exactly these three figures and must not count the same two tables a second
   * time. It is a separate transaction from `userSummary`'s four counts rather than a shared building block: each
   * caller then gets one snapshot its own figures agree within, at the cost of three repeated `count` lines. The
   * predicates — the part that could actually go wrong — are shared.
   */
  async headcount(actor: AuthenticatedUser): Promise<ReportHeadcountDto> {
    const where = this.userWhere(actor.mosqueId);

    const [total, active, volunteers] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.count({ where: { ...where, isActive: true } }),
      this.prisma.volunteer.count({ where: this.volunteerWhere(actor.mosqueId) }),
    ]);

    return { total, active, volunteers };
  }

  // ---- internals ------------------------------------------------------------

  /** Narrowed to `Permission` so a typo in a permission string is a compile error, not a silent `false`. */
  private may(granted: Permission[], permission: Permission): boolean {
    return hasPermission(granted, permission);
  }

  private async userSummary(
    actor: AuthenticatedUser,
    query: FinancialReportQueryDto,
  ): Promise<ReportUserSummaryDto> {
    const where = this.userWhere(actor.mosqueId);

    const [total, active, volunteers, joined] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.count({ where: { ...where, isActive: true } }),
      this.prisma.volunteer.count({ where: this.volunteerWhere(actor.mosqueId) }),
      this.prisma.user.count({ where: { ...where, ...this.createdWithin(query) } }),
    ]);

    return { total, active, volunteers, joined };
  }

  private async volunteerSummary(
    actor: AuthenticatedUser,
    query: FinancialReportQueryDto,
  ): Promise<ReportVolunteerSummaryDto> {
    const where = this.volunteerWhere(actor.mosqueId);

    const [total, active, joined] = await this.prisma.$transaction([
      this.prisma.volunteer.count({ where }),
      this.prisma.volunteer.count({ where: { ...where, status: VolunteerStatus.active } }),
      this.prisma.volunteer.count({ where: { ...where, ...this.joinedWithin(query) } }),
    ]);

    return { total, active, joined };
  }

  /**
   * One mosque's users, excluding deleted ones.
   *
   * `deletedAt: null` is not optional. A soft-deleted user is kept so the donations, expenses and audit entries
   * that reference them still resolve; counting one as a member would inflate every headcount the mosque quotes.
   */
  private userWhere(mosqueId: string): Prisma.UserWhereInput {
    return { mosqueId, deletedAt: null };
  }

  /**
   * One mosque's volunteers.
   *
   * A `Volunteer` row has no `mosqueId` of its own — it hangs off exactly one user, and the user carries the
   * mosque. So the scope goes through the relation. That is not a workaround: it means a volunteer cannot be
   * scoped to a different mosque than the person volunteering, which a duplicated column would allow.
   */
  private volunteerWhere(mosqueId: string): Prisma.VolunteerWhereInput {
    return { user: this.userWhere(mosqueId) };
  }

  /**
   * `createdAt` inside the window, for a `Timestamptz` column.
   *
   * The upper bound is `< dayAfter(to)` rather than `<= toDateOnly(to)`. The latter means "at or before midnight",
   * which silently drops everyone who signed up during the final day of the window — the commonest off-by-one in
   * a date-range report, and invisible, because the answer is merely a little too small.
   */
  private createdWithin(query: FinancialReportQueryDto): Prisma.UserWhereInput {
    if (!query.from && !query.to) return {};

    return {
      createdAt: {
        ...(query.from ? { gte: toDateOnly(query.from) } : {}),
        ...(query.to ? { lt: dayAfter(query.to) } : {}),
      },
    };
  }

  /** The same bound, on `Volunteer.joinedAt`, which is also a `Timestamptz`. */
  private joinedWithin(query: FinancialReportQueryDto): Prisma.VolunteerWhereInput {
    if (!query.from && !query.to) return {};

    return {
      joinedAt: {
        ...(query.from ? { gte: toDateOnly(query.from) } : {}),
        ...(query.to ? { lt: dayAfter(query.to) } : {}),
      },
    };
  }

  /** The window, echoed back, so a stored or shared report says what it covers. */
  private rangeOf(query: FinancialReportQueryDto): ReportRangeDto {
    return { from: query.from ?? null, to: query.to ?? null };
  }

  /**
   * `to >= from`, when both were given.
   *
   * ISO `YYYY-MM-DD` strings compare correctly as strings, so this needs no parsing and cannot pick up a timezone
   * on the way. An inverted window is a 400 rather than a page of zeroes: zeroes read as "the mosque has no
   * members", which is a worse answer than an error.
   *
   * Checked here as well as in `FinancialReportsService`, rather than relying on the delegate to raise it — the
   * routes this service answers for do not all reach the delegate, and a rule enforced only on some of them is
   * not a rule.
   */
  private assertRange(query: FinancialReportQueryDto): void {
    const { from, to } = query;

    if (!from || !to || to >= from) return;

    throw new BadRequestException({
      code: 'INVALID_DATE_RANGE',
      message: 'to must not fall before from.',
    });
  }
}
