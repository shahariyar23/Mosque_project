import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod, Prisma, SalaryStatus, TransactionStatus, TransactionType } from '@prisma/client';

import { type DataScope, effectivePermissions, scopeFor } from '../common/constants/roles';
import { forbidden } from '../common/guards/authorization';
import { MAX_PAGE_SIZE } from '../common/pagination/page';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { CURRENCY_PATTERN, FALLBACK_CURRENCY, normalizeCurrency } from '../common/utils/currency';
import { toDateOnly } from '../common/utils/date-only';
import { toMoney } from '../common/utils/money';
import { FundBalanceService } from '../fund-balance/fund-balance.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalaryRecordDto } from './dto/create-salary-record.dto';
import { SalaryRecordQueryDto } from './dto/salary-record-query.dto';
import { SalaryRecordListMetaDto, SalaryRecordResponseDto } from './dto/salary-record-response.dto';
import { UpdateSalaryRecordDto } from './dto/update-salary-record.dto';
import {
  DEFAULT_SALARY_PAGE_SIZE,
  SALARY_SELECT,
  type SelectedSalaryRecord,
} from './types/salary.types';

@Injectable()
export class SalariesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fundBalanceService: FundBalanceService,
  ) {}

  /**
   * Records what somebody is paid.
   * Atomically validates sufficient funds if a fundId is provided and status is paid.
   */
  async create(
    actor: AuthenticatedUser,
    dto: CreateSalaryRecordDto,
  ): Promise<SalaryRecordResponseDto> {
    await this.assertUserOwned(actor.mosqueId, dto.userId);

    const currency = await this.resolveCurrency(actor.mosqueId, dto.currency);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        if (dto.status === SalaryStatus.paid && dto.fundId) {
          await this.fundBalanceService.assertSufficientFundsTx(
            tx,
            actor.mosqueId,
            dto.fundId,
            toMoney(dto.amount),
          );
        }

        const salary = await tx.salaryRecord.create({
          data: {
            mosqueId: actor.mosqueId,
            userId: dto.userId,
            amount: toMoney(dto.amount),
            currency,
            payPeriod: dto.payPeriod,
            paymentDate: toDateOnly(dto.paymentDate),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            notes: dto.notes ?? null,
          },
          select: SALARY_SELECT,
        });

        if (salary.status === SalaryStatus.paid && dto.fundId) {
          await tx.transaction.create({
            data: {
              mosqueId: actor.mosqueId,
              type: TransactionType.expense,
              status: TransactionStatus.completed,
              amount: salary.amount,
              currency: salary.currency,
              description: `Salary payment for period ${salary.payPeriod}`,
              category: 'Salaries',
              paymentMethod: PaymentMethod.bank_transfer,
              fundId: dto.fundId,
              transactedAt: salary.paymentDate,
              createdById: actor.id,
            },
          });
        }

        return salary;
      });

      return SalaryRecordResponseDto.from(created);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async findMany(
    actor: AuthenticatedUser,
    query: SalaryRecordQueryDto,
  ): Promise<{ rows: SalaryRecordResponseDto[]; meta: SalaryRecordListMetaDto }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(Math.max(1, query.limit ?? DEFAULT_SALARY_PAGE_SIZE), MAX_PAGE_SIZE);

    // Authorization before input validation, so a caller who may not read the payroll is refused rather than
    // told which of their query parameters was malformed.
    const scope = this.scopeOf(actor);

    this.assertRange(query.from, query.to);

    const where = this.buildWhere(actor, query, scope);

    // One transaction so the count and the page describe the same set of rows.
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.salaryRecord.count({ where }),
      this.prisma.salaryRecord.findMany({
        where,
        select: SALARY_SELECT,
        // `id` breaks ties so a record cannot appear on two pages, or on none, when several share a creation
        // timestamp — a month's payroll entered in one sitting produces exactly that.
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      rows: rows.map((row) => SalaryRecordResponseDto.from(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Reads one salary record.
   *
   * A caller limited to their own record gets a 404 for a colleague's, not a 403 — the same answer another
   * mosque's record gives. Ownership is part of the question the query asks, so a row they may not see is a row
   * that was not found. A 403 would confirm the record exists, which for payroll is itself worth withholding.
   */
  async findOne(actor: AuthenticatedUser, id: string): Promise<SalaryRecordResponseDto> {
    const scope = this.scopeOf(actor);

    return SalaryRecordResponseDto.from(
      await this.getOwned(actor.mosqueId, id, scope === 'own' ? actor.id : undefined),
    );
  }

  /**
   * Amends a salary record.
   *
   * `userId` is not among the fields it can set, and the DTO does not carry one. Reassigning it would move an
   * amount, a period and a `paid` flag from one person to another while leaving nothing in the row to show it,
   * and both people's payroll history would then be wrong. A record raised against the wrong person is
   * cancelled and a correct one created.
   *
   * No scope check: the route requires `salary.manage`, which nobody holds "for their own record only". An imam
   * cannot raise their own pay, and should not be able to.
   */
  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateSalaryRecordDto,
  ): Promise<SalaryRecordResponseDto> {
    const existing = await this.getOwned(actor.mosqueId, id);

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const targetStatus = dto.status !== undefined ? dto.status : existing.status;
        const targetAmount = dto.amount !== undefined ? toMoney(dto.amount) : existing.amount;

        if (targetStatus === SalaryStatus.paid && dto.fundId) {
          await this.fundBalanceService.assertSufficientFundsTx(
            tx,
            actor.mosqueId,
            dto.fundId,
            targetAmount,
          );
        }

        const salary = await tx.salaryRecord.update({
          where: { id },
          data: this.toUpdateData(dto),
          select: SALARY_SELECT,
        });

        if (salary.status === SalaryStatus.paid && dto.fundId) {
          await tx.transaction.create({
            data: {
              mosqueId: actor.mosqueId,
              type: TransactionType.expense,
              status: TransactionStatus.completed,
              amount: salary.amount,
              currency: salary.currency,
              description: `Salary payment for period ${salary.payPeriod}`,
              category: 'Salaries',
              paymentMethod: PaymentMethod.bank_transfer,
              fundId: dto.fundId,
              transactedAt: salary.paymentDate,
              createdById: actor.id,
            },
          });
        }

        return salary;
      });

      return SalaryRecordResponseDto.from(updated);
    } catch (error) {
      throw this.translate(error);
    }
  }

  // ---- internals ------------------------------------------------------------

  /**
   * How much of the mosque's payroll this caller may read.
   *
   * The same view/viewOwn resolver the donations and users modules use, over the same registry the guards read —
   * so a `salary.view` sitting in the actor's `deniedPermissions` is honoured here too, and no branch in this
   * file compares a role name.
   *
   * The route decorator already requires one of the two permissions, so `none` should be unreachable. It is
   * still refused rather than quietly treated as `own`: if the decorator and this method ever disagree, the
   * request should fail rather than return whatever the narrower reading happens to allow.
   */
  private scopeOf(actor: AuthenticatedUser): DataScope {
    const scope = scopeFor(effectivePermissions(actor), 'salary.view', 'salary.viewOwn');

    if (scope === 'none') throw forbidden();

    return scope;
  }

  private buildWhere(
    actor: AuthenticatedUser,
    query: SalaryRecordQueryDto,
    scope: DataScope,
  ): Prisma.SalaryRecordWhereInput {
    // Whose records the query is for. A caller narrowed to their own is pinned to themselves whatever `userId`
    // they sent, so the filter can only ever select within the scope and never widen it.
    const userId = scope === 'own' ? actor.id : query.userId;

    return {
      // First and non-negotiable: the caller's mosque. Everything below narrows within it, which is also why
      // `userId` needs no ownership check on a read — another mosque's user simply matches no row in this one.
      mosqueId: actor.mosqueId,
      ...(userId ? { userId } : {}),
      ...(query.status ? { status: query.status } : {}),
      // Exact, not a prefix: `payPeriod` is a fixed `YYYY-MM`, so there is nothing to match loosely.
      ...(query.payPeriod ? { payPeriod: query.payPeriod } : {}),
      // The window is on `paymentDate` — when the money moved — because that is what a financial report for a
      // period needs. A caller after the month the pay was *for* uses `payPeriod`, and the two genuinely
      // differ: August's salary paid on 3 September belongs to a September window.
      ...(query.from || query.to
        ? {
            paymentDate: {
              ...(query.from ? { gte: toDateOnly(query.from) } : {}),
              ...(query.to ? { lte: toDateOnly(query.to) } : {}),
            },
          }
        : {}),
    };
  }

  /**
   * Reads one salary record inside the caller's mosque, or refuses with 404.
   *
   * `findFirst` on the whole condition rather than `findUnique` on the id: the mosque — and, for a caller
   * reading only their own, the person paid — are part of the question, so a record they may not see is not
   * found at all rather than found and then rejected.
   */
  private async getOwned(
    mosqueId: string,
    id: string,
    userId?: string,
  ): Promise<SelectedSalaryRecord> {
    const record = await this.prisma.salaryRecord.findFirst({
      where: { id, mosqueId, ...(userId !== undefined ? { userId } : {}) },
      select: SALARY_SELECT,
    });

    if (!record) throw salaryRecordNotFound();

    return record;
  }

  /**
   * That the named user is one of this mosque's own, and is not deleted.
   *
   * A 400 rather than a 404: the request named something that does not belong in it, which is a fault in the
   * body and not a missing resource. The message says only that the id does not match a user of this mosque —
   * deliberately the same answer for "no such user" and "a user of some other mosque", so this cannot be used
   * to test whether an id exists elsewhere in the system.
   */
  private async assertUserOwned(mosqueId: string, userId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, mosqueId, deletedAt: null },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException({
        code: 'SALARY_USER_NOT_FOUND',
        message: 'userId does not match a user of this mosque.',
      });
    }
  }

  /**
   * `to >= from`, when both were given.
   *
   * ISO `YYYY-MM-DD` strings compare correctly as strings — same width, most significant field first — so this
   * needs no date parsing and cannot pick up a timezone on the way. An inverted window is a 400 rather than an
   * empty page, because it is a mistake in the request and silently returning nothing hides it.
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
   * from BDT to USD must not silently restate what it paid three years ago.
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
   * `mosqueId` and `userId` are absent by design, not by omission. Neither is patchable.
   */
  private toUpdateData(dto: UpdateSalaryRecordDto): Prisma.SalaryRecordUpdateInput {
    const data: Prisma.SalaryRecordUpdateInput = {};

    if (dto.amount !== undefined) data.amount = toMoney(dto.amount);
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.payPeriod !== undefined) data.payPeriod = dto.payPeriod;
    if (dto.paymentDate !== undefined) data.paymentDate = toDateOnly(dto.paymentDate);
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
    if (error instanceof HttpException) return error;
    if (error instanceof Error && 'status' in error) return error;
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return error;

    switch (error.code) {
      case 'P2025':
        return salaryRecordNotFound();
      default:
        return error;
    }
  }
}

function salaryRecordNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'SALARY_RECORD_NOT_FOUND',
    message: 'We could not find that salary record.',
  });
}
