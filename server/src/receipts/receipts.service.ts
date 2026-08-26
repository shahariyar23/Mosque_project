import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DonationStatus,
  PaymentMethod,
  Prisma,
  ReceiptStatus,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';

import { type DataScope, effectivePermissions, scopeFor } from '../common/constants/roles';
import { forbidden } from '../common/guards/authorization';
import { MAX_PAGE_SIZE } from '../common/pagination/page';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { CURRENCY_PATTERN, FALLBACK_CURRENCY, normalizeCurrency } from '../common/utils/currency';
import { toInstant } from '../common/utils/instant';
import { toMoney } from '../common/utils/money';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { ReceiptQueryDto } from './dto/receipt-query.dto';
import { ReceiptListMetaDto, ReceiptResponseDto } from './dto/receipt-response.dto';
import { VoidReceiptDto } from './dto/void-receipt.dto';
import {
  DEFAULT_RECEIPT_PAGE_SIZE,
  RECEIPT_SELECT,
  type SelectedReceipt,
} from './types/receipt.types';

@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Issues a new receipt atomically for the actor's mosque and links it to the financial ledger transaction.
   *
   * Sequential numbering format: `REC-YYYY-NNNNN` (e.g. `REC-2026-00001`).
   *
   * Accounting Principles:
   * 1. Receipt != Separate Income. A receipt is proof of an underlying payment event.
   * 2. Existing Donation: Links receipt to the existing donation and its existing financial transaction.
   *    Confirms the donation if pending, and NEVER creates duplicate income.
   * 3. Standalone Direct Receipt: Creates the donation, the single corresponding income transaction,
   *    and the receipt atomically.
   * 4. Voiding & Reversal: Voiding a receipt marks it voided and reverses the associated ledger transaction (status = cancelled).
   */
  async create(actor: AuthenticatedUser, dto: CreateReceiptDto): Promise<ReceiptResponseDto> {
    if (dto.fundId) await this.assertFundOwned(actor.mosqueId, dto.fundId);
    if (dto.userId) await this.assertDonorOwned(actor.mosqueId, dto.userId);
    if (dto.donationId) await this.assertDonationOwned(actor.mosqueId, dto.donationId);

    const currency = await this.resolveCurrency(actor.mosqueId, dto.currency);
    const issuedAt = dto.issuedAt ? toInstant(dto.issuedAt) : new Date();
    const year = issuedAt.getFullYear();
    const prefix = `REC-${year}-`;
    const lockKey = `receipt_seq:${actor.mosqueId}:${year}`;

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        // 1. Acquire PostgreSQL transaction-level advisory lock for (mosqueId, year)
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

        let linkedDonationId = dto.donationId ?? null;
        let resolvedFundId = dto.fundId ?? null;
        let linkedTransactionId: string | null = null;

        // 2. Handle existing donation vs standalone payment
        if (dto.donationId) {
          const donation = await tx.donation.findFirst({
            where: { id: dto.donationId, mosqueId: actor.mosqueId },
            select: {
              id: true,
              fundId: true,
              userId: true,
              status: true,
              amount: true,
              currency: true,
              reference: true,
              paymentMethod: true,
              donatedAt: true,
              notes: true,
            },
          });

          if (!donation) {
            throw new BadRequestException({
              code: 'DONATION_NOT_FOUND',
              message: 'donationId does not match a donation of this mosque.',
            });
          }

          // Check if an active issued receipt already exists for this donation
          const existingActive = await tx.receipt.findFirst({
            where: {
              mosqueId: actor.mosqueId,
              donationId: dto.donationId,
              status: ReceiptStatus.issued,
            },
            select: { id: true, receiptNumber: true },
          });

          if (existingActive) {
            throw new BadRequestException({
              code: 'RECEIPT_ALREADY_ISSUED',
              message: `An active receipt (${existingActive.receiptNumber}) is already issued for this donation. Void it first to reissue.`,
            });
          }

          // Confirm the donation if it was pending
          if (donation.status === DonationStatus.pending) {
            await tx.donation.update({
              where: { id: donation.id },
              data: { status: DonationStatus.completed },
            });
          }

          resolvedFundId = resolvedFundId ?? donation.fundId;

          // Check if a transaction already exists for this donation to avoid double-counting
          const existingTx = await tx.transaction.findFirst({
            where: { mosqueId: actor.mosqueId, donationId: donation.id },
            select: { id: true },
          });

          if (existingTx) {
            linkedTransactionId = existingTx.id;
            await tx.transaction.update({
              where: { id: existingTx.id },
              data: { status: TransactionStatus.completed },
            });
          } else {
            // Create the single income transaction for this donation if not yet created
            const newTx = await tx.transaction.create({
              data: {
                mosqueId: actor.mosqueId,
                type: TransactionType.income,
                status: TransactionStatus.completed,
                amount: donation.amount,
                currency: donation.currency,
                description:
                  donation.notes ||
                  `Donation receipt issued (${donation.reference || donation.id})`,
                category: 'Donation',
                reference: donation.reference,
                paymentMethod: donation.paymentMethod,
                fundId: resolvedFundId,
                donationId: donation.id,
                transactedAt: donation.donatedAt,
                createdById: actor.id,
              },
              select: { id: true },
            });
            linkedTransactionId = newTx.id;
          }
        } else {
          // Standalone receipt: resolve fund
          if (!resolvedFundId) {
            const defaultFund = await tx.donationFund.findFirst({
              where: { mosqueId: actor.mosqueId, status: 'active' },
              orderBy: { createdAt: 'asc' },
              select: { id: true },
            });
            resolvedFundId = defaultFund?.id ?? null;
          }

          if (!resolvedFundId) {
            throw new BadRequestException({
              code: 'FUND_REQUIRED',
              message:
                'A donation fund is required to issue a receipt and record the income transaction.',
            });
          }

          // Create the single donation record
          const newDonation = await tx.donation.create({
            data: {
              mosqueId: actor.mosqueId,
              fundId: resolvedFundId,
              userId: dto.userId ?? null,
              amount: toMoney(dto.amount),
              currency,
              paymentMethod: PaymentMethod.cash,
              status: DonationStatus.completed,
              donatedAt: issuedAt,
              notes: 'Created via receipt issuance',
            },
            select: { id: true },
          });

          linkedDonationId = newDonation.id;

          // Create the single corresponding income ledger transaction
          const newTx = await tx.transaction.create({
            data: {
              mosqueId: actor.mosqueId,
              type: TransactionType.income,
              status: TransactionStatus.completed,
              amount: toMoney(dto.amount),
              currency,
              description: `Receipt payment received`,
              category: 'Donation',
              paymentMethod: PaymentMethod.cash,
              fundId: resolvedFundId,
              donationId: newDonation.id,
              transactedAt: issuedAt,
              createdById: actor.id,
            },
            select: { id: true },
          });

          linkedTransactionId = newTx.id;
        }

        // 3. Query highest current sequence number for this mosque and year
        const latest = await tx.receipt.findFirst({
          where: {
            mosqueId: actor.mosqueId,
            receiptNumber: { startsWith: prefix },
          },
          orderBy: { receiptNumber: 'desc' },
          select: { receiptNumber: true },
        });

        let nextSeq = 1;
        if (latest?.receiptNumber) {
          const parts = latest.receiptNumber.split('-');
          const parsed = parseInt(parts[parts.length - 1] ?? '0', 10);
          if (!Number.isNaN(parsed) && parsed > 0) {
            nextSeq = parsed + 1;
          }
        }

        const receiptNumber = `${prefix}${String(nextSeq).padStart(5, '0')}`;

        // 4. Update donation & transaction references with the assigned receipt number
        if (linkedDonationId) {
          await tx.donation.update({
            where: { id: linkedDonationId },
            data: { reference: receiptNumber },
          });
        }

        // 5. Create receipt document record
        const receipt = await tx.receipt.create({
          data: {
            mosqueId: actor.mosqueId,
            receiptNumber,
            donationId: linkedDonationId,
            fundId: resolvedFundId,
            userId: dto.userId ?? null,
            amount: toMoney(dto.amount),
            currency,
            status: ReceiptStatus.issued,
            issuedAt,
          },
          select: RECEIPT_SELECT,
        });

        // 6. Link receiptId on the financial transaction
        if (linkedTransactionId) {
          await tx.transaction.update({
            where: { id: linkedTransactionId },
            data: {
              receiptId: receipt.id,
              reference: receiptNumber,
            },
          });
        }

        return receipt;
      });

      return ReceiptResponseDto.from(created);
    } catch (error) {
      throw this.translate(error);
    }
  }

  /**
   * Lists receipts for the actor's mosque with server-side filtering, search, and pagination.
   */
  async findMany(
    actor: AuthenticatedUser,
    query: ReceiptQueryDto,
  ): Promise<{ data: ReceiptResponseDto[]; meta: ReceiptListMetaDto }> {
    const scope = this.scopeOf(actor);
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, query.limit ?? DEFAULT_RECEIPT_PAGE_SIZE));
    const skip = (page - 1) * limit;

    const where = this.buildWhere(actor, scope, query);

    const [total, rows] = await Promise.all([
      this.prisma.receipt.count({ where }),
      this.prisma.receipt.findMany({
        where,
        select: RECEIPT_SELECT,
        orderBy: [{ issuedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      data: rows.map(ReceiptResponseDto.from),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Retrieves a single receipt by ID with ownership and permission checks.
   */
  async findOne(actor: AuthenticatedUser, id: string): Promise<ReceiptResponseDto> {
    const scope = this.scopeOf(actor);
    const receipt = await this.getOwned(actor.mosqueId, id, scope === 'own' ? actor.id : undefined);
    return ReceiptResponseDto.from(receipt);
  }

  /**
   * Voids an issued receipt. Marks it as VOIDED and cancels linked donation & ledger transaction.
   */
  async void(
    actor: AuthenticatedUser,
    id: string,
    dto: VoidReceiptDto,
  ): Promise<ReceiptResponseDto> {
    const receipt = await this.getOwned(actor.mosqueId, id);

    if (receipt.status === ReceiptStatus.voided) {
      throw new BadRequestException({
        code: 'RECEIPT_ALREADY_VOIDED',
        message: 'Receipt is already voided.',
      });
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        // Reverse linked donation and transaction if present
        if (receipt.donation?.id) {
          await tx.donation.update({
            where: { id: receipt.donation.id },
            data: {
              status: DonationStatus.cancelled,
              notes: receipt.donation.donorName
                ? `Receipt ${receipt.receiptNumber} voided: ${dto.voidReason.trim()}`
                : undefined,
            },
          });

          // Cancel the financial transaction
          const existingTx = await tx.transaction.findFirst({
            where: {
              mosqueId: actor.mosqueId,
              OR: [{ donationId: receipt.donation.id }, { receiptId: receipt.id }],
            },
            select: { id: true },
          });

          if (existingTx) {
            await tx.transaction.update({
              where: { id: existingTx.id },
              data: { status: TransactionStatus.cancelled },
            });
          }
        }

        // Void the receipt record
        return tx.receipt.update({
          where: { id: receipt.id },
          data: {
            status: ReceiptStatus.voided,
            voidedAt: new Date(),
            voidReason: dto.voidReason.trim(),
          },
          select: RECEIPT_SELECT,
        });
      });

      return ReceiptResponseDto.from(updated);
    } catch (error) {
      throw this.translate(error);
    }
  }

  /* -------------------------------------------------------------------------- *
   * Private Helpers & Scoping
   * -------------------------------------------------------------------------- */

  private scopeOf(actor: AuthenticatedUser): DataScope {
    const scope = scopeFor(effectivePermissions(actor), 'receipt.view', 'receipt.viewOwn');
    if (scope === 'none') throw forbidden();
    return scope;
  }

  private buildWhere(
    actor: AuthenticatedUser,
    scope: DataScope,
    query: ReceiptQueryDto,
  ): Prisma.ReceiptWhereInput {
    const where: Prisma.ReceiptWhereInput = {
      mosqueId: actor.mosqueId,
      ...(scope === 'own' ? { userId: actor.id } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.fundId ? { fundId: query.fundId } : {}),
      ...(query.donationId ? { donationId: query.donationId } : {}),
      ...(query.userId && scope !== 'own' ? { userId: query.userId } : {}),
    };

    const fromDate = query.dateFrom || query.from;
    const toDate = query.dateTo || query.to;

    if (fromDate || toDate) {
      where.issuedAt = {
        ...(fromDate ? { gte: toInstant(fromDate) } : {}),
        ...(toDate ? { lte: toInstant(toDate) } : {}),
      };
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { receiptNumber: { contains: term, mode: 'insensitive' } },
        { donor: { fullName: { contains: term, mode: 'insensitive' } } },
        { donation: { donorName: { contains: term, mode: 'insensitive' } } },
      ];
    }

    return where;
  }

  private async getOwned(mosqueId: string, id: string, userId?: string): Promise<SelectedReceipt> {
    const receipt = await this.prisma.receipt.findFirst({
      where: {
        id,
        mosqueId,
        ...(userId ? { userId } : {}),
      },
      select: RECEIPT_SELECT,
    });

    if (!receipt) {
      throw new NotFoundException({
        code: 'RECEIPT_NOT_FOUND',
        message: 'No receipt found with that identifier.',
      });
    }

    return receipt;
  }

  private async assertFundOwned(mosqueId: string, fundId: string): Promise<void> {
    const fund = await this.prisma.donationFund.findFirst({
      where: { id: fundId, mosqueId },
      select: { id: true },
    });

    if (!fund) {
      throw new BadRequestException({
        code: 'FUND_NOT_FOUND',
        message: 'fundId does not match a donation fund of this mosque.',
      });
    }
  }

  private async assertDonorOwned(mosqueId: string, userId: string): Promise<void> {
    const donor = await this.prisma.user.findFirst({
      where: { id: userId, mosqueId, deletedAt: null },
      select: { id: true },
    });

    if (!donor) {
      throw new BadRequestException({
        code: 'DONOR_NOT_FOUND',
        message: 'userId does not match a user of this mosque.',
      });
    }
  }

  private async assertDonationOwned(mosqueId: string, donationId: string): Promise<void> {
    const donation = await this.prisma.donation.findFirst({
      where: { id: donationId, mosqueId },
      select: { id: true },
    });

    if (!donation) {
      throw new BadRequestException({
        code: 'DONATION_NOT_FOUND',
        message: 'donationId does not match a donation of this mosque.',
      });
    }
  }

  private async resolveCurrency(mosqueId: string, sent: string | undefined): Promise<string> {
    if (sent) return sent;

    const settings = await this.prisma.mosqueSettings.findUnique({
      where: { mosqueId },
      select: { currency: true },
    });

    const configured = normalizeCurrency(settings?.currency);

    return typeof configured === 'string' && CURRENCY_PATTERN.test(configured)
      ? configured
      : FALLBACK_CURRENCY;
  }

  private translate(error: unknown): Error {
    if (error instanceof Error && 'status' in error) return error;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new ConflictException({
          code: 'RECEIPT_ALREADY_EXISTS',
          message: 'A receipt with this number already exists in the mosque register.',
        });
      }
      if (error.code === 'P2003') {
        return new BadRequestException({
          code: 'FOREIGN_KEY_VIOLATION',
          message: 'One of the specified relation IDs does not exist or cannot be referenced.',
        });
      }
    }

    return error instanceof Error ? error : new Error(String(error));
  }
}
