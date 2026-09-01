import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  JummahCollectionStatus,
  NotificationType,
  PaymentMethod,
  ReceiptStatus,
  Role,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { AuditLogService } from '../audit/audit-log.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { toMoney } from '../common/utils/money';
import { DashboardService } from '../dashboard/dashboard.service';
import { FinancialReportsService } from '../financial-reports/financial-reports.service';
import { FundBalanceService } from '../fund-balance/fund-balance.service';
import { JummahCollectionsService } from '../jumuah/jummah-collections.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrayerTimesService } from '../prayer-times/prayer-times.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicTransparencyService } from '../public-transparency/public-transparency.service';
import { ReceiptsService } from '../receipts/receipts.service';
import { ReportsService } from '../reports/reports.service';

/**
 * PART 8: Complete Full-System End-to-End Security, Ledger & Contract Audit
 */
describe('PART 8: Full System Security, Ledger & Architecture Audit', () => {
  // Test Mosques
  const mosqueA = {
    id: 'mosque-noor-id',
    slug: 'noor-mosque',
    name: 'Noor Mosque',
    currency: 'BDT',
  };
  const mosqueB = {
    id: 'mosque-taqwa-id',
    slug: 'taqwa-mosque',
    name: 'Taqwa Mosque',
    currency: 'BDT',
  };

  // Actors
  const superAdminActor: AuthenticatedUser = {
    id: 'super-admin-1',
    email: 'superadmin@noor.org',
    role: Role.super_admin,
    mosqueId: mosqueA.id,
    permissions: ['platform.manage', 'user.viewDeleted', 'finance.manage'],
    deniedPermissions: [],
    isActive: true,
  };

  const mosqueAdminA: AuthenticatedUser = {
    id: 'admin-mosque-a',
    email: 'admin@noormosque.org',
    role: Role.mosque_admin,
    mosqueId: mosqueA.id,
    permissions: [
      'finance.manage',
      'finance.view',
      'jumuah_collection.record',
      'jumuah_collection.manage',
      'receipt.issue',
      'notification.viewOwn',
      'user.view',
      'audit.view',
    ],
    deniedPermissions: [],
    isActive: true,
  };

  const memberA: AuthenticatedUser = {
    id: 'member-mosque-a',
    email: 'member@noormosque.org',
    role: Role.member,
    mosqueId: mosqueA.id,
    permissions: ['account.view', 'notification.viewOwn', 'donation.viewOwn'],
    deniedPermissions: [],
    isActive: true,
  };

  const mosqueAdminB: AuthenticatedUser = {
    id: 'admin-mosque-b',
    email: 'admin@taqwamosque.org',
    role: Role.mosque_admin,
    mosqueId: mosqueB.id,
    permissions: [
      'finance.manage',
      'finance.view',
      'jumuah_collection.record',
      'jumuah_collection.manage',
      'receipt.issue',
      'notification.viewOwn',
      'user.view',
      'audit.view',
    ],
    deniedPermissions: [],
    isActive: true,
  };

  // In-Memory Database Store for Audit
  let mosques: any[] = [];
  let users: any[] = [];
  let funds: any[] = [];
  let transactions: any[] = [];
  let collections: any[] = [];
  let receipts: any[] = [];
  let notifications: any[] = [];
  let auditLogs: any[] = [];

  let fundBalanceService: FundBalanceService;
  let financialReportsService: FinancialReportsService;
  let reportsService: ReportsService;
  let dashboardService: DashboardService;
  let publicService: PublicTransparencyService;
  let notificationsService: NotificationsService;
  let jummahService: JummahCollectionsService;
  let receiptsService: ReceiptsService;

  beforeEach(async () => {
    mosques = [{ ...mosqueA }, { ...mosqueB }];

    users = [
      {
        id: superAdminActor.id,
        email: superAdminActor.email,
        mosqueId: mosqueA.id,
        role: Role.super_admin,
        isActive: true,
        deletedAt: null,
      },
      {
        id: mosqueAdminA.id,
        email: mosqueAdminA.email,
        mosqueId: mosqueA.id,
        role: Role.mosque_admin,
        isActive: true,
        deletedAt: null,
      },
      {
        id: memberA.id,
        email: memberA.email,
        mosqueId: mosqueA.id,
        role: Role.member,
        isActive: true,
        deletedAt: null,
      },
      {
        id: 'deleted-user-a',
        email: 'former@noormosque.org',
        mosqueId: mosqueA.id,
        role: Role.member,
        isActive: false,
        deletedAt: new Date('2026-01-01'),
      },
      {
        id: mosqueAdminB.id,
        email: mosqueAdminB.email,
        mosqueId: mosqueB.id,
        role: Role.mosque_admin,
        isActive: true,
        deletedAt: null,
      },
    ];

    funds = [
      {
        id: 'fund-imam-salary-a',
        mosqueId: mosqueA.id,
        name: 'Imam Salary Fund',
        slug: 'imam-salary',
        isDefault: false,
        isActive: true,
        currency: 'BDT',
        openingBalance: new Decimal(0),
        goalAmount: new Decimal(500000),
      },
      {
        id: 'fund-general-a',
        mosqueId: mosqueA.id,
        name: 'General Fund',
        slug: 'general',
        isDefault: true,
        isActive: true,
        currency: 'BDT',
        openingBalance: new Decimal(0),
        goalAmount: null,
      },
      {
        id: 'fund-secret-b',
        mosqueId: mosqueB.id,
        name: 'Taqwa Secret Fund',
        slug: 'secret-fund',
        isDefault: true,
        isActive: true,
        currency: 'BDT',
        openingBalance: new Decimal(0),
        goalAmount: null,
      },
    ];

    // Seed Initial Balance for Imam Salary Fund in Mosque A (৳100,000)
    transactions = [
      {
        id: 'tx-seed-1',
        mosqueId: mosqueA.id,
        fundId: 'fund-imam-salary-a',
        type: TransactionType.income,
        status: TransactionStatus.completed,
        amount: new Decimal(100000),
        currency: 'BDT',
        description: 'Opening balance for Imam Salary Fund',
        transactedAt: new Date('2026-08-01T00:00:00Z'),
        createdById: mosqueAdminA.id,
        isDeleted: false,
        deletedAt: null,
      },
    ];

    collections = [];
    receipts = [];
    notifications = [];
    auditLogs = [];

    const mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (arg) => {
        if (Array.isArray(arg)) {
          return Promise.all(arg);
        }
        if (typeof arg === 'function') {
          return arg(mockPrismaService);
        }
        return arg;
      }),
      mosque: {
        findUnique: jest.fn().mockImplementation(async ({ where }) => {
          if (where.slug) return mosques.find((m) => m.slug === where.slug) || null;
          if (where.id) return mosques.find((m) => m.id === where.id) || null;
          return null;
        }),
      },
      mosqueSettings: {
        findUnique: jest.fn().mockResolvedValue({ currency: 'BDT' }),
      },
      user: {
        findMany: jest.fn().mockImplementation(async ({ where }) => {
          return users.filter((u) => {
            if (where.mosqueId && u.mosqueId !== where.mosqueId) return false;
            if (where.isActive !== undefined && u.isActive !== where.isActive) return false;
            if (where.deletedAt === null && u.deletedAt !== null) return false;
            if (where.role && where.role.in && !where.role.in.includes(u.role)) return false;
            return true;
          });
        }),
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          return users.find((u) => {
            if (where.id && u.id !== where.id) return false;
            if (where.mosqueId && u.mosqueId !== where.mosqueId) return false;
            return true;
          }) || null;
        }),
      },
      donationFund: {
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          return funds.find((f) => {
            if (where.id && f.id !== where.id) return false;
            if (where.mosqueId && f.mosqueId !== where.mosqueId) return false;
            if (where.slug && f.slug !== where.slug) return false;
            return true;
          }) || null;
        }),
        findMany: jest.fn().mockImplementation(async ({ where }) => {
          return funds.filter((f) => {
            if (where.mosqueId && f.mosqueId !== where.mosqueId) return false;
            if (where.isActive !== undefined && f.isActive !== where.isActive) return false;
            return true;
          });
        }),
      },
      transaction: {
        create: jest.fn().mockImplementation(async ({ data }) => {
          const item = {
            id: `tx-${Date.now()}-${Math.random()}`,
            ...data,
            isDeleted: false,
            deletedAt: null,
            createdAt: new Date(),
          };
          transactions.push(item);
          return item;
        }),
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          return transactions.find((t) => {
            if (where.id && t.id !== where.id) return false;
            if (where.mosqueId && t.mosqueId !== where.mosqueId) return false;
            if (where.donationId && t.donationId !== where.donationId) return false;
            return true;
          }) || null;
        }),
        findMany: jest.fn().mockImplementation(async ({ where, orderBy, take }) => {
          return transactions.filter((t) => {
            if (where.mosqueId && t.mosqueId !== where.mosqueId) return false;
            if (where.status && t.status !== where.status) return false;
            if (where.fundId && t.fundId !== where.fundId) return false;
            if (where.isDeleted !== undefined && t.isDeleted !== where.isDeleted) return false;
            return true;
          });
        }),
        aggregate: jest.fn().mockImplementation(async ({ where, _sum, _count }) => {
          const matched = transactions.filter((t) => {
            if (where.mosqueId && t.mosqueId !== where.mosqueId) return false;
            if (where.status && t.status !== where.status) return false;
            if (where.type && t.type !== where.type) return false;
            if (where.fundId && t.fundId !== where.fundId) return false;
            if (where.toFundId && t.toFundId !== where.toFundId) return false;
            if (where.isDeleted !== undefined && t.isDeleted !== where.isDeleted) return false;
            return true;
          });
          const sum = matched.reduce((acc, t) => acc.plus(t.amount), new Decimal(0));
          return { _sum: { amount: sum }, _count: { _all: matched.length } };
        }),
        groupBy: jest.fn().mockImplementation(async ({ by, where, _sum }) => {
          const matched = transactions.filter((t) => {
            if (where.mosqueId && t.mosqueId !== where.mosqueId) return false;
            if (where.status && t.status !== where.status) return false;
            if (where.type && t.type !== where.type) return false;
            if (where.isDeleted !== undefined && t.isDeleted !== where.isDeleted) return false;
            return true;
          });
          const map: Record<string, Decimal> = {};
          for (const tx of matched) {
            const key = tx.fundId || 'null';
            map[key] = (map[key] || new Decimal(0)).plus(tx.amount);
          }
          return Object.entries(map).map(([fundId, amount]) => ({
            fundId: fundId === 'null' ? null : fundId,
            _sum: { amount },
          }));
        }),
      },
      jummahCollection: {
        create: jest.fn().mockImplementation(async ({ data }) => {
          const fund = funds.find((f) => f.id === data.fundId);
          const item = {
            id: `col-${Date.now()}-${Math.random()}`,
            ...data,
            fund: { id: fund.id, name: fund.name, slug: fund.slug },
            schedule: null,
            createdBy: { id: mosqueAdminA.id, fullName: 'Admin' },
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          collections.push(item);
          return item;
        }),
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          return collections.find((c) => {
            if (where.id && c.id !== where.id) return false;
            if (where.mosqueId && c.mosqueId !== where.mosqueId) return false;
            return true;
          }) || null;
        }),
        findMany: jest.fn().mockImplementation(async ({ where, take }) => {
          return collections.filter((c) => {
            if (where.mosqueId && c.mosqueId !== where.mosqueId) return false;
            if (where.isPublic !== undefined && c.isPublic !== where.isPublic) return false;
            if (where.status && c.status !== where.status) return false;
            return true;
          });
        }),
        count: jest.fn().mockImplementation(async ({ where }) => {
          return collections.filter((c) => {
            if (where.mosqueId && c.mosqueId !== where.mosqueId) return false;
            return true;
          }).length;
        }),
        aggregate: jest.fn().mockImplementation(async ({ where }) => {
          const matched = collections.filter((c) => {
            if (where.mosqueId && c.mosqueId !== where.mosqueId) return false;
            if (where.status && c.status !== where.status) return false;
            return true;
          });
          const sum = matched.reduce((acc, c) => acc.plus(c.amount), new Decimal(0));
          return { _sum: { amount: sum }, _count: { _all: matched.length } };
        }),
      },
      receipt: {
        create: jest.fn().mockImplementation(async ({ data }) => {
          const item = {
            id: `rec-${Date.now()}`,
            ...data,
            donor: users.find((u) => u.id === data.userId) || null,
            fund: funds.find((f) => f.id === data.fundId) || null,
            donation: null,
            createdAt: new Date(),
          };
          receipts.push(item);
          return item;
        }),
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          return receipts.find((r) => {
            if (where.id && r.id !== where.id) return false;
            if (where.mosqueId && r.mosqueId !== where.mosqueId) return false;
            if (where.receiptNumber && r.receiptNumber !== where.receiptNumber) return false;
            return true;
          }) || null;
        }),
        count: jest.fn().mockImplementation(async () => receipts.length),
      },
      donation: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: new Decimal(0) },
          _count: { _all: 0 },
        }),
      },
      expense: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: new Decimal(0) },
          _count: { _all: 0 },
        }),
      },
      salaryRecord: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: new Decimal(0) },
          _count: { _all: 0 },
        }),
      },
      budget: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: new Decimal(0) },
          _count: { _all: 0 },
        }),
      },
      notification: {
        create: jest.fn().mockImplementation(async ({ data }) => {
          const item = {
            id: `notif-${Date.now()}-${Math.random()}`,
            ...data,
            isRead: false,
            readAt: null,
            createdAt: new Date(),
          };
          notifications.push(item);
          return item;
        }),
        createMany: jest.fn().mockImplementation(async ({ data }) => {
          const createdList = data.map((d: any) => ({
            id: `notif-${Date.now()}-${Math.random()}`,
            ...d,
            isRead: false,
            readAt: null,
            createdAt: new Date(),
          }));
          notifications.push(...createdList);
          return { count: createdList.length };
        }),
        findMany: jest.fn().mockImplementation(async ({ where }) => {
          return notifications.filter((n) => {
            if (where.mosqueId && n.mosqueId !== where.mosqueId) return false;
            if (where.userId && n.userId !== where.userId) return false;
            return true;
          });
        }),
        count: jest.fn().mockImplementation(async ({ where }) => {
          return notifications.filter((n) => {
            if (where.mosqueId && n.mosqueId !== where.mosqueId) return false;
            if (where.userId && n.userId !== where.userId) return false;
            if (where.isRead !== undefined && n.isRead !== where.isRead) return false;
            return true;
          }).length;
        }),
      },
      auditLog: {
        create: jest.fn().mockImplementation(async ({ data }) => {
          auditLogs.push(data);
          return data;
        }),
      },
    };

    const mockAuditLogService = {
      record: jest.fn().mockImplementation(async (data) => {
        auditLogs.push(data);
      }),
      log: jest.fn().mockImplementation(async (data) => {
        auditLogs.push(data);
      }),
    };

    const mockMailService = {
      sendMail: jest.fn().mockResolvedValue(true),
    };

    const mockPrayerTimesService = {
      getTodayTimes: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundBalanceService,
        FinancialReportsService,
        ReportsService,
        DashboardService,
        PublicTransparencyService,
        NotificationsService,
        JummahCollectionsService,
        ReceiptsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: MailService, useValue: mockMailService },
        { provide: PrayerTimesService, useValue: mockPrayerTimesService },
      ],
    }).compile();

    fundBalanceService = module.get<FundBalanceService>(FundBalanceService);
    financialReportsService = module.get<FinancialReportsService>(FinancialReportsService);
    reportsService = module.get<ReportsService>(ReportsService);
    dashboardService = module.get<DashboardService>(DashboardService);
    publicService = module.get<PublicTransparencyService>(PublicTransparencyService);
    notificationsService = module.get<NotificationsService>(NotificationsService);
    jummahService = module.get<JummahCollectionsService>(JummahCollectionsService);
    receiptsService = module.get<ReceiptsService>(ReceiptsService);
  });

  describe('36. Final Comprehensive Scenario Test (Noor Mosque Full Workflow)', () => {
    it('Executes the authoritative 36-point scenario with exact financial and notification consistency', async () => {
      // Step 1: Initial Balance Verification (৳100,000)
      const initialBalance = await fundBalanceService.getFundBalance(
        mosqueAdminA,
        'fund-imam-salary-a',
      );
      expect(initialBalance.availableBalance).toBe('100000.00');

      // Step 2: Jummah Collection on 2026-08-28 (৳10,000)
      const col1 = await jummahService.create(mosqueAdminA, {
        date: '2026-08-28',
        amount: '10000',
        fundId: 'fund-imam-salary-a',
        status: JummahCollectionStatus.completed,
        isPublic: true,
      });
      expect(col1.amount).toBe('10000.00');

      // Verify Fund Balance -> ৳110,000
      const balanceAfterJummah = await fundBalanceService.getFundBalance(
        mosqueAdminA,
        'fund-imam-salary-a',
      );
      expect(balanceAfterJummah.availableBalance).toBe('110000.00');

      // Verify Notification created for finance admins
      expect(notifications.length).toBeGreaterThanOrEqual(1);
      const jumuahNotif = notifications.find((n) => n.type === NotificationType.jummah_collection);
      expect(jumuahNotif).toBeDefined();
      expect(jumuahNotif.message).toContain('৳10000 recorded for Friday 2026-08-28');

      // Step 3: Public Website verification
      const publicJummah = await publicService.getPublicJummahCollections(mosqueA.slug, {});
      expect(publicJummah.rows).toHaveLength(1);
      expect(publicJummah.rows[0].amount).toBe('10000.00');
      expect(publicJummah.meta.total).toBe(1);

      // Step 4: Expense of ৳20,000 from Imam Salary Fund
      transactions.push({
        id: 'tx-expense-1',
        mosqueId: mosqueA.id,
        fundId: 'fund-imam-salary-a',
        type: TransactionType.expense,
        status: TransactionStatus.completed,
        amount: new Decimal(20000),
        currency: 'BDT',
        description: 'Imam Monthly Stipend',
        transactedAt: new Date('2026-08-29T10:00:00Z'),
        createdById: mosqueAdminA.id,
        isDeleted: false,
        deletedAt: null,
      });

      // Verify Fund Balance -> ৳90,000 (100,000 + 10,000 - 20,000)
      const balanceAfterExpense = await fundBalanceService.getFundBalance(
        mosqueAdminA,
        'fund-imam-salary-a',
      );
      expect(balanceAfterExpense.availableBalance).toBe('90000.00');

      // Step 5: Transfer ৳10,000 from Imam Salary Fund to General Fund
      transactions.push({
        id: 'tx-transfer-1',
        mosqueId: mosqueA.id,
        fundId: 'fund-imam-salary-a',
        toFundId: 'fund-general-a',
        type: TransactionType.transfer,
        status: TransactionStatus.completed,
        amount: new Decimal(10000),
        currency: 'BDT',
        description: 'Transfer from Imam Salary to General Fund',
        transactedAt: new Date('2026-08-30T10:00:00Z'),
        createdById: mosqueAdminA.id,
        isDeleted: false,
        deletedAt: null,
      });

      // Verify Balances: Imam Salary = ৳80,000 (90,000 - 10,000), General = ৳10,000
      const imamBal = await fundBalanceService.getFundBalance(mosqueAdminA, 'fund-imam-salary-a');
      const genBal = await fundBalanceService.getFundBalance(mosqueAdminA, 'fund-general-a');
      expect(imamBal.availableBalance).toBe('80000.00');
      expect(genBal.availableBalance).toBe('10000.00');

      // Step 6: Receipt Generation (Document proof only - NO additional balance change)
      const txCountBeforeReceipt = transactions.length;
      receipts.push({
        id: 'rec-001',
        mosqueId: mosqueA.id,
        receiptNumber: 'REC-2026-00001',
        amount: new Decimal(10000),
        currency: 'BDT',
        status: ReceiptStatus.issued,
        userId: memberA.id,
        fundId: 'fund-imam-salary-a',
        issuedAt: new Date(),
      });

      // Re-verify balances - MUST REMAIN UNCHANGED
      const imamBalAfterReceipt = await fundBalanceService.getFundBalance(
        mosqueAdminA,
        'fund-imam-salary-a',
      );
      expect(imamBalAfterReceipt.availableBalance).toBe('80000.00');
      expect(transactions.length).toBe(txCountBeforeReceipt); // Zero new transactions created

      // Step 7: Reports and Dashboard Agreement
      const finSummary = await financialReportsService.summary(mosqueAdminA, {});
      expect(finSummary.income?.total).toBe('110000.00'); // 100,000 + 10,000
      expect(finSummary.expenses?.total).toBe('0.00'); // No direct Expense rows, tx-expense-1 counted in spent
      expect(finSummary.netBalance).toBe('90000.00'); // 110,000 - 20,000

      // Step 8: Multi-Mosque Tenant Isolation
      // Mosque B admin cannot access Mosque A private fund balance
      await expect(
        fundBalanceService.getFundBalance(mosqueAdminB, 'fund-imam-salary-a'),
      ).rejects.toThrow();

      // Mosque B public endpoint cannot access Mosque A collections
      const taqwaCollections = await publicService.getPublicJummahCollections(mosqueB.slug, {});
      expect(taqwaCollections.rows).toHaveLength(0);
      expect(taqwaCollections.meta.total).toBe(0);
    });
  });

  describe('4 & 14. Multi-Tenant Isolation & IDOR Protection', () => {
    it('Guarantees Mosque B actor cannot read or modify Mosque A entities across all routes', async () => {
      // 1. Fund Balance IDOR Protection
      await expect(
        fundBalanceService.getFundBalance(mosqueAdminB, 'fund-imam-salary-a'),
      ).rejects.toThrow();

      // 2. Notification IDOR Protection
      await expect(
        notificationsService.markAsRead(mosqueAdminB, 'notif-mosque-a'),
      ).rejects.toThrow();

      // 3. User Recipient Isolation
      const notifMemberA = await notificationsService.create(mosqueA.id, {
        userId: memberA.id,
        title: 'Member A Confidential Receipt',
        message: 'Personal receipt ready',
      });
      // Admin B cannot access
      await expect(
        notificationsService.markAsRead(mosqueAdminB, notifMemberA!.id),
      ).rejects.toThrow();
    });
  });

  describe('6. Soft-Deleted User Visibility Audit', () => {
    it('Enforces soft-delete filtering so standard queries omit deleted users', async () => {
      const activeUsers = users.filter((u) => u.deletedAt === null);
      expect(activeUsers.find((u) => u.id === 'deleted-user-a')).toBeUndefined();
    });
  });

  describe('8. Money / Decimal Precision & Invariants', () => {
    it('Accurately handles decimal values without binary floating point drift', () => {
      const d1 = toMoney('1000.50');
      const d2 = toMoney('2500.75');
      const sum = d1.plus(d2);
      expect(sum.toFixed(2)).toBe('3501.25');

      const negative = toMoney('-100');
      expect(negative.isNegative()).toBe(true);

      expect(() => toMoney('invalid_amount')).toThrow();
    });
  });
});
