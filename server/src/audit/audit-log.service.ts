import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { effectivePermissions, hasPermission } from '../common/constants/roles';
import { MAX_PAGE_SIZE } from '../common/pagination/page';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { toDateOnly } from '../common/utils/date-only';
import { PrismaService } from '../prisma/prisma.service';
import type { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditLogListMetaDto, AuditLogResponseDto } from './dto/audit-log-response.dto';
import {
  AUDIT_LOG_SELECT,
  DEFAULT_AUDIT_LOG_PAGE_SIZE,
  redactSecrets,
  type AuditChanges,
  type AuditEntry,
} from './types/audit-log.types';

/**
 * Writes and reads the audit trail.
 *
 * Three rules run through it.
 *
 * **A write never breaks the thing it is recording.** `record` catches everything and logs the failure
 * instead of rethrowing. The trade is deliberate and goes the way round most people expect it not to: a
 * database that will not accept the audit row would otherwise turn a legitimate role change into a 500,
 * and the administrator would try again, and fail again. Losing an entry is bad; refusing to let the
 * mosque run its own affairs because the log is unhappy is worse. The failure is logged at `error` so it
 * is visible rather than silent. `record` is also called *after* the business write has committed, never
 * inside its transaction, so an audit failure cannot roll one back.
 *
 * **A secret never reaches the row.** Every caller names the fields it records, and `redactSecrets` then
 * removes anything whose name suggests a credential. Two independent measures for one rule, because the
 * first depends on every future caller being careful and the second does not.
 *
 * **A reader sees one mosque.** Every query is scoped to the caller's own mosque, taken from the token
 * and never from the request. The single exception is a holder of `platform.manage`, who administers
 * across mosques and would otherwise be unable to audit their own actions; that is the permission the
 * brief means by "SUPER_ADMIN should retain full administrative access".
 *
 * There is no update and no delete, here or in the controller. The trail is append-only.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records one entry. Best-effort by design — see the class note.
   *
   * Values are capped to their column widths rather than left to fail. A browser's `User-Agent` runs
   * past 255 characters often enough that not doing so would quietly cost the log every entry from
   * whichever browser is currently the most verbose.
   */
  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          mosqueId: entry.mosqueId,
          actorId: entry.actorId ?? null,
          actorName: cap(entry.actorName, 160),
          actorRole: cap(entry.actorRole, 32),
          action: entry.action,
          resource: entry.resource,
          resourceId: cap(entry.resourceId, 64),
          changes: this.jsonFor(entry.changes),
          note: entry.note ?? null,
          ipAddress: cap(entry.ipAddress, 64),
          userAgent: cap(entry.userAgent, 255),
        },
      });
    } catch (error) {
      // The entry's shape, not its contents: this line goes to the application log, which is not the
      // audit trail and has no business holding what the trail was asked to hold.
      this.logger.error(
        `could not record ${entry.action} on ${entry.resource} ${entry.resourceId ?? '-'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async findMany(
    actor: AuthenticatedUser,
    query: AuditLogQueryDto,
  ): Promise<{ rows: AuditLogResponseDto[]; meta: AuditLogListMetaDto }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(Math.max(1, query.limit ?? DEFAULT_AUDIT_LOG_PAGE_SIZE), MAX_PAGE_SIZE);

    this.assertRange(query.from, query.to);

    const where = this.buildWhere(actor, query);

    // One transaction so the count and the page describe the same set of rows. The trail is written to
    // by every administrative action, so without this a busy afternoon makes the two disagree.
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        select: AUDIT_LOG_SELECT,
        // `id` breaks ties so an entry cannot appear on two pages, or on none, when several share a
        // timestamp — one administrative action often writes more than one row.
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      rows: rows.map((row) => AuditLogResponseDto.from(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Reads one entry.
   *
   * Another mosque's entry is a 404, not a 403. A 403 would confirm the id exists, which for a log of
   * who did what is itself worth withholding — and it is the answer every other module here gives.
   */
  async findOne(actor: AuthenticatedUser, id: string): Promise<AuditLogResponseDto> {
    const entry = await this.prisma.auditLog.findFirst({
      where: { id, ...this.mosqueScope(actor) },
      select: AUDIT_LOG_SELECT,
    });

    if (!entry) {
      throw new NotFoundException({
        code: 'AUDIT_LOG_NOT_FOUND',
        message: 'No such audit log entry.',
      });
    }

    return AuditLogResponseDto.from(entry);
  }

  private buildWhere(actor: AuthenticatedUser, query: AuditLogQueryDto): Prisma.AuditLogWhereInput {
    const action = query.action ?? query.operation;
    const resourceId = query.resourceId ?? query.fundId;

    return {
      ...this.mosqueScope(actor),
      ...(action ? { action } : {}),
      // The brief's `entity`, which is this column.
      ...(query.entity ? { resource: query.entity } : {}),
      // The brief's `userId`. A filter, not a scope: it cannot widen what the caller may see.
      ...(query.userId ? { actorId: query.userId } : {}),
      ...(resourceId ? { resourceId } : {}),
      ...(query.reference
        ? {
            OR: [
              { resourceId: { contains: query.reference, mode: 'insensitive' } },
              { note: { contains: query.reference, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.status === 'failure'
        ? {
            action: {
              in: [
                'LOGIN_FAILED',
                'APPROVAL_REJECTED',
                'EXPENSE_REJECTED_INSUFFICIENT_FUNDS',
                'SALARY_REJECTED_INSUFFICIENT_FUNDS',
                'FUND_TRANSFER_REJECTED_INSUFFICIENT_FUNDS',
              ],
            },
          }
        : query.status === 'success'
          ? {
              action: {
                notIn: [
                  'LOGIN_FAILED',
                  'APPROVAL_REJECTED',
                  'EXPENSE_REJECTED_INSUFFICIENT_FUNDS',
                  'SALARY_REJECTED_INSUFFICIENT_FUNDS',
                  'FUND_TRANSFER_REJECTED_INSUFFICIENT_FUNDS',
                ],
              },
            }
          : {}),
      ...(query.from !== undefined || query.to !== undefined
        ? {
            createdAt: {
              ...(query.from !== undefined ? { gte: toDateOnly(query.from) } : {}),
              // `to` names a day, and a day includes its last second. `lte` on that day's midnight
              // would return the entries written in its first instant and nothing else.
              ...(query.to !== undefined ? { lt: startOfNextDay(query.to) } : {}),
            },
          }
        : {}),
    };
  }

  /**
   * The mosque filter, or nothing at all for a platform administrator.
   *
   * Read from `effectivePermissions` rather than from the role name, so it answers the same question the
   * guard does — and so a deactivated account, which resolves to no permissions, is confined rather than
   * unleashed.
   */
  private mosqueScope(actor: AuthenticatedUser): { mosqueId?: string } {
    return hasPermission(effectivePermissions(actor), 'platform.manage')
      ? {}
      : { mosqueId: actor.mosqueId };
  }

  /**
   * `to >= from`, when both were given. ISO `YYYY-MM-DD` strings compare correctly as strings, so this
   * needs no date parsing. An inverted window is a 400 rather than an empty page: it is a mistake in the
   * request, and an audit search that silently returns nothing is the worst possible way to hide one.
   */
  private assertRange(from: string | undefined, to: string | undefined): void {
    if (!from || !to || to >= from) return;

    throw new BadRequestException({
      code: 'INVALID_DATE_RANGE',
      message: 'to must not fall before from.',
    });
  }

  /** `changes`, redacted, in the shape Prisma wants — or nothing, leaving the column null. */
  private jsonFor(changes: AuditChanges | null | undefined): Prisma.InputJsonObject | undefined {
    if (!changes) return undefined;

    return redactSecrets(changes) as Prisma.InputJsonObject;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight UTC on the day after the one named, so a `lt` bound includes the whole of it. */
function startOfNextDay(isoDate: string): Date {
  return new Date(toDateOnly(isoDate).getTime() + DAY_MS);
}

/**
 * A value trimmed to what its column can hold.
 *
 * Overloaded rather than widened: `actorName` is non-null in the schema and the callers always have one,
 * so passing a `string` must come back as a `string`. Collapsing both cases into `string | null` would
 * make the column's own guarantee unusable from here.
 */
function cap(value: string, length: number): string;
function cap(value: string | null | undefined, length: number): string | null;
function cap(value: string | null | undefined, length: number): string | null {
  if (value === null || value === undefined) return null;

  return value.length > length ? value.slice(0, length) : value;
}
