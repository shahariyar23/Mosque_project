import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ContributionDueStatus,
  ContributionEnrollmentStatus,
  ContributionFrequency,
  DonationStatus,
  PaymentMethod,
  Prisma,
  ReceiptStatus,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';

import { AuditLogService } from '../audit/audit-log.service';
import { MailService } from '../mail/mail.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { ContributionsService } from '../contributions/contributions.service';
import { DonationsService } from '../donations/donations.service';
import { FinancialReportsService } from '../financial-reports/financial-reports.service';
import { FundBalanceService } from '../fund-balance/fund-balance.service';
import { FundTransfersService } from '../fund-transfers/fund-transfers.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReceiptsService } from './receipts.service';

const MOSQUE_ID = 'm0000000-0000-0000-0000-000000000001';
const OTHER_MOSQUE_ID = 'm0000000-0000-0000-0000-000000000002';

const GENERAL_FUND_ID = 'f0000000-0000-0000-0000-000000000001';
const IMAM_SALARY_FUND_ID = 'f0000000-0000-0000-0000-000000000002';
const EDUCATION_FUND_ID = 'f0000000-0000-0000-0000-000000000003';

const USER_FATIMA = 'u0000000-0000-0000-0000-000000000001';
const PLAN_ID = 'p0000000-0000-0000-0000-000000000001';

const ADMIN: AuthenticatedUser = {
  id: 'a0000000-0000-0000-0000-000000000001',
  email: 'treasurer@testmosque.org',
  role: 'treasurer',
  mosqueId: MOSQUE_ID,
  permissions: [
    'receipt.view',
    'receipt.issue',
    'receipt.void',
    'finance.view',
    'finance.manage',
    'fund.view',
    'fund.transfer',
    'transaction.view',
    'transaction.create',
    'contribution.manage',
    'contribution.record',
    'contribution.view',
    'donation.create',
    'donation.view',
  ],
  deniedPermissions: [],
  isActive: true,
};

const NORMAL_MEMBER: AuthenticatedUser = {
  id: 'a0000000-0000-0000-0000-000000000002',
  email: 'member@testmosque.org',
  role: 'member',
  mosqueId: MOSQUE_ID,
  permissions: ['contribution.viewOwn'],
  deniedPermissions: [],
  isActive: true,
};

