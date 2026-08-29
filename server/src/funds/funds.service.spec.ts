import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FundStatus, Prisma } from '@prisma/client';

import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { FundBalanceService } from '../fund-balance/fund-balance.service';
import { PrismaService } from '../prisma/prisma.service';
import { FundsService } from './funds.service';

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';
const USER_ID = '1f8c6cfe-6fe5-11d2-883f-0016d3cca777';
const FUND_1_ID = '11111111-1111-1111-1111-111111111111';
const FUND_2_ID = '22222222-2222-2222-2222-222222222222';

const ACTOR: AuthenticatedUser = {
  id: USER_ID,
  mosqueId: MOSQUE_ID,
  email: 'treasurer@noor.example',
  role: 'treasurer',
  permissions: ['fund.view', 'finance.view'],
  deniedPermissions: [],
  isActive: true,
};

describe('FundsService', () => {
  let service: FundsService;
  let prisma: any;
  let fundBalanceService: any;

  beforeEach(async () => {
    prisma = {
      donationFund: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      mosqueSettings: {
        findUnique: jest.fn().mockResolvedValue({ currency: 'BDT' }),
      },
    };

    fundBalanceService = {
      getFundBalance: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundsService,
        { provide: PrismaService, useValue: prisma },
        { provide: FundBalanceService, useValue: fundBalanceService },
      ],
    }).compile();

    service = module.get<FundsService>(FundsService);
  });

  describe('getAllFunds', () => {
    it('returns all funds with server-calculated balance metrics', async () => {
      prisma.donationFund.findMany.mockResolvedValue([
        {
          id: FUND_1_ID,
          name: 'General Fund',
          slug: 'general-fund',
          description: 'General fund',
          status: FundStatus.active,
          targetAmount: null,
          openingBalance: new Prisma.Decimal('1000.00'),
          startDate: null,
          endDate: null,
          isPublic: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          _count: { campaigns: 1 },
        },
      ]);

      fundBalanceService.getFundBalance.mockResolvedValue({
        fundId: FUND_1_ID,
        fundName: 'General Fund',
        currency: 'BDT',
        openingBalance: '1000.00',
        totalIncome: '5000.00',
        totalExpenses: '2000.00',
        incomingTransfers: '1000.00',
        outgoingTransfers: '500.00',
        availableBalance: '4500.00',
      });

      const result = await service.getAllFunds(ACTOR);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: FUND_1_ID,
          name: 'General Fund',
          currency: 'BDT',
          openingBalance: '1000.00',
          totalIncome: '5000.00',
          totalExpenses: '2000.00',
          incomingTransfers: '1000.00',
          outgoingTransfers: '500.00',
          availableBalance: '4500.00',
        }),
      );
    });
  });

  describe('getFundById', () => {
    it('returns single fund details and calculated balance breakdown', async () => {
      prisma.donationFund.findFirst.mockResolvedValue({
        id: FUND_1_ID,
        name: 'General Fund',
        slug: 'general-fund',
        description: 'General fund',
        status: FundStatus.active,
        targetAmount: null,
        openingBalance: new Prisma.Decimal('1000.00'),
        startDate: null,
        endDate: null,
        isPublic: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        _count: { campaigns: 1 },
      });

      fundBalanceService.getFundBalance.mockResolvedValue({
        fundId: FUND_1_ID,
        fundName: 'General Fund',
        currency: 'BDT',
        openingBalance: '1000.00',
        totalIncome: '5000.00',
        totalExpenses: '2000.00',
        incomingTransfers: '1000.00',
        outgoingTransfers: '500.00',
        availableBalance: '4500.00',
      });

      const result = await service.getFundById(ACTOR, FUND_1_ID);

      expect(result.id).toBe(FUND_1_ID);
      expect(result.availableBalance).toBe('4500.00');
    });

    it('throws NotFoundException when fund does not belong to mosque', async () => {
      prisma.donationFund.findFirst.mockResolvedValue(null);

      await expect(service.getFundById(ACTOR, FUND_1_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFundsSummary', () => {
    it('aggregates total available, opening, income, expenses, and transfers across funds', async () => {
      prisma.donationFund.findMany.mockResolvedValue([
        {
          id: FUND_1_ID,
          name: 'General Fund',
          slug: 'general-fund',
          status: FundStatus.active,
          targetAmount: null,
          openingBalance: new Prisma.Decimal('1000.00'),
          startDate: null,
          endDate: null,
          isPublic: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          _count: { campaigns: 1 },
        },
        {
          id: FUND_2_ID,
          name: 'Building Fund',
          slug: 'building-fund',
          status: FundStatus.active,
          targetAmount: null,
          openingBalance: new Prisma.Decimal('2000.00'),
          startDate: null,
          endDate: null,
          isPublic: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          _count: { campaigns: 0 },
        },
      ]);

      fundBalanceService.getFundBalance
        .mockResolvedValueOnce({
          fundId: FUND_1_ID,
          fundName: 'General Fund',
          currency: 'BDT',
          openingBalance: '1000.00',
          totalIncome: '5000.00',
          totalExpenses: '2000.00',
          incomingTransfers: '0.00',
          outgoingTransfers: '500.00',
          availableBalance: '3500.00',
        })
        .mockResolvedValueOnce({
          fundId: FUND_2_ID,
          fundName: 'Building Fund',
          currency: 'BDT',
          openingBalance: '2000.00',
          totalIncome: '1000.00',
          totalExpenses: '500.00',
          incomingTransfers: '500.00',
          outgoingTransfers: '0.00',
          availableBalance: '3000.00',
        });

      const result = await service.getFundsSummary(ACTOR);

      expect(result.currency).toBe('BDT');
      expect(result.totalAvailableBalance).toBe('6500.00'); // 3500 + 3000
      expect(result.totalOpeningBalance).toBe('3000.00'); // 1000 + 2000
      expect(result.totalIncome).toBe('6000.00'); // 5000 + 1000
      expect(result.totalExpenses).toBe('2500.00'); // 2000 + 500
      expect(result.totalTransfers).toBe('500.00'); // incoming transfers total
      expect(result.fundCount).toBe(2);
      expect(result.funds).toHaveLength(2);
    });
  });
});
