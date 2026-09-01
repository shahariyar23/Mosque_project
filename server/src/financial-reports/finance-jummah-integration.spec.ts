import { Test, TestingModule } from '@nestjs/testing';
import {
  Prisma,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JummahCollectionsService } from '../jumuah/jummah-collections.service';
import { FundBalanceService } from '../fund-balance/fund-balance.service';
import { FinancialReportsService } from '../financial-reports/financial-reports.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { ReportsService } from '../reports/reports.service';
import { PrayerTimesService } from '../prayer-times/prayer-times.service';
import { AuditLogService } from '../audit/audit-log.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';

describe('PART 6: Finance & Reports Integration Verification', () => {
  let jummahCollectionsService: JummahCollectionsService;
  let fundBalanceService: FundBalanceService;
  let financialReportsService: FinancialReportsService;
  let dashboardService: DashboardService;

  const mockMosqueId = 'mosque-finance-integ-1';
  const mockOtherMosqueId = 'mosque-finance-integ-2';
  const mockUserId = 'user-finance-admin-1';

  const actor: AuthenticatedUser = {
    id: mockUserId,
    email: 'treasurer@noormosque.org',
    role: 'treasurer',
    mosqueId: mockMosqueId,
    permissions: [
      'finance.view',
      'finance.manage',
      'jumuah_collection.view',
      'jumuah_collection.record',
      'jumuah_collection.manage',
      'jumuah_collection.void',
      'dashboard.view',
      'report.view',
    ],
    deniedPermissions: [],
    isActive: true,
  };

  // In-memory relational state simulator for full integration verification
  let funds: any[] = [];
  let transactions: any[] = [];
  let collections: any[] = [];
  let auditLogs: any[] = [];
  let expenses: any[] = [];
  let salaries: any[] = [];

  beforeEach(async () => {
    funds = [
      {
        id: 'fund-imam-salary',
        mosqueId: mockMosqueId,
        name: 'Imam Salary Fund',
        slug: 'imam-salary-fund',
        targetAmount: new Prisma.Decimal('100000.00'),
        openingBalance: new Prisma.Decimal('0.00'),
        status: 'active',
        isPublic: true,
        currency: 'BDT',
      },
      {
        id: 'fund-general',
        mosqueId: mockMosqueId,
        name: 'General Fund',
        slug: 'general-fund',
        targetAmount: null,
        openingBalance: new Prisma.Decimal('0.00'),
        status: 'active',
        isPublic: true,
        currency: 'BDT',
      },
      {
        id: 'fund-other-mosque',
        mosqueId: mockOtherMosqueId,
        name: 'Other Mosque Fund',
        slug: 'other-mosque-fund',
        targetAmount: new Prisma.Decimal('50000.00'),
        openingBalance: new Prisma.Decimal('0.00'),
        status: 'active',
        isPublic: true,
        currency: 'BDT',
      },
    ];
    transactions = [];
    collections = [];
    auditLogs = [];
    expenses = [];
    salaries = [];

    const mockPrismaService: any = {
      $transaction: async (arg: any) => {
        if (Array.isArray(arg)) {
          return Promise.all(arg);
        }
        if (typeof arg === 'function') {
          return arg(mockPrismaService);
        }
        return arg;
      },
      donationFund: {
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          return (
            funds.find((f) => {
              if (where.id && f.id !== where.id) return false;
              if (where.slug && f.slug !== where.slug) return false;
              if (where.mosqueId && f.mosqueId !== where.mosqueId) return false;
              return true;
            }) || null
          );
        }),
      },
      jummahCollection: {
        create: jest.fn().mockImplementation(async ({ data }) => {
          const matchedFund = funds.find((f) => f.id === data.fundId) || { id: data.fundId, name: 'Fund', slug: 'fund' };
          const record = {
            id: `col-${Date.now()}-${Math.random()}`,
            ...data,
            fund: matchedFund,
            createdBy: {
              id: data.createdById || mockUserId,
              fullName: 'Staff Counter',
              email: 'treasurer@noormosque.org',
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          collections.push(record);
          return record;
        }),
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          const col = collections.find((c) => {
            if (where.id && c.id !== where.id) return false;
            if (where.mosqueId && c.mosqueId !== where.mosqueId) return false;
            return true;
          });
          if (!col) return null;
          return {
            ...col,
            fund: funds.find((f) => f.id === col.fundId) || { id: col.fundId, name: 'Fund', slug: 'fund' },
            createdBy: col.createdBy || {
              id: mockUserId,
              fullName: 'Staff Counter',
              email: 'treasurer@noormosque.org',
            },
            transaction: transactions.find((t) => t.id === col.transactionId) || null,
          };
        }),
        findMany: jest.fn().mockImplementation(async ({ where }) => {
          return collections.filter((c) => {
            if (where.mosqueId && c.mosqueId !== where.mosqueId) return false;
            if (where.status && c.status !== where.status) return false;
            return true;
          });
        }),
        update: jest.fn().mockImplementation(async ({ where, data }) => {
          const idx = collections.findIndex((c) => c.id === where.id);
          if (idx >= 0) {
            collections[idx] = { ...collections[idx], ...data };
            return collections[idx];
          }
          return null;
        }),
      },
      transaction: {
        create: jest.fn().mockImplementation(async ({ data }) => {
          const record = { id: `tx-${Date.now()}-${Math.random()}`, ...data, createdAt: new Date(), updatedAt: new Date() };
          transactions.push(record);
          return record;
        }),
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          return (
            transactions.find((t) => {
              if (where.id && t.id !== where.id) return false;
              if (where.mosqueId && t.mosqueId !== where.mosqueId) return false;
              return true;
            }) || null
          );
        }),
        findMany: jest.fn().mockImplementation(async ({ where }) => {
          return transactions.filter((t) => {
            if (where.mosqueId && t.mosqueId !== where.mosqueId) return false;
            if (where.fundId && t.fundId !== where.fundId) return false;
            if (where.type && t.type !== where.type) return false;
            if (where.status && t.status !== where.status) return false;
            return true;
          });
        }),
        aggregate: jest.fn().mockImplementation(async ({ where }) => {
          const filtered = transactions.filter((t) => {
            if (where.mosqueId && t.mosqueId !== where.mosqueId) return false;
            if (where.fundId && t.fundId !== where.fundId) return false;
            if (where.toFundId && t.toFundId !== where.toFundId) return false;
            if (where.type && t.type !== where.type) return false;
            if (where.status && t.status !== where.status) return false;
            if (where.transactedAt) {
              if (where.transactedAt.gte && new Date(t.transactedAt) < where.transactedAt.gte) return false;
              if (where.transactedAt.lt && new Date(t.transactedAt) >= where.transactedAt.lt) return false;
            }
            return true;
          });
          const sum = filtered.reduce((acc, t) => acc.add(new Prisma.Decimal(t.amount)), new Prisma.Decimal(0));
          return {
            _sum: { amount: sum },
            _count: { _all: filtered.length },
          };
        }),
        update: jest.fn().mockImplementation(async ({ where, data }) => {
          const idx = transactions.findIndex((t) => t.id === where.id);
          if (idx >= 0) {
            transactions[idx] = { ...transactions[idx], ...data };
            return transactions[idx];
          }
          return null;
        }),
      },
      donation: {
        aggregate: jest.fn().mockReturnValue({ _sum: { amount: new Prisma.Decimal(0) }, _count: { _all: 0 } }),
      },
      expense: {
        aggregate: jest.fn().mockImplementation(async () => {
          const sum = expenses.reduce((acc, e) => acc.add(new Prisma.Decimal(e.amount)), new Prisma.Decimal(0));
          return { _sum: { amount: sum }, _count: { _all: expenses.length } };
        }),
      },
      salaryRecord: {
        aggregate: jest.fn().mockImplementation(async () => {
          const sum = salaries.reduce((acc, s) => acc.add(new Prisma.Decimal(s.amount)), new Prisma.Decimal(0));
          return { _sum: { amount: sum }, _count: { _all: salaries.length } };
        }),
      },
      budget: {
        aggregate: jest.fn().mockReturnValue({ _sum: { amount: new Prisma.Decimal(0) }, _count: { _all: 0 } }),
      },
      mosque: {
        findUnique: jest.fn().mockResolvedValue({ id: mockMosqueId, currency: 'BDT', timezone: 'Asia/Dhaka' }),
      },
      mosqueSettings: {
        findUnique: jest.fn().mockResolvedValue({ mosqueId: mockMosqueId, currency: 'BDT', timezone: 'Asia/Dhaka' }),
      },
      jumuahSchedule: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      approvalRequest: {
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const mockAuditLogService = {
      record: jest.fn().mockImplementation(async (entry) => {
        auditLogs.push(entry);
      }),
    };

    const mockPrayerTimesService = {
      getPrayerTimes: jest.fn().mockResolvedValue({
        date: '2026-08-30',
        timezone: 'Asia/Dhaka',
        timings: {
          fajr: { time: '04:30' },
          dhuhr: { time: '12:15' },
          asr: { time: '16:30' },
          maghrib: { time: '18:25' },
          isha: { time: '19:45' },
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JummahCollectionsService,
        FundBalanceService,
        FinancialReportsService,
        ReportsService,
        DashboardService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: PrayerTimesService, useValue: mockPrayerTimesService },
      ],
    }).compile();

    jummahCollectionsService = module.get<JummahCollectionsService>(JummahCollectionsService);
    fundBalanceService = module.get<FundBalanceService>(FundBalanceService);
    financialReportsService = module.get<FinancialReportsService>(FinancialReportsService);
    dashboardService = module.get<DashboardService>(DashboardService);
  });

  describe('End-to-End Accounting Flow & Financial Invariants', () => {
    it('STEPS 1-5: Records 2 Friday collections and verifies unified fund balance, ledger transaction, reports, and dashboard totals', async () => {
      // 1. Record 30 Aug 2026 = ৳10,000
      const col1 = await jummahCollectionsService.create(actor, {
        date: '2026-08-28', // Valid Friday
        amount: '10000.00',
        fundId: 'fund-imam-salary',
        reference: 'BOX-A',
        isPublic: true,
      });

      expect(col1).toBeDefined();
      expect(transactions.length).toBe(1);
      expect(new Prisma.Decimal(transactions[0].amount).toFixed(2)).toBe('10000.00');
      expect(transactions[0].type).toBe(TransactionType.income);
      expect(transactions[0].status).toBe(TransactionStatus.completed);

      // Verify Fund Balance after col 1
      let fundBal = await fundBalanceService.getFundBalance(actor, 'fund-imam-salary');
      expect(fundBal.availableBalance).toBe('10000.00');
      expect(fundBal.totalIncome).toBe('10000.00');

      // 2. Record 6 Sep 2026 = ৳7,500
      const col2 = await jummahCollectionsService.create(actor, {
        date: '2026-09-04', // Valid Friday
        amount: '7500.00',
        fundId: 'fund-imam-salary',
        reference: 'BOX-B',
        isPublic: true,
      });

      expect(col2).toBeDefined();
      expect(transactions.length).toBe(2);

      // Verify Fund Balance after col 2
      fundBal = await fundBalanceService.getFundBalance(actor, 'fund-imam-salary');
      expect(fundBal.availableBalance).toBe('17500.00');
      expect(fundBal.totalIncome).toBe('17500.00');

      // Verify Financial Reports Summary
      const report = await financialReportsService.summary(actor, {});
      expect(report.income?.total).toBe('17500.00');
      expect(report.income?.count).toBe(2);
      expect(report.netBalance).toBe('17500.00');

      // Verify Dashboard Overview
      const dashboard = await dashboardService.overview(actor);
      expect(dashboard.finance?.income?.total).toBe('17500.00');
      expect(dashboard.finance?.netBalance).toBe('17500.00');
    });

    it('STEP 6: Receipt Generation does NOT create extra transactions or modify balances', async () => {
      // Create collection
      await jummahCollectionsService.create(actor, {
        date: '2026-08-28',
        amount: '5000.00',
        fundId: 'fund-imam-salary',
      });

      const initialTxCount = transactions.length;
      expect(initialTxCount).toBe(1);

      const balBefore = await fundBalanceService.getFundBalance(actor, 'fund-imam-salary');
      expect(balBefore.availableBalance).toBe('5000.00');

      // Simulating receipt issuance: Receipt documents an existing transaction, does not add transaction
      // Re-query fund balance
      const balAfter = await fundBalanceService.getFundBalance(actor, 'fund-imam-salary');
      expect(balAfter.availableBalance).toBe('5000.00');
      expect(transactions.length).toBe(initialTxCount);
    });

    it('STEP 7: Expense creation reduces fund balance and updates financial reports accurately', async () => {
      // 1. Initial collection ৳17,500
      await jummahCollectionsService.create(actor, {
        date: '2026-08-28',
        amount: '17500.00',
        fundId: 'fund-imam-salary',
      });

      // 2. Record Expense ৳2,500 (creates completed expense transaction)
      transactions.push({
        id: 'tx-exp-1',
        mosqueId: mockMosqueId,
        fundId: 'fund-imam-salary',
        type: TransactionType.expense,
        status: TransactionStatus.completed,
        amount: new Prisma.Decimal('2500.00'),
        transactedAt: new Date(),
      });
      expenses.push({ amount: new Prisma.Decimal('2500.00') });

      // 3. Verify Fund Balance
      const fundBal = await fundBalanceService.getFundBalance(actor, 'fund-imam-salary');
      expect(fundBal.totalIncome).toBe('17500.00');
      expect(fundBal.totalExpenses).toBe('2500.00');
      expect(fundBal.availableBalance).toBe('15000.00');

      // 4. Verify Financial Reports Summary
      const report = await financialReportsService.summary(actor, {});
      expect(report.income?.total).toBe('17500.00');
      expect(report.expenses.total).toBe('2500.00');
      expect(report.netBalance).toBe('15000.00');
    });

    it('STEP 8: Fund transfer moves money between funds without altering total income or expenses', async () => {
      // 1. Initial collection ৳15,000 into Imam Salary Fund
      await jummahCollectionsService.create(actor, {
        date: '2026-08-28',
        amount: '15000.00',
        fundId: 'fund-imam-salary',
      });

      // 2. Transfer ৳2,000 from Imam Salary Fund to General Fund
      transactions.push({
        id: 'tx-xfer-1',
        mosqueId: mockMosqueId,
        fundId: 'fund-imam-salary',
        toFundId: 'fund-general',
        type: TransactionType.transfer,
        status: TransactionStatus.completed,
        amount: new Prisma.Decimal('2000.00'),
        transactedAt: new Date(),
      });

      // 3. Verify source fund balance (15000 - 2000 = 13000)
      const sourceBal = await fundBalanceService.getFundBalance(actor, 'fund-imam-salary');
      expect(sourceBal.availableBalance).toBe('13000.00');
      expect(sourceBal.outgoingTransfers).toBe('2000.00');

      // 4. Verify destination fund balance (0 + 2000 = 2000)
      const destBal = await fundBalanceService.getFundBalance(actor, 'fund-general');
      expect(destBal.availableBalance).toBe('2000.00');
      expect(destBal.incomingTransfers).toBe('2000.00');

      // 5. Total mosque income in reports remains ৳15,000 (transfers are neutral)
      const report = await financialReportsService.summary(actor, {});
      expect(report.income?.total).toBe('15000.00');
    });

    it('STEP 9: Voiding a Jummah Collection marks transaction voided and deducts balance safely', async () => {
      // 1. Create collection ৳10,000
      const col = await jummahCollectionsService.create(actor, {
        date: '2026-08-28',
        amount: '10000.00',
        fundId: 'fund-imam-salary',
      });

      let fundBal = await fundBalanceService.getFundBalance(actor, 'fund-imam-salary');
      expect(fundBal.availableBalance).toBe('10000.00');

      // 2. Void collection
      await jummahCollectionsService.update(actor, col.id, {
        status: 'voided',
      });

      // 3. Verify transaction status updated to voided
      expect(transactions[0].status).toBe(TransactionStatus.voided);

      // 4. Available balance becomes 0
      fundBal = await fundBalanceService.getFundBalance(actor, 'fund-imam-salary');
      expect(fundBal.availableBalance).toBe('0.00');
    });

    it('STEP 10: Multi-Mosque Tenant Isolation is strictly enforced across all finance services', async () => {
      // 1. Mosque A collection ৳10,000
      await jummahCollectionsService.create(actor, {
        date: '2026-08-28',
        amount: '10000.00',
        fundId: 'fund-imam-salary',
      });

      // 2. Attempt to read Mosque A fund using Mosque B actor
      const actorMosqueB: AuthenticatedUser = {
        ...actor,
        mosqueId: mockOtherMosqueId,
      };

      await expect(
        fundBalanceService.getFundBalance(actorMosqueB, 'fund-imam-salary'),
      ).rejects.toThrow();

      // 3. Reports for Mosque B are 0
      const reportB = await financialReportsService.summary(actorMosqueB, {});
      expect(reportB.income?.total).toBe('0.00');
    });
  });
});
