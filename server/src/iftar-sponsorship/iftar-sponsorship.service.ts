import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditLogService } from '../audit/audit-log.service';
import { buildPage, toSkipTake } from '../common/pagination/page';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { fromDateOnly, toDateOnly } from '../common/utils/date-only';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateIftarSponsorshipDto,
  IftarSponsorshipDto,
  IftarSponsorshipStatus,
  ListIftarSponsorshipQueryDto,
  PaginatedIftarSponsorshipDto,
  UpdateIftarSponsorshipDto,
} from './dto/iftar-sponsorship.dto';

const SPONSOR_USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
};

@Injectable()
export class IftarSponsorshipService {
  private readonly logger = new Logger(IftarSponsorshipService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly mail: MailService,
  ) {}

  /**
   * List Iftar sponsorships for the authenticated mosque.
   * Returns a standard paginated envelope (or all records when query.all is true).
   */
  async findAll(
    mosqueId: string,
    query: ListIftarSponsorshipQueryDto = {},
  ): Promise<PaginatedIftarSponsorshipDto | IftarSponsorshipDto[]> {
    const where: Prisma.IftarSponsorshipWhereInput = {
      mosqueId,
      ...(query.year !== undefined && { year: query.year }),
      ...(query.status !== undefined && { status: query.status }),
      ...(query.date !== undefined && { date: toDateOnly(query.date) }),
      ...(query.userId !== undefined && { userId: query.userId }),
      ...(query.search && {
        OR: [
          { sponsorName: { contains: query.search.trim(), mode: 'insensitive' } },
          { menuDetails: { contains: query.search.trim(), mode: 'insensitive' } },
          { notes: { contains: query.search.trim(), mode: 'insensitive' } },
        ],
      }),
    };

    if (query.all) {
      const rows = await this.prisma.iftarSponsorship.findMany({
        where,
        include: { user: { select: SPONSOR_USER_SELECT } },
        orderBy: [{ year: 'desc' }, { date: 'asc' }],
      });
      return rows.map((r) => IftarSponsorshipDto.from(r));
    }

    const { skip, take } = toSkipTake(query);
    const [total, rows] = await Promise.all([
      this.prisma.iftarSponsorship.count({ where }),
      this.prisma.iftarSponsorship.findMany({
        where,
        include: { user: { select: SPONSOR_USER_SELECT } },
        orderBy: [{ year: 'desc' }, { date: 'asc' }],
        skip,
        take,
      }),
    ]);

    const items = rows.map((r) => IftarSponsorshipDto.from(r));
    return buildPage(items, total, query);
  }

  async findOne(mosqueId: string, id: string): Promise<IftarSponsorshipDto> {
    const row = await this.getOwned(mosqueId, id);
    return IftarSponsorshipDto.from(row);
  }

  async findByDate(mosqueId: string, dateStr: string): Promise<IftarSponsorshipDto | null> {
    const row = await this.prisma.iftarSponsorship.findFirst({
      where: {
        mosqueId,
        date: toDateOnly(dateStr),
        status: { in: [IftarSponsorshipStatus.pending, IftarSponsorshipStatus.confirmed] },
      },
      include: { user: { select: SPONSOR_USER_SELECT } },
    });

    return row ? IftarSponsorshipDto.from(row) : null;
  }

