import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JummahCollectionStatus, TransactionStatus, TransactionType } from '@prisma/client';

import { AuditLogService } from '../audit/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { JummahCollectionsService } from './jummah-collections.service';

import type { AuthenticatedUser } from '../common/types/authenticated-user';

describe('JummahCollectionsService', () => {
  let service: JummahCollectionsService;
  let prisma: PrismaService;
  let audit: AuditLogService;

  const mosqueId = '11111111-1111-1111-1111-111111111111';
  const otherMosqueId = '22222222-2222-2222-2222-222222222222';
  const fundId = '33333333-3333-3333-3333-333333333333';
  const scheduleId = '44444444-4444-4444-4444-444444444444';
  const actor: AuthenticatedUser = {
    id: 'user-1',
    mosqueId,
    email: 'treasurer@noor.org',
    role: 'treasurer' as const,
    isActive: true,
    permissions: [],
    deniedPermissions: [],
  };

  const mockPrisma: any = {
    $transaction: jest.fn((callback) => {
      if (typeof callback === 'function') {
        return callback(mockPrisma);
      }
      return Promise.all(callback);
    }),
    jummahCollection: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    donationFund: {
      findFirst: jest.fn(),
    },
    jumuahSchedule: {
      findFirst: jest.fn(),
    },
    mosqueSettings: {
      findUnique: jest.fn(),
    },
  };

  const mockAudit = {
    record: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JummahCollectionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<JummahCollectionsService>(JummahCollectionsService);
    prisma = module.get<PrismaService>(PrismaService);
    audit = module.get<AuditLogService>(AuditLogService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('TEST 1 & 4: creates a Jummah collection for Friday and atomically records income transaction in ledger', async () => {
      // 2026-09-04 is a Friday
      mockPrisma.donationFund.findFirst.mockResolvedValueOnce({ id: fundId, name: 'Building Fund' });
      mockPrisma.mosqueSettings.findUnique.mockResolvedValueOnce({ currency: 'BDT' });

      const mockCreated = {
        id: 'col-1',
        mosqueId,
        date: new Date('2026-09-04T00:00:00.000Z'),
        amount: '10000.00',
        currency: 'BDT',
        status: JummahCollectionStatus.completed,
        reference: 'BOX-1',
        notes: 'First Friday collection',
        isPublic: true,
        createdAt: new Date('2026-09-04T12:00:00.000Z'),
        updatedAt: new Date('2026-09-04T12:00:00.000Z'),
        fund: { id: fundId, name: 'Building Fund', slug: 'building-fund' },
        schedule: null,
        createdBy: { id: actor.id, fullName: 'Treasurer', email: actor.email },
      };

      mockPrisma.jummahCollection.create.mockResolvedValueOnce(mockCreated);
      mockPrisma.transaction.create.mockResolvedValueOnce({ id: 'tx-1' });

      const result = await service.create(actor, {
        date: '2026-09-04',
        fundId,
        amount: '10000.00',
        notes: 'First Friday collection',
        reference: 'BOX-1',
      });

      expect(result.id).toBe('col-1');
      expect(result.amount).toBe('10000.00');
      expect(result.date).toBe('2026-09-04');
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mosqueId,
            type: TransactionType.income,
            status: TransactionStatus.completed,
            amount: expect.anything(),
            fundId,
            jummahCollectionId: 'col-1',
          }),
        }),
      );
      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'JUMMAH_COLLECTION_RECORDED',
          resource: 'jummah_collection',
          resourceId: 'col-1',
        }),
      );
    });

    it('TEST 2 & 3: creating a second collection for next Friday (2026-09-11) is stored as a separate independent record', async () => {
      // 2026-09-11 is a Friday
      mockPrisma.donationFund.findFirst.mockResolvedValueOnce({ id: fundId, name: 'Building Fund' });
      mockPrisma.mosqueSettings.findUnique.mockResolvedValueOnce({ currency: 'BDT' });

      const mockSecondCreated = {
        id: 'col-2',
        mosqueId,
        date: new Date('2026-09-11T00:00:00.000Z'),
        amount: '7500.00',
        currency: 'BDT',
        status: JummahCollectionStatus.completed,
        reference: 'BOX-2',
        notes: 'Second Friday collection',
        isPublic: true,
        createdAt: new Date('2026-09-11T12:00:00.000Z'),
        updatedAt: new Date('2026-09-11T12:00:00.000Z'),
        fund: { id: fundId, name: 'Building Fund', slug: 'building-fund' },
        schedule: null,
        createdBy: { id: actor.id, fullName: 'Treasurer', email: actor.email },
      };

      mockPrisma.jummahCollection.create.mockResolvedValueOnce(mockSecondCreated);
      mockPrisma.transaction.create.mockResolvedValueOnce({ id: 'tx-2' });

      const result = await service.create(actor, {
        date: '2026-09-11',
        fundId,
        amount: '7500.00',
        notes: 'Second Friday collection',
        reference: 'BOX-2',
      });

      expect(result.id).toBe('col-2');
      expect(result.amount).toBe('7500.00');
      expect(result.date).toBe('2026-09-11');
      // Proves col-2 is independent from col-1
      expect(result.id).not.toBe('col-1');
    });

    it('TEST 6: fails when trying to attach to another mosque’s fund', async () => {
      // Fund lookup returns null for this mosque
      mockPrisma.donationFund.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.create(actor, {
          date: '2026-09-04',
          fundId: 'foreign-fund-id',
          amount: '5000.00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('TEST 7: fails when date is not a Friday', async () => {
      // 2026-09-05 is a Saturday
      await expect(
        service.create(actor, {
          date: '2026-09-05',
          fundId,
          amount: '5000.00',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update / voiding', () => {
    it('TEST 9: voiding a collection updates status and marks financial transaction as voided', async () => {
      const existing = {
        id: 'col-1',
        mosqueId,
        date: new Date('2026-09-04T00:00:00.000Z'),
        amount: '10000.00',
        currency: 'BDT',
        status: JummahCollectionStatus.completed,
        reference: 'BOX-1',
        notes: null,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        fund: { id: fundId, name: 'Building Fund', slug: 'building-fund' },
        schedule: null,
        createdBy: { id: actor.id, fullName: 'Treasurer', email: actor.email },
      };

      mockPrisma.jummahCollection.findFirst.mockResolvedValueOnce(existing);
      mockPrisma.jummahCollection.update.mockResolvedValueOnce({
        ...existing,
        status: JummahCollectionStatus.voided,
      });
      mockPrisma.transaction.findFirst.mockResolvedValueOnce({ id: 'tx-1' });
      mockPrisma.transaction.update.mockResolvedValueOnce({ id: 'tx-1', status: TransactionStatus.voided });

      const result = await service.update(actor, 'col-1', {
        status: JummahCollectionStatus.voided,
      });

      expect(result.status).toBe(JummahCollectionStatus.voided);
      expect(mockPrisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
        data: { status: TransactionStatus.voided },
      });
      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'JUMMAH_COLLECTION_VOIDED',
          resource: 'jummah_collection',
          resourceId: 'col-1',
        }),
      );
    });
  });

  describe('tenant isolation', () => {
    it('throws 404 when reading a collection of a different mosque', async () => {
      mockPrisma.jummahCollection.findFirst.mockResolvedValueOnce(null);

      await expect(service.findOne(actor, 'foreign-col-id')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.jummahCollection.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'foreign-col-id', mosqueId: actor.mosqueId },
        }),
      );
    });
  });
});
