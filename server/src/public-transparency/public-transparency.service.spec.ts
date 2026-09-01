import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FundStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { PublicTransparencyService } from './public-transparency.service';

describe('PublicTransparencyService', () => {
  let service: PublicTransparencyService;
  let prisma: PrismaService;

  const mosqueId = '11111111-1111-1111-1111-111111111111';
  const mosqueSlug = 'baitul-mukarram';

  const mockMosque = {
    id: mosqueId,
    name: 'Baitul Mukarram National Mosque',
    slug: mosqueSlug,
    isActive: true,
    settings: { currency: 'BDT' },
  };

  const mockPrisma = {
    mosque: {
      findUnique: jest.fn(),
    },
    donationFund: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    jummahCollection: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    transaction: {
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicTransparencyService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PublicTransparencyService>(PublicTransparencyService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('getPublicFunds & progress calculation', () => {
    it('TEST 4 & 5 & 9: correctly computes target, collected, remaining, and progress percentage for public funds', async () => {
      mockPrisma.mosque.findUnique.mockResolvedValueOnce(mockMosque);

      const mockFunds = [
        {
          id: 'fund-1',
          name: 'Mosque Building Fund',
          slug: 'mosque-building-fund',
          description: 'Expansion project',
          status: FundStatus.active,
          openingBalance: new Prisma.Decimal(25000),
          targetAmount: new Prisma.Decimal(500000),
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-12-31'),
        },
      ];

      mockPrisma.donationFund.findMany.mockResolvedValueOnce(mockFunds);
      // Income transactions sum to 300,000 => Total collected = 25,000 + 300,000 = 325,000
      mockPrisma.transaction.aggregate.mockResolvedValueOnce({
        _sum: { amount: new Prisma.Decimal(300000) },
      });

      const results = await service.getPublicFunds(mosqueSlug);

      expect(results).toHaveLength(1);
      const fund = results[0]!;
      expect(fund.targetAmount).toBe('500000.00');
      expect(fund.collectedAmount).toBe('325000.00');
      expect(fund.remainingAmount).toBe('175000.00');
      expect(fund.progressPercentage).toBe(65.0);
      expect(fund.currency).toBe('BDT');
    });

    it('handles open-ended funds without targets (targetAmount: null)', async () => {
      mockPrisma.mosque.findUnique.mockResolvedValueOnce(mockMosque);

      const mockFunds = [
        {
          id: 'fund-2',
          name: 'Zakat Fund',
          slug: 'zakat-fund',
          description: 'General zakat',
          status: FundStatus.active,
          openingBalance: new Prisma.Decimal(0),
          targetAmount: null,
          startDate: null,
          endDate: null,
        },
      ];

      mockPrisma.donationFund.findMany.mockResolvedValueOnce(mockFunds);
      mockPrisma.transaction.aggregate.mockResolvedValueOnce({
        _sum: { amount: new Prisma.Decimal(50000) },
      });

      const results = await service.getPublicFunds(mosqueSlug);

      expect(results).toHaveLength(1);
      const fund = results[0]!;
      expect(fund.targetAmount).toBeNull();
      expect(fund.collectedAmount).toBe('50000.00');
      expect(fund.remainingAmount).toBeNull();
      expect(fund.progressPercentage).toBeNull();
    });
  });

  describe('getPublicJummahCollections privacy check', () => {
    it('TEST 10: exposes only public fields and zero private donor info, user emails, or internal IDs', async () => {
      mockPrisma.mosque.findUnique.mockResolvedValueOnce(mockMosque);

      const mockCollections = [
        {
          id: 'col-1',
          date: new Date('2026-09-04T00:00:00.000Z'),
          amount: new Prisma.Decimal(10000),
          currency: 'BDT',
          notes: 'Congregational collection',
          fund: { name: 'Mosque Building Fund', slug: 'mosque-building-fund' },
        },
      ];

      mockPrisma.jummahCollection.count.mockResolvedValueOnce(1);
      mockPrisma.jummahCollection.findMany.mockResolvedValueOnce(mockCollections);

      const result = await service.getPublicJummahCollections(mosqueSlug, { page: 1, limit: 20 });

      expect(result.rows).toHaveLength(1);
      const item = result.rows[0] as any;
      expect(item.amount).toBe('10000.00');
      expect(item.date).toBe('2026-09-04');
      expect(item.fundName).toBe('Mosque Building Fund');

      // Strict privacy assertions
      expect(item.userId).toBeUndefined();
      expect(item.donorName).toBeUndefined();
      expect(item.donorEmail).toBeUndefined();
      expect(item.createdById).toBeUndefined();
      expect(item.donor).toBeUndefined();
    });

    it('throws 404 when mosque slug is not found or inactive', async () => {
      mockPrisma.mosque.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.getPublicJummahCollections('non-existent-slug', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
