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
import { slugify } from '../common/utils/slug';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateEventDto,
  EventCategory,
  EventDto,
  EventStatus,
  ListEventsQueryDto,
  PaginatedEventsDto,
  UpdateEventDto,
} from './dto/event.dto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  /**
   * List mosque events.
   * Returns a standard paginated envelope (or all events when query.all is true).
   */
  async findAll(
    mosqueId: string,
    query: ListEventsQueryDto = {},
  ): Promise<PaginatedEventsDto | EventDto[]> {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayDate = toDateOnly(todayStr);

    const where: Prisma.EventWhereInput = {
      mosqueId,
      deletedAt: null,
      ...(query.category !== undefined && { category: query.category }),
      ...(query.status !== undefined && { status: query.status }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search.trim(), mode: 'insensitive' } },
          { speaker: { contains: query.search.trim(), mode: 'insensitive' } },
          { location: { contains: query.search.trim(), mode: 'insensitive' } },
          { description: { contains: query.search.trim(), mode: 'insensitive' } },
        ],
      }),
    };

    // Date range filtering
    if (query.from && query.to) {
      where.date = { gte: toDateOnly(query.from), lte: toDateOnly(query.to) };
    } else if (query.from) {
      where.date = { gte: toDateOnly(query.from) };
    } else if (query.to) {
      where.date = { lte: toDateOnly(query.to) };
    }

    // Timeframe presets
    if (query.timeframe) {
      const tf = query.timeframe.toLowerCase();
      if (tf === 'upcoming') {
        where.date = { gte: todayDate };
        where.status = { in: [EventStatus.upcoming, EventStatus.ongoing] };
      } else if (tf === 'completed') {
        where.status = EventStatus.completed;
      } else if (tf === 'past') {
        where.date = { lt: todayDate };
      } else if (tf === 'this_month') {
        const now = new Date();
        const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
        where.date = { gte: startOfMonth, lte: endOfMonth };
      }
    }

    const orderBy: Prisma.EventOrderByWithRelationInput[] = [
      { date: 'asc' },
      { startTime: 'asc' },
    ];

    if (query.all) {
      const rows = await this.prisma.event.findMany({
        where,
        include: {
          registrations: {
            where: { status: 'confirmed' },
            select: { guests: true },
          },
        },
        orderBy,
      });

      return rows.map((r) => {
        const registered = r.registrations.reduce((sum, reg) => sum + 1 + (reg.guests || 0), 0);
        return EventDto.from(r, registered);
      });
    }

    const { skip, take } = toSkipTake(query);
    const [total, rows] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        include: {
          registrations: {
            where: { status: 'confirmed' },
            select: { guests: true },
          },
        },
        orderBy,
        skip,
        take,
      }),
    ]);

    const items = rows.map((r) => {
      const registered = r.registrations.reduce((sum, reg) => sum + 1 + (reg.guests || 0), 0);
      return EventDto.from(r, registered);
    });

    return buildPage(items, total, query);
  }

  /**
   * Find a single event by ID or slug.
   */
  async findOne(mosqueId: string, idOrSlug: string): Promise<EventDto> {
    const isUuid = UUID_REGEX.test(idOrSlug);
    const where: Prisma.EventWhereInput = {
      mosqueId,
      deletedAt: null,
      ...(isUuid ? { id: idOrSlug } : { slug: idOrSlug }),
    };

    const row = await this.prisma.event.findFirst({
      where,
      include: {
        registrations: {
          where: { status: 'confirmed' },
          select: { guests: true },
        },
      },
    });

    if (!row) {
      throw new NotFoundException('Event not found.');
    }

    const registered = row.registrations.reduce((sum, reg) => sum + 1 + (reg.guests || 0), 0);
    return EventDto.from(row, registered);
  }

  /**
   * Create a new event.
   */
  async create(actor: AuthenticatedUser, dto: CreateEventDto): Promise<EventDto> {
    const mosqueId = actor.mosqueId;
    const slug = await this.resolveUniqueSlug(mosqueId, dto.slug, dto.title);

    const row = await this.prisma.event.create({
      data: {
        mosqueId,
        title: dto.title.trim(),
        slug,
        category: dto.category,
        status: dto.status ?? EventStatus.upcoming,
        date: toDateOnly(dto.date),
        startTime: dto.startTime,
        endTime: dto.endTime ?? null,
        timeLabel: dto.timeLabel?.trim() || null,
        location: dto.location.trim(),
        speaker: dto.speaker?.trim() || null,
        description: dto.description.trim(),
        capacity: dto.capacity ?? 100,
        registrationRequired: dto.registrationRequired ?? false,
        contribution: dto.contribution !== undefined && dto.contribution !== null ? new Prisma.Decimal(dto.contribution) : null,
        imageUrl: dto.imageUrl?.trim() || null,
        isPublished: dto.isPublished ?? true,
      },
    });

    await this.audit.record({
      action: 'EVENT_CREATED',
      resource: 'event',
      resourceId: row.id,
      actorId: actor.id,
      actorName: actor.email,
      mosqueId,
      changes: {
        title: row.title,
        slug: row.slug,
        category: row.category,
        date: fromDateOnly(row.date),
        startTime: row.startTime,
      },
    });

    return EventDto.from(row, 0);
  }

  /**
   * Update an existing event.
   */
  async update(actor: AuthenticatedUser, id: string, dto: UpdateEventDto): Promise<EventDto> {
    const mosqueId = actor.mosqueId;
    const existing = await this.getOwned(mosqueId, id);

    let slug = existing.slug;
    if (dto.slug && dto.slug !== existing.slug) {
      const conflict = await this.prisma.event.findFirst({
        where: { mosqueId, slug: dto.slug, id: { not: id } },
      });
      if (conflict) {
        throw new ConflictException('An event with this slug already exists for this mosque.');
      }
      slug = dto.slug;
    }

    const row = await this.prisma.event.update({
      where: { id: existing.id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.slug !== undefined && { slug }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.date !== undefined && { date: toDateOnly(dto.date) }),
        ...(dto.startTime !== undefined && { startTime: dto.startTime }),
        ...(dto.endTime !== undefined && { endTime: dto.endTime }),
        ...(dto.timeLabel !== undefined && { timeLabel: dto.timeLabel }),
        ...(dto.location !== undefined && { location: dto.location.trim() }),
        ...(dto.speaker !== undefined && { speaker: dto.speaker ? dto.speaker.trim() : null }),
        ...(dto.description !== undefined && { description: dto.description.trim() }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(dto.registrationRequired !== undefined && { registrationRequired: dto.registrationRequired }),
        ...(dto.contribution !== undefined && {
          contribution: dto.contribution !== null ? new Prisma.Decimal(dto.contribution) : null,
        }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
      },
      include: {
        registrations: {
          where: { status: 'confirmed' },
          select: { guests: true },
        },
      },
    });

    await this.audit.record({
      action: 'EVENT_UPDATED',
      resource: 'event',
      resourceId: row.id,
      actorId: actor.id,
      actorName: actor.email,
      mosqueId,
      changes: {
        before: {
          title: existing.title,
          status: existing.status,
          date: fromDateOnly(existing.date),
        },
        after: {
          title: row.title,
          status: row.status,
          date: fromDateOnly(row.date),
        },
      },
    });

    const registered = row.registrations.reduce((sum, reg) => sum + 1 + (reg.guests || 0), 0);
    return EventDto.from(row, registered);
  }

  /**
   * Delete an event (soft delete).
   */
  async remove(actor: AuthenticatedUser, id: string): Promise<EventDto> {
    const mosqueId = actor.mosqueId;
    const existing = await this.getOwned(mosqueId, id);

    const row = await this.prisma.event.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
        status: EventStatus.cancelled,
      },
      include: {
        registrations: {
          where: { status: 'confirmed' },
          select: { guests: true },
        },
      },
    });

    await this.audit.record({
      action: 'EVENT_DELETED',
      resource: 'event',
      resourceId: row.id,
      actorId: actor.id,
      actorName: actor.email,
      mosqueId,
      changes: {
        title: existing.title,
        date: fromDateOnly(existing.date),
      },
    });

    const registered = row.registrations.reduce((sum, reg) => sum + 1 + (reg.guests || 0), 0);
    return EventDto.from(row, registered);
  }

  /**
   * Fetch an active event belonging strictly to the specified mosque.
   */
  private async getOwned(mosqueId: string, id: string) {
    const row = await this.prisma.event.findFirst({
      where: { id, mosqueId, deletedAt: null },
    });

    if (!row) {
      throw new NotFoundException('Event not found.');
    }

    return row;
  }

  /**
   * Derive a unique slug within the mosque.
   */
  private async resolveUniqueSlug(
    mosqueId: string,
    suppliedSlug?: string,
    title?: string,
  ): Promise<string> {
    let baseSlug = suppliedSlug ? slugify(suppliedSlug) : slugify(title || 'event');
    if (!baseSlug) {
      baseSlug = 'event';
    }

    let candidate = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.event.findFirst({
        where: { mosqueId, slug: candidate },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }

      counter++;
      candidate = `${baseSlug}-${counter}`;
    }
  }
}
