import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { MAX_PAGE_SIZE } from '../common/pagination/page';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { CURRENCY_PATTERN, FALLBACK_CURRENCY, normalizeCurrency } from '../common/utils/currency';
import { fromDateOnly, toDateOnly } from '../common/utils/date-only';
import { fromMoney, toMoney } from '../common/utils/money';
import { PrismaService } from '../prisma/prisma.service';
import { BudgetQueryDto } from './dto/budget-query.dto';
import { BudgetListMetaDto, BudgetResponseDto, DeletedBudgetDto } from './dto/budget-response.dto';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { BUDGET_SELECT, DEFAULT_BUDGET_PAGE_SIZE, type SelectedBudget } from './types/budget.types';

/**
 * Everything the budgets endpoints do.
 *
 * Much of it reads like the expenses service on purpose — the mosque comes from the token and never from the
 * body, reads are scoped in the `where` clause rather than checked after the fact, an unowned row answers 404
 * rather than 403, money moves as `Decimal` and never as a float, and Prisma errors are translated instead of
 * passed through. `DonationFundsService` gives the reasoning for each.
 *
 * Three things are specific to budgets.
 *
 * **A budget is a plan, so `DELETE` has no status rule.** An expense may only be deleted while `pending`,
 * because past that it records money that moved and removing it would erase a financial fact. A budget records
 * money that was *intended*; deleting one loses an intention, not a transaction, and the expenses that were
 * booked while it existed are untouched and still add up to the same figure. So any budget may be removed, and
 * `cancelled` is offered for a mosque that would rather keep the record of what it once planned.
 *
 * **Nothing here caps anything.** Creating a budget does not restrict an expense, block one, or require an
 * approval for one; a category may be overspent freely and only the reports will say so.
 *
 * **Overlapping budgets are allowed.** A draft may sit alongside the active line it is meant to replace, and a
 * mosque may budget the same category over a month and over the year containing it. Deciding which of those is
 * a mistake is a judgement, and this service does not make it.
 */
