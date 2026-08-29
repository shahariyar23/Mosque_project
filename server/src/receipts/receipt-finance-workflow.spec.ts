import { BadRequestException, NotFoundException } from '@nestjs/common';
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
import { PrismaService } from '../prisma/prisma.service';
import { ReceiptsService } from './receipts.service';

const MOSQUE_ID = 'm0000000-0000-0000-0000-000000000001';
const FUND_ID = 'f0000000-0000-0000-0000-000000000001';
const USER_ID = 'u0000000-0000-0000-0000-000000000001';
const PLAN_ID = 'p0000000-0000-0000-0000-000000000001';
const PERIOD_ID = 'cp000000-0000-0000-0000-000000000001';

const ACTOR: AuthenticatedUser = {
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
    'transaction.view',
    'transaction.create',
    'contribution.manage',
    'contribution.record',
    'donation.create',
    'donation.view',
  ],
  deniedPermissions: [],
  isActive: true,
};

describe('Receipts & Finance System Verification — Test Cases 1 through 8 (Part 7)', () => {
  let receiptsService: ReceiptsService;
  let donationsService: DonationsService;
  let contributionsService: ContributionsService;
  let fundBalanceService: FundBalanceService;
  let financialReportsService: FinancialReportsService;
  let prisma: any;
  let audit: any;

  // In-memory ledger database state
  let transactionsDb: any[] = [];
  let receiptsDb: any[] = [];
  let donationsDb: any[] = [];
  let periodsDb: any[] = [];

  beforeEach(async () => {
    transactionsDb = [];
    receiptsDb = [];
    donationsDb = [];
    periodsDb = [];

    // Seed general fund with 0 opening balance
    const generalFund = {
      id: FUND_ID,
      mosqueId: MOSQUE_ID,
      name: 'General Fund',
      slug: 'general-fund',
      openingBalance: new Prisma.Decimal('0.00'),
      currency: 'BDT',
    };

    prisma = {
      donationFund: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.id === FUND_ID && where.mosqueId === MOSQUE_ID) {
            return Promise.resolve(generalFund);
          }
          return Promise.resolve(null);
        }),
        findMany: jest.fn().mockResolvedValue([generalFund]),
        count: jest.fn().mockResolvedValue(1),
        aggregate: jest.fn().mockResolvedValue({ _sum: { openingBalance: new Prisma.Decimal('0.00') } }),
      },
      donation: {
        create: jest.fn().mockImplementation(({ data }) => {
          const doc = {
            id: `don-${donationsDb.length + 1}`,
            ...data,
            donatedAt: data.donatedAt ? new Date(data.donatedAt) : new Date(),
            fund: generalFund,
            donor: { id: data.userId || USER_ID, fullName: data.donorName || 'Fatima Member' },
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
          const filtered = donationsDb.filter((d) => !where?.status || d.status === where.status);
          const sum = filtered.reduce((acc, d) => acc.add(d.amount), new Prisma.Decimal('0.00'));
          return Promise.resolve({ _sum: { amount: sum }, _count: { _all: filtered.length } });
        }),
      },
      contributionPlan: {
        findFirst: jest.fn().mockResolvedValue({
          id: PLAN_ID,
          mosqueId: MOSQUE_ID,
          name: 'Standard Monthly',
          amount: new Prisma.Decimal('1500.00'),
          currency: 'BDT',
          frequency: ContributionFrequency.monthly,
          fundId: FUND_ID,
          fund: generalFund,
          isActive: true,
        }),
      },
      contributionPeriod: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          const found = periodsDb.find((p) => p.id === where.id);
          return Promise.resolve(found || null);
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
          return Promise.resolve({
            ...found,
            receipt: r || null,
          });
        }),
        findMany: jest.fn().mockImplementation(({ where }) => {
          let rows = [...transactionsDb];
          if (where?.mosqueId) rows = rows.filter((t) => t.mosqueId === where.mosqueId);
          if (where?.fundId) rows = rows.filter((t) => t.fundId === where.fundId);
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
          const newReceipt = {
            id: `rec-${receiptsDb.length + 1}`,
            ...data,
            fund: generalFund,
            donor: { id: data.userId || USER_ID, fullName: 'Fatima Member' },
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
        findFirst: jest.fn().mockResolvedValue({ id: USER_ID, fullName: 'Fatima Member', email: 'fatima@test.org' }),
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
        ReceiptsService,
        DonationsService,
        ContributionsService,
        FundBalanceService,
        FinancialReportsService,
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

    receiptsService = module.get<ReceiptsService>(ReceiptsService);
    donationsService = module.get<DonationsService>(DonationsService);
    contributionsService = module.get<ContributionsService>(ContributionsService);
    fundBalanceService = module.get<FundBalanceService>(FundBalanceService);
    financialReportsService = module.get<FinancialReportsService>(FinancialReportsService);
  });

  it('runs complete verification of Test Cases 1 through 8', async () => {
    // -----------------------------------------------------------------------
    // Test Case 1: Create payment of ৳1,500 -> Complete/Verify it
    // -----------------------------------------------------------------------
    const payment = await donationsService.create(ACTOR, {
      fundId: FUND_ID,
      amount: '1500.00',
      currency: 'BDT',
      paymentMethod: PaymentMethod.cash,
      status: DonationStatus.completed,
      donorName: 'Fatima Member',
    });

    expect(payment.amount).toBe('1500.00');
    expect(payment.status).toBe(DonationStatus.completed);

    // Verify exactly 1 Transaction created
    expect(transactionsDb).toHaveLength(1);
    expect(transactionsDb[0].type).toBe(TransactionType.income);
    expect(transactionsDb[0].status).toBe(TransactionStatus.completed);
    expect(new Prisma.Decimal(transactionsDb[0].amount).toFixed(2)).toBe('1500.00');

    // Verify Fund Balance increases by ৳1,500
    const fundBal1 = await fundBalanceService.getFundBalance(ACTOR, FUND_ID);
    expect(fundBal1.availableBalance).toBe('1500.00');
    expect(fundBal1.totalIncome).toBe('1500.00');

    // Verify Main/Net Summary is ৳1,500
    const report1 = await financialReportsService.summary(ACTOR, {});
    expect(report1.income?.total).toBe('1500.00');
    expect(report1.netBalance).toBe('1500.00');

    // Verify exactly 1 Receipt created
    expect(receiptsDb).toHaveLength(1);
    const firstReceipt = receiptsDb[0];
    expect(firstReceipt.receiptNumber).toBe('REC-2026-00001');
    expect(new Prisma.Decimal(firstReceipt.amount).toFixed(2)).toBe('1500.00');
    expect(firstReceipt.status).toBe(ReceiptStatus.issued);

    // -----------------------------------------------------------------------
    // Test Case 2: Open the receipt
    // -----------------------------------------------------------------------
    const openedReceipt = await receiptsService.findOne(ACTOR, firstReceipt.id);
    expect(openedReceipt.receiptNumber).toBe('REC-2026-00001');
    expect(openedReceipt.amount).toBe('1500.00');

    // Expected: No balance change
    const fundBal2 = await fundBalanceService.getFundBalance(ACTOR, FUND_ID);
    expect(fundBal2.availableBalance).toBe('1500.00');
    const report2 = await financialReportsService.summary(ACTOR, {});
    expect(report2.netBalance).toBe('1500.00');

    // -----------------------------------------------------------------------
    // Test Case 3: Print/download the receipt (list receipts)
    // -----------------------------------------------------------------------
    const receiptList = await receiptsService.findMany(ACTOR, {});
    expect(receiptList.data).toHaveLength(1);

    // Expected: No balance change
    const fundBal3 = await fundBalanceService.getFundBalance(ACTOR, FUND_ID);
    expect(fundBal3.availableBalance).toBe('1500.00');
    const report3 = await financialReportsService.summary(ACTOR, {});
    expect(report3.netBalance).toBe('1500.00');

    // -----------------------------------------------------------------------
    // Test Case 4: Try to issue another receipt for the same transaction
    // -----------------------------------------------------------------------
    await expect(
      receiptsService.create(ACTOR, {
        transactionId: transactionsDb[0].id,
      }),
    ).rejects.toThrow(BadRequestException);

    // Expected: Receipt count remains 1, balance remains 1,500
    expect(receiptsDb).toHaveLength(1);
    const fundBal4 = await fundBalanceService.getFundBalance(ACTOR, FUND_ID);
    expect(fundBal4.availableBalance).toBe('1500.00');

    // -----------------------------------------------------------------------
    // Test Case 5: Try to issue a receipt for a pending transaction
    // -----------------------------------------------------------------------
    const pendingTx = {
      id: 'tx-pending-1',
      mosqueId: MOSQUE_ID,
      type: TransactionType.income,
      status: TransactionStatus.pending,
      amount: new Prisma.Decimal('1000.00'),
      currency: 'BDT',
      fundId: FUND_ID,
      receiptId: null,
    };
    transactionsDb.push(pendingTx);

    await expect(
      receiptsService.create(ACTOR, {
        transactionId: 'tx-pending-1',
      }),
    ).rejects.toThrow(BadRequestException);

    // -----------------------------------------------------------------------
    // Test Case 6: Try to issue a receipt for failed/cancelled transaction
    // -----------------------------------------------------------------------
    const cancelledTx = {
      id: 'tx-cancelled-1',
      mosqueId: MOSQUE_ID,
      type: TransactionType.income,
      status: TransactionStatus.cancelled,
      amount: new Prisma.Decimal('1000.00'),
      currency: 'BDT',
      fundId: FUND_ID,
      receiptId: null,
    };
    transactionsDb.push(cancelledTx);

    await expect(
      receiptsService.create(ACTOR, {
        transactionId: 'tx-cancelled-1',
      }),
    ).rejects.toThrow(BadRequestException);

    // -----------------------------------------------------------------------
    // Test Case 7: Create an expense of ৳500
    // -----------------------------------------------------------------------
    const expenseTx = {
      id: 'tx-expense-1',
      mosqueId: MOSQUE_ID,
      type: TransactionType.expense,
      status: TransactionStatus.completed,
      amount: new Prisma.Decimal('500.00'),
      currency: 'BDT',
      fundId: FUND_ID,
      category: 'Maintenance',
      description: 'Mosque light repair',
      transactedAt: new Date(),
      receiptId: null,
    };
    transactionsDb.push(expenseTx);

    // Expected: Fund balance decreases to ৳1,000, Main balance decreases to ৳1,000
    const fundBal7 = await fundBalanceService.getFundBalance(ACTOR, FUND_ID);
    expect(fundBal7.availableBalance).toBe('1000.00');
    expect(fundBal7.totalExpenses).toBe('500.00');

    const report7 = await financialReportsService.summary(ACTOR, {});
    expect(report7.income?.total).toBe('1500.00');
    expect(report7.netBalance).toBe('1000.00');

    // Expected: Receipts count remains 1 (no receipt operation involved in expense)
    expect(receiptsDb).toHaveLength(1);

    // -----------------------------------------------------------------------
    // Test Case 8: Refresh the page and reload data multiple times
    // -----------------------------------------------------------------------
    const reportSummary1 = await financialReportsService.summary(ACTOR, {});
    expect(reportSummary1.income?.total).toBe('1500.00');
    expect(reportSummary1.netBalance).toBe('1000.00');

    const reportSummary2 = await financialReportsService.summary(ACTOR, {});
    expect(reportSummary2.income?.total).toBe('1500.00');
    expect(reportSummary2.netBalance).toBe('1000.00');

    const finalFundBalance = await fundBalanceService.getFundBalance(ACTOR, FUND_ID);
    expect(finalFundBalance.availableBalance).toBe('1000.00');
  });
});
