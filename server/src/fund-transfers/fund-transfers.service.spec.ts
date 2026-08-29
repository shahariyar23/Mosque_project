import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethod, Prisma, TransactionStatus, TransactionType } from '@prisma/client';

import { AuditLogService } from '../audit/audit-log.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { FundBalanceService } from '../fund-balance/fund-balance.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateFundTransferDto } from './dto/create-fund-transfer.dto';
import { FundTransfersService } from './fund-transfers.service';

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';
const USER_ID = '1f8c6cfe-6fe5-11d2-883f-0016d3cca777';
const FROM_FUND_ID = '11111111-1111-1111-1111-111111111111';
const TO_FUND_ID = '22222222-2222-2222-2222-222222222222';
const TRANSFER_TX_ID = '33333333-3333-3333-3333-333333333333';

const TREASURER: AuthenticatedUser = {
  id: USER_ID,
  mosqueId: MOSQUE_ID,
  email: 'treasurer@noor.example',
  role: 'treasurer',
  permissions: ['fund.manage', 'finance.manage'],
  deniedPermissions: [],
  isActive: true,
};

describe('FundTransfersService', () => {
  let service: FundTransfersService;
  let prisma: any;
  let audit: any;
  let fundBalanceService: any;

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      donationFund: {
        findFirst: jest.fn(),
      },
      transaction: {
        create: jest.fn(),
        aggregate: jest.fn(),
      },
      mosqueSettings: {
        findUnique: jest.fn().mockResolvedValue({ currency: 'BDT' }),
      },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };

    audit = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    fundBalanceService = {
      assertSufficientFundsTx: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundTransfersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: audit },
        { provide: FundBalanceService, useValue: fundBalanceService },
      ],
    }).compile();

    service = module.get<FundTransfersService>(FundTransfersService);
  });

  describe('transfer', () => {
    it('executes fund-to-fund transfer atomically (General ৳10,000 -> Building ৳2,000, Transfer ৳3,000)', async () => {
      // 1. Setup funds: General Fund (from) and Building Fund (to)
      prisma.donationFund.findFirst
        .mockResolvedValueOnce({
          id: FROM_FUND_ID,
          name: 'General Fund',
          openingBalance: new Prisma.Decimal('10000.00'),
        })
        .mockResolvedValueOnce({
          id: TO_FUND_ID,
          name: 'Building Fund',
          openingBalance: new Prisma.Decimal('2000.00'),
        });

      // 2. Sufficient funds assertion returns source available balance of 10000.00
      fundBalanceService.assertSufficientFundsTx.mockResolvedValue({
        availableBalance: new Prisma.Decimal('10000.00'),
      });

      // 3. Ledger transaction create
      prisma.transaction.create.mockResolvedValue({
        id: TRANSFER_TX_ID,
        amount: new Prisma.Decimal('3000.00'),
        currency: 'BDT',
        description: 'Transfer from General Fund to Building Fund',
        reference: 'TRF-2026-001',
        transactedAt: new Date('2026-08-29T10:00:00.000Z'),
      });

      // 4. Aggregates for destination fund (toFund: 2000 opening + 3000 incoming transfer = 5000)
      prisma.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } }) // income
        .mockResolvedValueOnce({ _sum: { amount: null } }) // expense
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal('3000.00') } }) // transfers in
        .mockResolvedValueOnce({ _sum: { amount: null } }); // transfers out

      const dto: CreateFundTransferDto = {
        fromFundId: FROM_FUND_ID,
        toFundId: TO_FUND_ID,
        amount: '3000.00',
        reference: 'TRF-2026-001',
      };

      const result = await service.transfer(TREASURER, dto);

      expect(result).toEqual({
        id: TRANSFER_TX_ID,
        transferReference: 'TRF-2026-001',
        fromFundId: FROM_FUND_ID,
        fromFundName: 'General Fund',
        toFundId: TO_FUND_ID,
        toFundName: 'Building Fund',
        amount: '3000.00',
        currency: 'BDT',
        description: 'Transfer from General Fund to Building Fund',
        reference: 'TRF-2026-001',
        transactedAt: '2026-08-29T10:00:00.000Z',
        fromFundRemainingBalance: '7000.00',
        toFundNewBalance: '5000.00',
      });

      // Assert transaction created with correct links
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          mosqueId: MOSQUE_ID,
          type: TransactionType.transfer,
          status: TransactionStatus.completed,
          amount: new Prisma.Decimal('3000.00'),
          fundId: FROM_FUND_ID,
          toFundId: TO_FUND_ID,
          createdById: USER_ID,
        }),
        select: expect.anything(),
      });

      // Assert audit log
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FUND_TRANSFER_COMPLETED',
          resource: 'fund_transfer',
          resourceId: TRANSFER_TX_ID,
        }),
      );
    });

    it('rejects transfer when source fund has insufficient balance (Available ৳7,000, Required ৳8,000)', async () => {
      prisma.donationFund.findFirst
        .mockResolvedValueOnce({
          id: FROM_FUND_ID,
          name: 'General Fund',
          openingBalance: new Prisma.Decimal('10000.00'),
        })
        .mockResolvedValueOnce({
          id: TO_FUND_ID,
          name: 'Building Fund',
          openingBalance: new Prisma.Decimal('2000.00'),
        });

      fundBalanceService.assertSufficientFundsTx.mockRejectedValueOnce(
        new BadRequestException({
          code: 'INSUFFICIENT_FUNDS',
          message: 'Insufficient funds in General Fund. Available ৳7,000, required ৳8,000.',
        }),
      );

      const dto: CreateFundTransferDto = {
        fromFundId: FROM_FUND_ID,
        toFundId: TO_FUND_ID,
        amount: '8000.00',
      };

      await expect(service.transfer(TREASURER, dto)).rejects.toThrow(
        new BadRequestException({
          code: 'INSUFFICIENT_FUNDS',
          message: 'Insufficient funds in General Fund. Available ৳7,000, required ৳8,000.',
        }),
      );

      // Verify no transaction was created
      expect(prisma.transaction.create).not.toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FUND_TRANSFER_REJECTED_INSUFFICIENT_FUNDS',
          resource: 'fund_transfer',
        }),
      );
    });

    it('rejects self-transfer when fromFundId equals toFundId', async () => {
      const dto: CreateFundTransferDto = {
        fromFundId: FROM_FUND_ID,
        toFundId: FROM_FUND_ID,
        amount: '1000.00',
      };

      await expect(service.transfer(TREASURER, dto)).rejects.toThrow(
        new BadRequestException({
          code: 'SELF_TRANSFER_NOT_ALLOWED',
          message: 'Cannot transfer funds to the same fund.',
        }),
      );

      expect(prisma.donationFund.findFirst).not.toHaveBeenCalled();
    });

    it('rejects when either fund does not belong to the caller mosque', async () => {
      prisma.donationFund.findFirst
        .mockResolvedValueOnce({
          id: FROM_FUND_ID,
          name: 'General Fund',
          openingBalance: new Prisma.Decimal('10000.00'),
        })
        .mockResolvedValueOnce(null); // toFund not found

      const dto: CreateFundTransferDto = {
        fromFundId: FROM_FUND_ID,
        toFundId: TO_FUND_ID,
        amount: '1000.00',
      };

      await expect(service.transfer(TREASURER, dto)).rejects.toThrow(
        new NotFoundException({
          code: 'FUND_NOT_FOUND',
          message: 'One or both donation funds could not be found for your mosque.',
        }),
      );

      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });
  });
});
