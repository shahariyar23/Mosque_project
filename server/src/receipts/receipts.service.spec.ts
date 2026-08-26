import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DonationStatus, PaymentMethod, Prisma, ReceiptStatus } from '@prisma/client';

import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateReceiptDto } from './dto/create-receipt.dto';
import type { VoidReceiptDto } from './dto/void-receipt.dto';
import { ReceiptsService } from './receipts.service';

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';
const RECEIPT_ID = '7e8c6cfe-6fe5-11d2-883f-0016d3cca444';
const DONATION_ID = '8f8c6cfe-6fe5-11d2-883f-0016d3cca555';
const TRANSACTION_ID = '9f8c6cfe-6fe5-11d2-883f-0016d3cca888';
const FUND_ID = '9f8c6cfe-6fe5-11d2-883f-0016d3cca666';
const USER_ID = '1f8c6cfe-6fe5-11d2-883f-0016d3cca777';

const TREASURER: AuthenticatedUser = {
  id: '9c8b7a65-4321-4f6a-8c11-2d5e7a9b0c31',
  mosqueId: MOSQUE_ID,
  email: 'treasurer@noor.example',
  role: 'treasurer',
  permissions: [],
  deniedPermissions: [],
  isActive: true,
};

function mockReceiptRow(overrides: Record<string, unknown> = {}) {
  return {
    id: RECEIPT_ID,
    receiptNumber: 'REC-2026-00001',
    amount: new Prisma.Decimal('1500.00'),
    currency: 'BDT',
    status: ReceiptStatus.issued,
    issuedAt: new Date('2026-08-26T12:00:00.000Z'),
    voidedAt: null,
    voidReason: null,
    createdAt: new Date('2026-08-26T12:00:00.000Z'),
    updatedAt: new Date('2026-08-26T12:00:00.000Z'),
    donor: {
      id: USER_ID,
      fullName: 'Abdul Karim',
      email: 'karim@example.com',
    },
    fund: {
      id: FUND_ID,
      name: 'General Fund',
      slug: 'general-fund',
    },
    donation: null,
    ...overrides,
  };
}

