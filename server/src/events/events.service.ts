import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditLogService } from '../audit/audit-log.service';
import { buildPage, toSkipTake } from '../common/pagination/page';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { fromDateOnly, toDateOnly } from '../common/utils/date-only';
import { todayInZone } from '../prayer-times/prayer-time.utils';
import { slugify } from '../common/utils/slug';
import { PrismaService } from '../prisma/prisma.service';
import {
  CheckInResponseDto,
  CreateEventDto,
  EventCategory,
  EventDto,
  EventRegistrationDto,
  EventStatus,
  FindRegistrationsQueryDto,
  ListEventRegistrationsQueryDto,
  ListEventsQueryDto,
  MyEventRegistrationDto,
  MyRegistrationsQueryDto,
  PaginatedEventsDto,
  PaginatedEventRegistrationsDto,
  PaginatedMyRegistrationsDto,
  PaginatedRegistrationsDto,
  RegistrationStatus,
  UpdateEventDto,
  UpdateRegistrationDto,
  VerifyTicketResponseDto,
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
   * Resolve the mosque ID for a request.
   * If mosqueId is provided, use it. Otherwise, return the first/primary mosque.
   * This allows unauthenticated users to see the default mosque's events.
   */
  private async resolveMosqueId(mosqueId: string | undefined): Promise<string> {
    if (mosqueId) {
      return mosqueId;
    }

    // For unauthenticated requests, find the first/primary mosque
    const mosque = await this.prisma.mosque.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!mosque) {
      throw new Error('No mosque found in the system.');
    }

    return mosque.id;
  }

  /**
   * List mosque events.
   * Returns a standard paginated envelope (or all events when query.all is true).
   * For unauthenticated users, returns events from the primary mosque.
   */
  async findAll(
    mosqueId: string | undefined,
    query: ListEventsQueryDto = {},
  ): Promise<PaginatedEventsDto | EventDto[]> {
    const resolvedMosqueId = await this.resolveMosqueId(mosqueId);
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayDate = toDateOnly(todayStr);

    const where: Prisma.EventWhereInput = {
      mosqueId: resolvedMosqueId,
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

    const orderBy: Prisma.EventOrderByWithRelationInput[] = [{ date: 'asc' }, { startTime: 'asc' }];

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
   * For unauthenticated users, finds events from the primary mosque.
   */
  async findOne(mosqueId: string | undefined, idOrSlug: string): Promise<EventDto> {
    const resolvedMosqueId = await this.resolveMosqueId(mosqueId);
    const isUuid = UUID_REGEX.test(idOrSlug);
    const where: Prisma.EventWhereInput = {
      mosqueId: resolvedMosqueId,
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
        contribution:
          dto.contribution !== undefined && dto.contribution !== null
            ? new Prisma.Decimal(dto.contribution)
            : null,
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
        ...(dto.registrationRequired !== undefined && {
          registrationRequired: dto.registrationRequired,
        }),
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
   * List the current user's own event registrations.
   *
   * Ownership and tenancy are enforced from the authenticated actor only:
   * no userId may be supplied by the client.
   */
  async findMyRegistrations(
    actor: AuthenticatedUser,
    query: MyRegistrationsQueryDto = {},
  ): Promise<PaginatedMyRegistrationsDto | MyEventRegistrationDto[]> {
    const mosque = await this.prisma.mosque.findUnique({
      where: { id: actor.mosqueId },
      select: { timezone: true },
    });
    const timezone = mosque?.timezone;
    const now = new Date();
    const todayDate = toDateOnly(todayInZone(timezone, now));

    const where: Prisma.EventRegistrationWhereInput = {
      mosqueId: actor.mosqueId,
      userId: actor.id,
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    } else {
      where.status = { not: RegistrationStatus.cancelled };
    }

    const eventWhere: Prisma.EventWhereInput = { deletedAt: null };

    if (query.timeframe) {
      const tf = query.timeframe.toLowerCase();
      if (tf === 'upcoming') {
        eventWhere.date = { gte: todayDate };
      } else if (tf === 'past') {
        eventWhere.date = { lt: todayDate };
      }
    }

    where.event = eventWhere;

    const orderBy: Prisma.EventRegistrationOrderByWithRelationInput[] = [
      { event: { date: 'desc' } },
      { registeredAt: 'desc' },
    ];

    if (query.all) {
      const rows = await this.prisma.eventRegistration.findMany({
        where,
        include: { event: true },
        orderBy,
      });
      const checkInMap = await this.getCheckInMap(
        actor.mosqueId,
        rows.map((r) => r.id),
      );
      return rows.map((row) =>
        this.toMyRegistrationDto(row, timezone, now, checkInMap.get(row.id)),
      );
    }

    const { skip, take } = toSkipTake(query);
    const [total, rows] = await Promise.all([
      this.prisma.eventRegistration.count({ where }),
      this.prisma.eventRegistration.findMany({
        where,
        include: { event: true },
        orderBy,
        skip,
        take,
      }),
    ]);

    const checkInMap = await this.getCheckInMap(
      actor.mosqueId,
      rows.map((r) => r.id),
    );
    const items = rows.map((row) =>
      this.toMyRegistrationDto(row, timezone, now, checkInMap.get(row.id)),
    );
    return buildPage(items, total, query);
  }

  /**
   * List registrations for a single event — admin view.
   *
   * The event is first resolved strictly within the requesting admin's mosque, so an admin can
   * never read another mosque's registrations by supplying its event id. Cancelled registrations
   * are excluded unless explicitly requested, mirroring the rule the confirmed-count query applies.
   */
  async listRegistrations(
    actor: AuthenticatedUser,
    eventId: string,
    query: ListEventRegistrationsQueryDto = {},
  ): Promise<PaginatedEventRegistrationsDto | EventRegistrationDto[]> {
    const event = await this.getOwned(actor.mosqueId, eventId);

    const where: Prisma.EventRegistrationWhereInput = {
      eventId: event.id,
      mosqueId: actor.mosqueId,
      deletedAt: null,
      ...(query.status !== undefined
        ? { status: query.status }
        : { status: { not: RegistrationStatus.cancelled } }),
    };

    const orderBy: Prisma.EventRegistrationOrderByWithRelationInput[] = [{ registeredAt: 'desc' }];

    if (query.all) {
      const rows = await this.prisma.eventRegistration.findMany({ where, orderBy });
      return rows.map((row) =>
        EventRegistrationDto.from(row, event.title, fromDateOnly(event.date)),
      );
    }

    const { skip, take } = toSkipTake(query);
    const [total, rows] = await Promise.all([
      this.prisma.eventRegistration.count({ where }),
      this.prisma.eventRegistration.findMany({ where, orderBy, skip, take }),
    ]);

    const items = rows.map((row) =>
      EventRegistrationDto.from(row, event.title, fromDateOnly(event.date)),
    );
    return buildPage(items, total, query);
  }

  /**
   * List all event registrations across every event — mosque admin view.
   * Scoped to the authenticated admin's mosque.
   */
  async findAllRegistrations(
    actor: AuthenticatedUser,
    query: FindRegistrationsQueryDto = {},
  ): Promise<PaginatedRegistrationsDto | EventRegistrationDto[]> {
    const where: Prisma.EventRegistrationWhereInput = {
      mosqueId: actor.mosqueId,
      deletedAt: null,
    };

    const targetEvent = query.eventId || (query.event && query.event !== 'all' ? query.event : undefined);
    if (targetEvent) {
      const isUuid = UUID_REGEX.test(targetEvent);
      if (isUuid) {
        where.eventId = targetEvent;
      } else {
        where.event = { slug: targetEvent, deletedAt: null };
      }
    }

    if (query.status && query.status !== 'all') {
      const lower = query.status.toLowerCase() as RegistrationStatus;
      if (Object.values(RegistrationStatus).includes(lower)) {
        where.status = lower;
      }
    }

    if (query.from) {
      const fromDate = new Date(query.from);
      if (!isNaN(fromDate.getTime())) {
        where.registeredAt = { ...((where.registeredAt as Prisma.DateTimeFilter) || {}), gte: fromDate };
      }
    }

    if (query.to) {
      const toDate = new Date(query.to);
      if (!isNaN(toDate.getTime())) {
        where.registeredAt = { ...((where.registeredAt as Prisma.DateTimeFilter) || {}), lte: toDate };
      }
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      const isUuid = UUID_REGEX.test(term);
      where.OR = [
        { participantName: { contains: term, mode: 'insensitive' } },
        { participantEmail: { contains: term, mode: 'insensitive' } },
        { participantPhone: { contains: term, mode: 'insensitive' } },
        { event: { title: { contains: term, mode: 'insensitive' } } },
        ...(isUuid ? [{ id: term }] : []),
      ];
    }

    const orderBy: Prisma.EventRegistrationOrderByWithRelationInput[] = [{ registeredAt: 'desc' }];
    const include = {
      event: { select: { id: true, title: true, date: true } },
    };

    if (query.all) {
      const rows = await this.prisma.eventRegistration.findMany({ where, orderBy, include });
      const checkInMap = await this.getCheckInMap(
        actor.mosqueId,
        rows.map((r) => r.id),
      );
      return rows.map((r) =>
        EventRegistrationDto.from(
          r,
          r.event.title,
          fromDateOnly(r.event.date),
          checkInMap.get(r.id),
        ),
      );
    }

    const { skip, take } = toSkipTake(query);
    const [total, rows] = await Promise.all([
      this.prisma.eventRegistration.count({ where }),
      this.prisma.eventRegistration.findMany({ where, orderBy, include, skip, take }),
    ]);

    const checkInMap = await this.getCheckInMap(
      actor.mosqueId,
      rows.map((r) => r.id),
    );
    const items = rows.map((r) =>
      EventRegistrationDto.from(
        r,
        r.event.title,
        fromDateOnly(r.event.date),
        checkInMap.get(r.id),
      ),
    );
    return buildPage(items, total, query);
  }

  /**
   * Get single registration by ID within the mosque.
   */
  async getRegistration(actor: AuthenticatedUser, id: string): Promise<EventRegistrationDto> {
    const isUuid = UUID_REGEX.test(id);
    if (!isUuid) {
      throw new BadRequestException('Invalid registration ID format.');
    }

    const row = await this.prisma.eventRegistration.findFirst({
      where: {
        id,
        mosqueId: actor.mosqueId,
        deletedAt: null,
      },
      include: {
        event: { select: { id: true, title: true, date: true } },
      },
    });

    if (!row) {
      throw new NotFoundException('Registration not found.');
    }

    const checkIn = await this.getCheckInInfo(actor.mosqueId, row.id);
    return EventRegistrationDto.from(
      row,
      row.event.title,
      fromDateOnly(row.event.date),
      checkIn,
    );
  }

  /**
   * Update a registration's status, guests, or notes.
   */
  async updateRegistration(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateRegistrationDto,
  ): Promise<EventRegistrationDto> {
    const isUuid = UUID_REGEX.test(id);
    if (!isUuid) {
      throw new BadRequestException('Invalid registration ID format.');
    }

    const row = await this.prisma.eventRegistration.findFirst({
      where: {
        id,
        mosqueId: actor.mosqueId,
        deletedAt: null,
      },
      include: {
        event: { select: { id: true, title: true, date: true } },
      },
    });

    if (!row) {
      throw new NotFoundException('Registration not found.');
    }

    const updated = await this.prisma.eventRegistration.update({
      where: { id: row.id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.guests !== undefined ? { guests: dto.guests } : {}),
        ...(dto.specialRequirements !== undefined ? { specialRequirements: dto.specialRequirements } : {}),
      },
      include: {
        event: { select: { id: true, title: true, date: true } },
      },
    });

    await this.audit.record({
      mosqueId: actor.mosqueId,
      actorId: actor.id,
      actorName: actor.email,
      action: 'EVENT_REGISTRATION_UPDATED',
      resource: 'event_registration',
      resourceId: row.id,
      changes: { status: updated.status, guests: updated.guests },
    });

    const checkIn = await this.getCheckInInfo(actor.mosqueId, row.id);
    return EventRegistrationDto.from(
      updated,
      updated.event.title,
      fromDateOnly(updated.event.date),
      checkIn,
    );
  }

  /**
   * Cancel / soft delete a registration.
   */
  async deleteRegistration(
    actor: AuthenticatedUser,
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const isUuid = UUID_REGEX.test(id);
    if (!isUuid) {
      throw new BadRequestException('Invalid registration ID format.');
    }

    const row = await this.prisma.eventRegistration.findFirst({
      where: {
        id,
        mosqueId: actor.mosqueId,
        deletedAt: null,
      },
    });

    if (!row) {
      throw new NotFoundException('Registration not found.');
    }

    await this.prisma.eventRegistration.update({
      where: { id: row.id },
      data: { deletedAt: new Date(), status: RegistrationStatus.cancelled },
    });

    await this.audit.record({
      mosqueId: actor.mosqueId,
      actorId: actor.id,
      actorName: actor.email,
      action: 'EVENT_REGISTRATION_CANCELLED',
      resource: 'event_registration',
      resourceId: row.id,
    });

    return { success: true, message: 'Registration cancelled.' };
  }

  /**
   * Register the current user for an event.
   *
   * The caller's own mosque and user id are the only source of truth for ownership and tenancy.
   */
  async registerCurrentUser(
    actor: AuthenticatedUser,
    eventIdOrSlug: string,
  ): Promise<MyEventRegistrationDto> {
    const isUuid = UUID_REGEX.test(eventIdOrSlug);
    const event = await this.prisma.event.findFirst({
      where: {
        ...(isUuid ? { id: eventIdOrSlug } : { slug: eventIdOrSlug }),
        mosqueId: actor.mosqueId,
        deletedAt: null,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found.');
    }

    if (!event.isPublished) {
      throw new BadRequestException('This event is not open for registration.');
    }

    if (event.status === EventStatus.cancelled) {
      throw new BadRequestException('This event has been cancelled.');
    }

    const eventId = event.id;

    if (event.registrationRequired) {
      const confirmedCount = await this.prisma.eventRegistration.count({
        where: {
          eventId,
          mosqueId: actor.mosqueId,
          status: RegistrationStatus.confirmed,
          deletedAt: null,
        },
      });

      if (confirmedCount >= event.capacity) {
        throw new ConflictException('This event is full.');
      }
    }

    const existing = await this.prisma.eventRegistration.findFirst({
      where: {
        eventId,
        userId: actor.id,
        mosqueId: actor.mosqueId,
        status: { not: RegistrationStatus.cancelled },
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException('You are already registered for this event.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: { fullName: true, email: true, phone: true },
    });

    const row = await this.prisma.eventRegistration.create({
      data: {
        mosqueId: actor.mosqueId,
        eventId,
        userId: actor.id,
        participantName: user?.fullName?.trim() || actor.email,
        participantEmail: user?.email?.trim() || null,
        participantPhone: user?.phone?.trim() || null,
        guests: 0,
        status: RegistrationStatus.confirmed,
      },
      include: { event: true },
    });

    await this.audit.record({
      action: 'EVENT_REGISTERED',
      resource: 'event_registration',
      resourceId: row.id,
      actorId: actor.id,
      actorName: actor.email,
      mosqueId: actor.mosqueId,
      changes: {
        eventId,
        eventTitle: event.title,
        eventDate: fromDateOnly(event.date),
      },
    });

    const mosque = await this.prisma.mosque.findUnique({
      where: { id: actor.mosqueId },
      select: { timezone: true },
    });

    return this.toMyRegistrationDto(row, mosque?.timezone, new Date());
  }

  private async getCheckInMap(
    mosqueId: string,
    registrationIds: string[],
  ): Promise<Map<string, { isCheckedIn: boolean; checkedInAt: string; checkedInByName: string }>> {
    const map = new Map<
      string,
      { isCheckedIn: boolean; checkedInAt: string; checkedInByName: string }
    >();
    if (!registrationIds.length) return map;

    const logs = await this.prisma.auditLog.findMany({
      where: {
        mosqueId,
        resource: 'event_registration',
        resourceId: { in: registrationIds },
        action: 'EVENT_CHECKED_IN',
      },
      select: { resourceId: true, createdAt: true, actorName: true },
      orderBy: { createdAt: 'desc' },
    });

    for (const log of logs) {
      if (log.resourceId && !map.has(log.resourceId)) {
        map.set(log.resourceId, {
          isCheckedIn: true,
          checkedInAt: log.createdAt.toISOString(),
          checkedInByName: log.actorName,
        });
      }
    }
    return map;
  }

  private async getCheckInInfo(
    mosqueId: string,
    registrationId: string,
  ): Promise<{ isCheckedIn: boolean; checkedInAt: string | null; checkedInByName: string | null }> {
    const log = await this.prisma.auditLog.findFirst({
      where: {
        mosqueId,
        resource: 'event_registration',
        resourceId: registrationId,
        action: 'EVENT_CHECKED_IN',
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, actorName: true },
    });

    if (!log) {
      return { isCheckedIn: false, checkedInAt: null, checkedInByName: null };
    }

    return {
      isCheckedIn: true,
      checkedInAt: log.createdAt.toISOString(),
      checkedInByName: log.actorName,
    };
  }

  /**
   * Look up a single registration for the current authenticated user.
   * idOrEventId may be either the registration UUID or the event UUID / slug.
   */
  async findMyRegistration(
    actor: AuthenticatedUser,
    idOrEventId: string,
  ): Promise<MyEventRegistrationDto> {
    const isUuid = UUID_REGEX.test(idOrEventId);

    // First try finding by registration id directly
    let row = isUuid
      ? await this.prisma.eventRegistration.findFirst({
          where: {
            id: idOrEventId,
            userId: actor.id,
            mosqueId: actor.mosqueId,
            deletedAt: null,
          },
          include: { event: true },
        })
      : null;

    // If not found, try finding by event id or slug
    if (!row) {
      const event = await this.prisma.event.findFirst({
        where: {
          ...(isUuid ? { id: idOrEventId } : { slug: idOrEventId }),
          mosqueId: actor.mosqueId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (event) {
        row = await this.prisma.eventRegistration.findFirst({
          where: {
            eventId: event.id,
            userId: actor.id,
            mosqueId: actor.mosqueId,
            deletedAt: null,
          },
          include: { event: true },
        });
      }
    }

    if (!row) {
      throw new NotFoundException('Registration not found for this event.');
    }

    const mosque = await this.prisma.mosque.findUnique({
      where: { id: actor.mosqueId },
      select: { timezone: true },
    });

    const checkInInfo = await this.getCheckInInfo(actor.mosqueId, row.id);
    return this.toMyRegistrationDto(row, mosque?.timezone, new Date(), checkInInfo);
  }

  /**
   * Verify an event registration ticket (for scanning / verification pass).
   */
  async verifyTicket(
    callerMosqueId: string | undefined,
    registrationId: string,
  ): Promise<VerifyTicketResponseDto> {
    const isUuid = UUID_REGEX.test(registrationId);
    if (!isUuid) {
      throw new BadRequestException('Invalid ticket identifier format.');
    }

    const row = await this.prisma.eventRegistration.findFirst({
      where: {
        id: registrationId,
        deletedAt: null,
      },
      include: { event: true },
    });

    if (!row) {
      throw new NotFoundException('Ticket not found or registration does not exist.');
    }

    // Enforce cross-mosque isolation if caller is authenticated with a mosque context
    if (callerMosqueId && row.mosqueId !== callerMosqueId) {
      throw new ForbiddenException('This ticket belongs to a different mosque.');
    }

    const checkInInfo = await this.getCheckInInfo(row.mosqueId, row.id);

    let valid = true;
    let message = 'Valid event ticket.';

    if (row.status === RegistrationStatus.cancelled) {
      valid = false;
      message = 'This registration has been cancelled.';
    } else if (row.event.status === EventStatus.cancelled) {
      valid = false;
      message = 'This event has been cancelled.';
    } else if (checkInInfo.isCheckedIn) {
      valid = true;
      message = 'Already checked in.';
    }

    return {
      valid,
      message,
      registrationId: row.id,
      participantName: row.participantName,
      participantEmail: row.participantEmail,
      guests: row.guests,
      status: row.status,
      registeredAt: row.registeredAt.toISOString(),
      isCheckedIn: checkInInfo.isCheckedIn,
      checkedInAt: checkInInfo.checkedInAt,
      checkedInByName: checkInInfo.checkedInByName,
      event: EventDto.from(row.event, 0),
    };
  }

  /**
   * Check in a participant by registration id.
   * Requires authorized mosque staff.
   */
  async checkInTicket(
    actor: AuthenticatedUser,
    registrationId: string,
  ): Promise<CheckInResponseDto> {
    const isUuid = UUID_REGEX.test(registrationId);
    if (!isUuid) {
      throw new BadRequestException('Invalid registration ID format.');
    }

    const row = await this.prisma.eventRegistration.findFirst({
      where: {
        id: registrationId,
        deletedAt: null,
      },
      include: { event: true },
    });

    if (!row) {
      throw new NotFoundException('Registration not found.');
    }

    // Cross-mosque security check
    if (row.mosqueId !== actor.mosqueId) {
      throw new ForbiddenException('This ticket belongs to a different mosque.');
    }

    if (row.status === RegistrationStatus.cancelled) {
      throw new BadRequestException('Cannot check in a cancelled registration.');
    }

    if (row.event.status === EventStatus.cancelled) {
      throw new BadRequestException('Cannot check in to a cancelled event.');
    }

    // Atomically check if already checked in
    const existingCheckIn = await this.prisma.auditLog.findFirst({
      where: {
        mosqueId: actor.mosqueId,
        resource: 'event_registration',
        resourceId: row.id,
        action: 'EVENT_CHECKED_IN',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingCheckIn) {
      return {
        success: false,
        alreadyCheckedIn: true,
        message: 'Participant was already checked in.',
        checkedInAt: existingCheckIn.createdAt.toISOString(),
        checkedInByName: existingCheckIn.actorName,
        registrationId: row.id,
        participantName: row.participantName,
        eventTitle: row.event.title,
      };
    }

    const now = new Date();

    // Record check-in in AuditLog
    await this.audit.record({
      action: 'EVENT_CHECKED_IN',
      resource: 'event_registration',
      resourceId: row.id,
      actorId: actor.id,
      actorName: actor.email,
      mosqueId: actor.mosqueId,
      changes: {
        registrationId: row.id,
        eventId: row.eventId,
        eventTitle: row.event.title,
        participantName: row.participantName,
        guests: row.guests,
        checkedInAt: now.toISOString(),
      },
    });

    return {
      success: true,
      alreadyCheckedIn: false,
      message: 'Check-in confirmed successfully.',
      checkedInAt: now.toISOString(),
      checkedInByName: actor.email,
      registrationId: row.id,
      participantName: row.participantName,
      eventTitle: row.event.title,
    };
  }

  /**
   * Map a registration row (with its event) to the user-facing DTO.
   */
  private toMyRegistrationDto(
    row: Prisma.EventRegistrationGetPayload<{ include: { event: true } }>,
    timezone: string | null | undefined,
    now: Date,
    checkInInfo?: {
      isCheckedIn: boolean;
      checkedInAt: string | null;
      checkedInByName: string | null;
    } | null,
  ): MyEventRegistrationDto {
    const { date: nowDate, time: nowTime } = this.nowInZone(timezone, now);
    const eventDate = fromDateOnly(row.event.date);

    const isPast = eventDate < nowDate || (eventDate === nowDate && row.event.startTime <= nowTime);

    return {
      registrationId: row.id,
      registrationStatus: row.status,
      guests: row.guests,
      registeredAt: row.registeredAt.toISOString(),
      isPast,
      isCheckedIn: checkInInfo?.isCheckedIn ?? false,
      checkedInAt: checkInInfo?.checkedInAt ?? null,
      checkedInByName: checkInInfo?.checkedInByName ?? null,
      event: EventDto.from(row.event, 0),
    };
  }

  /**
   * Current calendar date and wall-clock time in a mosque's timezone.
   */
  private nowInZone(
    timezone: string | null | undefined,
    now: Date,
  ): { date: string; time: string } {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone || undefined,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };

    const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(now);
    const partOf = (type: string) => parts.find((p) => p.type === type)?.value ?? '';

    return {
      date: `${partOf('year')}-${partOf('month')}-${partOf('day')}`,
      time: `${partOf('hour')}:${partOf('minute')}`,
    };
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
