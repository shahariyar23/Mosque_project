import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import { ROLE_PERMISSIONS } from '../common/constants/roles';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { DashboardController } from '../dashboard/dashboard.controller';
import { DashboardService } from '../dashboard/dashboard.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

/**
 * Authorization for the two read-only aggregation endpoints.
 *
 * The risk these tests exist for is specific: `report.view` and `dashboard.view` are held by roles that hold no
 * finance or directory grant at all — an `imam` holds both and holds neither `finance.view` nor `user.view`. So a
 * summary or an overview that returned every block to anyone who could reach the route would be a privilege
 * escalation created by a convenience endpoint. Two things are asserted for each: the route declares the grants it
 * needs, and the service does not query a block the caller cannot see.
 */

const MOSQUE = '11111111-1111-4111-8111-111111111111';
const IMAM = '77777777-7777-4777-8777-777777777777';

function person(role: Role, permissions: string[]): AuthenticatedUser {
  return {
    id: IMAM,
    mosqueId: MOSQUE,
    email: `${role}@example.test`,
    role,
    permissions,
    deniedPermissions: [],
    isActive: true,
  };
}

/** The shipped role exactly as configured, so these tests fail if the role map is widened. */
function shipped(role: Role): AuthenticatedUser {
  return person(role, [...ROLE_PERMISSIONS[role]]);
}