describe('ReceiptsService - Financial Ledger & Transaction Integration', () => {
  let service: ReceiptsService;
  let prisma: {
    receipt: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    donationFund: { findFirst: jest.Mock };
    donation: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    transaction: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    user: { findFirst: jest.Mock };
    mosqueSettings: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      receipt: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      donationFund: {
        findFirst: jest.fn().mockResolvedValue({ id: FUND_ID }),
      },
      donation: {
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: DONATION_ID }),
        update: jest.fn().mockResolvedValue({ id: DONATION_ID }),
      },
      transaction: {
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: TRANSACTION_ID }),
        update: jest.fn().mockResolvedValue({ id: TRANSACTION_ID }),
      },
      user: { findFirst: jest.fn() },
      mosqueSettings: { findUnique: jest.fn() },
      $transaction: jest.fn(async (cb: any) => {
        const tx = {
          $executeRaw: jest.fn().mockResolvedValue(1),
          receipt: prisma.receipt,
          donation: prisma.donation,
          donationFund: prisma.donationFund,
          transaction: prisma.transaction,
        };
        return cb(tx);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReceiptsService>(ReceiptsService);
  });

  describe('create (Receipt != Separate Income)', () => {
    it('creates exactly one income transaction when issuing a standalone receipt', async () => {
      prisma.receipt.findFirst.mockResolvedValue(null);
      prisma.receipt.create.mockImplementation(({ data }: any) => {
        return mockReceiptRow({
          receiptNumber: data.receiptNumber,
          amount: data.amount,
        });
      });

      const dto: CreateReceiptDto = {
        amount: '1500.00',
        fundId: FUND_ID,
        issuedAt: '2026-08-26T12:00:00.000Z',
      };

      const result = await service.create(TREASURER, dto);

      expect(result.receiptNumber).toBe('REC-2026-00001');
      expect(result.amount).toBe('1500.00');
      // Created exactly 1 donation and 1 income transaction
      expect(prisma.donation.create).toHaveBeenCalledTimes(1);
      expect(prisma.transaction.create).toHaveBeenCalledTimes(1);
      expect(prisma.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TRANSACTION_ID },
          data: expect.objectContaining({ receiptId: RECEIPT_ID }),
        }),
      );
    });

    it('attaches to existing donation transaction without creating a duplicate income transaction', async () => {
      prisma.donation.findFirst.mockResolvedValue({
        id: DONATION_ID,
        fundId: FUND_ID,
        userId: USER_ID,
        status: DonationStatus.completed,
        amount: new Prisma.Decimal('1500.00'),
        currency: 'BDT',
        reference: 'REF-DON-1',
        paymentMethod: PaymentMethod.cash,
        donatedAt: new Date(),
        notes: 'Already recorded donation',
      });
      prisma.receipt.findFirst
        .mockResolvedValueOnce(null) // no existing receipt
        .mockResolvedValueOnce({ receiptNumber: 'REC-2026-00125' }); // latest number
      // Existing transaction found
      prisma.transaction.findFirst.mockResolvedValue({
        id: TRANSACTION_ID,
        donationId: DONATION_ID,
      });

      prisma.receipt.create.mockImplementation(({ data }: any) => {
        return mockReceiptRow({ receiptNumber: data.receiptNumber, amount: data.amount });
      });

      const dto: CreateReceiptDto = {
        donationId: DONATION_ID,
        amount: '1500.00',
        issuedAt: '2026-08-26T12:00:00.000Z',
      };

      const result = await service.create(TREASURER, dto);

      expect(result.receiptNumber).toBe('REC-2026-00126');
      // No second donation created
      expect(prisma.donation.create).not.toHaveBeenCalled();
      // No second transaction created (reuse existing)
      expect(prisma.transaction.create).not.toHaveBeenCalled();
      // Updated existing transaction to link receipt
      expect(prisma.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TRANSACTION_ID },
          data: expect.objectContaining({ receiptId: RECEIPT_ID }),
        }),
      );
    });

    it('rejects issuing duplicate receipt for donation that already has an active issued receipt', async () => {
      prisma.donation.findFirst.mockResolvedValue({
        id: DONATION_ID,
        fundId: FUND_ID,
        status: DonationStatus.completed,
      });
      prisma.receipt.findFirst.mockResolvedValueOnce({
        id: 'existing-id',
        receiptNumber: 'REC-2026-00050',
      });

      const dto: CreateReceiptDto = {
        donationId: DONATION_ID,
        amount: '1000.00',
      };

      await expect(service.create(TREASURER, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('void (Financial Reversal)', () => {
    it('voids an issued receipt and cancels the linked transaction', async () => {
      const existing = mockReceiptRow({
        status: ReceiptStatus.issued,
        donation: {
          id: DONATION_ID,
          amount: new Prisma.Decimal('1500.00'),
          currency: 'BDT',
          donorName: 'Karim',
          donorEmail: null,
          paymentMethod: PaymentMethod.cash,
          donatedAt: new Date(),
        },
      });
      prisma.receipt.findFirst.mockResolvedValue(existing);
      prisma.transaction.findFirst.mockResolvedValue({ id: TRANSACTION_ID });
      prisma.receipt.update.mockResolvedValue(
        mockReceiptRow({
          status: ReceiptStatus.voided,
          voidedAt: new Date('2026-08-27T00:00:00.000Z'),
          voidReason: 'Mistake in entry',
        }),
      );

      const dto: VoidReceiptDto = { voidReason: 'Mistake in entry' };
      const result = await service.void(TREASURER, RECEIPT_ID, dto);

      expect(result.status).toBe('voided');
      expect(prisma.donation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: DONATION_ID },
          data: expect.objectContaining({ status: DonationStatus.cancelled }),
        }),
      );
      expect(prisma.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TRANSACTION_ID },
          data: expect.objectContaining({ status: 'cancelled' }),
        }),
      );
    });

    it('rejects voiding an already-voided receipt', async () => {
      const alreadyVoided = mockReceiptRow({
        status: ReceiptStatus.voided,
        voidedAt: new Date(),
        voidReason: 'Prior void',
      });
      prisma.receipt.findFirst.mockResolvedValue(alreadyVoided);

      const dto: VoidReceiptDto = { voidReason: 'Attempting again' };
      await expect(service.void(TREASURER, RECEIPT_ID, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('tenant isolation & permissions', () => {
    it('throws 404 when reading a receipt belonging to another mosque', async () => {
      prisma.receipt.findFirst.mockResolvedValue(null);

      await expect(service.findOne(TREASURER, 'other-mosque-receipt-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
