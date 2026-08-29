import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, TransactionStatus, TransactionType } from '@prisma/client';

import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { FundBalanceService } from './fund-balance.service';

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';
const OTHER_MOSQUE_ID = 'd0b80121-7ac0-11d1-898c-00c04fd8d5c1';
const FUND_ID = '1b4e28ba-2fa1-11d2-883f-0016d3cca427';
const FUND_2_ID = '2c5e28ba-2fa1-11d2-883f-0016d3cca428';

const ACTOR: AuthenticatedUser = {
  id: '9c8b7a65-4321-4f6a-8c11-2d5e7a9b0c31',
  mosqueId: MOSQUE_ID,
  email: 'treasurer@noor.example',
  role: 'treasurer',
  permissions: [],
  deniedPermissions: [],
  isActive: true,
};

describe('FundBalanceService', () => {
  let service: FundBalanceService;
  let prisma: {
    donationFund: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
    transaction: {
      aggregate: jest.Mock;
      groupBy: jest.Mock;
    };
    mosqueSettings: {
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      donationFund: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      transaction: {
        aggregate: jest.fn(),
        groupBy: jest.fn(),
      },
      mosqueSettings: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundBalanceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FundBalanceService>(FundBalanceService);
  });

  describe('getFundBalance', () => {
    it('calculates availableBalance correctly with openingBalance, income, expenses, and transfers', async () => {
      prisma.donationFund.findFirst.mockResolvedValue({
        id: FUND_ID,
        name: 'Zakat Fund',
        openingBalance: new Prisma.Decimal('10000.00'),
      });

      // $transaction receives an array of 4 aggregate queries
      prisma.$transaction.mockResolvedValue([
        { _sum: { amount: new Prisma.Decimal('50000.50') } }, // income
        { _sum: { amount: new Prisma.Decimal('15000.25') } }, // expense
        { _sum: { amount: new Prisma.Decimal('5000.00') } },  // incoming transfers
        { _sum: { amount: new Prisma.Decimal('2000.00') } },  // outgoing transfers
      ]);

      const result = await service.getFundBalance(ACTOR, FUND_ID);

      // available = 10000.00 + 50000.50 - 15000.25 + 5000.00 - 2000.00 = 48000.25
      expect(result).toEqual({
        fundId: FUND_ID,
        fundName: 'Zakat Fund',
        openingBalance: '10000.00',
        totalIncome: '50000.50',
        totalExpenses: '15000.25',
        incomingTransfers: '5000.00',
        outgoingTransfers: '2000.00',
        availableBalance: '48000.25',
      });

      expect(prisma.donationFund.findFirst).toHaveBeenCalledWith({
        where: { id: FUND_ID, mosqueId: MOSQUE_ID },
        select: { id: true, name: true, openingBalance: true },
      });
    });

    it('defaults openingBalance to 0.00 and handles null aggregates', async () => {
      prisma.donationFund.findFirst.mockResolvedValue({
        id: FUND_ID,
        name: 'Sadaqah Fund',
        openingBalance: null,
      });

      prisma.$transaction.mockResolvedValue([
        { _sum: { amount: null } },
        { _sum: { amount: null } },
        { _sum: { amount: null } },
        { _sum: { amount: null } },
      ]);

      const result = await service.getFundBalance(ACTOR, FUND_ID);

      expect(result).toEqual({
        fundId: FUND_ID,
        fundName: 'Sadaqah Fund',
        openingBalance: '0.00',
        totalIncome: '0.00',
        totalExpenses: '0.00',
        incomingTransfers: '0.00',
        outgoingTransfers: '0.00',
        availableBalance: '0.00',
      });
    });

    it('throws NotFoundException when fund is not found or belongs to another mosque', async () => {
      prisma.donationFund.findFirst.mockResolvedValue(null);

      await expect(service.getFundBalance(ACTOR, 'non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAllFundBalances', () => {
    it('returns all fund balances and total available balance across the mosque', async () => {
      prisma.donationFund.findMany.mockResolvedValue([
        { id: FUND_ID, name: 'Fund 1' },
        { id: FUND_2_ID, name: 'Fund 2' },
      ]);

      // Mock first fund lookup & aggregates
      prisma.donationFund.findFirst
        .mockResolvedValueOnce({
          id: FUND_ID,
          name: 'Fund 1',
          openingBalance: new Prisma.Decimal('1000.00'),
        })
        .mockResolvedValueOnce({
          id: FUND_2_ID,
          name: 'Fund 2',
          openingBalance: new Prisma.Decimal('2000.00'),
        });

      prisma.$transaction
        .mockResolvedValueOnce([
          { _sum: { amount: new Prisma.Decimal('500.00') } }, // income
          { _sum: { amount: new Prisma.Decimal('100.00') } }, // expense
          { _sum: { amount: null } },
          { _sum: { amount: null } },
        ])
        .mockResolvedValueOnce([
          { _sum: { amount: new Prisma.Decimal('1500.00') } }, // income
          { _sum: { amount: new Prisma.Decimal('500.00') } },  // expense
          { _sum: { amount: null } },
          { _sum: { amount: null } },
        ]);

      const result = await service.getAllFundBalances(ACTOR);

      // Fund 1 available = 1000 + 500 - 100 = 1400.00
      // Fund 2 available = 2000 + 1500 - 500 = 3000.00
      // Total available = 4400.00
      expect(result.funds).toHaveLength(2);
      expect(result.funds[0].availableBalance).toBe('1400.00');
      expect(result.funds[1].availableBalance).toBe('3000.00');
      expect(result.totalAvailableBalance).toBe('4400.00');
    });
  });

  describe('checkSufficientFunds', () => {
    it('returns sufficient: true when requested amount is <= available balance', async () => {
      prisma.donationFund.findFirst.mockResolvedValue({
        id: FUND_ID,
        name: 'General Fund',
        openingBalance: new Prisma.Decimal('5000.00'),
      });

      prisma.$transaction.mockResolvedValue([
        { _sum: { amount: new Prisma.Decimal('2000.00') } },
        { _sum: { amount: new Prisma.Decimal('1000.00') } },
        { _sum: { amount: null } },
        { _sum: { amount: null } },
      ]);

      // available = 5000 + 2000 - 1000 = 6000.00
      const result = await service.checkSufficientFunds(ACTOR, FUND_ID, '5000.00');

      expect(result).toEqual({
        fundId: FUND_ID,
        fundName: 'General Fund',
        availableBalance: '6000.00',
        requestedAmount: '5000.00',
        sufficient: true,
      });
    });

    it('returns sufficient: false when requested amount exceeds available balance', async () => {
      prisma.donationFund.findFirst.mockResolvedValue({
        id: FUND_ID,
        name: 'General Fund',
        openingBalance: new Prisma.Decimal('1000.00'),
      });

      prisma.$transaction.mockResolvedValue([
        { _sum: { amount: null } },
        { _sum: { amount: null } },
        { _sum: { amount: null } },
        { _sum: { amount: null } },
      ]);

      // available = 1000.00
      const result = await service.checkSufficientFunds(ACTOR, FUND_ID, '5000.00');

      expect(result).toEqual({
        fundId: FUND_ID,
        fundName: 'General Fund',
        availableBalance: '1000.00',
        requestedAmount: '5000.00',
        sufficient: false,
      });
    });

    it('rejects invalid or negative amounts', async () => {
      await expect(service.checkSufficientFunds(ACTOR, FUND_ID, '-100.00')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.checkSufficientFunds(ACTOR, FUND_ID, 'invalid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('assertSufficientFundsTx', () => {
    it('succeeds when availableBalance >= requiredAmount (Fund = ৳1,000, Expense = ৳700)', async () => {
      const mockTx = {
        $queryRaw: jest.fn().mockResolvedValue([]),
        donationFund: {
          findFirst: jest.fn().mockResolvedValue({
            id: FUND_ID,
            name: 'Maintenance Fund',
            openingBalance: new Prisma.Decimal('1000.00'),
          }),
        },
        transaction: {
          aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
        },
      };

      const result = await service.assertSufficientFundsTx(
        mockTx as any,
        MOSQUE_ID,
        FUND_ID,
        new Prisma.Decimal('700.00'),
      );

      expect(result.availableBalance.toFixed(2)).toBe('1000.00');
    });

    it('rejects with clear message when availableBalance < requiredAmount (Fund = ৳300, Expense = ৳500)', async () => {
      const mockTx = {
        $queryRaw: jest.fn().mockResolvedValue([]),
        donationFund: {
          findFirst: jest.fn().mockResolvedValue({
            id: FUND_ID,
            name: 'Maintenance Fund',
            openingBalance: new Prisma.Decimal('1000.00'),
          }),
        },
        transaction: {
          aggregate: jest
            .fn()
            .mockResolvedValueOnce({ _sum: { amount: null } }) // income
            .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal('700.00') } }) // expense: 700
            .mockResolvedValueOnce({ _sum: { amount: null } }) // transfers in
            .mockResolvedValueOnce({ _sum: { amount: null } }), // transfers out
        },
      };

      // Available = 1000 - 700 = 300. Required = 500.
      await expect(
        service.assertSufficientFundsTx(
          mockTx as any,
          MOSQUE_ID,
          FUND_ID,
          new Prisma.Decimal('500.00'),
        ),
      ).rejects.toThrow(
        new BadRequestException({
          code: 'INSUFFICIENT_FUNDS',
          message: 'Insufficient funds in Maintenance Fund. Available ৳300, required ৳500.',
        }),
      );
    });
  });

  describe('getFundFinancialSummary', () => {
    it('returns detailed breakdown by status, payment method, category, and transfers', async () => {
      prisma.donationFund.findFirst.mockResolvedValue({
        id: FUND_ID,
        name: 'Zakat Fund',
        openingBalance: new Prisma.Decimal('5000.00'),
      });

      prisma.mosqueSettings.findUnique.mockResolvedValue({ currency: 'BDT' });

      prisma.$transaction.mockResolvedValue([
        // incomeAgg
        { _sum: { amount: new Prisma.Decimal('20000.00') }, _count: { _all: 5 } },
        // incomeByStatus
        [{ status: TransactionStatus.completed, _sum: { amount: new Prisma.Decimal('20000.00') }, _count: { _all: 5 } }],
        // incomeByMethod
        [{ paymentMethod: 'cash', _sum: { amount: new Prisma.Decimal('20000.00') }, _count: { _all: 5 } }],
        // expenseAgg
        { _sum: { amount: new Prisma.Decimal('8000.00') }, _count: { _all: 2 } },
        // expenseByStatus
        [{ status: TransactionStatus.completed, _sum: { amount: new Prisma.Decimal('8000.00') }, _count: { _all: 2 } }],
        // expenseByCategory
        [{ category: 'Relief', _sum: { amount: new Prisma.Decimal('8000.00') }, _count: { _all: 2 } }],
        // transfersInAgg
        { _sum: { amount: new Prisma.Decimal('3000.00') }, _count: { _all: 1 } },
        // transfersInByStatus
        [{ status: TransactionStatus.completed, _sum: { amount: new Prisma.Decimal('3000.00') }, _count: { _all: 1 } }],
        // transfersOutAgg
        { _sum: { amount: new Prisma.Decimal('1000.00') }, _count: { _all: 1 } },
        // transfersOutByStatus
        [{ status: TransactionStatus.completed, _sum: { amount: new Prisma.Decimal('1000.00') }, _count: { _all: 1 } }],
      ]);

      const result = await service.getFundFinancialSummary(ACTOR, FUND_ID);

      // available = 5000.00 + 20000.00 - 8000.00 + 3000.00 - 1000.00 = 19000.00
      expect(result.fundId).toBe(FUND_ID);
      expect(result.fundName).toBe('Zakat Fund');
      expect(result.openingBalance).toBe('5000.00');
      expect(result.currency).toBe('BDT');
      expect(result.income.total).toBe('20000.00');
      expect(result.income.count).toBe(5);
      expect(result.expenses.total).toBe('8000.00');
      expect(result.expenses.count).toBe(2);
      expect(result.transfersIn.total).toBe('3000.00');
      expect(result.transfersOut.total).toBe('1000.00');
      expect(result.availableBalance).toBe('19000.00');
    });
  });
});