  async create(actor: AuthenticatedUser, dto: CreateIftarSponsorshipDto): Promise<IftarSponsorshipDto> {
    const mosqueId = actor.mosqueId;
    const dateObj = toDateOnly(dto.date);

    // Business Rule Check 1: One active sponsor per date per mosque
    const existing = await this.prisma.iftarSponsorship.findFirst({
      where: {
        mosqueId,
        date: dateObj,
        status: { in: [IftarSponsorshipStatus.pending, IftarSponsorshipStatus.confirmed] },
      },
    });

    if (existing) {
      throw new ConflictException(
        'An active Iftar sponsorship already exists for this date. Update or cancel the existing sponsorship instead.',
      );
    }

    // Business Rule Check 2: Ramadan schedule validation & auto-linking
    let ramadanScheduleId = dto.ramadanScheduleId ?? null;
    if (ramadanScheduleId) {
      const schedule = await this.prisma.ramadanSchedule.findFirst({
        where: { id: ramadanScheduleId, mosqueId },
      });
      if (!schedule) {
        throw new NotFoundException('Specified Ramadan schedule entry was not found for this mosque.');
      }
      if (fromDateOnly(schedule.date) !== dto.date || schedule.year !== dto.year) {
        throw new BadRequestException(
          'Sponsorship date or year does not match the linked Ramadan schedule entry.',
        );
      }
    } else {
      const matchingSchedule = await this.prisma.ramadanSchedule.findFirst({
        where: { mosqueId, date: dateObj },
      });
      if (matchingSchedule) {
        ramadanScheduleId = matchingSchedule.id;
      }
    }

    // Business Rule Check 3: Member validation
    let resolvedSponsorName = dto.sponsorName?.trim() || '';
    if (dto.userId) {
      const userRecord = await this.prisma.user.findFirst({
        where: { id: dto.userId, mosqueId, deletedAt: null, isActive: true },
        select: SPONSOR_USER_SELECT,
      });
      if (!userRecord) {
        throw new NotFoundException('Selected mosque member was not found or is inactive.');
      }
      if (!resolvedSponsorName) {
        resolvedSponsorName = userRecord.fullName;
      }
    }

    if (!resolvedSponsorName || resolvedSponsorName.length < 2) {
      throw new BadRequestException('Sponsor name must be at least 2 characters.');
    }

    const row = await this.prisma.iftarSponsorship.create({
      data: {
        mosqueId,
        ramadanScheduleId,
        year: dto.year,
        date: dateObj,
        userId: dto.userId ?? null,
        sponsorName: resolvedSponsorName,
        sponsorPhone: dto.sponsorPhone?.trim() ?? null,
        sponsorEmail: dto.sponsorEmail?.trim() ?? null,
        numberOfServings: dto.numberOfServings ?? null,
        estimatedCost: dto.estimatedCost ? new Prisma.Decimal(dto.estimatedCost) : null,
        currency: dto.currency ?? 'BDT',
        menuDetails: dto.menuDetails?.trim() ?? null,
        notes: dto.notes?.trim() ?? null,
        status: dto.status ?? IftarSponsorshipStatus.pending,
      },
      include: { user: { select: SPONSOR_USER_SELECT } },
    });

    // Audit log
    await this.audit.record({
      mosqueId,
      actorId: actor.id,
      actorRole: actor.role,
      actorName: actor.email,
      resource: 'iftar_sponsorship',
      resourceId: row.id,
      action: 'IFTAR_SPONSORSHIP_CREATED',
      changes: {
        year: row.year,
        date: fromDateOnly(row.date),
        sponsorName: row.sponsorName,
        status: row.status,
        numberOfServings: row.numberOfServings,
        estimatedCost: row.estimatedCost ? row.estimatedCost.toString() : null,
      },
    });

    // Safe Notification Email (Fire and forget)
    const targetEmail = row.sponsorEmail || row.user?.email;
    if (targetEmail) {
      this.mail
        .sendIftarSponsorshipEmail(targetEmail, {
          sponsorName: row.sponsorName,
          date: fromDateOnly(row.date),
          year: row.year,
          status: row.status,
          numberOfServings: row.numberOfServings,
          estimatedCost: row.estimatedCost ? row.estimatedCost.toString() : null,
          currency: row.currency,
          menuDetails: row.menuDetails,
          notes: row.notes,
        })
        .catch((err) => {
          this.logger.warn(`Failed to dispatch iftar sponsorship notification: ${err?.message}`);
        });
    }

    return IftarSponsorshipDto.from(row);
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateIftarSponsorshipDto,
  ): Promise<IftarSponsorshipDto> {
    const mosqueId = actor.mosqueId;
    const current = await this.getOwned(mosqueId, id);

    // Business Rule Check 1: Status transition validation
    if (dto.status !== undefined && dto.status !== current.status) {
      this.validateStatusTransition(current.status, dto.status);
    }

    // Business Rule Check 2: Conflict checking when rescheduling or reactivating
    const targetDateStr = dto.date !== undefined ? dto.date : fromDateOnly(current.date);
    const targetDateObj = toDateOnly(targetDateStr);
    const targetStatus = dto.status !== undefined ? dto.status : current.status;

    if (
      targetStatus === IftarSponsorshipStatus.pending ||
      targetStatus === IftarSponsorshipStatus.confirmed
    ) {
      const conflict = await this.prisma.iftarSponsorship.findFirst({
        where: {
          mosqueId,
          date: targetDateObj,
          id: { not: id },
          status: { in: [IftarSponsorshipStatus.pending, IftarSponsorshipStatus.confirmed] },
        },
      });
      if (conflict) {
        throw new ConflictException('Another active Iftar sponsorship already covers that date.');
      }
    }

    // Business Rule Check 3: Ramadan schedule consistency
    if (dto.ramadanScheduleId !== undefined && dto.ramadanScheduleId !== null) {
      const schedule = await this.prisma.ramadanSchedule.findFirst({
        where: { id: dto.ramadanScheduleId, mosqueId },
      });
      if (!schedule) {
        throw new NotFoundException('Specified Ramadan schedule entry was not found for this mosque.');
      }
      if (fromDateOnly(schedule.date) !== targetDateStr) {
        throw new BadRequestException(
          'Sponsorship date does not match the linked Ramadan schedule entry.',
        );
      }
    }

    // Business Rule Check 4: Member tenancy validation
    if (dto.userId !== undefined && dto.userId !== null) {
      const user = await this.prisma.user.findFirst({
        where: { id: dto.userId, mosqueId, deletedAt: null, isActive: true },
      });
      if (!user) {
        throw new NotFoundException('Selected mosque member was not found or is inactive.');
      }
    }

    const data: Prisma.IftarSponsorshipUpdateInput = {};
    if (dto.year !== undefined) data.year = dto.year;
    if (dto.date !== undefined) data.date = toDateOnly(dto.date);
    if (dto.ramadanScheduleId !== undefined) {
      data.ramadanSchedule = dto.ramadanScheduleId
        ? { connect: { id: dto.ramadanScheduleId } }
        : { disconnect: true };
    }
    if (dto.userId !== undefined) {
      data.user = dto.userId ? { connect: { id: dto.userId } } : { disconnect: true };
    }
    if (dto.sponsorName !== undefined) data.sponsorName = dto.sponsorName.trim();
    if (dto.sponsorPhone !== undefined) data.sponsorPhone = dto.sponsorPhone?.trim() ?? null;
    if (dto.sponsorEmail !== undefined) data.sponsorEmail = dto.sponsorEmail?.trim() ?? null;
    if (dto.numberOfServings !== undefined) data.numberOfServings = dto.numberOfServings;
    if (dto.estimatedCost !== undefined) {
      data.estimatedCost = dto.estimatedCost ? new Prisma.Decimal(dto.estimatedCost) : null;
    }
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.menuDetails !== undefined) data.menuDetails = dto.menuDetails?.trim() ?? null;
    if (dto.notes !== undefined) data.notes = dto.notes?.trim() ?? null;
    if (dto.status !== undefined) data.status = dto.status;

