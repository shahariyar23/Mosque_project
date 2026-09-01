import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditLogService } from '../audit/audit-log.service';
import { fromDateOnly, toDateOnly } from '../common/utils/date-only';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateIftarSponsorshipDto,
  IftarSponsorshipDto,
  IftarSponsorshipStatus,
  ListIftarSponsorshipQueryDto,
  UpdateIftarSponsorshipDto,
} from './dto/iftar-sponsorship.dto';

const SPONSOR_USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
} as const;

@Injectable()
export class IftarSponsorshipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly mail: MailService,
  ) {}

  /**
   * List all Iftar sponsorships for the authenticated user's mosque.
   * Filterable by Hijri year, date, and status.
   */
  async findAll(
    mosqueId: string,
    query: ListIftarSponsorshipQueryDto = {},
  ): Promise<IftarSponsorshipDto[]> {
    const rows = await this.prisma.iftarSponsorship.findMany({
      where: {
        mosqueId,
        ...(query.year !== undefined && { year: query.year }),
        ...(query.status !== undefined && { status: query.status }),
        ...(query.date !== undefined && { date: toDateOnly(query.date) }),
      },
      include: {
        user: { select: SPONSOR_USER_SELECT },
      },
      orderBy: [{ year: 'desc' }, { date: 'asc' }],
    });

    return rows.map((row) => IftarSponsorshipDto.from(row));
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
      include: {
        user: { select: SPONSOR_USER_SELECT },
      },
    });

    return row ? IftarSponsorshipDto.from(row) : null;
  }

  async create(mosqueId: string, dto: CreateIftarSponsorshipDto): Promise<IftarSponsorshipDto> {
    const dateObj = toDateOnly(dto.date);

    // Enforce one active/pending sponsor per date business rule
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

    // Auto-link matching Ramadan schedule if available
    let ramadanScheduleId = dto.ramadanScheduleId ?? null;
    if (ramadanScheduleId) {
      const explicitSchedule = await this.prisma.ramadanSchedule.findFirst({
        where: { id: ramadanScheduleId, mosqueId },
      });
      if (!explicitSchedule || fromDateOnly(explicitSchedule.date) !== dto.date) {
        throw new BadRequestException('Selected Ramadan schedule date does not match sponsorship date');
      }
    } else {
      const matchingSchedule = await this.prisma.ramadanSchedule.findFirst({
        where: { mosqueId, date: dateObj },
      });
      if (matchingSchedule) {
        ramadanScheduleId = matchingSchedule.id;
      }
    }

    // Validate member tenancy if userId supplied
    let userRecord: { id: string; fullName: string; email: string; phone: string | null } | null = null;
    if (dto.userId) {
      userRecord = await this.prisma.user.findFirst({
        where: { id: dto.userId, mosqueId },
        select: SPONSOR_USER_SELECT,
      });
      if (!userRecord) {
        throw new NotFoundException('Selected mosque member was not found');
      }
    }

    const sponsorName = dto.sponsorName?.trim() || userRecord?.fullName || 'Anonymous Sponsor';
    const sponsorEmail = dto.sponsorEmail?.trim() || userRecord?.email || null;
    const sponsorPhone = dto.sponsorPhone?.trim() || userRecord?.phone || null;

    const row = await this.prisma.iftarSponsorship.create({
      data: {
        mosqueId,
        ramadanScheduleId,
        year: dto.year,
        date: dateObj,
        userId: dto.userId ?? null,
        sponsorName,
        sponsorPhone,
        sponsorEmail,
        numberOfServings: dto.numberOfServings ?? null,
        estimatedCost: dto.estimatedCost ? new Prisma.Decimal(dto.estimatedCost) : null,
        currency: dto.currency ?? 'BDT',
        menuDetails: dto.menuDetails?.trim() ?? null,
        notes: dto.notes?.trim() ?? null,
        status: dto.status ?? IftarSponsorshipStatus.confirmed,
      },
      include: {
        user: { select: SPONSOR_USER_SELECT },
      },
    });

    await this.audit.record({
      action: 'IFTAR_SPONSORSHIP_CREATED',
      resource: 'iftar_sponsorship',
      resourceId: row.id,
      actorId: dto.userId ?? null,
      actorName: sponsorName,
      mosqueId,
      changes: {
        year: row.year,
        date: fromDateOnly(row.date),
        sponsorName: row.sponsorName,
      },
    });

    if (sponsorEmail) {
      await this.mail.sendIftarSponsorshipEmail(sponsorEmail, {
        sponsorName,
        year: row.year,
        date: fromDateOnly(row.date),
        status: row.status as IftarSponsorshipStatus,
      });
    }

    return IftarSponsorshipDto.from(row);
  }

  async update(
    mosqueId: string,
    id: string,
    dto: UpdateIftarSponsorshipDto,
  ): Promise<IftarSponsorshipDto> {
    const current = await this.getOwned(mosqueId, id);

    if (
      dto.status !== undefined &&
      current.status === IftarSponsorshipStatus.completed &&
      dto.status === IftarSponsorshipStatus.pending
    ) {
      throw new BadRequestException('Cannot revert completed sponsorship back to pending');
    }

    if (dto.date !== undefined) {
      const dateObj = toDateOnly(dto.date);
      const conflict = await this.prisma.iftarSponsorship.findFirst({
        where: {
          mosqueId,
          date: dateObj,
          id: { not: id },
          status: { in: [IftarSponsorshipStatus.pending, IftarSponsorshipStatus.confirmed] },
        },
      });
      if (conflict) {
        throw new ConflictException('Another active Iftar sponsorship already covers that date.');
      }
    }

    if (dto.userId !== undefined && dto.userId !== null) {
      const user = await this.prisma.user.findFirst({
        where: { id: dto.userId, mosqueId },
      });
      if (!user) {
        throw new NotFoundException('Selected mosque member was not found');
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
      include: {
        user: { select: SPONSOR_USER_SELECT },
      },
    });

    await this.audit.record({
      action: 'IFTAR_SPONSORSHIP_UPDATED',
      resource: 'iftar_sponsorship',
      resourceId: updated.id,
      actorName: updated.sponsorName,
      mosqueId,
      changes: {
        before: { status: current.status },
        after: { status: updated.status },
      },
    });

    const targetEmail = updated.sponsorEmail || updated.user?.email;
    if (dto.status && dto.status !== current.status && targetEmail) {
      await this.mail.sendIftarSponsorshipEmail(targetEmail, {
        sponsorName: updated.sponsorName,
        year: updated.year,
        date: fromDateOnly(updated.date),
        status: updated.status as IftarSponsorshipStatus,
      });
    }

    return IftarSponsorshipDto.from(updated);
  }

  async remove(mosqueId: string, id: string): Promise<IftarSponsorshipDto> {
    const current = await this.getOwned(mosqueId, id);

    const deleted = await this.prisma.iftarSponsorship.delete({
      where: { id },
      include: {
        user: { select: SPONSOR_USER_SELECT },
      },
    });

    await this.audit.record({
      action: 'IFTAR_SPONSORSHIP_DELETED',
      resource: 'iftar_sponsorship',
      resourceId: deleted.id,
      actorName: deleted.sponsorName,
      mosqueId,
      changes: {
        date: fromDateOnly(deleted.date),
        sponsorName: deleted.sponsorName,
      },
    });

    return IftarSponsorshipDto.from(deleted);
  }

  private async getOwned(mosqueId: string, id: string) {
    const row = await this.prisma.iftarSponsorship.findFirst({
      where: { id, mosqueId },
      include: {
        user: { select: SPONSOR_USER_SELECT },
      },
    });

    if (!row) {
      throw new NotFoundException('Iftar sponsorship record not found');
    }

    return row;
  }
}
