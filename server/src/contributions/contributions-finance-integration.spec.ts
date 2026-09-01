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
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { FinancialReportsService } from '../financial-reports/financial-reports.service';
import { FundBalanceService } from '../fund-balance/fund-balance.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContributionsService } from './contributions.service';

const MOSQUE_ID = 'm0000000-0000-0000-0000-000000000001';
const OTHER_MOSQUE_ID = 'm0000000-0000-0000-0000-000000000002';
const FUND_ID = 'f0000000-0000-0000-0000-000000000001';
const USER_ID = 'u0000000-0000-0000-0000-000000000001';
const PLAN_ID = 'p0000000-0000-0000-0000-000000000001';
const ENROLLMENT_ID = 'e0000000-0000-0000-0000-000000000001';
const PERIOD_ID = 'cp000000-0000-0000-0000-000000000001';

const ACTOR: AuthenticatedUser = {
  id: 'a0000000-0000-0000-0000-000000000001',
  email: 'treasurer@testmosque.org',
  role: 'treasurer',
  mosqueId: MOSQUE_ID,
  permissions: [
    'contribution.manage',
    'contribution.record',
    'contribution.view',
    'finance.view',
    'finance.manage',
    'donation.view',
  ],
  deniedPermissions: [],
  isActive: true,
};

const MEMBER_ACTOR: AuthenticatedUser = {
  id: 'a0000000-0000-0000-0000-000000000002',
  email: 'member@testmosque.org',
  role: 'member',
  mosqueId: MOSQUE_ID,
  permissions: ['contribution.viewOwn'],
  deniedPermissions: [],
  isActive: true,
};

