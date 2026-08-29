import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExpenseStatus, Prisma, TransactionStatus, TransactionType } from '@prisma/client';

import { MAX_PAGE_SIZE } from '../common/pagination/page';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { CURRENCY_PATTERN, FALLBACK_CURRENCY, normalizeCurrency } from '../common/utils/currency';
import { toDateOnly } from '../common/utils/date-only';
import { fromMoney, toMoney } from '../common/utils/money';
import { FundBalanceService } from '../fund-balance/fund-balance.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseQueryDto } from './dto/expense-query.dto';
import {
  DeletedExpenseDto,
  ExpenseListMetaDto,
  ExpenseResponseDto,
} from './dto/expense-response.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import {
  DEFAULT_EXPENSE_PAGE_SIZE,
  EXPENSE_SELECT,
  type SelectedExpense,
} from './types/expense.types';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fundBalanceService: FundBalanceService,
  ) {}

  /**
   * Records an expense for the caller's mosque.
   * Atomically validates sufficient funds if a fundId is provided and expense is paid.
   */
  async create(actor: AuthenticatedUser, dto: CreateExpenseDto): Promise<ExpenseResponseDto> {
    const currency = await this.resolveCurrency(actor.mosqueId, dto.currency);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        // Enforce sufficient funds if paid from a specific fund
        if (dto.fundId && dto.status === ExpenseStatus.paid) {
          await this.fundBalanceService.assertSufficientFundsTx(
            tx,
            actor.mosqueId,
            dto.fundId,
            toMoney(dto.amount),
          );
        }

        const expense = await tx.expense.create({
          data: {
            mosqueId: actor.mosqueId,
            createdById: actor.id,
            category: dto.category.trim(),
            description: dto.description.trim(),
            amount: toMoney(dto.amount),
            currency,
            paymentMethod: dto.paymentMethod,
            expenseDate: toDateOnly(dto.expenseDate),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            reference: dto.reference ?? null,
            notes: dto.notes ?? null,
          },
          select: EXPENSE_SELECT,
        });

        // If expense is paid on creation, record the corresponding expense ledger transaction
        if (expense.status === ExpenseStatus.paid) {
          await tx.transaction.create({
            data: {
              mosqueId: actor.mosqueId,
              type: TransactionType.expense,
              status: TransactionStatus.completed,
              amount: expense.amount,
              currency: expense.currency,
              description: expense.description,
              category: expense.category,
              reference: expense.reference,
              paymentMethod: expense.paymentMethod,
              fundId: dto.fundId ?? null,
              expenseId: expense.id,
              transactedAt: expense.expenseDate,
              createdById: actor.id,
            },
          });
        }

        return expense;
      });

      return ExpenseResponseDto.from(created);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async findMany(
    actor: AuthenticatedUser,
    query: ExpenseQueryDto,
  ): Promise<{ rows: ExpenseResponseDto[]; meta: ExpenseListMetaDto }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(Math.max(1, query.limit ?? DEFAULT_EXPENSE_PAGE_SIZE), MAX_PAGE_SIZE);

    this.assertRange(query.from, query.to);

    const where = this.buildWhere(actor.mosqueId, query);

    // One transaction so the count and the page describe the same set of rows.
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.expense.count({ where }),
      this.prisma.expense.findMany({
        where,
        select: EXPENSE_SELECT,
        // `id` breaks ties so an expense cannot appear on two pages, or on none, when several share a
        // creation timestamp — a stack of receipts entered in one sitting produces exactly that.
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      rows: rows.map((row) => ExpenseResponseDto.from(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(actor: AuthenticatedUser, id: string): Promise<ExpenseResponseDto> {
    return ExpenseResponseDto.from(await this.getOwned(actor.mosqueId, id));
  }

  /**
   * Corrects an expense.
   *
   * Every field keeps its three-way meaning, so `toUpdateData` tests `!== undefined` per field rather than
   * building the object from whatever the DTO happens to hold.
   *
   * `createdById` is not among the fields it can set. The column records who entered the payment, and an
   * audit trail anyone with edit rights can reassign is not one.
   */
  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    await this.getOwned(actor.mosqueId, id);

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const expense = await tx.expense.update({
          where: { id },
          data: this.toUpdateData(dto),
          select: EXPENSE_SELECT,
        });

        // Synchronize corresponding ledger transaction
        if (expense.status === ExpenseStatus.paid) {
          const existingTx = await tx.transaction.findFirst({
            where: { mosqueId: actor.mosqueId, expenseId: expense.id },
            select: { id: true, fundId: true, amount: true },
          });

          const targetFundId = dto.fundId !== undefined ? dto.fundId : existingTx?.fundId;

          if (targetFundId) {
            await this.fundBalanceService.assertSufficientFundsTx(
              tx,
              actor.mosqueId,
              targetFundId,
              expense.amount,
            );
          }

          if (existingTx) {
            await tx.transaction.update({
              where: { id: existingTx.id },
              data: {
                status: TransactionStatus.completed,
                amount: expense.amount,
                currency: expense.currency,
                description: expense.description,
                category: expense.category,
                reference: expense.reference,
                paymentMethod: expense.paymentMethod,
                fundId: targetFundId ?? null,
                transactedAt: expense.expenseDate,
              },
            });
          } else {
            await tx.transaction.create({
              data: {
                mosqueId: actor.mosqueId,
                type: TransactionType.expense,
                status: TransactionStatus.completed,
                amount: expense.amount,
                currency: expense.currency,
                description: expense.description,
                category: expense.category,
                reference: expense.reference,
                paymentMethod: expense.paymentMethod,
                fundId: targetFundId ?? null,
                expenseId: expense.id,
                transactedAt: expense.expenseDate,
                createdById: actor.id,
              },
            });
          }
        } else if (expense.status === ExpenseStatus.cancelled) {
          const existingTx = await tx.transaction.findFirst({
            where: { mosqueId: actor.mosqueId, expenseId: expense.id },
            select: { id: true },
          });

          if (existingTx) {
            await tx.transaction.update({
              where: { id: existingTx.id },
              data: { status: TransactionStatus.cancelled },
            });
          }
        }

        return expense;
      });

      return ExpenseResponseDto.from(updated);
    } catch (error) {
      throw this.translate(error);
    }
  }

  /**
   * Deletes an expense that is still `pending`.
   *
   * A `pending` expense is a draft: somebody typed a figure, nothing was decided and nothing was paid.
   * Removing a mistyped draft is housekeeping, and forcing a permanent `cancelled` row for every slip of the
   * keyboard would fill the books with noise nobody can distinguish from real refusals.
   *
   * Once an expense is `approved`, `paid` or `cancelled` it has a history, and this refuses with 409. That
   * is the financial rule this codebase works to: records of money that moved are not removed, they are
   * retired — `PATCH { "status": "cancelled" }` does that, reversibly, and leaves the figure and the date
   * where an auditor can still see them.
   */
  async remove(actor: AuthenticatedUser, id: string): Promise<DeletedExpenseDto> {
    const expense = await this.getOwned(actor.mosqueId, id);

    if (expense.status !== ExpenseStatus.pending) {
      throw new ConflictException({
        code: 'EXPENSE_NOT_DELETABLE',
        message:
          `This expense is ${expense.status} and cannot be deleted. Send ` +
          'PATCH /expenses/:id with `{ "status": "cancelled" }` instead — that withdraws it without ' +
          'losing the record.',
      });
    }

    try {
      await this.prisma.expense.delete({ where: { id } });
    } catch (error) {
      throw this.translate(error);
    }

    return {
      id: expense.id,
      category: expense.category,
      description: expense.description,
      amount: fromMoney(expense.amount),
      currency: expense.currency,
    };
  }

  // ---- internals ------------------------------------------------------------

  private buildWhere(mosqueId: string, query: ExpenseQueryDto): Prisma.ExpenseWhereInput {
    const search = query.search?.trim();
    const category = query.category?.trim();

    return {
      // First and non-negotiable: the caller's mosque. Everything below narrows within it.
      mosqueId,
      ...(query.status ? { status: query.status } : {}),
      ...(category ? { category } : {}),
      // Both ends inclusive, and either may stand alone. `gte`/`lte` on a `@db.Date` column, so the
      // comparison is against the stored day and cannot pick up a time.
      ...(query.from || query.to
        ? {
            expenseDate: {
              ...(query.from ? { gte: toDateOnly(query.from) } : {}),
              ...(query.to ? { lte: toDateOnly(query.to) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { category: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { reference: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  /**
   * Reads one expense inside the caller's mosque, or refuses with 404.
   *
   * `findFirst` on both columns rather than `findUnique` on the id: the mosque is part of the question, so
   * another mosque's expense is not found at all rather than found and then rejected.
   */
  private async getOwned(mosqueId: string, id: string): Promise<SelectedExpense> {
    const expense = await this.prisma.expense.findFirst({
      where: { id, mosqueId },
      select: EXPENSE_SELECT,
    });

    if (!expense) throw expenseNotFound();

    return expense;
  }

  /**
   * `to >= from`, when both were given.
   *
   * ISO `YYYY-MM-DD` strings compare correctly as strings — same width, most significant field first — so
   * this needs no date parsing and cannot pick up a timezone on the way. An inverted window is a 400 rather
   * than an empty page, because it is a mistake in the request and silently returning nothing hides it.
   */
  private assertRange(from: string | undefined, to: string | undefined): void {
    if (!from || !to || to >= from) return;

    throw new BadRequestException({
      code: 'INVALID_DATE_RANGE',
      message: 'to must not fall before from.',
    });
  }

  /**
   * The currency to store on the row.
   *
   * What the caller sent, otherwise the mosque's configured currency, otherwise `BDT`. It is read once here
   * and then written down, because the row has to keep meaning what it meant: a mosque that switches its
   * default from BDT to USD must not silently restate a bill it paid three years ago.
   *
   * The settings value is re-checked against the pattern rather than trusted. The column is a `VarChar(8)`
   * with no format constraint, so a mosque could be holding `"Taka"` in it — and a payment is not the place
   * to discover that.
   */
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

  /**
   * The `data` for a patch.
   *
   * Every field is tested for `undefined` rather than truthiness, which is what preserves the three-way
   * meaning: `reference: null` clears the invoice number, and omitting it leaves whatever is there. The
   * required columns cannot arrive as null — the DTO rejects that — so they need no null branch here.
   *
   * `mosqueId` and `createdById` are absent by design, not by omission. Neither is patchable.
   */
  private toUpdateData(dto: UpdateExpenseDto): Prisma.ExpenseUpdateInput {
    const data: Prisma.ExpenseUpdateInput = {};

    if (dto.category !== undefined) data.category = dto.category.trim();
    if (dto.description !== undefined) data.description = dto.description.trim();
    if (dto.amount !== undefined) data.amount = toMoney(dto.amount);
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.paymentMethod !== undefined) data.paymentMethod = dto.paymentMethod;
    if (dto.expenseDate !== undefined) data.expenseDate = toDateOnly(dto.expenseDate);
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.reference !== undefined) data.reference = dto.reference;
    if (dto.notes !== undefined) data.notes = dto.notes;

    return data;
  }

  /**
   * Turns a Prisma failure into an HTTP one.
   *
   * Anything unrecognised is returned unchanged so the global filter logs it and answers 500 — a database
   * fault is not the caller's to interpret, and inventing a 4xx for one would hide a bug.
   */
  private translate(error: unknown): unknown {
    if (error instanceof HttpException) return error;
    if (error instanceof Error && 'status' in error) return error;
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return error;

    switch (error.code) {
      case 'P2025':
        return expenseNotFound();
      default:
        return error;
    }
  }
}

function expenseNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'EXPENSE_NOT_FOUND',
    message: 'We could not find that expense.',
  });
}
