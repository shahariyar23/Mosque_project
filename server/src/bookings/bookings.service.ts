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
import { PrismaService } from '../prisma/prisma.service';
import {
  BookingDto,
  BookingStatsDto,
  BookingStatus,
  CreateBookingDto,
  ListBookingsQueryDto,
  PaginatedBookingsDto,
  UpdateBookingDto,
  UpdateBookingStatusDto,
} from './dto/booking.dto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  /**
   * List mosque booking requests with filters, search, and pagination.
   */
  async findAll(
    mosqueId: string,
    query: ListBookingsQueryDto = {},
  ): Promise<PaginatedBookingsDto | BookingDto[]> {
    const where: Prisma.BookingWhereInput = {
      mosqueId,
      deletedAt: null,
      ...(query.serviceId && { serviceId: query.serviceId }),
      ...(query.status !== undefined && { status: query.status }),
      ...(query.category !== undefined && {
        service: {
          category: query.category,
        },
      }),
      ...(query.search && {
        OR: [
          { requesterName: { contains: query.search.trim(), mode: 'insensitive' } },
          { requesterPhone: { contains: query.search.trim(), mode: 'insensitive' } },
          { requesterEmail: { contains: query.search.trim(), mode: 'insensitive' } },
          { memberId: { contains: query.search.trim(), mode: 'insensitive' } },
          { location: { contains: query.search.trim(), mode: 'insensitive' } },
          { notes: { contains: query.search.trim(), mode: 'insensitive' } },
          { service: { name: { contains: query.search.trim(), mode: 'insensitive' } } },
        ],
      }),
    };

    // Date range filtering on scheduledDate
    if (query.from && query.to) {
      where.scheduledDate = { gte: toDateOnly(query.from), lte: toDateOnly(query.to) };
    } else if (query.from) {
      where.scheduledDate = { gte: toDateOnly(query.from) };
    } else if (query.to) {
      where.scheduledDate = { lte: toDateOnly(query.to) };
    }

    const orderBy: Prisma.BookingOrderByWithRelationInput[] = [
      { scheduledDate: 'desc' },
      { submittedAt: 'desc' },
    ];

    if (query.all) {
      const rows = await this.prisma.booking.findMany({
        where,
        orderBy,
        include: {
          service: {
            select: { name: true, category: true },
          },
        },
      });

      return rows.map((r) => BookingDto.from(r));
    }

    const { skip, take } = toSkipTake(query);

    const [total, rows] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          service: {
            select: { name: true, category: true },
          },
        },
      }),
    ]);

    const items = rows.map((r) => BookingDto.from(r));
    return buildPage(items, total, query);
  }

  /**
   * Get dynamic statistics calculated from PostgreSQL for the Bookings dashboard.
   */
  async getStats(mosqueId: string): Promise<BookingStatsDto> {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayDate = toDateOnly(todayStr);

    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysDate = toDateOnly(in7Days.toISOString().slice(0, 10));

    const [total, pending, confirmed, thisWeek] = await Promise.all([
      this.prisma.booking.count({
        where: { mosqueId, deletedAt: null },
      }),
      this.prisma.booking.count({
        where: { mosqueId, status: BookingStatus.pending, deletedAt: null },
      }),
      this.prisma.booking.count({
        where: { mosqueId, status: BookingStatus.confirmed, deletedAt: null },
      }),
      this.prisma.booking.count({
        where: {
          mosqueId,
          scheduledDate: { gte: todayDate, lte: in7DaysDate },
          deletedAt: null,
        },
      }),
    ]);

    return {
      total,
      pending,
      confirmed,
      thisWeek,
    };
  }

  /**
   * Find a single booking by UUID ID.
   */
  async findOne(mosqueId: string, id: string): Promise<BookingDto> {
    if (!UUID_REGEX.test(id)) {
      throw new NotFoundException(`Booking '${id}' not found.`);
    }

    const row = await this.prisma.booking.findFirst({
      where: {
        id,
        mosqueId,
        deletedAt: null,
      },
      include: {
        service: {
          select: { name: true, category: true },
        },
      },
    });

    if (!row) {
      throw new NotFoundException(`Booking '${id}' not found.`);
    }

    return BookingDto.from(row);
  }

  /**
   * Create a new booking request.
   */
  async create(user: AuthenticatedUser, dto: CreateBookingDto): Promise<BookingDto> {
    // 1. Verify service exists and is active
    const service = await this.prisma.service.findFirst({
      where: {
        id: dto.serviceId,
        mosqueId: user.mosqueId,
        deletedAt: null,
      },
    });

    if (!service) {
      throw new BadRequestException('Service not found.');
    }

    if (service.status !== 'active') {
      throw new BadRequestException(`Service "${service.name}" is currently ${service.status} and cannot accept new bookings.`);
    }

    // 2. Validate user if given
    if (dto.userId) {
      const existingUser = await this.prisma.user.findFirst({
        where: { id: dto.userId, mosqueId: user.mosqueId, deletedAt: null },
      });
      if (!existingUser) {
        throw new BadRequestException('Requester user account not found in this mosque.');
      }
    }

    // 3. Validate assigned staff if given
    if (dto.assignedToId) {
      const assignedUser = await this.prisma.user.findFirst({
        where: { id: dto.assignedToId, mosqueId: user.mosqueId, deletedAt: null },
      });
      if (!assignedUser) {
        throw new BadRequestException('Assigned staff member not found in this mosque.');
      }
    }

    const scheduledDateObj = toDateOnly(dto.scheduledDate);

    // 4. Duplicate / conflict check
    const existingConflict = await this.prisma.booking.findFirst({
      where: {
        mosqueId: user.mosqueId,
        serviceId: dto.serviceId,
        scheduledDate: scheduledDateObj,
        ...(dto.scheduledTime ? { scheduledTime: dto.scheduledTime } : {}),
        requesterPhone: dto.requesterPhone.trim(),
        status: { notIn: [BookingStatus.cancelled, BookingStatus.declined] },
        deletedAt: null,
      },
    });

    if (existingConflict) {
      throw new ConflictException(
        `A booking request for "${service.name}" on ${dto.scheduledDate} already exists for this phone number.`,
      );
    }

    const resolvedFee = dto.fee !== undefined ? dto.fee : service.fee;

    const created = await this.prisma.booking.create({
      data: {
        mosqueId: user.mosqueId,
        serviceId: dto.serviceId,
        userId: dto.userId || null,
        requesterName: dto.requesterName.trim(),
        requesterPhone: dto.requesterPhone.trim(),
        requesterEmail: dto.requesterEmail?.trim() || null,
        memberId: dto.memberId?.trim() || null,
        status: dto.status ?? BookingStatus.pending,
        scheduledDate: scheduledDateObj,
        scheduledTime: dto.scheduledTime?.trim() || null,
        location: dto.location.trim(),
        partySize: dto.partySize ?? 0,
        fee: resolvedFee,
        assignedTo: dto.assignedTo?.trim() || service.coordinator,
        assignedToId: dto.assignedToId || service.coordinatorId,
        notes: dto.notes?.trim() || null,
        submittedAt: new Date(),
      },
      include: {
        service: {
          select: { name: true, category: true },
        },
      },
    });

    await this.audit.record({
      mosqueId: user.mosqueId,
      actorId: user.id,
      actorName: user.email,
      actorRole: user.role,
      action: 'BOOKING_CREATED',
      resource: 'booking',
      resourceId: created.id,
      changes: {
        serviceName: service.name,
        requesterName: created.requesterName,
        scheduledDate: dto.scheduledDate,
        status: created.status,
      },
    });

    return BookingDto.from(created);
  }

  /**
   * Update an existing booking.
   */
  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateBookingDto,
  ): Promise<BookingDto> {
    const existing = await this.prisma.booking.findFirst({
      where: { id, mosqueId: user.mosqueId, deletedAt: null },
      include: {
        service: {
          select: { name: true, category: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Booking '${id}' not found.`);
    }

    if (dto.serviceId && dto.serviceId !== existing.serviceId) {
      const service = await this.prisma.service.findFirst({
        where: { id: dto.serviceId, mosqueId: user.mosqueId, deletedAt: null },
      });
      if (!service) {
        throw new BadRequestException('Specified service not found.');
      }
    }

    if (dto.userId) {
      const u = await this.prisma.user.findFirst({
        where: { id: dto.userId, mosqueId: user.mosqueId, deletedAt: null },
      });
      if (!u) {
        throw new BadRequestException('Specified user not found in this mosque.');
      }
    }

    if (dto.assignedToId) {
      const assigned = await this.prisma.user.findFirst({
        where: { id: dto.assignedToId, mosqueId: user.mosqueId, deletedAt: null },
      });
      if (!assigned) {
        throw new BadRequestException('Assigned staff member not found.');
      }
    }

    const updated = await this.prisma.booking.update({
      where: { id: existing.id },
      data: {
        ...(dto.serviceId !== undefined && { serviceId: dto.serviceId }),
        ...(dto.requesterName !== undefined && { requesterName: dto.requesterName.trim() }),
        ...(dto.requesterPhone !== undefined && { requesterPhone: dto.requesterPhone.trim() }),
        ...(dto.requesterEmail !== undefined && { requesterEmail: dto.requesterEmail?.trim() || null }),
        ...(dto.memberId !== undefined && { memberId: dto.memberId?.trim() || null }),
        ...(dto.scheduledDate !== undefined && { scheduledDate: toDateOnly(dto.scheduledDate) }),
        ...(dto.scheduledTime !== undefined && { scheduledTime: dto.scheduledTime?.trim() || null }),
        ...(dto.location !== undefined && { location: dto.location.trim() }),
        ...(dto.partySize !== undefined && { partySize: dto.partySize }),
        ...(dto.fee !== undefined && { fee: dto.fee }),
        ...(dto.assignedTo !== undefined && { assignedTo: dto.assignedTo?.trim() || null }),
        ...(dto.assignedToId !== undefined && { assignedToId: dto.assignedToId || null }),
        ...(dto.notes !== undefined && { notes: dto.notes?.trim() || null }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: {
        service: {
          select: { name: true, category: true },
        },
      },
    });

    await this.audit.record({
      mosqueId: user.mosqueId,
      actorId: user.id,
      actorName: user.email,
      actorRole: user.role,
      action: 'BOOKING_UPDATED',
      resource: 'booking',
      resourceId: updated.id,
      changes: dto as unknown as Record<string, unknown>,
    });

    return BookingDto.from(updated);
  }

  /**
   * Update booking status with transition validation.
   */
  async updateStatus(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateBookingStatusDto,
  ): Promise<BookingDto> {
    const existing = await this.prisma.booking.findFirst({
      where: { id, mosqueId: user.mosqueId, deletedAt: null },
      include: {
        service: {
          select: { name: true, category: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Booking '${id}' not found.`);
    }

    const updated = await this.prisma.booking.update({
      where: { id: existing.id },
      data: {
        status: dto.status,
      },
      include: {
        service: {
          select: { name: true, category: true },
        },
      },
    });

    await this.audit.record({
      mosqueId: user.mosqueId,
      actorId: user.id,
      actorName: user.email,
      actorRole: user.role,
      action: 'BOOKING_STATUS_CHANGED',
      resource: 'booking',
      resourceId: updated.id,
      changes: {
        previousStatus: existing.status,
        newStatus: dto.status,
      },
      note: dto.reason || undefined,
    });

    return BookingDto.from(updated);
  }

  /**
   * Soft-delete / cancel a booking.
   */
  async remove(user: AuthenticatedUser, id: string): Promise<BookingDto> {
    const existing = await this.prisma.booking.findFirst({
      where: { id, mosqueId: user.mosqueId, deletedAt: null },
      include: {
        service: {
          select: { name: true, category: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Booking '${id}' not found.`);
    }

    const updated = await this.prisma.booking.update({
      where: { id: existing.id },
      data: {
        status: BookingStatus.cancelled,
        deletedAt: new Date(),
      },
      include: {
        service: {
          select: { name: true, category: true },
        },
      },
    });

    await this.audit.record({
      mosqueId: user.mosqueId,
      actorId: user.id,
      actorName: user.email,
      actorRole: user.role,
      action: 'BOOKING_DELETED',
      resource: 'booking',
      resourceId: updated.id,
      note: `Cancelled and removed booking for ${updated.requesterName}`,
    });

    return BookingDto.from(updated);
  }
}

