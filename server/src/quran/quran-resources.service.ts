import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, QuranStatus } from '@prisma/client';

import { AuditLogService } from '../audit/audit-log.service';
import { buildPage, toSkipTake } from '../common/pagination/page';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateQuranResourceDto,
  ListQuranResourcesQueryDto,
  QuranResourceDto,
  UpdateQuranResourceDto,
} from './dto/quran-resource.dto';

/**
 * The mosque's Quran study library.
 *
 * Every read and write is scoped to `actor.mosqueId` — the tenant comes from the verified token,
 * never from the request body. A resource belonging to mosque A is unreachable from a mosque B
 * session at the service layer, so even a mistake in the controller could not cross mosques.
 *
 * Soft delete: a resource is never hard-deleted (it may be referenced elsewhere), so DELETE sets
 * `deletedAt` and drops the row from every list query. Archived and deleted are distinct states —
 * archive is a deliberate content lifecycle step, delete removes it from the library.
 *
 * Status transitions:
 *   draft -> published      (publish now)
 *   draft/scheduled -> scheduled (schedule for later; requires a date)
 *   *      -> archived      (taken down deliberately)
 *   published -> draft      (unpublish back to draft)
 */
@Injectable()
export class QuranResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  private readonly DEFAULT_ORDER: Prisma.QuranResourceOrderByWithRelationInput[] = [
    { createdAt: 'desc' },
  ];

  private readonly SORT_FIELDS = new Set([
    'title',
    'type',
    'status',
    'surah',
    'createdAt',
    'publishedAt',
    'updatedAt',
  ]);

  /**
   * List resources with DB-level search, filter, sort and pagination.
   */
  async findAll(
    mosqueId: string,
    query: ListQuranResourcesQueryDto,
  ): Promise<{
    rows: QuranResourceDto[];
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
  }> {
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? query.limit ?? 10));
    const page = Math.max(1, query.page ?? 1);

    const where: Prisma.QuranResourceWhereInput = {
      mosqueId,
      deletedAt: null,
    };

    if (query.type) where.type = query.type;
    if (query.format) where.format = query.format;
    if (query.status) where.status = query.status;
    if (query.surah) {
      where.surah = { contains: query.surah.trim(), mode: 'insensitive' };
    }

    if (query.publishedFrom || query.publishedTo) {
      where.publishedAt = {};
      if (query.publishedFrom)
        where.publishedAt.gte = new Date(`${query.publishedFrom}T00:00:00.000Z`);
      if (query.publishedTo) where.publishedAt.lte = new Date(`${query.publishedTo}T23:59:59.999Z`);
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { surah: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { reciter: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
      ];
    }

    let orderBy: Prisma.QuranResourceOrderByWithRelationInput[] = this.DEFAULT_ORDER;
    if (query.sortBy && this.SORT_FIELDS.has(query.sortBy)) {
      orderBy = [{ [query.sortBy]: query.sortDir === 'asc' ? 'asc' : 'desc' }];
    }

    const { skip, take } = toSkipTake({ page, pageSize });
    const [total, rows] = await Promise.all([
      this.prisma.quranResource.count({ where }),
      this.prisma.quranResource.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
    ]);

    return buildPage(
      rows.map((row) => QuranResourceDto.from(row)),
      total,
      { page, pageSize },
    );
  }

  /**
   * Get one resource by id, scoped to the mosque.
   */
  async findOne(mosqueId: string, id: string): Promise<QuranResourceDto> {
    const row = await this.prisma.quranResource.findFirst({
      where: { id, mosqueId, deletedAt: null },
    });

    if (!row) {
      throw new NotFoundException('Quran resource not found.');
    }

    return QuranResourceDto.from(row);
  }

  /**
   * Create a resource in the actor's mosque.
   */
  async create(actor: AuthenticatedUser, dto: CreateQuranResourceDto): Promise<QuranResourceDto> {
    const mosqueId = actor.mosqueId;
    const status = dto.status ?? QuranStatus.draft;

    const { publishedAt, scheduledAt } = this.resolveDates(status, dto.scheduledAt);

    const row = await this.prisma.quranResource.create({
      data: {
        mosqueId,
        title: dto.title.trim(),
        summary: dto.summary?.trim() || null,
        description: dto.description.trim(),
        type: dto.type,
        format: dto.format,
        status,
        surah: dto.surah.trim(),
        reference: dto.reference?.trim() || '',
        ayahStart: dto.ayahStart ?? null,
        ayahEnd: dto.ayahEnd ?? null,
        reciter: dto.reciter?.trim() || null,
        author: dto.author?.trim() || null,
        language: dto.language?.trim() || 'Arabic',
        mediaUrl: dto.mediaUrl?.trim() || null,
        thumbnailUrl: dto.thumbnailUrl?.trim() || null,
        duration: dto.duration?.trim() || null,
        isFeatured: dto.isFeatured ?? false,
        publishedAt,
        scheduledAt,
        createdById: actor.id,
      },
    });

    await this.audit.record({
      action: 'QURAN_RESOURCE_CREATED',
      resource: 'quran_resource',
      resourceId: row.id,
      actorId: actor.id,
      actorName: actor.email,
      mosqueId,
      changes: {
        title: row.title,
        type: row.type,
        format: row.format,
        status: row.status,
        surah: row.surah,
      },
    });

    return QuranResourceDto.from(row);
  }

  /**
   * Update a resource. `status` may be given directly or through the dedicated
   * publish / schedule / archive endpoints.
   */
  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateQuranResourceDto,
  ): Promise<QuranResourceDto> {
    const mosqueId = actor.mosqueId;
    const existing = await this.getOwned(mosqueId, id);

    const data: Prisma.QuranResourceUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.summary !== undefined) data.summary = dto.summary?.trim() || null;
    if (dto.description !== undefined) data.description = dto.description.trim();
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.format !== undefined) data.format = dto.format;
    if (dto.surah !== undefined) data.surah = dto.surah.trim();
    if (dto.reference !== undefined) data.reference = dto.reference?.trim() || '';
    if (dto.ayahStart !== undefined) data.ayahStart = dto.ayahStart;
    if (dto.ayahEnd !== undefined) data.ayahEnd = dto.ayahEnd;
    if (dto.reciter !== undefined) data.reciter = dto.reciter?.trim() || null;
    if (dto.author !== undefined) data.author = dto.author?.trim() || null;
    if (dto.language !== undefined) data.language = dto.language?.trim() || 'Arabic';
    if (dto.mediaUrl !== undefined) data.mediaUrl = dto.mediaUrl?.trim() || null;
    if (dto.thumbnailUrl !== undefined) data.thumbnailUrl = dto.thumbnailUrl?.trim() || null;
    if (dto.duration !== undefined) data.duration = dto.duration?.trim() || null;
    if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;

    // Status transition, when given.
    if (dto.status !== undefined) {
      const nextStatus = dto.status;
      if (nextStatus === QuranStatus.scheduled) {
        // Scheduling from a patch keeps the existing scheduledAt when the row already had one.
        const scheduledAt = dto.scheduledAt
          ? new Date(`${dto.scheduledAt}T00:00:00.000Z`)
          : existing.scheduledAt;
        if (!scheduledAt) {
          throw new BadRequestException('Scheduling a Quran resource requires a scheduledAt date.');
        }
        data.status = QuranStatus.scheduled;
        data.scheduledAt = scheduledAt;
        data.publishedAt = null;
      } else if (nextStatus === QuranStatus.published) {
        data.status = QuranStatus.published;
        data.publishedAt = dto.scheduledAt
          ? new Date(`${dto.scheduledAt}T00:00:00.000Z`)
          : (existing.publishedAt ?? new Date());
        data.scheduledAt = null;
      } else if (nextStatus === QuranStatus.archived) {
        data.status = QuranStatus.archived;
        data.archivedAt = new Date();
      } else {
        // draft
        data.status = QuranStatus.draft;
        data.publishedAt = null;
        data.scheduledAt = null;
      }
    } else if (dto.scheduledAt !== undefined) {
      // Only reschedule when the row is actually in a scheduled state.
      if (existing.status !== QuranStatus.scheduled) {
        throw new BadRequestException(
          'scheduledAt can only be set on a resource in scheduled status.',
        );
      }
      data.scheduledAt = new Date(`${dto.scheduledAt}T00:00:00.000Z`);
    }

    const row = await this.prisma.quranResource.update({
      where: { id: existing.id },
      data: {
        ...data,
        updatedById: actor.id,
      },
    });

    await this.audit.record({
      action: 'QURAN_RESOURCE_UPDATED',
      resource: 'quran_resource',
      resourceId: row.id,
      actorId: actor.id,
      actorName: actor.email,
      mosqueId,
      changes: {
        before: {
          title: existing.title,
          status: existing.status,
          type: existing.type,
        },
        after: {
          title: row.title,
          status: row.status,
          type: row.type,
        },
      },
    });

    return QuranResourceDto.from(row);
  }

  /**
   * Publish a resource now.
   */
  async publish(actor: AuthenticatedUser, id: string): Promise<QuranResourceDto> {
    return this.update(actor, id, { status: QuranStatus.published });
  }

  /**
   * Schedule a resource to publish on a future date.
   */
  async schedule(
    actor: AuthenticatedUser,
    id: string,
    scheduledAt: string,
  ): Promise<QuranResourceDto> {
    return this.update(actor, id, { status: QuranStatus.scheduled, scheduledAt });
  }

  /**
   * Archive a resource.
   */
  async archive(actor: AuthenticatedUser, id: string): Promise<QuranResourceDto> {
    return this.update(actor, id, { status: QuranStatus.archived });
  }

  /**
   * Soft-delete a resource.
   */
  async remove(
    actor: AuthenticatedUser,
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const mosqueId = actor.mosqueId;
    const existing = await this.getOwned(mosqueId, id);

    await this.prisma.quranResource.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });

    await this.audit.record({
      action: 'QURAN_RESOURCE_DELETED',
      resource: 'quran_resource',
      resourceId: id,
      actorId: actor.id,
      actorName: actor.email,
      mosqueId,
      changes: {
        title: existing.title,
        status: existing.status,
      },
    });

    return { success: true, message: 'Quran resource deleted successfully' };
  }

  /**
   * Dashboard stat counts for the actor's mosque.
   */
  async getStats(actor: AuthenticatedUser): Promise<{
    total: number;
    published: number;
    scheduled: number;
    drafted: number;
    archived: number;
  }> {
    const mosqueId = actor.mosqueId;
    const base: Prisma.QuranResourceWhereInput = { mosqueId, deletedAt: null };

    const [total, published, scheduled, drafted, archived] = await Promise.all([
      this.prisma.quranResource.count({ where: base }),
      this.prisma.quranResource.count({ where: { ...base, status: QuranStatus.published } }),
      this.prisma.quranResource.count({ where: { ...base, status: QuranStatus.scheduled } }),
      this.prisma.quranResource.count({ where: { ...base, status: QuranStatus.draft } }),
      this.prisma.quranResource.count({ where: { ...base, status: QuranStatus.archived } }),
    ]);

    return { total, published, scheduled, drafted, archived };
  }

  /**
   * Fetch a live resource belonging strictly to the mosque, or 404.
   */
  private async getOwned(mosqueId: string, id: string) {
    const row = await this.prisma.quranResource.findFirst({
      where: { id, mosqueId, deletedAt: null },
    });

    if (!row) {
      throw new NotFoundException('Quran resource not found.');
    }

    return row;
  }

  /**
   * Work out publishedAt / scheduledAt from a status and an optional date-only string.
   */
  private resolveDates(
    status: QuranStatus,
    scheduledAtValue?: string,
  ): { publishedAt: Date | null; scheduledAt: Date | null } {
    if (status === QuranStatus.published) {
      return { publishedAt: new Date(), scheduledAt: null };
    }

    if (status === QuranStatus.scheduled) {
      if (!scheduledAtValue) {
        throw new BadRequestException('Scheduling a Quran resource requires a scheduledAt date.');
      }
      const parsed = new Date(`${scheduledAtValue}T00:00:00.000Z`);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('scheduledAt must be a valid YYYY-MM-DD date.');
      }
      return { publishedAt: null, scheduledAt: parsed };
    }

    return { publishedAt: null, scheduledAt: null };
  }
}