function buildReports() {
  const prisma = {
    user: { count: jest.fn().mockResolvedValue(0), groupBy: jest.fn().mockResolvedValue([]) },
    volunteer: { count: jest.fn().mockResolvedValue(0), groupBy: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
  };
  const financial = {
    summary: jest.fn().mockResolvedValue({ range: { from: null, to: null } }),
    donations: jest.fn().mockResolvedValue({}),
    expenses: jest.fn().mockResolvedValue({}),
  };

  return { prisma, financial, service: new ReportsService(prisma as never, financial as never) };
}

function buildDashboard() {
  const prisma = {
    mosque: { findUnique: jest.fn().mockResolvedValue({ timezone: 'Asia/Dhaka' }) },
    jumuahSchedule: { findFirst: jest.fn().mockResolvedValue(null) },
    approvalRequest: { count: jest.fn().mockResolvedValue(4) },
  };
  const reports = {
    headcount: jest.fn().mockResolvedValue({ total: 5, active: 4, volunteers: 1 }),
    finance: jest.fn().mockResolvedValue({ netBalance: '1000.00' }),
  };
  const prayerTimes = {
    getPrayerTimes: jest.fn().mockResolvedValue({
      date: '2026-08-26',
      timezone: 'Asia/Dhaka',
      timings: {
        fajr: { time: '04:42' },
        dhuhr: { time: '12:05' },
        asr: { time: '16:28' },
        maghrib: { time: '18:12' },
        isha: { time: '19:31' },
        imsak: { time: '04:32' },
        sunrise: { time: '05:58' },
        sunset: { time: '18:10' },
        midnight: { time: '00:05' },
      },
    }),
  };

  return {
    prisma,
    reports,
    prayerTimes,
    service: new DashboardService(prisma as never, reports as never, prayerTimes as never),
  };
}

describe('report authorization', () => {
  const reflector = new Reflector();

  it('requires report.view plus the subject grant on every route that carries figures', () => {
    const expected: Record<string, string[]> = {
      users: ['report.view', 'user.view'],
      donations: ['report.view', 'donation.view'],
      expenses: ['report.view', 'expense.view'],
      events: ['report.view', 'event.view'],
      volunteers: ['report.view', 'volunteer.view'],
      finance: ['report.view', 'finance.view'],
    };

    for (const [handler, permissions] of Object.entries(expected)) {
      // `getAllAndOverride`, not `getAll`: the guard reads it that way, so a handler-level declaration
      // replaces the class-level one rather than adding to it.
      expect(
        reflector.getAllAndOverride(PERMISSIONS_KEY, [
          ReportsController.prototype[handler as keyof ReportsController],
          ReportsController,
        ]),
      ).toEqual(permissions);
    }
  });

  it('lets the summary route through on report.view alone, since it gates its own blocks', () => {
    expect(
      reflector.getAllAndOverride(PERMISSIONS_KEY, [
        ReportsController.prototype.summary,
        ReportsController,
      ]),
    ).toEqual(['report.view']);
  });

  it('does not query the finance or people blocks for an imam, who holds report.view and neither grant', async () => {
    const { prisma, financial, service } = buildReports();

    const result = await service.summary(shipped(Role.imam), {});

    expect(result.users).toBeNull();
    expect(result.volunteers).toBeNull();
    expect(result.finance).toBeNull();
    // The point of the null is that the query never ran — a block that is not fetched cannot leak.
    expect(financial.summary).not.toHaveBeenCalled();
    expect(prisma.user.count).not.toHaveBeenCalled();
    expect(prisma.volunteer.count).not.toHaveBeenCalled();
  });

  it('gives a treasurer the money but not the directory, which they hold no grant for', async () => {
    const { prisma, financial, service } = buildReports();

    const result = await service.summary(shipped(Role.treasurer), {});

    expect(result.finance).not.toBeNull();
    expect(financial.summary).toHaveBeenCalledTimes(1);
    // `finance.view` is not a directory grant, and the role map does not give a treasurer one.
    expect(result.users).toBeNull();
    expect(result.volunteers).toBeNull();
    expect(prisma.user.count).not.toHaveBeenCalled();
  });

  it('returns every block to a mosque admin, who holds all three', async () => {
    const { financial, service } = buildReports();

    const result = await service.summary(shipped(Role.mosque_admin), {});

    expect(result.users).not.toBeNull();
    expect(result.volunteers).not.toBeNull();
    expect(result.finance).not.toBeNull();
    expect(financial.summary).toHaveBeenCalledTimes(1);
  });

  it('honours a per-user denial over the role’s own grant', async () => {
    const { financial, service } = buildReports();
    const denied = shipped(Role.treasurer);

    const result = await service.summary({ ...denied, deniedPermissions: ['finance.view'] }, {});

    expect(result.finance).toBeNull();
    expect(financial.summary).not.toHaveBeenCalled();
  });

  it('scopes people and volunteer figures to the caller’s own mosque', async () => {
    const { prisma, service } = buildReports();

    await service.users(shipped(Role.secretary), {});

    for (const call of prisma.user.count.mock.calls) {
      expect(call[0].where).toMatchObject({ mosqueId: MOSQUE, deletedAt: null });
    }
    // A volunteer row carries no mosque of its own, so the scope goes through the user relation.
    expect(prisma.volunteer.count.mock.calls[0][0].where).toMatchObject({
      user: { mosqueId: MOSQUE, deletedAt: null },
    });
  });

  it('returns counts only — no names, emails or phone numbers', async () => {
    const { service } = buildReports();

    const result = await service.users(shipped(Role.secretary), {});

    expect(JSON.stringify(result)).not.toMatch(/email|fullName|phone|passwordHash/i);
    expect(Object.keys(result).sort()).toEqual(
      ['active', 'byRole', 'inactive', 'joined', 'range', 'total', 'volunteers'].sort(),
    );
  });
});

describe('dashboard authorization', () => {
  const reflector = new Reflector();

  it('requires dashboard.view to reach the route', () => {
    expect(
      reflector.getAllAndOverride(PERMISSIONS_KEY, [
        DashboardController.prototype.overview,
        DashboardController,
      ]),
    ).toEqual(['dashboard.view']);
  });

  it('is unreachable for a plain member, who holds no dashboard.view', () => {
    expect(ROLE_PERMISSIONS[Role.member]).not.toContain('dashboard.view');
  });

  it('withholds finance and headcount from an imam, and does not query them', async () => {
    const { reports, service } = buildDashboard();

    const overview = await service.overview(shipped(Role.imam));

    expect(overview.users).toBeNull();
    expect(overview.finance).toBeNull();
    expect(reports.headcount).not.toHaveBeenCalled();
    expect(reports.finance).not.toHaveBeenCalled();
    // Prayer is in the base group, so it is still there — which is the whole point of the split.
    expect(overview.prayer).not.toBeNull();
  });

  it('withholds the pending-approvals count from a cashier, who cannot review', async () => {
    const { prisma, service } = buildDashboard();

    const overview = await service.overview(shipped(Role.cashier));

    expect(overview.approvals).toBeNull();
    expect(prisma.approvalRequest.count).not.toHaveBeenCalled();
  });

  it('gives a mosque admin everything, scoped to their own mosque', async () => {
    const { prisma, reports, service } = buildDashboard();

    const overview = await service.overview(shipped(Role.mosque_admin));

    expect(overview.users).toMatchObject({ total: 5 });
    expect(overview.finance).not.toBeNull();
    expect(overview.approvals).toEqual({ pending: 4 });
    expect(reports.finance.mock.calls[0][1]).toEqual({});
    expect(prisma.approvalRequest.count.mock.calls[0][0].where).toMatchObject({
      mosqueId: MOSQUE,
      status: 'pending',
    });
    expect(prisma.jumuahSchedule.findFirst.mock.calls[0][0].where).toMatchObject({
      mosqueId: MOSQUE,
      isActive: true,
    });
  });

  it('trims prayer to the five obligatory times and omits the almanac extras', async () => {
    const { service } = buildDashboard();

    const overview = await service.overview(shipped(Role.mosque_admin));

    expect(Object.keys(overview.prayer?.timings ?? {})).toEqual([
      'fajr',
      'dhuhr',
      'asr',
      'maghrib',
      'isha',
    ]);
  });

  it('degrades to a null prayer block when the upstream calculation fails, rather than failing the response', async () => {
    const { prayerTimes, service } = buildDashboard();
    prayerTimes.getPrayerTimes.mockRejectedValue(new Error('aladhan unreachable'));

    const overview = await service.overview(shipped(Role.mosque_admin));

    expect(overview.prayer).toBeNull();
    // Everything else still arrived.
    expect(overview.users).not.toBeNull();
    expect(overview.finance).not.toBeNull();
  });

  it('declares the untracked blocks as untracked rather than as zero', async () => {
    const { service } = buildDashboard();

    const overview = await service.overview(shipped(Role.mosque_admin));

    expect(overview.events).toEqual({ tracked: false, upcoming: null, registrations: null });
    expect(overview.content).toEqual({
      tracked: false,
      publishedArticles: null,
      publishedKhutbahs: null,
    });
  });
});