    const updated = await this.prisma.iftarSponsorship.update({
      where: { id: current.id },
      data,
      include: { user: { select: SPONSOR_USER_SELECT } },
    });

    // Audit log
    await this.audit.record({
      mosqueId,
      actorId: actor.id,
      actorRole: actor.role,
      actorName: actor.email,
      resource: 'iftar_sponsorship',
      resourceId: id,
      action: 'IFTAR_SPONSORSHIP_UPDATED',
      changes: {
        before: {
          date: fromDateOnly(current.date),
          sponsorName: current.sponsorName,
          status: current.status,
        },
        after: {
          date: fromDateOnly(updated.date),
          sponsorName: updated.sponsorName,
          status: updated.status,
        },
      },
    });

    // Notification on status changes (e.g. confirmation or cancellation)
    if (dto.status !== undefined && dto.status !== current.status) {
      const targetEmail = updated.sponsorEmail || updated.user?.email;
      if (targetEmail) {
        this.mail
          .sendIftarSponsorshipEmail(targetEmail, {
            sponsorName: updated.sponsorName,
            date: fromDateOnly(updated.date),
            year: updated.year,
            status: updated.status,
            numberOfServings: updated.numberOfServings,
            estimatedCost: updated.estimatedCost ? updated.estimatedCost.toString() : null,
            currency: updated.currency,
            menuDetails: updated.menuDetails,
            notes: updated.notes,
          })
          .catch((err) => {
            this.logger.warn(`Failed to dispatch iftar sponsorship status notification: ${err?.message}`);
          });
      }
    }

    return IftarSponsorshipDto.from(updated);
  }

  async remove(actor: AuthenticatedUser, id: string): Promise<IftarSponsorshipDto> {
    const mosqueId = actor.mosqueId;
    const current = await this.getOwned(mosqueId, id);

    const deleted = await this.prisma.iftarSponsorship.delete({
      where: { id },
      include: { user: { select: SPONSOR_USER_SELECT } },
    });

    // Audit log
    await this.audit.record({
      mosqueId,
      actorId: actor.id,
      actorRole: actor.role,
      actorName: actor.email,
      resource: 'iftar_sponsorship',
      resourceId: id,
      action: 'IFTAR_SPONSORSHIP_DELETED',
      changes: {
        before: {
          year: current.year,
          date: fromDateOnly(current.date),
          sponsorName: current.sponsorName,
          status: current.status,
        },
      },
    });

    return IftarSponsorshipDto.from(deleted);
  }

  private validateStatusTransition(
    from: IftarSponsorshipStatus,
    to: IftarSponsorshipStatus,
  ): void {
    if (from === IftarSponsorshipStatus.completed && to === IftarSponsorshipStatus.pending) {
      throw new BadRequestException('Completed sponsorships cannot be reverted directly to pending.');
    }
  }

  private async getOwned(mosqueId: string, id: string) {
    const row = await this.prisma.iftarSponsorship.findFirst({
      where: { id, mosqueId },
      include: { user: { select: SPONSOR_USER_SELECT } },
    });

    if (!row) {
      throw new NotFoundException('Iftar sponsorship record not found');
    }

    return row;
  }
}