describe('Contributions & Finance System Integration — 16 Flow Verification (Part 7)', () => {
  let contributionsService: ContributionsService;
  let fundBalanceService: FundBalanceService;
  let financialReportsService: FinancialReportsService;
  let prisma: any;
  let audit: any;

  // In-memory simulated database state for financial reconciliation
  let transactionsDb: any[] = [];
  let periodsDb: any[] = [];
  let enrollmentsDb: any[] = [];

  beforeEach(async () => {
    transactionsDb = [];
    periodsDb = [];
    enrollmentsDb = [];

    prisma = {
      donationFund: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.id === FUND_ID && where.mosqueId === MOSQUE_ID) {
            return Promise.resolve({
              id: FUND_ID,
              mosqueId: MOSQUE_ID,
              name: 'General Fund',
              slug: 'general-fund',
              openingBalance: new Prisma.Decimal('0.00'),
              currency: 'BDT',
            });
          }
          return Promise.resolve(null);
        }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: FUND_ID,
            mosqueId: MOSQUE_ID,
            name: 'General Fund',
            slug: 'general-fund',
            openingBalance: new Prisma.Decimal('0.00'),
            currency: 'BDT',
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
        aggregate: jest.fn().mockResolvedValue({ _sum: { openingBalance: new Prisma.Decimal('0.00') } }),
      },
      contributionPlan: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.id === PLAN_ID && where.mosqueId === MOSQUE_ID) {
            return Promise.resolve({
              id: PLAN_ID,
              mosqueId: MOSQUE_ID,
              name: 'Standard Monthly',
              amount: new Prisma.Decimal('500.00'),
              currency: 'BDT',
              frequency: ContributionFrequency.monthly,
              fundId: FUND_ID,
              fund: { id: FUND_ID, name: 'General Fund', slug: 'general-fund' },
              isActive: true,
            });
          }
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: PLAN_ID,
            ...data,
            fund: { id: FUND_ID, name: 'General Fund', slug: 'general-fund' },
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        ),
      },
      contributionEnrollment: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          const found = enrollmentsDb.find((e) => e.id === where.id || (e.userId === where.userId && e.planId === where.planId));
          return Promise.resolve(found || null);
        }),
        findMany: jest.fn().mockImplementation(({ where }) => {
          let rows = [...enrollmentsDb];
          if (where?.mosqueId) rows = rows.filter((e) => e.mosqueId === where.mosqueId);
          if (where?.status) rows = rows.filter((e) => e.status === where.status);
          return Promise.resolve(rows);
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const newEnrollment = {
            id: ENROLLMENT_ID,
            ...data,
            user: { id: data.userId, fullName: 'Tariq Member', email: 'tariq@test.org', phone: null },
            plan: { id: data.planId, name: 'Standard Monthly', frequency: data.frequency, fundId: FUND_ID },
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          enrollmentsDb.push(newEnrollment);
          return Promise.resolve(newEnrollment);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const idx = enrollmentsDb.findIndex((e) => e.id === where.id);
          if (idx !== -1) {
            enrollmentsDb[idx] = { ...enrollmentsDb[idx], ...data, updatedAt: new Date() };
            return Promise.resolve(enrollmentsDb[idx]);
          }
          return Promise.resolve(null);
        }),
      },
      contributionPeriod: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          const found = periodsDb.find((p) => p.id === where.id && (!where.mosqueId || p.mosqueId === where.mosqueId));
          return Promise.resolve(found || null);
        }),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.enrollmentId_periodStart) {
            const found = periodsDb.find(
              (p) =>
                p.enrollmentId === where.enrollmentId_periodStart.enrollmentId &&
                p.periodStart.getTime() === where.enrollmentId_periodStart.periodStart.getTime(),
            );
            return Promise.resolve(found || null);
          }
          return Promise.resolve(null);
        }),
        findMany: jest.fn().mockImplementation(({ where }) => {
          let rows = [...periodsDb];
          if (where?.mosqueId) rows = rows.filter((r) => r.mosqueId === where.mosqueId);
          if (where?.status?.not) rows = rows.filter((r) => r.status !== where.status.not);
          if (where?.status?.in) rows = rows.filter((r) => where.status.in.includes(r.status));
          return Promise.resolve(rows);
        }),
        count: jest.fn().mockImplementation(({ where }) => {
          let rows = [...periodsDb];
          if (where?.mosqueId) rows = rows.filter((r) => r.mosqueId === where.mosqueId);
          if (where?.status) rows = rows.filter((r) => r.status === where.status);
          return Promise.resolve(rows.length);
        }),
        aggregate: jest.fn().mockImplementation(({ where, _sum }) => {
          let rows = [...periodsDb];
          if (where?.mosqueId) rows = rows.filter((r) => r.mosqueId === where.mosqueId);
          if (where?.status?.not) rows = rows.filter((r) => r.status !== where.status.not);

          let expectedSum = new Prisma.Decimal('0.00');
          let paidSum = new Prisma.Decimal('0.00');
          for (const r of rows) {
            expectedSum = expectedSum.add(r.expectedAmount);
            paidSum = paidSum.add(r.paidAmount);
          }

          return Promise.resolve({
            _sum: {
              expectedAmount: _sum.expectedAmount ? expectedSum : undefined,
              paidAmount: _sum.paidAmount ? paidSum : undefined,
            },
          });
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const newPeriod = {
            id: `cp-${periodsDb.length + 1}`,
            ...data,
            user: { id: data.userId, fullName: 'Tariq Member', email: 'tariq@test.org', phone: null },
            plan: { id: data.planId, name: 'Standard Monthly', frequency: ContributionFrequency.monthly, fundId: FUND_ID },
            transaction: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          periodsDb.push(newPeriod);
          return Promise.resolve(newPeriod);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const idx = periodsDb.findIndex((p) => p.id === where.id);
          if (idx !== -1) {
            periodsDb[idx] = {
              ...periodsDb[idx],
              ...data,
              updatedAt: new Date(),
            };
            return Promise.resolve(periodsDb[idx]);
          }
          return Promise.resolve(null);
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      transaction: {
        create: jest.fn().mockImplementation(({ data }) => {
          const newTx = {
            id: `tx-${transactionsDb.length + 1}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          transactionsDb.push(newTx);
          return Promise.resolve(newTx);
        }),
        findMany: jest.fn().mockImplementation(({ where }) => {
          let rows = [...transactionsDb];
          if (where?.mosqueId) rows = rows.filter((t) => t.mosqueId === where.mosqueId);
          if (where?.fundId) rows = rows.filter((t) => t.fundId === where.fundId);
          if (where?.type) rows = rows.filter((t) => t.type === where.type);
          if (where?.status) rows = rows.filter((t) => t.status === where.status);
          return Promise.resolve(rows);
        }),
        aggregate: jest.fn().mockImplementation(({ where }) => {
          let rows = [...transactionsDb];
          if (where?.mosqueId) rows = rows.filter((t) => t.mosqueId === where.mosqueId);
          if (where?.fundId) rows = rows.filter((t) => t.fundId === where.fundId);
          if (where?.type) rows = rows.filter((t) => t.type === where.type);
          if (where?.status) rows = rows.filter((t) => t.status === where.status);

          let sum = new Prisma.Decimal('0.00');
          for (const r of rows) {
            sum = sum.add(r.amount);
          }
          return Promise.resolve({ _sum: { amount: sum }, _count: { _all: rows.length } });
        }),
        count: jest.fn().mockImplementation(({ where }) => {
          let rows = [...transactionsDb];
          if (where?.mosqueId) rows = rows.filter((t) => t.mosqueId === where.mosqueId);
          return Promise.resolve(rows.length);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const idx = transactionsDb.findIndex((t) => t.id === where.id);
          if (idx !== -1) {
            transactionsDb[idx] = { ...transactionsDb[idx], ...data };
            return Promise.resolve(transactionsDb[idx]);
          }
          return Promise.resolve(null);
        }),
      },
      receipt: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'r-1',
            receiptNumber: data.receiptNumber,
            amount: data.amount,
            currency: data.currency,
            status: data.status,
            issuedAt: data.issuedAt,
          }),
        ),
      },
      donation: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: new Prisma.Decimal('0.00') }, _count: { _all: 0 } }),
      },
      expense: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: new Prisma.Decimal('0.00') }, _count: { _all: 0 } }),
      },
      salaryRecord: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: new Prisma.Decimal('0.00') }, _count: { _all: 0 } }),
      },
      budget: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: new Prisma.Decimal('0.00') }, _count: { _all: 0 } }),
      },
      user: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.id === USER_ID || where.id === ACTOR.id) {
            return Promise.resolve({
              id: where.id,
              mosqueId: MOSQUE_ID,
              email: 'tariq@test.org',
              fullName: 'Tariq Member',
            });
          }
          return Promise.resolve(null);
        }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
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
        FundBalanceService,
        FinancialReportsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: audit },
        {
          provide: MailService,
          useValue: {
            sendContributionReminderEmail: jest.fn().mockResolvedValue(true),
            sendContributionReceiptEmail: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    contributionsService = module.get<ContributionsService>(ContributionsService);
    fundBalanceService = module.get<FundBalanceService>(FundBalanceService);
    financialReportsService = module.get<FinancialReportsService>(FinancialReportsService);
  });

  it('verifies flows 1 through 16 end-to-end', async () => {
    // Flow 1: Create plan
    const plan = await contributionsService.createPlan(ACTOR, {
      name: 'Standard Monthly',
      amount: '500.00',
      frequency: ContributionFrequency.monthly,
      fundId: FUND_ID,
    });
    expect(plan.id).toBe(PLAN_ID);
    expect(plan.amount).toBe('500.00');

    // Flow 2: Enroll member
    const enrollment = await contributionsService.createEnrollment(ACTOR, {
      planId: PLAN_ID,
      userId: USER_ID,
    });
    expect(enrollment.status).toBe(ContributionEnrollmentStatus.active);

    // Flow 3 & 11: Generate expected contribution & automated overdue detection (since Aug 10 dueDate < today)
    expect(periodsDb).toHaveLength(1);
    const period = periodsDb[0];
    expect(period.expectedAmount.toString()).toBe('500');
    expect(period.status).toBe(ContributionDueStatus.overdue);

    // Flow 4: Show pending contribution (Expected: 500, Collected: 0, Outstanding: 500)
    const summaryBefore = await contributionsService.getSummary(ACTOR);
    expect(summaryBefore.expectedAmount).toBe('500.00');
    expect(summaryBefore.collectedAmount).toBe('0.00');
    expect(summaryBefore.outstandingAmount).toBe('500.00');

    // Flow 8 & 9 & 10 baseline: Zero fund balance, zero income before payment
    const fundBefore = await fundBalanceService.getFundBalance(ACTOR, FUND_ID);
    expect(fundBefore.availableBalance).toBe('0.00');
    const reportBefore = await financialReportsService.summary(ACTOR, {});
    expect(reportBefore.income?.total).toBe('0.00');

    // Flow 5: Record payment
    const payResult = await contributionsService.payContribution(ACTOR, period.id, {
      amount: '500.00',
      paymentMethod: PaymentMethod.cash,
    });

    // Flow 6: Contribution becomes PAID
    expect(payResult.period.status).toBe(ContributionDueStatus.paid);
    expect(payResult.period.paidAmount).toBe('500.00');

    // Flow 7: Transaction is created exactly once
    expect(transactionsDb).toHaveLength(1);
    expect(transactionsDb[0].type).toBe(TransactionType.income);
    expect(transactionsDb[0].status).toBe(TransactionStatus.completed);

    // Flow 8: Fund balance increases exactly once (+500)
    const fundAfter = await fundBalanceService.getFundBalance(ACTOR, FUND_ID);
    expect(fundAfter.availableBalance).toBe('500.00');

    // Flow 9: Financial Report includes payment (+500)
    // Flow 10: Dashboard includes payment (netBalance: +500)
    const reportAfter = await financialReportsService.summary(ACTOR, {});
    expect(reportAfter.income?.total).toBe('500.00');
    expect(reportAfter.netBalance).toBe('500.00');

    // Flow 14: Duplicate payment is rejected
    await expect(
      contributionsService.payContribution(ACTOR, period.id, { amount: '500.00' }),
    ).rejects.toThrow(BadRequestException);

    // Flow 12: Pause enrollment stops future obligations
    const paused = await contributionsService.updateEnrollmentStatus(ACTOR, enrollment.id, {
      status: ContributionEnrollmentStatus.paused,
    });
    expect(paused.status).toBe(ContributionEnrollmentStatus.paused);

    // Flow 13: Cancel enrollment stops future obligations
    const cancelled = await contributionsService.updateEnrollmentStatus(ACTOR, enrollment.id, {
      status: ContributionEnrollmentStatus.cancelled,
    });
    expect(cancelled.status).toBe(ContributionEnrollmentStatus.cancelled);

    // Flow 15: Cross-mosque access is rejected
    const foreignActor: AuthenticatedUser = { ...ACTOR, mosqueId: OTHER_MOSQUE_ID };
    await expect(
      contributionsService.getPlanById(foreignActor, PLAN_ID),
    ).rejects.toThrow(NotFoundException);

    // Flow 16: Unauthorized users cannot modify contributions
    await expect(
      contributionsService.createEnrollment(MEMBER_ACTOR, {
        planId: PLAN_ID,
        userId: 'other-user-uuid',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
