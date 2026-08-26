import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod, Prisma, TransactionStatus, TransactionType } from '@prisma/client';

import { AuditLogService } from '../audit/audit-log.service';
import { MAX_PAGE_SIZE } from '../common/pagination/page';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { CURRENCY_PATTERN, FALLBACK_CURRENCY, normalizeCurrency } from '../common/utils/currency';
import { toInstant } from '../common/utils/instant';
import { fromMoney, toMoney } from '../common/utils/money';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import {
  TransactionListMetaDto,
  TransactionResponseDto,
  TransactionSummaryDto,
} from './dto/transaction-response.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { VoidTransactionDto } from './dto/void-transaction.dto';
import {
  DEFAULT_TRANSACTION_PAGE_SIZE,
  TRANSACTION_SELECT,
  type SelectedTransaction,
} from './types/transaction.types';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  /**
   * Records a new financial ledger transaction for the caller's mosque.
   */
  async create(actor: AuthenticatedUser, dto: CreateTransactionDto): Promise<TransactionResponseDto> {
    if (dto.fundId) await this.assertFundOwned(actor.mosqueId, dto.fundId);
    if (dto.toFundId) await this.assertFundOwned(actor.mosqueId, dto.toFundId);
    if (dto.donationId) await this.assertDonationOwned(actor.mosqueId, dto.donationId);
    if (dto.expenseId) await this.assertExpenseOwned(actor.mosqueId, dto.expenseId);
    if (dto.receiptId) await this.assertReceiptOwned(actor.mosqueId, dto.receiptId);

    const currency = await this.resolveCurrency(actor.mosqueId, dto.currency);
    const transactedAt = dto.transactedAt ? toInstant(dto.transactedAt) : new Date();

    try {
      const created = await this.prisma.transaction.create({
        data: {
          mosqueId: actor.mosqueId,
          type: dto.type,
          status: TransactionStatus.completed,
          amount: toMoney(dto.amount),
          currency,
          description: dto.description.trim(),
          category: dto.category?.trim() ?? null,
          reference: dto.reference?.trim() ?? null,
          paymentMethod: dto.paymentMethod ?? PaymentMethod.cash,
          fundId: dto.fundId ?? null,
          toFundId: dto.toFundId ?? null,
          donationId: dto.donationId ?? null,
          expenseId: dto.expenseId ?? null,
          receiptId: dto.receiptId ?? null,
          transactedAt,
          createdById: actor.id,
        },
        select: TRANSACTION_SELECT,
      });

      // Audit log recording
      await this.audit.record({
        mosqueId: actor.mosqueId,
        actorId: actor.id,
        actorName: actor.email,
        actorRole: actor.role,
        action: 'TRANSACTION_CREATED',
        resource: 'transaction',
        resourceId: created.id,
        note: `Created ${created.type} transaction of ${created.amount} ${created.currency}`,
      });

      return TransactionResponseDto.from(created);
    } catch (error) {
      throw this.translate(error);
    }
  }

  /**
   * Lists transactions for the actor's mosque with server-side filtering, search, and pagination.
   */
  async findMany(
    actor: AuthenticatedUser,
    query: TransactionQueryDto,
  ): Promise<{ data: TransactionResponseDto[]; meta: TransactionListMetaDto }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, query.limit ?? DEFAULT_TRANSACTION_PAGE_SIZE));
    const skip = (page - 1) * limit;

    const where = this.buildWhere(actor.mosqueId, query);

    const [total, rows] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        select: TRANSACTION_SELECT,
        orderBy: [{ transactedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      data: rows.map(TransactionResponseDto.from),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Aggregates financial ledger summary across the mosque.
   */
  async summary(actor: AuthenticatedUser): Promise<TransactionSummaryDto> {
    const [incomeAgg, expenseAgg, totalCount, pendingCount, voidedCount] = await this.prisma.$transaction([
      this.prisma.transaction.aggregate({
        where: {
          mosqueId: actor.mosqueId,
          type: TransactionType.income,
          status: TransactionStatus.completed,
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          mosqueId: actor.mosqueId,
          type: TransactionType.expense,
          status: TransactionStatus.completed,
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.count({
        where: { mosqueId: actor.mosqueId },
      }),
      this.prisma.transaction.count({
        where: { mosqueId: actor.mosqueId, status: TransactionStatus.pending },
      }),
      this.prisma.transaction.count({
        where: {
          mosqueId: actor.mosqueId,
          status: { in: [TransactionStatus.voided, TransactionStatus.cancelled] },
        },
      }),
    ]);

    const income = incomeAgg._sum.amount ?? new Prisma.Decimal(0);
    const expense = expenseAgg._sum.amount ?? new Prisma.Decimal(0);
    const net = income.sub(expense);

    return {
      totalTransactions: totalCount,
      incomeTotal: fromMoney(income),
      expenseTotal: fromMoney(expense),
      netBalance: fromMoney(net),
      pendingCount,
      voidedCount,
    };
  }

  /**
   * Retrieves a single transaction by ID with mosque scoping.
   */
  async findOne(actor: AuthenticatedUser, id: string): Promise<TransactionResponseDto> {
    const transaction = await this.getOwned(actor.mosqueId, id);
    return TransactionResponseDto.from(transaction);
  }

  /**
   * Updates non-immutable descriptive fields of a transaction.
   */
  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateTransactionDto,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.getOwned(actor.mosqueId, id);

    if (transaction.status === TransactionStatus.voided) {
      throw new BadRequestException({
        code: 'TRANSACTION_VOIDED',
        message: 'A voided transaction cannot be modified.',
      });
    }

    if (dto.fundId) {
      await this.assertFundOwned(actor.mosqueId, dto.fundId);
    }

    try {
      const updated = await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          description: dto.description?.trim(),
          category: dto.category !== undefined ? dto.category?.trim() || null : undefined,
          reference: dto.reference !== undefined ? dto.reference?.trim() || null : undefined,
          paymentMethod: dto.paymentMethod,
          fundId: dto.fundId,
          transactedAt: dto.transactedAt ? toInstant(dto.transactedAt) : undefined,
        },
        select: TRANSACTION_SELECT,
      });

      await this.audit.record({
        mosqueId: actor.mosqueId,
        actorId: actor.id,
        actorName: actor.email,
        actorRole: actor.role,
        action: 'TRANSACTION_UPDATED',
        resource: 'transaction',
        resourceId: updated.id,
        note: `Updated transaction ${updated.id}`,
        changes: {
          description: dto.description ? { old: transaction.description, new: dto.description } : undefined,
          category: dto.category ? { old: transaction.category, new: dto.category } : undefined,
        },
      });

      return TransactionResponseDto.from(updated);
    } catch (error) {
      throw this.translate(error);
    }
  }

  /**
   * Voids an active transaction. Marks it as VOIDED without deleting historical record.
   */
  async void(
    actor: AuthenticatedUser,
    id: string,
    dto: VoidTransactionDto,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.getOwned(actor.mosqueId, id);

    if (transaction.status === TransactionStatus.voided) {
      throw new BadRequestException({
        code: 'TRANSACTION_ALREADY_VOIDED',
        message: 'Transaction is already voided.',
      });
    }

    try {
      const updated = await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.voided,
          reference: transaction.reference
            ? `${transaction.reference} [VOID: ${dto.voidReason.trim()}]`
            : `[VOID: ${dto.voidReason.trim()}]`,
        },
        select: TRANSACTION_SELECT,
      });

      await this.audit.record({
        mosqueId: actor.mosqueId,
        actorId: actor.id,
        actorName: actor.email,
        actorRole: actor.role,
        action: 'TRANSACTION_VOIDED',
        resource: 'transaction',
        resourceId: updated.id,
        note: `Voided ${transaction.type} transaction of ${transaction.amount} ${transaction.currency}: ${dto.voidReason.trim()}`,
      });

      return TransactionResponseDto.from(updated);
    } catch (error) {
      throw this.translate(error);
    }
  }

  /* -------------------------------------------------------------------------- *
   * Private Helpers & Scoping
   * -------------------------------------------------------------------------- */

  private buildWhere(mosqueId: string, query: TransactionQueryDto): Prisma.TransactionWhereInput {
    const where: Prisma.TransactionWhereInput = {
      mosqueId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.fundId ? { fundId: query.fundId } : {}),
      ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
    };

    if (query.minAmount || query.maxAmount) {
      where.amount = {
        ...(query.minAmount ? { gte: toMoney(query.minAmount) } : {}),
        ...(query.maxAmount ? { lte: toMoney(query.maxAmount) } : {}),
      };
    }

    const fromDate = query.dateFrom || query.from;
    const toDate = query.dateTo || query.to;

    if (fromDate || toDate) {
      where.transactedAt = {
        ...(fromDate ? { gte: toInstant(fromDate) } : {}),
        ...(toDate ? { lte: toInstant(toDate) } : {}),
      };
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { description: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
        { reference: { contains: term, mode: 'insensitive' } },
        { receipt: { receiptNumber: { contains: term, mode: 'insensitive' } } },
      ];
    }

    return where;
  }

  private async getOwned(mosqueId: string, id: string): Promise<SelectedTransaction> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, mosqueId },
      select: TRANSACTION_SELECT,
    });

    if (!transaction) {
      throw new NotFoundException({
        code: 'TRANSACTION_NOT_FOUND',
        message: 'No financial transaction found with that identifier.',
      });
    }

    return transaction;
  }

  private async assertFundOwned(mosqueId: string, fundId: string): Promise<void> {
    const fund = await this.prisma.donationFund.findFirst({
      where: { id: fundId, mosqueId },
      select: { id: true },
    });

    if (!fund) {
      throw new BadRequestException({
        code: 'FUND_NOT_FOUND',
        message: 'fundId does not match a fund of this mosque.',
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

  private async assertExpenseOwned(mosqueId: string, expenseId: string): Promise<void> {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, mosqueId },
      select: { id: true },
    });

    if (!expense) {
      throw new BadRequestException({
        code: 'EXPENSE_NOT_FOUND',
        message: 'expenseId does not match an expense of this mosque.',
      });
    }
  }

  private async assertReceiptOwned(mosqueId: string, receiptId: string): Promise<void> {
    const receipt = await this.prisma.receipt.findFirst({
      where: { id: receiptId, mosqueId },
      select: { id: true },
    });

    if (!receipt) {
      throw new BadRequestException({
        code: 'RECEIPT_NOT_FOUND',
        message: 'receiptId does not match a receipt of this mosque.',
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
          code: 'TRANSACTION_ALREADY_EXISTS',
          message: 'A duplicate transaction was detected.',
        });
      }
      if (error.code === 'P2003') {
        return new BadRequestException({
          code: 'FOREIGN_KEY_VIOLATION',
          message: 'One of the specified foreign key relations does not exist.',
        });
      }
    }

    return error instanceof Error ? error : new Error(String(error));
  }
}
