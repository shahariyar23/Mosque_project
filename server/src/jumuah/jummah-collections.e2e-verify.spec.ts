import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FundStatus,
  JummahCollectionStatus,
  Prisma,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';

import { AuditLogService } from '../audit/audit-log.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { PublicTransparencyService } from '../public-transparency/public-transparency.service';
import { JummahCollectionsService } from './jummah-collections.service';

describe('PART 3 — Comprehensive Verification & Integration Test Suite', () => {
  let collectionsService: JummahCollectionsService;
  let publicService: PublicTransparencyService;
  let prisma: PrismaService;
  let audit: AuditLogService;

  const mosqueIdA = '11111111-1111-1111-1111-111111111111';
  const mosqueIdB = '22222222-2222-2222-2222-222222222222';
  const mosqueSlug = 'baitul-mukarram';
  const fundId = '33333333-3333-3333-3333-333333333333';

  const actorA: AuthenticatedUser = {
    id: 'user-a',
    mosqueId: mosqueIdA,
    email: 'treasurer@noor.org',
    role: 'treasurer',
    isActive: true,
    permissions: [],
    deniedPermissions: [],
  };

  const actorB: AuthenticatedUser = {
    id: 'user-b',
    mosqueId: mosqueIdB,
    email: 'treasurer-b@noor.org',
    role: 'treasurer',
    isActive: true,
    permissions: [],
    deniedPermissions: [],
  };

  // In-memory mock database state simulating Postgres
  let collectionsDb: any[] = [];
  let transactionsDb: any[] = [];
  let fundsDb: any[] = [];
  let auditDb: any[] = [];

  const mockPrisma: any = {
    $transaction: jest.fn(async (callback) => {
      if (typeof callback === 'function') {
        return callback(mockPrisma);
      }
      return Promise.all(callback);
    }),
    jummahCollection: {
      create: jest.fn(async ({ data, select }) => {
        const row = {
          id: `col-${collectionsDb.length + 1}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          fund: fundsDb.find((f) => f.id === data.fundId) || { id: data.fundId, name: 'Fund', slug: 'fund' },
          schedule: null,
          createdBy: { id: data.createdById, fullName: 'Actor', email: 'actor@noor.org' },
        };
        collectionsDb.push(row);
        return row;
      }),
      findMany: jest.fn(async ({ where, select, skip, take }) => {
        let rows = collectionsDb.filter((c) => {
          if (where.mosqueId && c.mosqueId !== where.mosqueId) return false;
          if (where.isPublic !== undefined && c.isPublic !== where.isPublic) return false;
          if (where.status && c.status !== where.status) return false;
          return true;
        });
        if (skip !== undefined && take !== undefined) {
          rows = rows.slice(skip, skip + take);
        }
        return rows;
      }),
      findFirst: jest.fn(async ({ where }) => {
        return collectionsDb.find((c) => {
          if (where.id && c.id !== where.id) return false;
          if (where.mosqueId && c.mosqueId !== where.mosqueId) return false;
          return true;
        }) || null;
      }),
      count: jest.fn(async ({ where }) => {
        return collectionsDb.filter((c) => {
          if (where.mosqueId && c.mosqueId !== where.mosqueId) return false;
          return true;
        }).length;
      }),
      update: jest.fn(async ({ where, data, select }) => {
        const idx = collectionsDb.findIndex((c) => c.id === where.id);
        if (idx === -1) throw new Error('Not found');
        const updated = { ...collectionsDb[idx], ...data, updatedAt: new Date() };
        collectionsDb[idx] = updated;
        return updated;
      }),
    },
    transaction: {
      create: jest.fn(async ({ data }) => {
        const row = { id: `tx-${transactionsDb.length + 1}`, ...data };
        transactionsDb.push(row);
        return row;
      }),
      findFirst: jest.fn(async ({ where }) => {
        return transactionsDb.find((t) => {
          if (where.mosqueId && t.mosqueId !== where.mosqueId) return false;
          if (where.jummahCollectionId && t.jummahCollectionId !== where.jummahCollectionId) return false;
          return true;
        }) || null;
      }),
      update: jest.fn(async ({ where, data }) => {
        const idx = transactionsDb.findIndex((t) => t.id === where.id);
        if (idx === -1) throw new Error('Not found');
        const updated = { ...transactionsDb[idx], ...data };
        transactionsDb[idx] = updated;
        return updated;
      }),
      aggregate: jest.fn(async ({ where }) => {
        const matched = transactionsDb.filter((t) => {
          if (where.mosqueId && t.mosqueId !== where.mosqueId) return false;
          if (where.fundId && t.fundId !== where.fundId) return false;
          if (where.type && t.type !== where.type) return false;
          if (where.status && t.status !== where.status) return false;
          return true;
        });
        const sum = matched.reduce((acc, t) => acc.add(new Prisma.Decimal(t.amount)), new Prisma.Decimal(0));
        return { _sum: { amount: sum } };
      }),
    },
    donationFund: {
      findFirst: jest.fn(async ({ where }) => {
        return fundsDb.find((f) => {
          if (where.id && f.id !== where.id) return false;
          if (where.mosqueId && f.mosqueId !== where.mosqueId) return false;
          if (where.slug && f.slug !== where.slug) return false;
          return true;
        }) || null;
      }),
      findMany: jest.fn(async ({ where }) => {
        return fundsDb.filter((f) => {
          if (where.mosqueId && f.mosqueId !== where.mosqueId) return false;
          if (where.isPublic !== undefined && f.isPublic !== where.isPublic) return false;
          return true;
        });
      }),
    },
    jumuahSchedule: {
      findFirst: jest.fn(async () => null),
    },
    mosque: {
      findUnique: jest.fn(async ({ where }) => {
        if (where.slug === mosqueSlug) {
          return {
            id: mosqueIdA,
            name: 'Baitul Mukarram National Mosque',
            slug: mosqueSlug,
            isActive: true,
            settings: { currency: 'BDT' },
          };
        }
        return null;
      }),
    },
    mosqueSettings: {
      findUnique: jest.fn(async () => ({ currency: 'BDT' })),
    },
  };

  const mockAudit: any = {
    record: jest.fn(async (entry) => {
      auditDb.push(entry);
    }),
  };

  beforeEach(async () => {
    collectionsDb = [];
    transactionsDb = [];
    auditDb = [];
    fundsDb = [
      {
        id: fundId,
        mosqueId: mosqueIdA,
        name: 'Mosque Building Fund',
        slug: 'mosque-building-fund',
        description: 'Second floor prayer hall expansion',
        status: FundStatus.active,
        openingBalance: new Prisma.Decimal('300000.00'),
        targetAmount: new Prisma.Decimal('500000.00'),
        isPublic: true,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      },
    ];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JummahCollectionsService,
        PublicTransparencyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAudit },
      ],
    }).compile();

    collectionsService = module.get<JummahCollectionsService>(JummahCollectionsService);
    publicService = module.get<PublicTransparencyService>(PublicTransparencyService);
    prisma = module.get<PrismaService>(PrismaService);
    audit = module.get<AuditLogService>(AuditLogService);

    jest.clearAllMocks();
  });

  describe('3. Historical Non-Overwrite & Independence Test', () => {
    it('creates 30 Aug, 6 Sep, and 13 Sep collections and verifies they are separate and non-overwriting', async () => {
      // 1. Record 30 August 2026 (Friday) = ৳10,000
      const rec1 = await collectionsService.create(actorA, {
        date: '2026-08-28', // Friday
        fundId,
        amount: '10000.00',
        reference: 'BOX-30-AUG',
      });

      // 2. Record 6 September 2026 (Friday) = ৳7,500
      const rec2 = await collectionsService.create(actorA, {
        date: '2026-09-04', // Friday
        fundId,
        amount: '7500.00',
        reference: 'BOX-06-SEP',
      });

      // 3. Record 13 September 2026 (Friday) = ৳12,000
      const rec3 = await collectionsService.create(actorA, {
        date: '2026-09-11', // Friday
        fundId,
        amount: '12000.00',
        reference: 'BOX-13-SEP',
      });

      // Verify all three exist independently
      expect(rec1.amount).toBe('10000.00');
      expect(rec2.amount).toBe('7500.00');
      expect(rec3.amount).toBe('12000.00');

      expect(rec1.id).not.toBe(rec2.id);
      expect(rec2.id).not.toBe(rec3.id);

      // Verify historical data: reading rec1 still yields ৳10,000
      const fetchedRec1 = await collectionsService.findOne(actorA, rec1.id);
      expect(fetchedRec1.amount).toBe('10000.00');
      expect(fetchedRec1.date).toBe('2026-08-28');
    });

    it('4. Correcting one collection does not alter other historical collections', async () => {
      const rec1 = await collectionsService.create(actorA, {
        date: '2026-08-28',
        fundId,
        amount: '10000.00',
      });

      const rec2 = await collectionsService.create(actorA, {
        date: '2026-09-04',
        fundId,
        amount: '7500.00',
      });

      // Correct rec2 from 7,500 to 8,000
      const updatedRec2 = await collectionsService.update(actorA, rec2.id, {
        amount: '8000.00',
        notes: 'Recounted',
      });

      expect(updatedRec2.amount).toBe('8000.00');

      // rec1 MUST remain exactly 10,000
      const fetchedRec1 = await collectionsService.findOne(actorA, rec1.id);
      expect(fetchedRec1.amount).toBe('10000.00');
    });
  });

  describe('5 & 6. Fund Integration & Progress Calculations', () => {
    it('verifies opening balance + collections dynamically updates total collected, remaining, and progress %', async () => {
      // Opening balance = 300,000. Target = 500,000.
      // Before collections: collected = 300,000 (60%)
      const initialProgress = await publicService.getPublicFundBySlug(mosqueSlug, 'mosque-building-fund');
      expect(initialProgress.collectedAmount).toBe('300000.00');
      expect(initialProgress.remainingAmount).toBe('200000.00');
      expect(initialProgress.progressPercentage).toBe(60.0);

      // Record Collection 1: 10,000
      await collectionsService.create(actorA, { date: '2026-08-28', fundId, amount: '10000.00' });
      // Now collected = 310,000, remaining = 190,000, progress = 62%
      const progress1 = await publicService.getPublicFundBySlug(mosqueSlug, 'mosque-building-fund');
      expect(progress1.collectedAmount).toBe('310000.00');
      expect(progress1.remainingAmount).toBe('190000.00');
      expect(progress1.progressPercentage).toBe(62.0);

      // Record Collection 2: 7,500
      await collectionsService.create(actorA, { date: '2026-09-04', fundId, amount: '7500.00' });
      // Record Collection 3: 12,000
      await collectionsService.create(actorA, { date: '2026-09-11', fundId, amount: '12000.00' });

      // Total collected = 300,000 + 10,000 + 7,500 + 12,000 = 329,500
      // Remaining = 500,000 - 329,500 = 170,500
      // Progress = (329,500 / 500,000) * 100 = 65.9%
      const finalProgress = await publicService.getPublicFundBySlug(mosqueSlug, 'mosque-building-fund');
      expect(finalProgress.collectedAmount).toBe('329500.00');
      expect(finalProgress.remainingAmount).toBe('170500.00');
      expect(finalProgress.progressPercentage).toBe(65.9);
    });
  });

  describe('7. Transaction Ledger Synchronization', () => {
    it('creates exactly 1 completed income Transaction per completed collection and reverses on void', async () => {
      const col = await collectionsService.create(actorA, {
        date: '2026-09-04',
        fundId,
        amount: '10000.00',
        reference: 'BOX-101',
      });

      expect(transactionsDb).toHaveLength(1);
      const tx = transactionsDb[0];
      expect(tx.type).toBe(TransactionType.income);
      expect(tx.status).toBe(TransactionStatus.completed);
      expect(tx.amount.toString()).toBe('10000');
      expect(tx.fundId).toBe(fundId);
      expect(tx.jummahCollectionId).toBe(col.id);

      // Void the collection
      await collectionsService.update(actorA, col.id, {
        status: JummahCollectionStatus.voided,
      });

      // Transaction status must move to voided
      expect(transactionsDb[0].status).toBe(TransactionStatus.voided);
    });
  });

  describe('10 & 11. Public Transparency & Visibility Isolation', () => {
    it('exposes public collections while hiding non-public ones from public API', async () => {
      // 1. Create a public collection
      await collectionsService.create(actorA, {
        date: '2026-09-04',
        fundId,
        amount: '10000.00',
        isPublic: true,
        notes: 'Publicly visible collection',
      });

      // 2. Create an internal non-public collection
      await collectionsService.create(actorA, {
        date: '2026-09-11',
        fundId,
        amount: '5000.00',
        isPublic: false,
        notes: 'Internal private audit collection',
      });

      // Admin sees both (total 2)
      const adminList = await collectionsService.findAll(actorA, {});
      expect(adminList.rows).toHaveLength(2);

      // Public API sees ONLY the public collection (total 1)
      const publicList = await publicService.getPublicJummahCollections(mosqueSlug, {});
      expect(publicList.rows).toHaveLength(1);
      expect(publicList.rows[0]?.amount).toBe('10000.00');

      // Privacy check: Zero donor account, user ID, email, or private references in public API
      const pubItem = publicList.rows[0] as any;
      expect(pubItem.createdById).toBeUndefined();
      expect(pubItem.userId).toBeUndefined();
      expect(pubItem.donorName).toBeUndefined();
      expect(pubItem.donorEmail).toBeUndefined();
    });
  });

  describe('13. Multi-Tenant Mosque Isolation', () => {
    it('prevents Mosque B from viewing, updating, or attaching funds of Mosque A', async () => {
      const colA = await collectionsService.create(actorA, {
        date: '2026-09-04',
        fundId,
        amount: '10000.00',
      });

      // Mosque B attempts to read Mosque A's collection -> 404
      await expect(collectionsService.findOne(actorB, colA.id)).rejects.toThrow(NotFoundException);

      // Mosque B attempts to update Mosque A's collection -> 404
      await expect(
        collectionsService.update(actorB, colA.id, { amount: '20000.00' }),
      ).rejects.toThrow(NotFoundException);

      // Mosque B attempts to create collection attaching to Mosque A's fund -> 400
      await expect(
        collectionsService.create(actorB, { date: '2026-09-04', fundId, amount: '5000.00' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('16. Audit Log Recording', () => {
    it('records audit trail for collection creation, update, and void actions', async () => {
      const col = await collectionsService.create(actorA, {
        date: '2026-09-04',
        fundId,
        amount: '10000.00',
      });

      expect(auditDb).toContainEqual(
        expect.objectContaining({
          action: 'JUMMAH_COLLECTION_RECORDED',
          resource: 'jummah_collection',
          resourceId: col.id,
        }),
      );

      await collectionsService.update(actorA, col.id, {
        status: JummahCollectionStatus.voided,
      });

      expect(auditDb).toContainEqual(
        expect.objectContaining({
          action: 'JUMMAH_COLLECTION_VOIDED',
          resource: 'jummah_collection',
          resourceId: col.id,
        }),
      );
    });
  });

  describe('17. Date Handling & Friday Validation', () => {
    it('accepts valid Friday and preserves YYYY-MM-DD date without shifting', async () => {
      const col = await collectionsService.create(actorA, {
        date: '2026-08-28', // Friday
        fundId,
        amount: '10000.00',
      });

      expect(col.date).toBe('2026-08-28');
    });

    it('rejects non-Friday dates with clear 400 error message', async () => {
      await expect(
        collectionsService.create(actorA, {
          date: '2026-08-29', // Saturday
          fundId,
          amount: '10000.00',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