@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sets a budget for the caller's mosque.
   *
   * `createdById` is the authenticated caller, not a field of the DTO. Who set a figure is a fact about the
   * request, and letting a body assert it would make the one column that answers "who decided this?" the
   * easiest one to falsify.
   */
  async create(actor: AuthenticatedUser, dto: CreateBudgetDto): Promise<BudgetResponseDto> {
    this.assertPeriod(dto.periodStart, dto.periodEnd);

    const currency = await this.resolveCurrency(actor.mosqueId, dto.currency);

    try {
      const created = await this.prisma.budget.create({
        // Field by field rather than spread from the DTO, and `mosqueId` from the token: a field added to the
        // DTO later cannot reach the database until someone names it here, and no request body can set a
        // budget against another mosque.
        data: {
          mosqueId: actor.mosqueId,
          createdById: actor.id,
          name: dto.name.trim(),
          category: dto.category.trim(),
          amount: toMoney(dto.amount),
          currency,
          periodStart: toDateOnly(dto.periodStart),
          periodEnd: toDateOnly(dto.periodEnd),
          // Falls back to the column default, `draft`, when the caller does not say.
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          notes: dto.notes ?? null,
        },
        select: BUDGET_SELECT,
      });

      return BudgetResponseDto.from(created);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async findMany(
    actor: AuthenticatedUser,
    query: BudgetQueryDto,
  ): Promise<{ rows: BudgetResponseDto[]; meta: BudgetListMetaDto }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(Math.max(1, query.limit ?? DEFAULT_BUDGET_PAGE_SIZE), MAX_PAGE_SIZE);

    this.assertRange(query.from, query.to);

    const where = this.buildWhere(actor.mosqueId, query);

    // One transaction so the count and the page describe the same set of rows.
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.budget.count({ where }),
      this.prisma.budget.findMany({
        where,
        select: BUDGET_SELECT,
        // `id` breaks ties so a budget cannot appear on two pages, or on none, when several share a creation
        // timestamp — a year's lines entered in one sitting produce exactly that.
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      rows: rows.map((row) => BudgetResponseDto.from(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(actor: AuthenticatedUser, id: string): Promise<BudgetResponseDto> {
    return BudgetResponseDto.from(await this.getOwned(actor.mosqueId, id));
  }

  /**
   * Revises a budget.
   *
   * Every field keeps its three-way meaning, so `toUpdateData` tests `!== undefined` per field rather than
   * building the object from whatever the DTO happens to hold.
   *
   * The period is checked against the *stored* row before it is written. A patch that moves only `periodEnd`
   * still has to agree with the `periodStart` already in the database, which no per-field validator can see —
   * which is why that rule lives here and not in the DTO.
   *
   * `createdById` is not among the fields it can set. The column records who set the figure, and an audit
   * trail anyone with edit rights can reassign is not one.
   */
  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateBudgetDto,
  ): Promise<BudgetResponseDto> {
    const existing = await this.getOwned(actor.mosqueId, id);

    // What the period will be *after* the patch: the incoming value where one was sent, otherwise what is
    // stored, read back through `fromDateOnly` so both sides of the comparison are `YYYY-MM-DD` strings.
    this.assertPeriod(
      dto.periodStart ?? fromDateOnly(existing.periodStart),
      dto.periodEnd ?? fromDateOnly(existing.periodEnd),
    );

    try {
      const updated = await this.prisma.budget.update({
        // `id` alone is safe only because `getOwned` has already established that it belongs to the caller's
        // mosque.
        where: { id },
        data: this.toUpdateData(dto),
        select: BUDGET_SELECT,
      });

      return BudgetResponseDto.from(updated);
    } catch (error) {
      throw this.translate(error);
    }
  }

  /**
   * Deletes a budget, whatever state it is in.
   *
   * Unlike an expense, this has no status rule, and the difference is the difference between the two tables. An
   * expense is a record of money; deleting a paid one erases a fact an auditor would need. A budget is a record
   * of an intention, and every expense booked while it existed is still there and still adds to the same total.
   * Nothing is reconciled against a budget, so nothing breaks when one goes.
   *
   * A mosque that would rather keep the record of what it once planned has `PATCH` with
   * `{ "status": "cancelled" }`, which is offered but not required.
   */
  async remove(actor: AuthenticatedUser, id: string): Promise<DeletedBudgetDto> {
    const budget = await this.getOwned(actor.mosqueId, id);

    try {
      await this.prisma.budget.delete({ where: { id } });
    } catch (error) {
      throw this.translate(error);
    }

    return {
      id: budget.id,
      name: budget.name,
      category: budget.category,
      amount: fromMoney(budget.amount),
      currency: budget.currency,
    };
  }

  // ---- internals ------------------------------------------------------------

  private buildWhere(mosqueId: string, query: BudgetQueryDto): Prisma.BudgetWhereInput {
    const search = query.search?.trim();
    const category = query.category?.trim();

    return {
      // First and non-negotiable: the caller's mosque. Everything below narrows within it.
      mosqueId,
      ...(query.status ? { status: query.status } : {}),
      ...(category ? { category } : {}),
      // Overlap, not containment: a budget matches when its period and the window share at least one day. An
      // annual budget covers August without either endpoint falling in August, and a containment filter would
      // leave it out — the one answer that is certainly wrong. Both comparisons are on `@db.Date` columns, so
      // neither can pick up a time.
      ...(query.to ? { periodStart: { lte: toDateOnly(query.to) } } : {}),
      ...(query.from ? { periodEnd: { gte: toDateOnly(query.from) } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { category: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  /**
   * Reads one budget inside the caller's mosque, or refuses with 404.
   *
   * `findFirst` on both columns rather than `findUnique` on the id: the mosque is part of the question, so
   * another mosque's budget is not found at all rather than found and then rejected.
   */
  private async getOwned(mosqueId: string, id: string): Promise<SelectedBudget> {
    const budget = await this.prisma.budget.findFirst({
      where: { id, mosqueId },
      select: BUDGET_SELECT,
    });

    if (!budget) throw budgetNotFound();

    return budget;
  }

  /**
   * `periodEnd >= periodStart`.
   *
   * ISO `YYYY-MM-DD` strings compare correctly as strings — same width, most significant field first — so this
   * needs no date parsing and cannot pick up a timezone on the way. A single-day period is allowed: a mosque
   * budgeting for one event is doing something ordinary.
   */
  private assertPeriod(periodStart: string, periodEnd: string): void {
    if (periodEnd >= periodStart) return;

    throw new BadRequestException({
      code: 'INVALID_BUDGET_PERIOD',
      message: 'periodEnd must not fall before periodStart.',
    });
  }

  /**
   * `to >= from`, when both were given.
   *
   * An inverted window is a 400 rather than an empty page, because it is a mistake in the request and silently
   * returning nothing hides it.
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
   * What the caller sent, otherwise the mosque's configured currency, otherwise `BDT`. It is read once here and
   * then written down, because the row has to keep meaning what it meant: a mosque that switches its default
   * from BDT to USD must not silently restate what it budgeted three years ago.
   *
   * The settings value is re-checked against the pattern rather than trusted. The column is a `VarChar(8)` with
   * no format constraint, so a mosque could be holding `"Taka"` in it.
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
   * meaning: `notes: null` clears the remark, and omitting it leaves whatever is there. The required columns
   * cannot arrive as null — the DTO rejects that — so they need no null branch here.
   *
   * `mosqueId` and `createdById` are absent by design, not by omission. Neither is patchable.
   */
  private toUpdateData(dto: UpdateBudgetDto): Prisma.BudgetUpdateInput {
    const data: Prisma.BudgetUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.category !== undefined) data.category = dto.category.trim();
    if (dto.amount !== undefined) data.amount = toMoney(dto.amount);
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.periodStart !== undefined) data.periodStart = toDateOnly(dto.periodStart);
    if (dto.periodEnd !== undefined) data.periodEnd = toDateOnly(dto.periodEnd);
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.notes !== undefined) data.notes = dto.notes;

    return data;
  }

  /**
   * Turns a Prisma failure into an HTTP one.
   *
   * Anything unrecognised is returned unchanged so the global filter logs it and answers 500 — a database fault
   * is not the caller's to interpret, and inventing a 4xx for one would hide a bug.
   */
  private translate(error: unknown): unknown {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return error;

    switch (error.code) {
      case 'P2025':
        return budgetNotFound();
      default:
        return error;
    }
  }
}

function budgetNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'BUDGET_NOT_FOUND',
    message: 'We could not find that budget.',
  });
}