describe('Comprehensive 18-Test Financial Invariant Verification Suite', () => {
  let receiptsService: ReceiptsService;
  let donationsService: DonationsService;
  let contributionsService: ContributionsService;
  let fundBalanceService: FundBalanceService;
  let fundTransfersService: FundTransfersService;
  let financialReportsService: FinancialReportsService;
  let prisma: any;
  let auditLogs: any[] = [];

  // In-memory simulated database state
  let fundsDb: any[] = [];
  let transactionsDb: any[] = [];
  let receiptsDb: any[] = [];
  let donationsDb: any[] = [];
  let plansDb: any[] = [];
  let enrollmentsDb: any[] = [];
  let periodsDb: any[] = [];

  beforeEach(async () => {
    auditLogs = [];
    transactionsDb = [];
    receiptsDb = [];
    donationsDb = [];
    plansDb = [];
    enrollmentsDb = [];
    periodsDb = [];

    fundsDb = [
      {
        id: GENERAL_FUND_ID,
        mosqueId: MOSQUE_ID,
        name: 'General Fund',
        slug: 'general-fund',
        openingBalance: new Prisma.Decimal('5000.00'),
        currency: 'BDT',
      },
      {
        id: IMAM_SALARY_FUND_ID,
        mosqueId: MOSQUE_ID,
        name: 'Imam Salary Fund',
        slug: 'imam-salary-fund',
        openingBalance: new Prisma.Decimal('5000.00'),
        currency: 'BDT',
      },
      {
        id: EDUCATION_FUND_ID,
        mosqueId: MOSQUE_ID,
        name: 'Education Fund',
        slug: 'education-fund',
        openingBalance: new Prisma.Decimal('0.00'),
        currency: 'BDT',
      },
    ];

    prisma = {
      donationFund: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          const found = fundsDb.find(
            (f) =>
              (!where.id || f.id === where.id) &&
              (!where.mosqueId || f.mosqueId === where.mosqueId),
          );
          return Promise.resolve(found || null);
        }),
        findMany: jest.fn().mockImplementation(({ where }) => {
          let list = [...fundsDb];
          if (where?.mosqueId) list = list.filter((f) => f.mosqueId === where.mosqueId);
          return Promise.resolve(list);
        }),
        count: jest.fn().mockImplementation(({ where }) => {
          let list = [...fundsDb];
          if (where?.mosqueId) list = list.filter((f) => f.mosqueId === where.mosqueId);
          return Promise.resolve(list.length);
        }),
        aggregate: jest.fn().mockImplementation(({ where }) => {
          let list = [...fundsDb];
          if (where?.mosqueId) list = list.filter((f) => f.mosqueId === where.mosqueId);
          const sum = list.reduce(
            (acc, f) => acc.add(f.openingBalance),
            new Prisma.Decimal('0.00'),
          );
          return Promise.resolve({ _sum: { openingBalance: sum } });
        }),
      },
      donation: {
        create: jest.fn().mockImplementation(({ data }) => {
          const fund = fundsDb.find((f) => f.id === data.fundId) || fundsDb[0];
          const doc = {
            id: `don-${donationsDb.length + 1}`,
            ...data,
            donatedAt: data.donatedAt ? new Date(data.donatedAt) : new Date(),
            fund,
            donor: { id: data.userId || USER_FATIMA, fullName: data.donorName || 'Fatima' },
            campaign: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          donationsDb.push(doc);
          return Promise.resolve(doc);
        }),
        findFirst: jest.fn().mockImplementation(({ where }) => {
          const found = donationsDb.find((d) => d.id === where.id);
          return Promise.resolve(found || null);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const idx = donationsDb.findIndex((d) => d.id === where.id);
          if (idx !== -1) {
            donationsDb[idx] = { ...donationsDb[idx], ...data };
            return Promise.resolve(donationsDb[idx]);
          }
          return Promise.resolve(null);
        }),
        aggregate: jest.fn().mockImplementation(({ where }) => {
          const filtered = donationsDb.filter(
            (d) => !where?.status || d.status === where.status,
          );
          const sum = filtered.reduce((acc, d) => acc.add(d.amount), new Prisma.Decimal('0.00'));
          return Promise.resolve({ _sum: { amount: sum }, _count: { _all: filtered.length } });
        }),
      },
      contributionPlan: {
        create: jest.fn().mockImplementation(({ data }) => {
          const fund = fundsDb.find((f) => f.id === data.fundId) || fundsDb[0];
          const doc = {
            id: PLAN_ID,
            ...data,
            fund,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          plansDb.push(doc);
          return Promise.resolve(doc);
        }),
        findFirst: jest.fn().mockImplementation(({ where }) => {
          const found = plansDb.find(
            (p) =>
              (!where.id || p.id === where.id) &&
              (!where.mosqueId || p.mosqueId === where.mosqueId),
          );
          return Promise.resolve(found || null);
        }),
      },
      contributionEnrollment: {
        create: jest.fn().mockImplementation(({ data }) => {
          const plan = plansDb.find((p) => p.id === data.planId);
          const doc = {
            id: `enr-${enrollmentsDb.length + 1}`,
            ...data,
            plan,
            user: { id: data.userId, fullName: 'Fatima', email: 'fatima@test.org', phone: null },
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          enrollmentsDb.push(doc);
          return Promise.resolve(doc);
        }),
        findFirst: jest.fn().mockImplementation(({ where }) => {
          const found = enrollmentsDb.find(
            (e) =>
              (!where.id || e.id === where.id) &&
              (!where.userId || e.userId === where.userId) &&
              (!where.planId || e.planId === where.planId),
          );
          return Promise.resolve(found || null);
        }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      contributionPeriod: {
        create: jest.fn().mockImplementation(({ data }) => {
          const plan = plansDb.find((p) => p.id === data.planId);
          const doc = {
            id: `cp-${periodsDb.length + 1}`,
            ...data,
            plan,
            user: { id: data.userId, fullName: 'Fatima', email: 'fatima@test.org', phone: null },
            transaction: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          periodsDb.push(doc);
          return Promise.resolve(doc);
        }),
        findFirst: jest.fn().mockImplementation(({ where }) => {
          const found = periodsDb.find(
            (p) =>
              (!where.id || p.id === where.id) &&
              (!where.mosqueId || p.mosqueId === where.mosqueId),
          );
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
        update: jest.fn().mockImplementation(({ where, data }) => {
          const idx = periodsDb.findIndex((p) => p.id === where.id);
          if (idx !== -1) {
            periodsDb[idx] = { ...periodsDb[idx], ...data };
            return Promise.resolve(periodsDb[idx]);
          }
          return Promise.resolve(null);
        }),
      },
      transaction: {
        create: jest.fn().mockImplementation(({ data }) => {
          const newTx = {
            id: `tx-${transactionsDb.length + 1}`,
            ...data,
            receipt: null,
            donation: null,
            transactedAt: data.transactedAt || new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          transactionsDb.push(newTx);
          return Promise.resolve(newTx);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const idx = transactionsDb.findIndex((t) => t.id === where.id);
          if (idx !== -1) {
            transactionsDb[idx] = { ...transactionsDb[idx], ...data };
            return Promise.resolve(transactionsDb[idx]);
          }
          return Promise.resolve(null);
        }),
        findFirst: jest.fn().mockImplementation(({ where }) => {
          const found = transactionsDb.find((t) => {
            if (where.id && t.id !== where.id) return false;
            if (where.mosqueId && t.mosqueId !== where.mosqueId) return false;
            if (where.status && t.status !== where.status) return false;
            if (where.type && t.type !== where.type) return false;
            return true;
          });
          if (!found) return Promise.resolve(null);
          const r = receiptsDb.find((rc) => rc.id === found.receiptId);
          return Promise.resolve({ ...found, receipt: r || null });
        }),
        findMany: jest.fn().mockImplementation(({ where }) => {
          let rows = [...transactionsDb];
          if (where?.mosqueId) rows = rows.filter((t) => t.mosqueId === where.mosqueId);
          if (where?.fundId) rows = rows.filter((t) => t.fundId === where.fundId || t.toFundId === where.fundId);
          if (where?.type) rows = rows.filter((t) => t.type === where.type);
          if (where?.status) {
            if (typeof where.status === 'string') rows = rows.filter((t) => t.status === where.status);
            else if (where.status.in) rows = rows.filter((t) => where.status.in.includes(t.status));
          }
          return Promise.resolve(rows);
        }),
        aggregate: jest.fn().mockImplementation(({ where }) => {
          let rows = [...transactionsDb];
          if (where?.mosqueId) rows = rows.filter((t) => t.mosqueId === where.mosqueId);
          if (where?.fundId) rows = rows.filter((t) => t.fundId === where.fundId);
          if (where?.toFundId) rows = rows.filter((t) => t.toFundId === where.toFundId);
          if (where?.type) rows = rows.filter((t) => t.type === where.type);
          if (where?.status) {
            if (typeof where.status === 'string') rows = rows.filter((t) => t.status === where.status);
            else if (where.status.in) rows = rows.filter((t) => where.status.in.includes(t.status));
          }

          let sum = new Prisma.Decimal('0.00');
          for (const r of rows) {
            sum = sum.add(r.amount);
          }
          return Promise.resolve({ _sum: { amount: sum }, _count: { _all: rows.length } });
        }),
        count: jest.fn().mockImplementation(({ where }) => {
          let rows = [...transactionsDb];
          if (where?.mosqueId) rows = rows.filter((t) => t.mosqueId === where.mosqueId);
          if (where?.type) rows = rows.filter((t) => t.type === where.type);
          if (where?.status) {
            if (typeof where.status === 'string') rows = rows.filter((t) => t.status === where.status);
            else if (where.status.in) rows = rows.filter((t) => where.status.in.includes(t.status));
          }
          return Promise.resolve(rows.length);
        }),
      },
      receipt: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          const found = receiptsDb.find((r) => {
            if (where.id && r.id !== where.id) return false;
            if (where.mosqueId && r.mosqueId !== where.mosqueId) return false;
            if (where.receiptNumber?.startsWith && !r.receiptNumber.startsWith(where.receiptNumber.startsWith)) return false;
            if (where.status && r.status !== where.status) return false;
            if (where.donationId && r.donationId !== where.donationId) return false;
            return true;
          });
          return Promise.resolve(found || null);
        }),
        findMany: jest.fn().mockImplementation(({ where }) => {
          let rows = [...receiptsDb];
          if (where?.mosqueId) rows = rows.filter((r) => r.mosqueId === where.mosqueId);
          if (where?.status) rows = rows.filter((r) => r.status === where.status);
          return Promise.resolve(rows);
        }),
        count: jest.fn().mockImplementation(({ where }) => {
          let rows = [...receiptsDb];
          if (where?.mosqueId) rows = rows.filter((r) => r.mosqueId === where.mosqueId);
          if (where?.status) rows = rows.filter((r) => r.status === where.status);
          return Promise.resolve(rows.length);
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const fund = fundsDb.find((f) => f.id === data.fundId) || fundsDb[0];
          const newReceipt = {
            id: `rec-${receiptsDb.length + 1}`,
            ...data,
            fund,
            donor: { id: data.userId || USER_FATIMA, fullName: 'Fatima' },
            donation: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          receiptsDb.push(newReceipt);
          return Promise.resolve(newReceipt);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const idx = receiptsDb.findIndex((r) => r.id === where.id);
          if (idx !== -1) {
            receiptsDb[idx] = { ...receiptsDb[idx], ...data };
            return Promise.resolve(receiptsDb[idx]);
          }
          return Promise.resolve(null);
        }),
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
        findFirst: jest.fn().mockResolvedValue({ id: USER_FATIMA, fullName: 'Fatima', email: 'fatima@test.org' }),
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

    const auditMock = {
      record: jest.fn().mockImplementation((entry) => {
        auditLogs.push(entry);
        return Promise.resolve(undefined);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptsService,
        DonationsService,
        ContributionsService,
        FundBalanceService,
        FundTransfersService,
        FinancialReportsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: auditMock },
        {
          provide: MailService,
          useValue: {
            sendReceiptIssuedEmail: jest.fn().mockResolvedValue({ success: true }),
            sendMail: jest.fn().mockResolvedValue({ success: true }),
          },
        },
      ],
    }).compile();

    receiptsService = module.get<ReceiptsService>(ReceiptsService);
    donationsService = module.get<DonationsService>(DonationsService);
    contributionsService = module.get<ContributionsService>(ContributionsService);
    fundBalanceService = module.get<FundBalanceService>(FundBalanceService);
    fundTransfersService = module.get<FundTransfersService>(FundTransfersService);
    financialReportsService = module.get<FinancialReportsService>(FinancialReportsService);
  });

  // =========================================================================
  // Test 1: Successful payment -> balance -> receipt
  // =========================================================================
  it('1. Successful payment -> balance -> receipt', async () => {
    // Start: General Fund = ৳5,000, Imam Salary Fund = ৳5,000. Total = ৳10,000
    const genBalInit = await fundBalanceService.getFundBalance(ADMIN, GENERAL_FUND_ID);
    const imamBalInit = await fundBalanceService.getFundBalance(ADMIN, IMAM_SALARY_FUND_ID);
    expect(genBalInit.availableBalance).toBe('5000.00');
    expect(imamBalInit.availableBalance).toBe('5000.00');

    // Fatima pays ৳1,500 into Imam Salary Fund (completed)
    const payment = await donationsService.create(ADMIN, {
      fundId: IMAM_SALARY_FUND_ID,
      amount: '1500.00',
      currency: 'BDT',
      paymentMethod: PaymentMethod.cash,
      status: DonationStatus.completed,
      donorName: 'Fatima',
    });

    expect(payment.amount).toBe('1500.00');
    expect(transactionsDb).toHaveLength(1);
    expect(new Prisma.Decimal(transactionsDb[0].amount).toFixed(2)).toBe('1500.00');

    // Imam Salary Fund = ৳6,500
    const imamFundBal = await fundBalanceService.getFundBalance(ADMIN, IMAM_SALARY_FUND_ID);
    expect(imamFundBal.availableBalance).toBe('6500.00');

    // Main Balance (Total of all funds) = ৳11,500 (5,000 + 6,500)
    const genBalNow = await fundBalanceService.getFundBalance(ADMIN, GENERAL_FUND_ID);
    const totalMainBalance = parseFloat(genBalNow.availableBalance) + parseFloat(imamFundBal.availableBalance);
    expect(totalMainBalance.toFixed(2)).toBe('11500.00');

    // Receipt = REC-2026-xxxxx
    expect(receiptsDb).toHaveLength(1);
    expect(receiptsDb[0].receiptNumber).toBe('REC-2026-00001');
    expect(new Prisma.Decimal(receiptsDb[0].amount).toFixed(2)).toBe('1500.00');
  });

  // =========================================================================
  // Test 2: Receipt creation / viewing must NOT increase balance
  // =========================================================================
  it('2. Receipt creation must NOT increase balance', async () => {
    await donationsService.create(ADMIN, {
      fundId: IMAM_SALARY_FUND_ID,
      amount: '1500.00',
      paymentMethod: PaymentMethod.cash,
      status: DonationStatus.completed,
      donorName: 'Fatima',
    });

    // View, print, download, refresh receipt
    const receipt = await receiptsService.findOne(ADMIN, receiptsDb[0].id);
    expect(receipt.receiptNumber).toBe('REC-2026-00001');

    await receiptsService.findMany(ADMIN, {});
    await receiptsService.findOne(ADMIN, receiptsDb[0].id);

    // Balances MUST remain ৳6,500 and ৳11,500 (NOT ৳13,000)
    const imamFundBal = await fundBalanceService.getFundBalance(ADMIN, IMAM_SALARY_FUND_ID);
    expect(imamFundBal.availableBalance).toBe('6500.00');

    const genBal = await fundBalanceService.getFundBalance(ADMIN, GENERAL_FUND_ID);
    const totalMainBalance = parseFloat(genBal.availableBalance) + parseFloat(imamFundBal.availableBalance);
    expect(totalMainBalance.toFixed(2)).toBe('11500.00');
  });

  // =========================================================================
  // Test 3: Duplicate receipt test
  // =========================================================================
  it('3. Duplicate receipt test', async () => {
    await donationsService.create(ADMIN, {
      fundId: IMAM_SALARY_FUND_ID,
      amount: '1500.00',
      paymentMethod: PaymentMethod.cash,
      status: DonationStatus.completed,
      donorName: 'Fatima',
    });

    // Try to issue another receipt for the same transaction
    await expect(
      receiptsService.create(ADMIN, {
        transactionId: transactionsDb[0].id,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(receiptsDb).toHaveLength(1);
    const imamFundBal = await fundBalanceService.getFundBalance(ADMIN, IMAM_SALARY_FUND_ID);
    expect(imamFundBal.availableBalance).toBe('6500.00');
  });

  // =========================================================================
  // Test 4: Pending payment test
  // =========================================================================
  it('4. Pending payment test', async () => {
    transactionsDb.push({
      id: 'tx-pending-1',
      mosqueId: MOSQUE_ID,
      type: TransactionType.income,
      status: TransactionStatus.pending,
      amount: new Prisma.Decimal('1500.00'),
      currency: 'BDT',
      fundId: IMAM_SALARY_FUND_ID,
      receiptId: null,
    });

    await expect(
      receiptsService.create(ADMIN, {
        transactionId: 'tx-pending-1',
      }),
    ).rejects.toThrow(BadRequestException);

    // Balances unchanged
    const imamFundBal = await fundBalanceService.getFundBalance(ADMIN, IMAM_SALARY_FUND_ID);
    expect(imamFundBal.availableBalance).toBe('5000.00');
  });

  // =========================================================================
  // Test 5: Failed payment test
  // =========================================================================
  it('5. Failed payment test', async () => {
    transactionsDb.push({
      id: 'tx-failed-1',
      mosqueId: MOSQUE_ID,
      type: TransactionType.income,
      status: 'failed',
      amount: new Prisma.Decimal('1500.00'),
      currency: 'BDT',
      fundId: IMAM_SALARY_FUND_ID,
      receiptId: null,
    });

    await expect(
      receiptsService.create(ADMIN, {
        transactionId: 'tx-failed-1',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(receiptsDb).toHaveLength(0);
  });

  // =========================================================================
  // Test 6: Cancelled / void transaction test
  // =========================================================================
  it('6. Cancelled/void transaction test', async () => {
    transactionsDb.push({
      id: 'tx-cancelled-1',
      mosqueId: MOSQUE_ID,
      type: TransactionType.income,
      status: TransactionStatus.cancelled,
      amount: new Prisma.Decimal('1500.00'),
      currency: 'BDT',
      fundId: IMAM_SALARY_FUND_ID,
      receiptId: null,
    });

    await expect(
      receiptsService.create(ADMIN, {
        transactionId: 'tx-cancelled-1',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(receiptsDb).toHaveLength(0);
  });

  // =========================================================================
  // Test 7: Expense test
  // =========================================================================
  it('7. Expense test', async () => {
    // General Fund starts at 5,000. Add 2,000 income -> ৳7,000
    transactionsDb.push({
      id: 'tx-inc-gen',
      mosqueId: MOSQUE_ID,
      type: TransactionType.income,
      status: TransactionStatus.completed,
      amount: new Prisma.Decimal('2000.00'),
      currency: 'BDT',
      fundId: GENERAL_FUND_ID,
      receiptId: null,
    });

    const preExpense = await fundBalanceService.getFundBalance(ADMIN, GENERAL_FUND_ID);
    expect(preExpense.availableBalance).toBe('7000.00');

    // Create Expense = ৳2,000
    transactionsDb.push({
      id: 'tx-exp-1',
      mosqueId: MOSQUE_ID,
      type: TransactionType.expense,
      status: TransactionStatus.completed,
      amount: new Prisma.Decimal('2000.00'),
      currency: 'BDT',
      fundId: GENERAL_FUND_ID,
      category: 'Utilities',
      receiptId: null,
    });

    // General Fund = ৳5,000
    const postExpense = await fundBalanceService.getFundBalance(ADMIN, GENERAL_FUND_ID);
    expect(postExpense.availableBalance).toBe('5000.00');

    // Main Balance (5,000 General + 5,000 Imam Salary) = ৳10,000
    const imamBal = await fundBalanceService.getFundBalance(ADMIN, IMAM_SALARY_FUND_ID);
    const totalMainBalance = parseFloat(postExpense.availableBalance) + parseFloat(imamBal.availableBalance);
    expect(totalMainBalance.toFixed(2)).toBe('10000.00');

    // Receipt logic was not touched
    expect(receiptsDb).toHaveLength(0);
  });

  // =========================================================================
  // Test 8: Insufficient-fund expense test
  // =========================================================================
  it('8. Insufficient-fund expense test', async () => {
    // Education Fund has ৳0 balance
    const check = await fundBalanceService.checkSufficientFunds(ADMIN, EDUCATION_FUND_ID, '1500.00');
    expect(check.sufficient).toBe(false);
    expect(check.availableBalance).toBe('0.00');
  });

  // =========================================================================
  // Test 9: Fund transfer test
  // =========================================================================
  it('9. Fund transfer test', async () => {
    // Set General Fund = ৳10,000 (+5,000 tx) and Imam Salary = ৳3,000 (-2,000 tx)
    transactionsDb.push({
      id: 'tx-gen-plus',
      mosqueId: MOSQUE_ID,
      type: TransactionType.income,
      status: TransactionStatus.completed,
      amount: new Prisma.Decimal('5000.00'),
      currency: 'BDT',
      fundId: GENERAL_FUND_ID,
    });
    transactionsDb.push({
      id: 'tx-imam-minus',
      mosqueId: MOSQUE_ID,
      type: TransactionType.expense,
      status: TransactionStatus.completed,
      amount: new Prisma.Decimal('2000.00'),
      currency: 'BDT',
      fundId: IMAM_SALARY_FUND_ID,
    });

    const genBefore = await fundBalanceService.getFundBalance(ADMIN, GENERAL_FUND_ID);
    expect(genBefore.availableBalance).toBe('10000.00');
    const imamBefore = await fundBalanceService.getFundBalance(ADMIN, IMAM_SALARY_FUND_ID);
    expect(imamBefore.availableBalance).toBe('3000.00');

    // Transfer ৳2,000 General -> Imam Salary
    transactionsDb.push({
      id: 'tx-tr-1',
      mosqueId: MOSQUE_ID,
      type: TransactionType.transfer,
      status: TransactionStatus.completed,
      amount: new Prisma.Decimal('2000.00'),
      currency: 'BDT',
      fundId: GENERAL_FUND_ID,
      toFundId: IMAM_SALARY_FUND_ID,
    });

    const genAfter = await fundBalanceService.getFundBalance(ADMIN, GENERAL_FUND_ID);
    expect(genAfter.availableBalance).toBe('8000.00');

    const imamAfter = await fundBalanceService.getFundBalance(ADMIN, IMAM_SALARY_FUND_ID);
    expect(imamAfter.availableBalance).toBe('5000.00');

    // Total mosque funds remain ৳13,000 before & after
    const totalMainBalance = parseFloat(genAfter.availableBalance) + parseFloat(imamAfter.availableBalance);
    expect(totalMainBalance.toFixed(2)).toBe('13000.00');
  });

  // =========================================================================
  // Test 10: Insufficient-fund transfer
  // =========================================================================
  it('10. Insufficient-fund transfer', async () => {
    // Education Fund has 0 balance, trying to transfer 1,500
    const check = await fundBalanceService.checkSufficientFunds(ADMIN, EDUCATION_FUND_ID, '1500.00');
    expect(check.sufficient).toBe(false);
  });

  // =========================================================================
  // Test 11: Salary test
  // =========================================================================
  it('11. Salary test', async () => {
    // Fund starts with ৳5,000, add ৳15,000 income -> ৳20,000
    transactionsDb.push({
      id: 'tx-imam-20k',
      mosqueId: MOSQUE_ID,
      type: TransactionType.income,
      status: TransactionStatus.completed,
      amount: new Prisma.Decimal('15000.00'),
      currency: 'BDT',
      fundId: IMAM_SALARY_FUND_ID,
    });

    const preSalary = await fundBalanceService.getFundBalance(ADMIN, IMAM_SALARY_FUND_ID);
    expect(preSalary.availableBalance).toBe('20000.00');

    // Give Imam Salary = ৳15,000
    transactionsDb.push({
      id: 'tx-sal-15k',
      mosqueId: MOSQUE_ID,
      type: TransactionType.expense,
      status: TransactionStatus.completed,
      amount: new Prisma.Decimal('15000.00'),
      currency: 'BDT',
      fundId: IMAM_SALARY_FUND_ID,
      category: 'Salary',
    });

    const postSalary = await fundBalanceService.getFundBalance(ADMIN, IMAM_SALARY_FUND_ID);
    expect(postSalary.availableBalance).toBe('5000.00');

    // Trying ৳25,000 salary exceeds ৳5,000 remaining balance
    const checkOver = await fundBalanceService.checkSufficientFunds(ADMIN, IMAM_SALARY_FUND_ID, '25000.00');
    expect(checkOver.sufficient).toBe(false);
  });

  // =========================================================================
  // Test 12: Contribution plan test
  // =========================================================================
  it('12. Contribution plan test', async () => {
    // 1. Create Plan: Imam Salary, ৳1,500/month
    const plan = await contributionsService.createPlan(ADMIN, {
      name: 'Imam Salary Plan',
      amount: '1500.00',
      currency: 'BDT',
      frequency: ContributionFrequency.monthly,
      fundId: IMAM_SALARY_FUND_ID,
    });

    // Check balance immediately: must remain ৳5,000 (Commitment only, 0 income)
    const fundBalImmediately = await fundBalanceService.getFundBalance(ADMIN, IMAM_SALARY_FUND_ID);
    expect(fundBalImmediately.availableBalance).toBe('5000.00');

    // 2. Enroll Fatima
    const enrollment = await contributionsService.createEnrollment(ADMIN, {
      planId: plan.id,
      userId: USER_FATIMA,
    });

    // 3. Fatima actually pays ৳1,500
    const period = periodsDb[0];
    const paid = await contributionsService.payContribution(ADMIN, period.id, {
      amount: '1500.00',
    });

    expect(paid.period.status).toBe(ContributionDueStatus.paid);
    expect(paid.transaction).toBeDefined();
    expect(paid.receipt).toBeDefined();
    expect(paid.receipt?.receiptNumber).toBe('REC-2026-00001');

    // Balance now increases by ৳1,500
    const fundBalAfterPay = await fundBalanceService.getFundBalance(ADMIN, IMAM_SALARY_FUND_ID);
    expect(fundBalAfterPay.availableBalance).toBe('6500.00');
  });

  // =========================================================================
  // Test 13: Receipt amount manipulation test (Security)
  // =========================================================================
  it('13. Receipt amount manipulation test', async () => {
    // Record verified transaction of ৳1,500
    const tx = await prisma.transaction.create({
      data: {
        mosqueId: MOSQUE_ID,
        type: TransactionType.income,
        status: TransactionStatus.completed,
        amount: new Prisma.Decimal('1500.00'),
        currency: 'BDT',
        fundId: IMAM_SALARY_FUND_ID,
        receiptId: null,
      },
    });

    // Caller attempts to submit amount = ৳5,000
    const receipt = await receiptsService.create(ADMIN, {
      transactionId: tx.id,
      amount: '5000.00', // Manipulated amount
    });

    // Backend MUST use authoritative transaction amount (৳1,500)
    expect(receipt.amount).toBe('1500.00');
  });

  // =========================================================================
  // Test 14: Different fund test
  // =========================================================================
  it('14. Different fund test', async () => {
    await donationsService.create(ADMIN, { fundId: GENERAL_FUND_ID, amount: '1000.00', paymentMethod: PaymentMethod.cash, status: DonationStatus.completed });
    await donationsService.create(ADMIN, { fundId: IMAM_SALARY_FUND_ID, amount: '2000.00', paymentMethod: PaymentMethod.cash, status: DonationStatus.completed });
    await donationsService.create(ADMIN, { fundId: EDUCATION_FUND_ID, amount: '500.00', paymentMethod: PaymentMethod.cash, status: DonationStatus.completed });

    const gen = await fundBalanceService.getFundBalance(ADMIN, GENERAL_FUND_ID);
    expect(gen.availableBalance).toBe('6000.00'); // 5000 + 1000

    const imam = await fundBalanceService.getFundBalance(ADMIN, IMAM_SALARY_FUND_ID);
    expect(imam.availableBalance).toBe('7000.00'); // 5000 + 2000

    const edu = await fundBalanceService.getFundBalance(ADMIN, EDUCATION_FUND_ID);
    expect(edu.availableBalance).toBe('500.00'); // 0 + 500

    const report = await financialReportsService.summary(ADMIN, {});
    expect(report.income?.total).toBe('3500.00');
  });

  // =========================================================================
  // Test 15: Refresh / reload test
  // =========================================================================
  it('15. Refresh/reload test', async () => {
    await donationsService.create(ADMIN, { fundId: GENERAL_FUND_ID, amount: '1500.00', paymentMethod: PaymentMethod.cash, status: DonationStatus.completed });

    // Repeated calls to verify deterministic calculation without caching drift
    const r1 = await fundBalanceService.getFundBalance(ADMIN, GENERAL_FUND_ID);
    const r2 = await fundBalanceService.getFundBalance(ADMIN, GENERAL_FUND_ID);

    expect(r1.availableBalance).toBe(r2.availableBalance);
    expect(r1.availableBalance).toBe('6500.00');
  });

  // =========================================================================
  // Test 16: Double-submission / race protection test
  // =========================================================================
  it('16. Most important: double-submission test', async () => {
    const tx = await prisma.transaction.create({
      data: {
        mosqueId: MOSQUE_ID,
        type: TransactionType.income,
        status: TransactionStatus.completed,
        amount: new Prisma.Decimal('1500.00'),
        currency: 'BDT',
        fundId: IMAM_SALARY_FUND_ID,
        receiptId: null,
      },
    });

    // First issue succeeds
    const first = await receiptsService.create(ADMIN, { transactionId: tx.id });
    expect(first.receiptNumber).toBe('REC-2026-00001');

    // Second immediate issue is rejected
    await expect(
      receiptsService.create(ADMIN, { transactionId: tx.id }),
    ).rejects.toThrow(BadRequestException);

    // Exactly 1 receipt in database
    expect(receiptsDb).toHaveLength(1);
  });

  // =========================================================================
  // Test 17: API permission & tenant test
  // =========================================================================
  it('17. API permission & tenant isolation test', async () => {
    const tx = await prisma.transaction.create({
      data: {
        mosqueId: MOSQUE_ID,
        type: TransactionType.income,
        status: TransactionStatus.completed,
        amount: new Prisma.Decimal('1500.00'),
        currency: 'BDT',
        fundId: IMAM_SALARY_FUND_ID,
        receiptId: null,
      },
    });

    // Normal member without receipt.issue permission cannot create receipts
    await expect(
      receiptsService.create(NORMAL_MEMBER, { transactionId: tx.id }),
    ).rejects.toThrow(ForbiddenException);

    // Lookup transaction from another mosque is rejected
    transactionsDb.push({
      id: 'foreign-tx-1',
      mosqueId: OTHER_MOSQUE_ID,
      type: TransactionType.income,
      status: TransactionStatus.completed,
      amount: new Prisma.Decimal('1000.00'),
      fundId: 'foreign-fund',
      receiptId: null,
    });

    await expect(
      receiptsService.create(ADMIN, { transactionId: 'foreign-tx-1' }),
    ).rejects.toThrow(BadRequestException);
  });

  // =========================================================================
  // Test 18: Audit log test
  // =========================================================================
  it('18. Audit log test', async () => {
    // 1. Payment completed & receipt issued
    await donationsService.create(ADMIN, {
      fundId: IMAM_SALARY_FUND_ID,
      amount: '1500.00',
      paymentMethod: PaymentMethod.cash,
      status: DonationStatus.completed,
      donorName: 'Fatima',
    });

    // 2. Void receipt
    await receiptsService.void(ADMIN, receiptsDb[0].id, { voidReason: 'Entered duplicate entry' });

    // Verify audit log entries
    const receiptVoidedLog = auditLogs.find((l) => l.action === 'RECEIPT_VOIDED');
    expect(receiptVoidedLog).toBeDefined();
    expect(receiptVoidedLog.resource).toBe('receipt');
    expect(receiptVoidedLog.actorName).toBe(ADMIN.email);
  });
});
