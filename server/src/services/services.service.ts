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
import { slugify } from '../common/utils/slug';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateServiceDto,
  ListServicesQueryDto,
  PaginatedServicesDto,
  ServiceCategory,
  ServiceDto,
  ServiceStatsDto,
  ServiceStatus,
  UpdateServiceDto,
} from './dto/service.dto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  /**
   * List mosque services with search, category/status filters, and pagination.
   */
  async findAll(
    mosqueId: string,
    query: ListServicesQueryDto = {},
  ): Promise<PaginatedServicesDto | ServiceDto[]> {
    const where: Prisma.ServiceWhereInput = {
      mosqueId,
      deletedAt: null,
      ...(query.category !== undefined && { category: query.category }),
      ...(query.status !== undefined && { status: query.status }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search.trim(), mode: 'insensitive' } },
          { coordinator: { contains: query.search.trim(), mode: 'insensitive' } },
          { location: { contains: query.search.trim(), mode: 'insensitive' } },
          { summary: { contains: query.search.trim(), mode: 'insensitive' } },
          { description: { contains: query.search.trim(), mode: 'insensitive' } },
        ],
      }),
    };

    const orderBy: Prisma.ServiceOrderByWithRelationInput[] = [
      { status: 'asc' },
      { createdAt: 'desc' },
    ];

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    if (query.all) {
      const rows = await this.prisma.service.findMany({
        where,
        orderBy,
        include: {
          bookings: {
            where: { deletedAt: null },
            select: { id: true, submittedAt: true },
          },
        },
      });

      return rows.map((row) => {
        const bookingsThisMonth = row.bookings.filter(
          (b) => b.submittedAt >= startOfMonth && b.submittedAt <= endOfMonth,
        ).length;
        return ServiceDto.from(row, bookingsThisMonth, row.bookings.length);
      });
    }

    const { skip, take } = toSkipTake(query);

    const [total, rows] = await Promise.all([
      this.prisma.service.count({ where }),
      this.prisma.service.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          bookings: {
            where: { deletedAt: null },
            select: { id: true, submittedAt: true },
          },
        },
      }),
    ]);

    const items = rows.map((row) => {
      const bookingsThisMonth = row.bookings.filter(
        (b) => b.submittedAt >= startOfMonth && b.submittedAt <= endOfMonth,
      ).length;
      return ServiceDto.from(row, bookingsThisMonth, row.bookings.length);
    });

    return buildPage(items, total, query);
  }

  /**
   * Get dynamic statistics calculated from PostgreSQL.
   */
  async getStats(mosqueId: string): Promise<ServiceStatsDto> {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    const [total, active, free, bookingsThisMonth] = await Promise.all([
      this.prisma.service.count({
        where: { mosqueId, deletedAt: null },
      }),
      this.prisma.service.count({
        where: { mosqueId, status: ServiceStatus.active, deletedAt: null },
      }),
      this.prisma.service.count({
        where: { mosqueId, status: ServiceStatus.active, fee: 0, deletedAt: null },
      }),
      this.prisma.booking.count({
        where: {
          mosqueId,
          submittedAt: { gte: startOfMonth, lte: endOfMonth },
          deletedAt: null,
        },
      }),
    ]);

    return {
      total,
      active,
      bookingsThisMonth,
      free,
    };
  }

  /**
   * Find a single service by UUID or URL slug.
   */
  async findOne(mosqueId: string, idOrSlug: string): Promise<ServiceDto> {
    const isUuid = UUID_REGEX.test(idOrSlug);
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    const row = await this.prisma.service.findFirst({
      where: {
        mosqueId,
        deletedAt: null,
        ...(isUuid ? { id: idOrSlug } : { slug: idOrSlug }),
      },
      include: {
        bookings: {
          where: { deletedAt: null },
          select: { id: true, submittedAt: true },
        },
      },
    });

    if (!row) {
      throw new NotFoundException(`Service '${idOrSlug}' not found.`);
    }

    const bookingsThisMonth = row.bookings.filter(
      (b) => b.submittedAt >= startOfMonth && b.submittedAt <= endOfMonth,
    ).length;

    return ServiceDto.from(row, bookingsThisMonth, row.bookings.length);
  }

  /**
   * Create a new service catalogue offering.
   */
  async create(user: AuthenticatedUser, dto: CreateServiceDto): Promise<ServiceDto> {
    if (dto.coordinatorId) {
      const coordinator = await this.prisma.user.findFirst({
        where: { id: dto.coordinatorId, mosqueId: user.mosqueId, deletedAt: null },
      });
      if (!coordinator) {
        throw new BadRequestException('Coordinator user not found in this mosque.');
      }
    }

    const baseSlug = dto.slug?.trim() || slugify(dto.name);
    let finalSlug = baseSlug;
    let suffix = 1;

    while (
      await this.prisma.service.findFirst({
        where: { mosqueId: user.mosqueId, slug: finalSlug },
      })
    ) {
      suffix += 1;
      finalSlug = `${baseSlug}-${suffix}`;
    }

    const created = await this.prisma.service.create({
      data: {
        mosqueId: user.mosqueId,
        name: dto.name.trim(),
        slug: finalSlug,
        category: dto.category,
        status: dto.status ?? ServiceStatus.active,
        summary: dto.summary.trim(),
        description: dto.description.trim(),
        coordinator: dto.coordinator.trim(),
        coordinatorId: dto.coordinatorId || null,
        contactPhone: dto.contactPhone.trim(),
        location: dto.location.trim(),
        availability: dto.availability.trim(),
        fee: dto.fee ?? 0,
        requiresBooking: dto.requiresBooking ?? true,
        turnaround: dto.turnaround.trim(),
      },
    });

    await this.audit.record({
      mosqueId: user.mosqueId,
      actorId: user.id,
      actorName: user.email,
      actorRole: user.role,
      action: 'SERVICE_CREATED',
      resource: 'service',
      resourceId: created.id,
      changes: {
        name: created.name,
        category: created.category,
        status: created.status,
        fee: created.fee.toString(),
      },
    });

    return ServiceDto.from(created, 0, 0);
  }

  /**
   * Update an existing service.
   */
  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateServiceDto,
  ): Promise<ServiceDto> {
    const existing = await this.prisma.service.findFirst({
      where: { id, mosqueId: user.mosqueId, deletedAt: null },
      include: {
        bookings: {
          where: { deletedAt: null },
          select: { id: true, submittedAt: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Service '${id}' not found.`);
    }

    if (dto.coordinatorId) {
      const coordinator = await this.prisma.user.findFirst({
        where: { id: dto.coordinatorId, mosqueId: user.mosqueId, deletedAt: null },
      });
      if (!coordinator) {
        throw new BadRequestException('Coordinator user not found in this mosque.');
      }
    }

    let slugToUse: string | undefined;
    if (dto.slug && dto.slug !== existing.slug) {
      const conflict = await this.prisma.service.findFirst({
        where: {
          mosqueId: user.mosqueId,
          slug: dto.slug,
          NOT: { id: existing.id },
        },
      });
      if (conflict) {
        throw new ConflictException(`Slug '${dto.slug}' is already in use by another service.`);
      }
      slugToUse = dto.slug;
    }

    const updated = await this.prisma.service.update({
      where: { id: existing.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(slugToUse !== undefined && { slug: slugToUse }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.summary !== undefined && { summary: dto.summary.trim() }),
        ...(dto.description !== undefined && { description: dto.description.trim() }),
        ...(dto.coordinator !== undefined && { coordinator: dto.coordinator.trim() }),
        ...(dto.coordinatorId !== undefined && { coordinatorId: dto.coordinatorId || null }),
        ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone.trim() }),
        ...(dto.location !== undefined && { location: dto.location.trim() }),
        ...(dto.availability !== undefined && { availability: dto.availability.trim() }),
        ...(dto.fee !== undefined && { fee: dto.fee }),
        ...(dto.requiresBooking !== undefined && { requiresBooking: dto.requiresBooking }),
        ...(dto.turnaround !== undefined && { turnaround: dto.turnaround.trim() }),
      },
      include: {
        bookings: {
          where: { deletedAt: null },
          select: { id: true, submittedAt: true },
        },
      },
    });

    await this.audit.record({
      mosqueId: user.mosqueId,
      actorId: user.id,
      actorName: user.email,
      actorRole: user.role,
      action: 'SERVICE_UPDATED',
      resource: 'service',
      resourceId: updated.id,
      changes: dto as unknown as Record<string, unknown>,
    });

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    const bookingsThisMonth = updated.bookings.filter(
      (b) => b.submittedAt >= startOfMonth && b.submittedAt <= endOfMonth,
    ).length;

    return ServiceDto.from(updated, bookingsThisMonth, updated.bookings.length);
  }

  /**
   * Soft-delete / deactivate a service.
   */
  async remove(user: AuthenticatedUser, id: string): Promise<ServiceDto> {
    const existing = await this.prisma.service.findFirst({
      where: { id, mosqueId: user.mosqueId, deletedAt: null },
      include: {
        bookings: {
          where: { deletedAt: null },
          select: { id: true, submittedAt: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Service '${id}' not found.`);
    }

    const updated = await this.prisma.service.update({
      where: { id: existing.id },
      data: {
        status: ServiceStatus.draft,
        deletedAt: new Date(),
      },
      include: {
        bookings: {
          where: { deletedAt: null },
          select: { id: true, submittedAt: true },
        },
      },
    });

    await this.audit.record({
      mosqueId: user.mosqueId,
      actorId: user.id,
      actorName: user.email,
      actorRole: user.role,
      action: 'SERVICE_DELETED',
      resource: 'service',
      resourceId: updated.id,
      note: `Soft-deleted service "${updated.name}"`,
    });

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    const bookingsThisMonth = updated.bookings.filter(
      (b) => b.submittedAt >= startOfMonth && b.submittedAt <= endOfMonth,
    ).length;

    return ServiceDto.from(updated, bookingsThisMonth, updated.bookings.length);
  }
}

