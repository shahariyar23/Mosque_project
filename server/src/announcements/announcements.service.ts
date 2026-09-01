import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  Announcement,
  AnnouncementAudience,
  AnnouncementCategory,
  AnnouncementStatus,
  Prisma,
} from '@prisma/client';
import { AuditLogService } from '../audit/audit-log.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AnnouncementAudienceEnum,
  AnnouncementCategoryEnum,
  AnnouncementStatusEnum,
  CreateAnnouncementDto,
} from './dto/create-announcement.dto';
import { AnnouncementQueryDto } from './dto/announcement-query.dto';
import {
  AnnouncementResponseDto,
  PaginationMetaDto,
} from './dto/announcement-response.dto';
import { AnnouncementStatsDto } from './dto/announcement-stats.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

// Formatting label mappers for frontend compatibility
const categoryLabels: Record<AnnouncementCategory, string> = {
  general: 'General',
  prayer: 'Prayer',
  event: 'Event',
  ramadan: 'Ramadan',
  fundraising: 'Fundraising',
  closure: 'Closure',
  urgent: 'Urgent',
};

const audienceLabels: Record<AnnouncementAudience, string> = {
  everyone: 'Whole community',
  members: 'Members',
  volunteers: 'Volunteers',
  youth: 'Youth',
  sisters: 'Sisters',
};

const statusLabels: Record<AnnouncementStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  published: 'Published',
  archived: 'Archived',
};

