import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ContributionDueStatus,
  ContributionEnrollmentStatus,
  ContributionFrequency,
  PaymentMethod,
  Prisma,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';

import { AuditLogService } from '../audit/audit-log.service';
import { MailService } from '../mail/mail.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { ContributionsService } from './contributions.service';

const ACTOR: AuthenticatedUser = {
  id: 'a0000000-0000-0000-0000-000000000001',
  email: 'treasurer@testmosque.org',
  role: 'treasurer',
  mosqueId: 'm0000000-0000-0000-0000-000000000001',
  permissions: ['contribution.manage', 'contribution.view', 'contribution.record'],
  deniedPermissions: [],
  isActive: true,
};

const MEMBER_ACTOR: AuthenticatedUser = {
  id: 'a0000000-0000-0000-0000-000000000002',
  email: 'member@testmosque.org',
  role: 'member',
  mosqueId: 'm0000000-0000-0000-0000-000000000001',
  permissions: ['contribution.viewOwn'],
  deniedPermissions: [],
  isActive: true,
};

describe('ContributionsService', () => {
  let service: ContributionsService;
  let prisma: any;
  let audit: any;

  beforeEach(async () => {
    prisma = {
      contributionPlan: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      contributionEnrollment: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      contributionPeriod: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        aggregate: jest.fn(),
      },
      transaction: {
        create: jest.fn().mockResolvedValue({ id: 'tx-1', amount: new Prisma.Decimal('500.00'), currency: 'BDT', status: 'completed' }),
        update: jest.fn().mockResolvedValue({ id: 'tx-1' }),
      },
      receipt: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'r-1',
          receiptNumber: 'REC-2026-00001',
          amount: new Prisma.Decimal('500.00'),
          currency: 'BDT',
          status: 'issued',
          issuedAt: new Date(),
        }),
      },
      donationFund: {
        findFirst: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      mosqueSettings: {
        findUnique: jest.fn().mockResolvedValue({ currency: 'BDT' }),
      },
      $executeRaw: jest.fn().mockResolvedValue(1),
      $transaction: jest.fn((callbackOrArray) => {
        if (typeof callbackOrArray === 'function') {
          return callbackOrArray(prisma);
        }
        return Promise.all(callbackOrArray);
      }),
    };

    audit = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContributionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: audit },
        {
          provide: MailService,
          useValue: {
            sendReceiptIssuedEmail: jest.fn().mockResolvedValue({ success: true }),
            sendMail: jest.fn().mockResolvedValue({ success: true }),
          },
        },
      ],
    }).compile();

    service = module.get<ContributionsService>(ContributionsService);
  });

  describe('Flow 1: Create Plan', () => {
    it('creates a contribution plan template without creating financial transactions', async () => {
      const fundId = 'f0000000-0000-0000-0000-000000000001';
      prisma.donationFund.findFirst.mockResolvedValue({ id: fundId });
      prisma.contributionPlan.create.mockResolvedValue({
        id: 'p0000000-0000-0000-0000-000000000001',
        mosqueId: ACTOR.mosqueId,
        name: 'Standard Monthly',
        description: 'Ongoing community support',
        amount: new Prisma.Decimal('500.00'),
        currency: 'BDT',
        frequency: ContributionFrequency.monthly,
        fundId,
        fund: { id: fundId, name: 'General Fund', slug: 'general-fund' },
        isActive: true,
        createdAt: new Date('2026-08-29T10:00:00.000Z'),
        updatedAt: new Date('2026-08-29T10:00:00.000Z'),
      });

      const res = await service.createPlan(ACTOR, {
        name: 'Standard Monthly',
        description: 'Ongoing community support',
        amount: '500.00',
        frequency: ContributionFrequency.monthly,
        fundId,
      });

      expect(res.id).toBe('p0000000-0000-0000-0000-000000000001');
      expect(res.amount).toBe('500.00');
      expect(res.isActive).toBe(true);
      expect(audit.record).toHaveBeenCalled();
    });

    it('rejects non-positive amount', async () => {
      await expect(
        service.createPlan(ACTOR, {
          name: 'Free Plan',
          amount: '0.00',
          frequency: ContributionFrequency.monthly,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Flow 2: Enroll Member & Permission Scoping', () => {
    it('successfully enrolls member and snapshots amount/frequency', async () => {
      const planId = 'p0000000-0000-0000-0000-000000000001';
      prisma.contributionPlan.findFirst.mockResolvedValue({
        id: planId,
        mosqueId: ACTOR.mosqueId,
        name: 'Standard Monthly',
        amount: new Prisma.Decimal('500.00'),
        currency: 'BDT',
        frequency: ContributionFrequency.monthly,
        isActive: true,
      });

      prisma.user.findFirst.mockResolvedValue({
        id: ACTOR.id,
        email: ACTOR.email,
        fullName: 'Treasurer User',
      });

      prisma.contributionEnrollment.findFirst.mockResolvedValue(null);
      prisma.contributionPeriod.findUnique.mockResolvedValue(null);

      prisma.contributionEnrollment.create.mockResolvedValue({
        id: 'e0000000-0000-0000-0000-000000000001',
        mosqueId: ACTOR.mosqueId,
        userId: ACTOR.id,
        user: { id: ACTOR.id, fullName: 'Treasurer User', email: ACTOR.email, phone: null },
        planId,
        plan: { id: planId, name: 'Standard Monthly', frequency: ContributionFrequency.monthly, fundId: null },
        amount: new Prisma.Decimal('500.00'),
        currency: 'BDT',
        frequency: ContributionFrequency.monthly,
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        endDate: null,
        status: ContributionEnrollmentStatus.active,
        createdAt: new Date('2026-08-29T10:00:00.000Z'),
        updatedAt: new Date('2026-08-29T10:00:00.000Z'),
      });

      const res = await service.createEnrollment(ACTOR, { planId });

      expect(res.id).toBe('e0000000-0000-0000-0000-000000000001');
      expect(res.amount).toBe('500.00');
      expect(res.status).toBe(ContributionEnrollmentStatus.active);
      expect(prisma.contributionPeriod.create).toHaveBeenCalled();
    });

    it('rejects unauthorized user from enrolling other users (Flow 16)', async () => {
      prisma.contributionPlan.findFirst.mockResolvedValue({
        id: 'p1',
        mosqueId: MEMBER_ACTOR.mosqueId,
        isActive: true,
      });

      await expect(
        service.createEnrollment(MEMBER_ACTOR, {
          planId: 'p1',
          userId: 'other-user-uuid',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects duplicate active enrollment for same user and plan (Flow 2 & 14)', async () => {
      prisma.contributionPlan.findFirst.mockResolvedValue({
        id: 'p1',
        mosqueId: ACTOR.mosqueId,
        isActive: true,
        amount: new Prisma.Decimal('500.00'),
        currency: 'BDT',
        frequency: ContributionFrequency.monthly,
      });

      prisma.user.findFirst.mockResolvedValue({ id: ACTOR.id });
      prisma.contributionEnrollment.findFirst.mockResolvedValue({ id: 'existing-enrollment' });

      await expect(
        service.createEnrollment(ACTOR, { planId: 'p1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Flow 15: Cross-Mosque Tenant Isolation', () => {
    it('rejects plan lookup for a different mosque', async () => {
      prisma.contributionPlan.findFirst.mockResolvedValue(null);

      await expect(
        service.getPlanById(ACTOR, 'foreign-plan-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects enrollment lookup for a different mosque', async () => {
      prisma.contributionEnrollment.findFirst.mockResolvedValue(null);

      await expect(
        service.getEnrollmentById(ACTOR, 'foreign-enrollment-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Flow 5, 6, 7, 14: Payment & Overdue Handling', () => {
    const fundId = 'f0000000-0000-0000-0000-000000000001';
    const periodId = 'cp-00000000-0000-0000-0000-000000000001';

    it('rejects payment on already fully paid period (Flow 14: Duplicate payment rejected)', async () => {
      prisma.contributionPeriod.findFirst.mockResolvedValue({
        id: periodId,
        mosqueId: ACTOR.mosqueId,
        expectedAmount: new Prisma.Decimal('500.00'),
        paidAmount: new Prisma.Decimal('500.00'),
        currency: 'BDT',
        status: ContributionDueStatus.paid,
      });

      await expect(
        service.payContribution(ACTOR, periodId, { amount: '500.00' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Flow 3, 4, 9, 10: Summary, Members, and History Reporting', () => {
    it('calculates comprehensive summary metrics with paidMembers and unpaidMembers', async () => {
      prisma.contributionPeriod.aggregate
        .mockResolvedValueOnce({
          _sum: { expectedAmount: new Prisma.Decimal('20000.00') },
        })
        .mockResolvedValueOnce({
          _sum: { paidAmount: new Prisma.Decimal('15000.00') },
        });

      prisma.contributionPeriod.count.mockResolvedValue(2);
      prisma.contributionEnrollment.findMany.mockResolvedValue([
        { userId: 'u1' },
        { userId: 'u2' },
        { userId: 'u3' },
      ]);
      prisma.contributionPeriod.findMany
        .mockResolvedValueOnce([{ userId: 'u1' }, { userId: 'u2' }])
        .mockResolvedValueOnce([{ userId: 'u3' }]);

      const summary = await service.getSummary(ACTOR, { month: 8, year: 2026 });

      expect(summary.expectedAmount).toBe('20000.00');
      expect(summary.collectedAmount).toBe('15000.00');
      expect(summary.outstandingAmount).toBe('5000.00');
      expect(summary.overdueCount).toBe(2);
      expect(summary.totalEnrolledMembers).toBe(3);
      expect(summary.paidMembers).toBe(2);
      expect(summary.unpaidMembers).toBe(1);
    });

    it('returns member directory with aggregated contribution metrics', async () => {
      prisma.user.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue([
        {
          id: 'u1',
          fullName: 'Abdullah Member',
          email: 'abdullah@test.org',
          phone: '+8801711111111',
          contributionEnrollments: [
            {
              id: 'e1',
              amount: new Prisma.Decimal('500.00'),
              frequency: 'monthly',
              status: 'active',
              plan: { id: 'p1', name: 'Standard Monthly' },
            },
          ],
          contributionPeriods: [
            {
              id: 'cp1',
              expectedAmount: new Prisma.Decimal('500.00'),
              paidAmount: new Prisma.Decimal('500.00'),
              status: ContributionDueStatus.paid,
              dueDate: new Date('2026-08-10T00:00:00.000Z'),
              paidAt: new Date('2026-08-05T10:00:00.000Z'),
            },
          ],
        },
      ]);

      const res = await service.getMembers(ACTOR, { page: 1, limit: 20 });
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].fullName).toBe('Abdullah Member');
      expect(res.rows[0].totalExpected).toBe('500.00');
      expect(res.rows[0].totalPaid).toBe('500.00');
      expect(res.rows[0].totalOutstanding).toBe('0.00');
      expect(res.rows[0].currentPeriodStatus).toBe('paid');
    });

    it('returns paginated contribution payment history', async () => {
      prisma.contributionPeriod.count.mockResolvedValue(1);
      prisma.contributionPeriod.findMany.mockResolvedValue([
        {
          id: 'cp-1',
          transactionId: 'tx-1',
          user: { id: 'u1', fullName: 'Abdullah', email: 'a@b.com', phone: null },
          plan: {
            id: 'p1',
            name: 'Standard Monthly',
            frequency: 'monthly',
            fundId: 'f1',
            fund: { id: 'f1', name: 'General', slug: 'general' },
          },
          paidAmount: new Prisma.Decimal('500.00'),
          currency: 'BDT',
          transaction: {
            id: 'tx-1',
            paymentMethod: 'cash',
            reference: 'REC-123',
            status: 'completed',
          },
          paidAt: new Date('2026-08-15T10:00:00.000Z'),
          updatedAt: new Date('2026-08-15T10:00:00.000Z'),
          periodStart: new Date('2026-08-01T00:00:00.000Z'),
          periodEnd: new Date('2026-08-31T00:00:00.000Z'),
        },
      ]);

      const res = await service.getHistory(ACTOR, { page: 1, limit: 20 });
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].amount).toBe('500.00');
      expect(res.rows[0].paymentMethod).toBe('cash');
      expect(res.rows[0].reference).toBe('REC-123');
    });
  });
});
