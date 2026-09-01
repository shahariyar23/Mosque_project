import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  JummahCollectionStatus,
  PaymentMethod,
  Prisma,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';

import { AuditLogService } from '../audit/audit-log.service';
import { MAX_PAGE_SIZE } from '../common/pagination/page';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { CURRENCY_PATTERN, FALLBACK_CURRENCY, normalizeCurrency } from '../common/utils/currency';
import { dayOfWeekUtc, fromDateOnly, toDateOnly } from '../common/utils/date-only';
import { toMoney } from '../common/utils/money';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJummahCollectionDto } from './dto/create-jummah-collection.dto';
import { JummahCollectionQueryDto } from './dto/jummah-collection-query.dto';
import {
  JummahCollectionListMetaDto,
  JummahCollectionResponseDto,
} from './dto/jummah-collection-response.dto';
import { UpdateJummahCollectionDto } from './dto/update-jummah-collection.dto';

const FRIDAY = 5;

const JUMMAH_COLLECTION_SELECT = {
  id: true,
  date: true,
  amount: true,
  currency: true,
  status: true,
  reference: true,
  notes: true,
  isPublic: true,
  createdAt: true,
  updatedAt: true,
  fund: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  schedule: {
    select: {
      id: true,
      khutbahTime: true,
      prayerTime: true,
      imam: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
} as const;

import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class JummahCollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  /**
   * Records a new Friday / Jummah congregational collection for the actor's mosque.
   * Atomically records the income ledger transaction when status is completed.
   */
  async create(
    actor: AuthenticatedUser,
    dto: CreateJummahCollectionDto,
  ): Promise<JummahCollectionResponseDto> {
    const fridayDate = this.assertFriday(dto.date);
    await this.assertFundOwned(actor.mosqueId, dto.fundId);
    if (dto.scheduleId) {
      await this.assertScheduleOwned(actor.mosqueId, dto.scheduleId);
    }

    const currency = await this.resolveCurrency(actor.mosqueId, dto.currency);
    const amountDecimal = toMoney(dto.amount);
    const dateObj = toDateOnly(fridayDate);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const collection = await tx.jummahCollection.create({
          data: {
            mosqueId: actor.mosqueId,
            date: dateObj,
            fundId: dto.fundId,
            scheduleId: dto.scheduleId ?? null,
            amount: amountDecimal,
            currency,
            status: dto.status ?? JummahCollectionStatus.completed,
            reference: dto.reference?.trim() ?? null,
            notes: dto.notes?.trim() ?? null,
            isPublic: dto.isPublic ?? true,
            createdById: actor.id,
          },
          select: JUMMAH_COLLECTION_SELECT,
        });

        // If completed, record corresponding Income Transaction atomically in the ledger
        if (collection.status === JummahCollectionStatus.completed) {
          await tx.transaction.create({
            data: {
              mosqueId: actor.mosqueId,
              type: TransactionType.income,
              status: TransactionStatus.completed,
              amount: amountDecimal,
              currency,
              description:
                dto.notes?.trim() ||
                `Jummah Collection on ${fridayDate} for ${collection.fund.name}`,
              category: 'Jummah Collection',
              reference: dto.reference?.trim() || `JUMMAH-${fridayDate}`,
              paymentMethod: PaymentMethod.cash,
              fundId: dto.fundId,
              jummahCollectionId: collection.id,
              transactedAt: dateObj,
              createdById: actor.id,
            },
          });
        }

        return collection;
      });

      // Append to audit trail
      await this.audit.record({
        mosqueId: actor.mosqueId,
        actorId: actor.id,
        actorName: actor.email,
        actorRole: actor.role,
        action: 'JUMMAH_COLLECTION_RECORDED',
        resource: 'jummah_collection',
        resourceId: created.id,
        note: `Recorded Jummah collection of ${created.amount} ${created.currency} for ${created.fund.name} on ${fridayDate}`,
        changes: {
          date: fridayDate,
          fundId: created.fund.id,
          amount: created.amount.toString(),
          currency: created.currency,
          status: created.status,
          isPublic: created.isPublic,
        },
      });

      // Emit in-app notification to finance officers & mosque admins
      if (this.notificationsService) {
        this.notificationsService.notifyFinanceAdmins(actor.mosqueId, {
          title: 'Friday Collection Recorded',
          message: `৳${created.amount} recorded for Friday ${fridayDate} (${created.fund.name})`,
          type: NotificationType.jummah_collection,
          category: 'jumuah',
          resourceType: 'jummah_collection',
          resourceId: created.id,
          actionUrl: '/dashboard/jumuah',
        }).catch(() => undefined);
      }

      return JummahCollectionResponseDto.from(created);
    } catch (error) {
      throw this.translate(error);
    }
  }

  /**
   * Lists Jummah collections for the caller's mosque with server-side filtering, sorting, and pagination.
   */
  async findAll(
    actor: AuthenticatedUser,
    query: JummahCollectionQueryDto,
  ): Promise<{ rows: JummahCollectionResponseDto[]; meta: JummahCollectionListMetaDto }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where = this.buildWhere(actor.mosqueId, query);

    const [total, rows] = await Promise.all([
      this.prisma.jummahCollection.count({ where }),
      this.prisma.jummahCollection.findMany({
        where,
        select: JUMMAH_COLLECTION_SELECT,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      rows: rows.map(JummahCollectionResponseDto.from),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Retrieves a single Jummah collection scoped to the caller's mosque.
   */
  async findOne(actor: AuthenticatedUser, id: string): Promise<JummahCollectionResponseDto> {
    const row = await this.getOwned(actor.mosqueId, id);
    return JummahCollectionResponseDto.from(row);
  }

  /**
   * Corrects or voids an existing Jummah collection according to financial ledger rules.
   */
  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateJummahCollectionDto,
  ): Promise<JummahCollectionResponseDto> {
    const existing = await this.getOwned(actor.mosqueId, id);

    const fundId = dto.fundId ?? existing.fund.id;
    if (dto.fundId !== undefined) {
      await this.assertFundOwned(actor.mosqueId, fundId);
    }

    if (dto.scheduleId !== undefined && dto.scheduleId !== null) {
      await this.assertScheduleOwned(actor.mosqueId, dto.scheduleId);
    }

    const dateStr = dto.date !== undefined ? this.assertFriday(dto.date) : undefined;
    const dateObj = dateStr !== undefined ? toDateOnly(dateStr) : undefined;
    const amountDecimal = dto.amount !== undefined ? toMoney(dto.amount) : undefined;

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const collection = await tx.jummahCollection.update({
          where: { id },
          data: {
            ...(dateObj !== undefined ? { date: dateObj } : {}),
            ...(dto.fundId !== undefined ? { fundId: dto.fundId } : {}),
            ...(dto.scheduleId !== undefined ? { scheduleId: dto.scheduleId } : {}),
            ...(amountDecimal !== undefined ? { amount: amountDecimal } : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            ...(dto.reference !== undefined ? { reference: dto.reference?.trim() ?? null } : {}),
            ...(dto.notes !== undefined ? { notes: dto.notes?.trim() ?? null } : {}),
            ...(dto.isPublic !== undefined ? { isPublic: dto.isPublic } : {}),
          },
          select: JUMMAH_COLLECTION_SELECT,
        });

        // Synchronize with existing financial transaction
        const existingTx = await tx.transaction.findFirst({
          where: { mosqueId: actor.mosqueId, jummahCollectionId: id },
          select: { id: true },
        });

        if (collection.status === JummahCollectionStatus.completed) {
          if (existingTx) {
            await tx.transaction.update({
              where: { id: existingTx.id },
              data: {
                status: TransactionStatus.completed,
                amount: collection.amount,
                fundId: collection.fund.id,
                reference: collection.reference || `JUMMAH-${fromDateOnly(collection.date)}`,
                transactedAt: collection.date,
                description:
                  collection.notes ||
                  `Jummah Collection on ${fromDateOnly(collection.date)} for ${collection.fund.name}`,
              },
            });
          } else {
            await tx.transaction.create({
              data: {
                mosqueId: actor.mosqueId,
                type: TransactionType.income,
                status: TransactionStatus.completed,
                amount: collection.amount,
                currency: collection.currency,
                description:
                  collection.notes ||
                  `Jummah Collection on ${fromDateOnly(collection.date)} for ${collection.fund.name}`,
                category: 'Jummah Collection',
                reference: collection.reference || `JUMMAH-${fromDateOnly(collection.date)}`,
                paymentMethod: PaymentMethod.cash,
                fundId: collection.fund.id,
                jummahCollectionId: collection.id,
                transactedAt: collection.date,
                createdById: actor.id,
              },
            });
          }
        } else if (collection.status === JummahCollectionStatus.voided) {
          if (existingTx) {
            await tx.transaction.update({
              where: { id: existingTx.id },
              data: { status: TransactionStatus.voided },
            });
          }
        }

        return collection;
      });

      // Audit trail entry
      const action =
        dto.status === JummahCollectionStatus.voided
          ? 'JUMMAH_COLLECTION_VOIDED'
          : 'JUMMAH_COLLECTION_UPDATED';

      await this.audit.record({
        mosqueId: actor.mosqueId,
        actorId: actor.id,
        actorName: actor.email,
        actorRole: actor.role,
        action,
        resource: 'jummah_collection',
        resourceId: updated.id,
        note: `Updated Jummah collection ${updated.id}`,
        changes: {
          ...(dto.amount !== undefined ? { amount: updated.amount.toString() } : {}),
          ...(dto.fundId !== undefined ? { fundId: updated.fund.id } : {}),
          ...(dto.status !== undefined ? { status: updated.status } : {}),
          ...(dto.isPublic !== undefined ? { isPublic: updated.isPublic } : {}),
        },
      });

      return JummahCollectionResponseDto.from(updated);
    } catch (error) {
      throw this.translate(error);
    }
  }

  // --- Internal Helpers ---

  private buildWhere(
    mosqueId: string,
    query: JummahCollectionQueryDto,
  ): Prisma.JummahCollectionWhereInput {
    const where: Prisma.JummahCollectionWhereInput = { mosqueId };

    if (query.from || query.to) {
      where.date = {
        ...(query.from ? { gte: toDateOnly(query.from) } : {}),
        ...(query.to ? { lte: toDateOnly(query.to) } : {}),
      };
    }

    if (query.fundId) where.fundId = query.fundId;
    if (query.scheduleId) where.scheduleId = query.scheduleId;
    if (query.status) where.status = query.status;
    if (query.isPublic !== undefined) where.isPublic = query.isPublic;

    return where;
  }

  private async getOwned(mosqueId: string, id: string) {
    const row = await this.prisma.jummahCollection.findFirst({
      where: { id, mosqueId },
      select: JUMMAH_COLLECTION_SELECT,
    });

    if (!row) {
      throw new NotFoundException({
        code: 'JUMMAH_COLLECTION_NOT_FOUND',
        message: 'Jummah collection record not found for this mosque',
      });
    }

    return row;
  }

  private async assertFundOwned(mosqueId: string, fundId: string): Promise<void> {
    const fund = await this.prisma.donationFund.findFirst({
      where: { id: fundId, mosqueId },
      select: { id: true },
    });

    if (!fund) {
      throw new BadRequestException({
        code: 'FUND_NOT_FOUND',
        message: 'The specified fund does not exist in this mosque.',
      });
    }
  }

  private async assertScheduleOwned(mosqueId: string, scheduleId: string): Promise<void> {
    const schedule = await this.prisma.jumuahSchedule.findFirst({
      where: { id: scheduleId, mosqueId },
      select: { id: true },
    });

    if (!schedule) {
      throw new BadRequestException({
        code: 'SCHEDULE_NOT_FOUND',
        message: 'The specified Jumu’ah schedule does not exist in this mosque.',
      });
    }
  }

  private assertFriday(isoDate: string): string {
    if (dayOfWeekUtc(isoDate) !== FRIDAY) {
      throw new BadRequestException({
        code: 'NOT_A_FRIDAY',
        message: `${isoDate} is not a Friday. Jummah collections must be recorded on a Friday date.`,
      });
    }
    return isoDate;
  }

  private async resolveCurrency(mosqueId: string, explicit?: string): Promise<string> {
    if (explicit) {
      const normalized = normalizeCurrency(explicit);
      if (typeof normalized === 'string' && CURRENCY_PATTERN.test(normalized)) return normalized;
      throw new BadRequestException('currency must be a 3-letter ISO code');
    }

    const settings = await this.prisma.mosqueSettings.findUnique({
      where: { mosqueId },
      select: { currency: true },
    });

    return settings?.currency || FALLBACK_CURRENCY;
  }

  private translate(error: unknown): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new BadRequestException('A unique constraint violation occurred.');
      }
      if (error.code === 'P2003') {
        return new BadRequestException('Foreign key constraint violation.');
      }
    }
    return error as Error;
  }
}