@Injectable()
export class AnnouncementsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnnouncementsService.name);
  private schedulerInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    // Run scheduled announcement publisher every 60 seconds
    this.schedulerInterval = setInterval(() => {
      this.processScheduledAnnouncements().catch((err) => {
        this.logger.error(`Error processing scheduled announcements: ${err.message}`, err.stack);
      });
    }, 60000);
  }

  onModuleDestroy() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }

  /** Formats Prisma announcement model into frontend-ready DTO */
  public mapToDto(announcement: Announcement & { createdBy?: { fullName: string | null } | null }): AnnouncementResponseDto {
    const author =
      announcement.authorName ||
      announcement.createdBy?.fullName ||
      'Mosque Office';

    const publishedAtStr = announcement.publishedAt
      ? announcement.publishedAt.toISOString().slice(0, 10)
      : null;

    const expiresAtStr = announcement.expiresAt
      ? announcement.expiresAt.toISOString().slice(0, 10)
      : null;

    return {
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      message: announcement.content,
      summary: announcement.summary,
      category: categoryLabels[announcement.category] || 'General',
      audience: audienceLabels[announcement.audience] || 'Whole community',
      status: statusLabels[announcement.status] || 'Draft',
      channels: announcement.channels || ['Website', 'App'],
      pinned: announcement.isPinned,
      isPinned: announcement.isPinned,
      author,
      publishedAt: publishedAtStr,
      scheduledAt: announcement.scheduledAt ? announcement.scheduledAt.toISOString() : null,
      expiresAt: expiresAtStr,
      archivedAt: announcement.archivedAt ? announcement.archivedAt.toISOString() : null,
      createdAt: announcement.createdAt.toISOString(),
      updatedAt: announcement.updatedAt.toISOString(),
    };
  }

  /**
   * Create a new announcement
   */
  async create(
    actor: AuthenticatedUser,
    dto: CreateAnnouncementDto,
  ): Promise<AnnouncementResponseDto> {
    const content = (dto.content || dto.message || '').trim();
    if (!content) {
      throw new BadRequestException('Announcement content/message is required');
    }

    const category = (dto.category || AnnouncementCategoryEnum.general) as AnnouncementCategory;
    const audience = (dto.audience || AnnouncementAudienceEnum.everyone) as AnnouncementAudience;
    const status = (dto.status || AnnouncementStatusEnum.draft) as AnnouncementStatus;
    const isPinned = dto.isPinned !== undefined ? dto.isPinned : dto.pinned !== undefined ? dto.pinned : false;

    let publishedAt: Date | null = null;
    let scheduledAt: Date | null = null;

    if (status === AnnouncementStatus.scheduled) {
      if (!dto.scheduledAt) {
        throw new BadRequestException('Scheduled announcements require a scheduledAt date/time');
      }
      scheduledAt = new Date(dto.scheduledAt);
      if (isNaN(scheduledAt.getTime())) {
        throw new BadRequestException('Invalid scheduledAt timestamp');
      }
    } else if (status === AnnouncementStatus.published) {
      publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : new Date();
    }

    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    const authorName = dto.author?.trim() || actor.email || 'Mosque Office';

    const created = await this.prisma.announcement.create({
      data: {
        mosqueId: actor.mosqueId,
        title: dto.title.trim(),
        content,
        summary: dto.summary?.trim() || null,
        category,
        audience,
        status,
        channels: dto.channels || ['Website', 'App'],
        isPinned,
        publishedAt,
        scheduledAt,
        expiresAt,
        authorName,
        createdById: actor.id,
      },
      include: {
        createdBy: { select: { fullName: true } },
      },
    });

    // Record audit trail
    await this.audit.record({
      mosqueId: actor.mosqueId,
      actorId: actor.id,
      actorName: actor.email,
      actorRole: actor.role,
      action: 'ANNOUNCEMENT_CREATED',
      resource: 'announcement',
      resourceId: created.id,
      note: `Created announcement "${created.title}" [status: ${statusLabels[created.status]}]`,
    });

    // If published immediately, dispatch notifications to relevant users
    if (created.status === AnnouncementStatus.published) {
      await this.dispatchAnnouncementNotifications(created);
    }

    return this.mapToDto(created);
  }

  /**
   * List announcements for admin dashboard
   */
  async findAll(
    actor: AuthenticatedUser,
    query: AnnouncementQueryDto,
  ): Promise<{ rows: AnnouncementResponseDto[]; meta: PaginationMetaDto }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.AnnouncementWhereInput = {
      mosqueId: actor.mosqueId,
    };

    if (query.category) {
      where.category = query.category as AnnouncementCategory;
    }

    if (query.status) {
      where.status = query.status as AnnouncementStatus;
    }

    if (query.audience) {
      where.audience = query.audience as AnnouncementAudience;
    }

    const pinnedFilter = query.pinned !== undefined ? query.pinned : query.isPinned;
    if (pinnedFilter !== undefined) {
      where.isPinned = pinnedFilter;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { content: { contains: term, mode: 'insensitive' } },
        { authorName: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.announcement.count({ where }),
      this.prisma.announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { isPinned: 'desc' },
          { publishedAt: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          createdBy: { select: { fullName: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      rows: items.map((item) => this.mapToDto(item)),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get announcement summary statistics
   */
  async getStats(actor: AuthenticatedUser): Promise<AnnouncementStatsDto> {
    const [total, published, scheduled, pinned] = await Promise.all([
      this.prisma.announcement.count({
        where: { mosqueId: actor.mosqueId },
      }),
      this.prisma.announcement.count({
        where: { mosqueId: actor.mosqueId, status: AnnouncementStatus.published },
      }),
      this.prisma.announcement.count({
        where: { mosqueId: actor.mosqueId, status: AnnouncementStatus.scheduled },
      }),
      this.prisma.announcement.count({
        where: { mosqueId: actor.mosqueId, isPinned: true },
      }),
    ]);

    return {
      total,
      published,
      scheduled,
      pinned,
    };
  }

  /**
   * Get a single announcement by ID
   */
  async findOne(actor: AuthenticatedUser, id: string): Promise<AnnouncementResponseDto> {
    const announcement = await this.prisma.announcement.findFirst({
      where: {
        id,
        mosqueId: actor.mosqueId,
      },
      include: {
        createdBy: { select: { fullName: true } },
      },
    });

    if (!announcement) {
      throw new NotFoundException(`Announcement with ID "${id}" not found`);
    }

    return this.mapToDto(announcement);
  }

  /**
   * Update an announcement
   */
  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateAnnouncementDto,
  ): Promise<AnnouncementResponseDto> {
    const existing = await this.prisma.announcement.findFirst({
      where: { id, mosqueId: actor.mosqueId },
    });

    if (!existing) {
      throw new NotFoundException(`Announcement with ID "${id}" not found`);
    }

    const data: Prisma.AnnouncementUpdateInput = {};

    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.content !== undefined || dto.message !== undefined) {
      data.content = (dto.content || dto.message || '').trim();
    }
    if (dto.summary !== undefined) data.summary = dto.summary?.trim() || null;
    if (dto.category !== undefined) data.category = dto.category as AnnouncementCategory;
    if (dto.audience !== undefined) data.audience = dto.audience as AnnouncementAudience;
    if (dto.channels !== undefined) data.channels = dto.channels;
    if (dto.pinned !== undefined || dto.isPinned !== undefined) {
      data.isPinned = dto.isPinned !== undefined ? dto.isPinned : dto.pinned;
    }
    if (dto.author !== undefined) data.authorName = dto.author.trim();
    if (dto.expiresAt !== undefined) {
      data.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }

    let newlyPublished = false;

    if (dto.status !== undefined) {
      const newStatus = dto.status as AnnouncementStatus;
      data.status = newStatus;

      if (newStatus === AnnouncementStatus.published && existing.status !== AnnouncementStatus.published) {
        data.publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : new Date();
        newlyPublished = true;
      } else if (newStatus === AnnouncementStatus.scheduled) {
        if (dto.scheduledAt) {
          data.scheduledAt = new Date(dto.scheduledAt);
        } else if (!existing.scheduledAt) {
          throw new BadRequestException('Scheduled announcements require a scheduledAt date/time');
        }
      } else if (newStatus === AnnouncementStatus.archived) {
        data.archivedAt = new Date();
      }
    } else if (dto.scheduledAt !== undefined) {
      data.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    }

    const updated = await this.prisma.announcement.update({
      where: { id },
      data,
      include: {
        createdBy: { select: { fullName: true } },
      },
    });

    await this.audit.record({
      mosqueId: actor.mosqueId,
      actorId: actor.id,
      actorName: actor.email,
      actorRole: actor.role,
      action: 'ANNOUNCEMENT_UPDATED',
      resource: 'announcement',
      resourceId: updated.id,
      note: `Updated announcement "${updated.title}"`,
    });

    if (newlyPublished) {
      await this.dispatchAnnouncementNotifications(updated);
    }

    return this.mapToDto(updated);
  }

  /**
   * Publish an announcement
   */
  async publish(actor: AuthenticatedUser, id: string): Promise<AnnouncementResponseDto> {
    return this.update(actor, id, {
      status: AnnouncementStatusEnum.published,
      publishedAt: new Date().toISOString(),
    });
  }

  /**
   * Archive an announcement
   */
  async archive(actor: AuthenticatedUser, id: string): Promise<AnnouncementResponseDto> {
    return this.update(actor, id, {
      status: AnnouncementStatusEnum.archived,
    });
  }

  /**
   * Toggle pinned state
   */
  async togglePin(actor: AuthenticatedUser, id: string, pinned?: boolean): Promise<AnnouncementResponseDto> {
    const existing = await this.prisma.announcement.findFirst({
      where: { id, mosqueId: actor.mosqueId },
    });

    if (!existing) {
      throw new NotFoundException(`Announcement with ID "${id}" not found`);
    }

    const nextPinned = pinned !== undefined ? pinned : !existing.isPinned;
    return this.update(actor, id, { isPinned: nextPinned });
  }

  /**
   * Delete an announcement
   */
  async delete(actor: AuthenticatedUser, id: string): Promise<{ success: boolean; message: string }> {
    const existing = await this.prisma.announcement.findFirst({
      where: { id, mosqueId: actor.mosqueId },
    });

    if (!existing) {
      throw new NotFoundException(`Announcement with ID "${id}" not found`);
    }

    await this.prisma.announcement.delete({ where: { id } });

    await this.audit.record({
      mosqueId: actor.mosqueId,
      actorId: actor.id,
      actorName: actor.email,
      actorRole: actor.role,
      action: 'ANNOUNCEMENT_DELETED',
      resource: 'announcement',
      resourceId: id,
      note: `Deleted announcement "${existing.title}"`,
    });

    return {
      success: true,
      message: 'Announcement deleted successfully',
    };
  }

  /**
   * Public list of published announcements
   */
  async findPublic(
    mosqueSlug: string,
    query: { limit?: number; category?: string },
  ): Promise<{ rows: AnnouncementResponseDto[]; total: number }> {
    const mosque = await this.prisma.mosque.findUnique({
      where: { slug: mosqueSlug },
      select: { id: true },
    });

    if (!mosque) {
      throw new NotFoundException(`Mosque with slug "${mosqueSlug}" not found`);
    }

    const now = new Date();
    const where: Prisma.AnnouncementWhereInput = {
      mosqueId: mosque.id,
      status: AnnouncementStatus.published,
      audience: AnnouncementAudience.everyone,
      publishedAt: { lte: now },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    };

    if (query.category && query.category !== 'all') {
      where.category = query.category.toLowerCase() as AnnouncementCategory;
    }

    const limit = Math.min(50, Math.max(1, query.limit || 20));

    const [total, items] = await Promise.all([
      this.prisma.announcement.count({ where }),
      this.prisma.announcement.findMany({
        where,
        take: limit,
        orderBy: [
          { isPinned: 'desc' },
          { publishedAt: 'desc' },
        ],
        include: {
          createdBy: { select: { fullName: true } },
        },
      }),
    ]);

    return {
      rows: items.map((item) => this.mapToDto(item)),
      total,
    };
  }

  /**
   * Background runner: publish scheduled announcements whose scheduledAt <= now
   */
  async processScheduledAnnouncements(): Promise<number> {
    const now = new Date();
    const scheduled = await this.prisma.announcement.findMany({
      where: {
        status: AnnouncementStatus.scheduled,
        scheduledAt: { lte: now },
      },
    });

    if (scheduled.length === 0) return 0;

    let processedCount = 0;
    for (const item of scheduled) {
      try {
        const updated = await this.prisma.announcement.update({
          where: { id: item.id },
          data: {
            status: AnnouncementStatus.published,
            publishedAt: now,
          },
        });
        await this.dispatchAnnouncementNotifications(updated);
        processedCount++;
      } catch (err: any) {
        this.logger.error(`Failed to publish scheduled announcement ${item.id}: ${err.message}`);
      }
    }

    if (processedCount > 0) {
      this.logger.log(`Published ${processedCount} scheduled announcements at ${now.toISOString()}`);
    }

    return processedCount;
  }

  /**
   * Dispatches in-app notifications for a published announcement
   */
  private async dispatchAnnouncementNotifications(announcement: Announcement): Promise<void> {
    try {
      // Find eligible recipient users in the mosque
      const users = await this.prisma.user.findMany({
        where: {
          mosqueId: announcement.mosqueId,
          isActive: true,
          deletedAt: null,
        },
        select: { id: true },
        take: 200, // Safe batch limit
      });

      if (users.length === 0) return;

      const userIds = users.map((u) => u.id);
      const summaryMsg =
        announcement.summary ||
        (announcement.content.length > 120
          ? `${announcement.content.slice(0, 117)}...`
          : announcement.content);

      await this.notifications.notifyUsers(announcement.mosqueId, userIds, {
        title: `Announcement: ${announcement.title}`,
        message: summaryMsg,
        type: 'announcement' as any,
        category: 'announcement',
        resourceType: 'announcement',
        resourceId: announcement.id,
        actionUrl: '/dashboard/announcements',
      });
    } catch (err: any) {
      this.logger.warn(`Failed to dispatch announcement notifications: ${err.message}`);
    }
  }
}

