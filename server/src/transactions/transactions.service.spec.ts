import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethod, Prisma, TransactionStatus, TransactionType } from '@prisma/client';

import { AuditLogService } from '../audit/audit-log.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { FundBalanceService } from '../fund-balance/fund-balance.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTransactionDto } from './dto/create-transaction.dto';
import type { UpdateTransactionDto } from './dto/update-transaction.dto';
import type { VoidTransactionDto } from './dto/void-transaction.dto';
import { TransactionsService } from './transactions.service';

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';
const TRANSACTION_ID = '7e8c6cfe-6fe5-11d2-883f-0016d3cca444';
const FUND_ID = '9f8c6cfe-6fe5-11d2-883f-0016d3cca666';
const USER_ID = '1f8c6cfe-6fe5-11d2-883f-0016d3cca777';

const TREASURER: AuthenticatedUser = {
  id: USER_ID,
  mosqueId: MOSQUE_ID,
  email: 'treasurer@noor.example',
  role: 'treasurer',
  permissions: [],
  deniedPermissions: [],
  isActive: true,
};

function mockTransactionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: TRANSACTION_ID,
    mosqueId: MOSQUE_ID,
    type: TransactionType.income,
    status: TransactionStatus.completed,
    amount: new Prisma.Decimal('1500.00'),
    currency: 'BDT',
    description: 'Weekly Friday Jummah collection',
    category: 'General Donation',
    reference: 'REF-2026-001',
    paymentMethod: PaymentMethod.cash,
    fundId: FUND_ID,
    toFundId: null,
    donationId: null,
    expenseId: null,
    receiptId: null,
    transactedAt: new Date('2026-08-22T12:00:00.000Z'),
    createdById: USER_ID,
    createdAt: new Date('2026-08-22T12:00:00.000Z'),
    updatedAt: new Date('2026-08-22T12:00:00.000Z'),
    fund: { id: FUND_ID, name: 'General Fund', slug: 'general-fund' },
    toFund: null,
    donation: null,
    expense: null,
    receipt: null,
    createdBy: { id: USER_ID, fullName: 'Rafiqul Islam', email: 'treasurer@noor.example' },
    ...overrides,
  };
}

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: {
    transaction: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      aggregate: jest.Mock;
    };
    donationFund: { findFirst: jest.Mock };
    donation: { findFirst: jest.Mock };
    expense: { findFirst: jest.Mock };
    receipt: { findFirst: jest.Mock };
    mosqueSettings: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let audit: { record: jest.Mock };

  beforeEach(async () => {
    prisma = {
      transaction: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
      },
      donationFund: { findFirst: jest.fn() },
      donation: { findFirst: jest.fn() },
      expense: { findFirst: jest.fn() },
      receipt: { findFirst: jest.fn() },
      mosqueSettings: { findUnique: jest.fn() },
      $transaction: jest.fn(async (cbOrOps: any) => {
        if (typeof cbOrOps === 'function') {
          return cbOrOps(prisma);
        }
        return Promise.all(cbOrOps);
      }),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };

    const fundBalanceService = {
      assertSufficientFundsTx: jest.fn().mockResolvedValue({ availableBalance: new Prisma.Decimal('1000.00') }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: audit },
        { provide: FundBalanceService, useValue: fundBalanceService },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  describe('create', () => {
    it('creates an income transaction with audit logging', async () => {
      prisma.donationFund.findFirst.mockResolvedValue({ id: FUND_ID, mosqueId: MOSQUE_ID });
      prisma.transaction.create.mockResolvedValue(mockTransactionRow());

      const dto: CreateTransactionDto = {
        type: TransactionType.income,
        amount: '1500.00',
        description: 'Weekly Friday Jummah collection',
        category: 'General Donation',
        reference: 'REF-2026-001',
        fundId: FUND_ID,
      };

      const result = await service.create(TREASURER, dto);

      expect(result.id).toBe(TRANSACTION_ID);
      expect(result.amount).toBe('1500.00');
      expect(result.type).toBe('income');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TRANSACTION_CREATED',
          resource: 'transaction',
          resourceId: TRANSACTION_ID,
        }),
      );
    });

    it('creates an expense transaction when fund has sufficient balance (Fund = ৳1000, Expense = ৳700)', async () => {
      prisma.donationFund.findFirst.mockResolvedValue({ id: FUND_ID, mosqueId: MOSQUE_ID });
      prisma.transaction.create.mockResolvedValue(
        mockTransactionRow({
          type: TransactionType.expense,
          amount: new Prisma.Decimal('700.00'),
          description: 'Roof repair',
          fundId: FUND_ID,
        }),
      );

      const dto: CreateTransactionDto = {
        type: TransactionType.expense,
        amount: '700.00',
        description: 'Roof repair',
        fundId: FUND_ID,
      };

      const result = await service.create(TREASURER, dto);

      expect(result.type).toBe('expense');
      expect(result.amount).toBe('700.00');
      expect(result.status).toBe('completed');
    });

    it('rejects expense transaction when fund has insufficient balance (Fund = ৳300, Expense = ৳500)', async () => {
      prisma.donationFund.findFirst.mockResolvedValue({ id: FUND_ID, mosqueId: MOSQUE_ID });

      const fundBalanceService = (service as any).fundBalanceService;
      fundBalanceService.assertSufficientFundsTx.mockRejectedValueOnce(
        new BadRequestException({
          code: 'INSUFFICIENT_FUNDS',
          message: 'Insufficient funds in Maintenance Fund. Available ৳300, required ৳500.',
        }),
      );

      const dto: CreateTransactionDto = {
        type: TransactionType.expense,
        amount: '500.00',
        description: 'Sound equipment',
        fundId: FUND_ID,
      };

      await expect(service.create(TREASURER, dto)).rejects.toThrow(
        new BadRequestException({
          code: 'INSUFFICIENT_FUNDS',
          message: 'Insufficient funds in Maintenance Fund. Available ৳300, required ৳500.',
        }),
      );
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });

    it('rejects transfer transaction when source fund has insufficient balance', async () => {
      prisma.donationFund.findFirst.mockResolvedValue({ id: FUND_ID, mosqueId: MOSQUE_ID });

      const fundBalanceService = (service as any).fundBalanceService;
      fundBalanceService.assertSufficientFundsTx.mockRejectedValueOnce(
        new BadRequestException({
          code: 'INSUFFICIENT_FUNDS',
          message: 'Insufficient funds in Maintenance Fund. Available ৳200, required ৳500.',
        }),
      );

      const dto: CreateTransactionDto = {
        type: TransactionType.transfer,
        amount: '500.00',
        description: 'Transfer to relief fund',
        fundId: FUND_ID,
        toFundId: '8f8c6cfe-6fe5-11d2-883f-0016d3cca888',
      };

      await expect(service.create(TREASURER, dto)).rejects.toThrow(
        new BadRequestException({
          code: 'INSUFFICIENT_FUNDS',
          message: 'Insufficient funds in Maintenance Fund. Available ৳200, required ৳500.',
        }),
      );
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });
  });

  describe('summary (Financial Ledger Source of Truth)', () => {
    it('calculates net balance as completed income minus completed expenses', async () => {
      // Income: 1000, Expense: 100
      prisma.$transaction.mockResolvedValue([
        { _sum: { amount: new Prisma.Decimal('1000.00') } }, // incomeAgg
        { _sum: { amount: new Prisma.Decimal('100.00') } }, // expenseAgg
        5, // totalCount
        1, // pendingCount
        1, // voidedCount
      ]);

      const result = await service.summary(TREASURER);

      expect(result.incomeTotal).toBe('1000.00');
      expect(result.expenseTotal).toBe('100.00');
      expect(result.netBalance).toBe('900.00');
      expect(result.totalTransactions).toBe(5);
      expect(result.pendingCount).toBe(1);
      expect(result.voidedCount).toBe(1);
    });

    it('handles zero or negative net balance correctly with Prisma Decimal precision', async () => {
      // Income: 500, Expense: 800 -> Net: -300
      prisma.$transaction.mockResolvedValue([
        { _sum: { amount: new Prisma.Decimal('500.00') } },
        { _sum: { amount: new Prisma.Decimal('800.00') } },
        2,
        0,
        0,
      ]);

      const result = await service.summary(TREASURER);

      expect(result.incomeTotal).toBe('500.00');
      expect(result.expenseTotal).toBe('800.00');
      expect(result.netBalance).toBe('-300.00');
    });
  });

  describe('findMany', () => {
    it('returns paginated transactions for the mosque', async () => {
      prisma.transaction.count.mockResolvedValue(1);
      prisma.transaction.findMany.mockResolvedValue([mockTransactionRow()]);

      const result = await service.findMany(TREASURER, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0]?.id).toBe(TRANSACTION_ID);
    });
  });

  describe('findOne', () => {
    it('returns a transaction by ID', async () => {
      prisma.transaction.findFirst.mockResolvedValue(mockTransactionRow());

      const result = await service.findOne(TREASURER, TRANSACTION_ID);

      expect(result.id).toBe(TRANSACTION_ID);
      expect(result.amount).toBe('1500.00');
    });

    it('throws 404 when transaction is not found or belongs to another mosque', async () => {
      prisma.transaction.findFirst.mockResolvedValue(null);

      await expect(service.findOne(TREASURER, 'missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates description and category with audit logging', async () => {
      const existing = mockTransactionRow();
      prisma.transaction.findFirst.mockResolvedValue(existing);
      prisma.transaction.update.mockResolvedValue(
        mockTransactionRow({ description: 'Updated note', category: 'General' }),
      );

      const dto: UpdateTransactionDto = { description: 'Updated note', category: 'General' };
      const result = await service.update(TREASURER, TRANSACTION_ID, dto);

      expect(result.description).toBe('Updated note');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TRANSACTION_UPDATED',
          resource: 'transaction',
          resourceId: TRANSACTION_ID,
        }),
      );
    });

    it('rejects modifying a voided transaction', async () => {
      prisma.transaction.findFirst.mockResolvedValue(
        mockTransactionRow({ status: TransactionStatus.voided }),
      );

      await expect(
        service.update(TREASURER, TRANSACTION_ID, { description: 'New note' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('void', () => {
    it('voids an active transaction and records audit log', async () => {
      const existing = mockTransactionRow();
      prisma.transaction.findFirst.mockResolvedValue(existing);
      prisma.transaction.update.mockResolvedValue(
        mockTransactionRow({ status: TransactionStatus.voided }),
      );

      const dto: VoidTransactionDto = { voidReason: 'Double booking error' };
      const result = await service.void(TREASURER, TRANSACTION_ID, dto);

      expect(result.status).toBe('voided');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TRANSACTION_VOIDED',
          note: expect.stringContaining('Double booking error'),
        }),
      );
    });

    it('rejects voiding an already-voided transaction', async () => {
      prisma.transaction.findFirst.mockResolvedValue(
        mockTransactionRow({ status: TransactionStatus.voided }),
      );

      const dto: VoidTransactionDto = { voidReason: 'Already void' };
      await expect(service.void(TREASURER, TRANSACTION_ID, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
