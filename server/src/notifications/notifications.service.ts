import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { NotificationType, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { MailService } from '../mail/mail.service';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { BroadcastQueryDto } from './dto/broadcast-query.dto';
import {
  BroadcastResponseDto,
  BroadcastStatsDto,
} from './dto/broadcast-response.dto';
import { CreateNotificationInput } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import {
  NotificationListResponseDto,
  NotificationResponseDto,
  UnreadCountResponseDto,
} from './dto/notification-response.dto';

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private schedulerTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  onModuleInit() {
    // Run scheduled broadcast processor every 30 seconds
    this.schedulerTimer = setInterval(async () => {
      try {
        await this.processScheduledBroadcasts();
      } catch (err: any) {
        this.logger.error(`Error in scheduled broadcast processor: ${err.message}`);
      }
    }, 30_000);
  }

  onModuleDestroy() {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  /**
   * Creates a single in-app notification for a designated recipient user within a mosque tenant.
   */
  async create(
    mosqueId: string,
    input: CreateNotificationInput,
  ): Promise<NotificationResponseDto | null> {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          mosqueId,
          userId: input.userId,
          title: input.title,
          message: input.message,
          type: input.type ?? NotificationType.general,
          category: input.category ?? 'system',
          resourceType: input.resourceType ?? null,
          resourceId: input.resourceId ?? null,
          actionUrl: input.actionUrl ?? null,
          metadata: input.metadata ?? undefined,
        },
      });

      return NotificationResponseDto.from(notification);
    } catch (err: any) {
      this.logger.error(`Failed to create notification for user ${input.userId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Broadcasts a notification to a specific list of user IDs within the mosque tenant.
   */
  async notifyUsers(
    mosqueId: string,
    userIds: string[],
    data: Omit<CreateNotificationInput, 'userId'>,
  ): Promise<void> {
    if (!userIds || userIds.length === 0) return;

    try {
      const uniqueIds = Array.from(new Set(userIds));
      await this.prisma.notification.createMany({
        data: uniqueIds.map((userId) => ({
          mosqueId,
          userId,
          title: data.title,
          message: data.message,
          type: data.type ?? NotificationType.general,
          category: data.category ?? 'system',
          resourceType: data.resourceType ?? null,
          resourceId: data.resourceId ?? null,
          actionUrl: data.actionUrl ?? null,
          metadata: data.metadata ?? undefined,
        })),
      });
    } catch (err: any) {
      this.logger.error(`Failed to broadcast notifications: ${err.message}`);
    }
  }

  /**
   * Dispatches a finance-related notification to all active finance officers and administrators of the mosque.
   */
  async notifyFinanceAdmins(
    mosqueId: string,
    data: Omit<CreateNotificationInput, 'userId'>,
    excludeUserId?: string,
  ): Promise<void> {
    try {
      const financeUsers = await this.prisma.user.findMany({
        where: {
          mosqueId,
          isActive: true,
          deletedAt: null,
          role: {
            in: [
              Role.super_admin,
              Role.mosque_admin,
              Role.treasurer,
              Role.cashier,
            ],
          },
          ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
        },
        select: { id: true },
      });

      const userIds = financeUsers.map((u) => u.id);
      await this.notifyUsers(mosqueId, userIds, data);
    } catch (err: any) {
      this.logger.error(`Failed to notify finance admins: ${err.message}`);
    }
  }

  /**
   * Returns a paginated list of notifications for the authenticated user within their mosque tenant.
   */
  async findMany(
    actor: AuthenticatedUser,
    query: NotificationQueryDto,
  ): Promise<NotificationListResponseDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      mosqueId: actor.mosqueId,
      userId: actor.id,
      ...(query.unreadOnly ? { isRead: false } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.type ? { type: query.type } : {}),
    };

    const [rows, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { mosqueId: actor.mosqueId, userId: actor.id, isRead: false },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: rows.map(NotificationResponseDto.from),
      meta: {
        page,
        limit,
        total,
        totalPages,
        unreadCount,
      },
    };
  }

  /**
   * Returns current count of unread notifications for the caller.
   */
  async getUnreadCount(actor: AuthenticatedUser): Promise<UnreadCountResponseDto> {
    const count = await this.prisma.notification.count({
      where: {
        mosqueId: actor.mosqueId,
        userId: actor.id,
        isRead: false,
      },
    });

    return { unreadCount: count };
  }

  /**
   * Marks a specific notification as read. Enforces strict tenant and recipient isolation.
   */
  async markAsRead(actor: AuthenticatedUser, id: string): Promise<NotificationResponseDto> {
    const existing = await this.prisma.notification.findFirst({
      where: {
        id,
        userId: actor.id,
        mosqueId: actor.mosqueId,
      },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'NOTIFICATION_NOT_FOUND',
        message: 'Notification not found or access denied.',
      });
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NotificationResponseDto.from(updated);
  }

  /**
   * Marks all unread notifications for the caller as read.
   */
  async markAllAsRead(actor: AuthenticatedUser): Promise<UnreadCountResponseDto> {
    await this.prisma.notification.updateMany({
      where: {
        mosqueId: actor.mosqueId,
        userId: actor.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { unreadCount: 0 };
  }

  /**
   * Deletes a notification belonging to the caller.
   */
  async delete(actor: AuthenticatedUser, id: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.notification.findFirst({
      where: {
        id,
        userId: actor.id,
        mosqueId: actor.mosqueId,
      },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'NOTIFICATION_NOT_FOUND',
        message: 'Notification not found or access denied.',
      });
    }

    await this.prisma.notification.delete({
      where: { id },
    });

    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Broadcast Messages / Outbox Functionality
  // ---------------------------------------------------------------------------

  /**
   * Retrieves paginated broadcast send log for the mosque.
   */
  async findBroadcasts(
    actor: AuthenticatedUser,
    query: BroadcastQueryDto,
  ): Promise<{ rows: BroadcastResponseDto[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const where: Prisma.BroadcastMessageWhereInput = {
      mosqueId: actor.mosqueId,
    };

    if (query.channel && query.channel !== 'all') {
      const ch = query.channel.toLowerCase().replace(/[\s-]/g, '_');
      if (ch === 'in_app' || ch === 'push' || ch === 'email' || ch === 'sms') {
        where.channel = ch as any;
      }
    }

    if (query.status && query.status !== 'all') {
      const st = query.status.toLowerCase();
      if (st === 'sent' || st === 'scheduled' || st === 'draft' || st === 'failed') {
        where.status = st as any;
      }
    }

    if (query.audience && query.audience !== 'all') {
      where.audience = { contains: query.audience, mode: 'insensitive' };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { message: { contains: query.search, mode: 'insensitive' } },
        { senderName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const [total, rows] = await Promise.all([
      this.prisma.broadcastMessage.count({ where }),
      this.prisma.broadcastMessage.findMany({
        where,
        orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    const broadcastIds = rows.map((r) => r.id);
    const readCounts = await this.prisma.notification.groupBy({
      by: ['resourceId'],
      where: {
        mosqueId: actor.mosqueId,
        resourceId: { in: broadcastIds },
        isRead: true,
      },
      _count: { id: true },
    });

    const readMap = new Map<string, number>();
    for (const item of readCounts) {
      if (item.resourceId) {
        readMap.set(item.resourceId, item._count.id);
      }
    }

    return {
      rows: rows.map((r) => {
        const actualOpened = readMap.get(r.id) ?? (r.status === 'sent' ? r.opened : 0);
        return BroadcastResponseDto.from({ ...r, opened: actualOpened });
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Calculates overall stats for outgoing broadcast campaigns.
   */
  async getBroadcastStats(
    actor: AuthenticatedUser,
  ): Promise<BroadcastStatsDto> {
    const [total, sentRows, totalReadNotifications] = await Promise.all([
      this.prisma.broadcastMessage.count({
        where: { mosqueId: actor.mosqueId },
      }),
      this.prisma.broadcastMessage.findMany({
        where: {
          mosqueId: actor.mosqueId,
          status: 'sent',
        },
        select: {
          delivered: true,
          opened: true,
        },
      }),
      this.prisma.notification.count({
        where: {
          mosqueId: actor.mosqueId,
          category: 'broadcast',
          isRead: true,
        },
      }),
    ]);

    const sent = sentRows.length;
    const delivered = sentRows.reduce((sum, r) => sum + r.delivered, 0);
    const opened = totalReadNotifications;
    const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0;

    return {
      total,
      sent,
      delivered,
      openRate,
    };
  }

  /**
   * Creates a new broadcast campaign and dispatches it if status === 'sent'.
   */
  async createBroadcast(
    actor: AuthenticatedUser,
    dto: CreateBroadcastDto,
  ): Promise<BroadcastResponseDto> {
    const isSent = dto.status === 'sent';

    // Count recipient members in this mosque
    const memberCount = await this.prisma.user.count({
      where: {
        mosqueId: actor.mosqueId,
        isActive: true,
        deletedAt: null,
      },
    });

    const recipients = isSent ? Math.max(memberCount, 1) : 0;
    const delivered = isSent ? recipients : 0;
    const opened = 0; // Starts at 0, tracked in real-time as users open/read

    const broadcast = await this.prisma.broadcastMessage.create({
      data: {
        mosqueId: actor.mosqueId,
        title: dto.title.trim(),
        message: dto.message.trim(),
        channel: (dto.channel as any) || 'push',
        audience: dto.audience || 'Whole community',
        status: (dto.status as any) || 'draft',
        senderName: dto.sender || actor.email || 'Mosque Office',
        sentAt: isSent ? new Date() : null,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        recipients,
        delivered,
        opened,
        createdById: actor.id,
      },
    });

    // If sent, dispatch payload (in-app notifications and email if channel === email)
    if (isSent) {
      await this.dispatchBroadcastPayload(actor.mosqueId, broadcast);
    }

    return BroadcastResponseDto.from(broadcast);
  }

  /**
   * Sends an existing scheduled or draft broadcast message.
   */
  async sendBroadcast(
    actor: AuthenticatedUser,
    id: string,
  ): Promise<BroadcastResponseDto> {
    const existing = await this.prisma.broadcastMessage.findFirst({
      where: { id, mosqueId: actor.mosqueId },
    });

    if (!existing) {
      throw new NotFoundException(`Broadcast message with ID "${id}" not found.`);
    }

    const memberCount = await this.prisma.user.count({
      where: {
        mosqueId: actor.mosqueId,
        isActive: true,
        deletedAt: null,
      },
    });

    const recipients = Math.max(memberCount, 1);
    const delivered = recipients;
    const opened = 0;

    const updated = await this.prisma.broadcastMessage.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        recipients,
        delivered,
        opened,
      },
    });

    await this.dispatchBroadcastPayload(actor.mosqueId, updated);

    return BroadcastResponseDto.from(updated);
  }

  /**
   * Dispatches notifications to recipient user inboxes and real emails if email channel is selected.
   */
  private async dispatchBroadcastPayload(
    mosqueId: string,
    broadcast: { id: string; title: string; message: string; channel: string; senderName?: string | null },
  ): Promise<void> {
    try {
      const activeUsers = await this.prisma.user.findMany({
        where: {
          mosqueId,
          isActive: true,
          deletedAt: null,
        },
        select: { id: true, email: true },
        take: 200,
      });

      // 1. In-app notification center delivery
      await this.notifyUsers(
        mosqueId,
        activeUsers.map((u) => u.id),
        {
          title: broadcast.title,
          message: broadcast.message,
          type: NotificationType.general,
          category: 'broadcast',
          resourceType: 'broadcast',
          resourceId: broadcast.id,
        },
      );

      // 2. Real email delivery via Titan SMTP if channel is email
      const isEmailChannel =
        broadcast.channel === 'email' ||
        broadcast.channel === 'Email';

      if (isEmailChannel && this.mailService.isConfigured()) {
        const emails = activeUsers
          .map((u) => u.email)
          .filter((e): e is string => Boolean(e) && e.includes('@'));

        if (emails.length > 0) {
          const htmlContent = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e7e6dc; border-radius: 8px; background-color: #faf9f4;">
              <h2 style="color: #17211d; margin-top: 0; font-size: 20px;">${broadcast.title}</h2>
              <div style="color: #4d564f; font-size: 15px; line-height: 1.6; white-space: pre-line;">${broadcast.message}</div>
              <hr style="border: none; border-top: 1px solid #e7e6dc; margin: 24px 0 16px 0;" />
              <p style="font-size: 12px; color: #8b938d; margin: 0;">Sent by ${broadcast.senderName || 'Mosque Office'} · NOOR Mosque Community</p>
            </div>
          `;

          // Fire in parallel
          Promise.allSettled(
            emails.map((to) =>
              this.mailService.sendMail({
                to,
                subject: broadcast.title,
                text: broadcast.message,
                html: htmlContent,
              }),
            ),
          ).then((results) => {
            const sentCount = results.filter((r) => r.status === 'fulfilled' && (r.value as any).success).length;
            this.logger.log(`Dispatched ${sentCount}/${emails.length} broadcast emails for "${broadcast.title}".`);
          }).catch((err) => {
            this.logger.error(`Broadcast email dispatch error: ${err.message}`);
          });
        }
      }
    } catch (err: any) {
      this.logger.error(`Failed to dispatch broadcast payload: ${err.message}`);
    }
  }

  /**
   * Scans for any scheduled broadcast messages whose scheduledAt <= now and automatically dispatches them.
   */
  public async processScheduledBroadcasts(): Promise<number> {
    const now = new Date();
    const dueBroadcasts = await this.prisma.broadcastMessage.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: { lte: now },
      },
    });

    if (dueBroadcasts.length === 0) return 0;

    let processed = 0;
    for (const b of dueBroadcasts) {
      try {
        const memberCount = await this.prisma.user.count({
          where: {
            mosqueId: b.mosqueId,
            isActive: true,
            deletedAt: null,
          },
        });

        const recipients = Math.max(memberCount, 1);
        const delivered = recipients;
        const opened = 0;

        const updated = await this.prisma.broadcastMessage.update({
          where: { id: b.id },
          data: {
            status: 'sent',
            sentAt: now,
            recipients,
            delivered,
            opened,
          },
        });

        await this.dispatchBroadcastPayload(b.mosqueId, updated);
        processed++;
        this.logger.log(
          `Automatically dispatched scheduled broadcast "${b.title}" [ID: ${b.id}] at ${now.toISOString()}`,
        );
      } catch (err: any) {
        this.logger.error(`Failed to dispatch scheduled broadcast ${b.id}: ${err.message}`);
      }
    }

    return processed;
  }

  /**
   * Deletes a broadcast message from the outbox.
   */
  async deleteBroadcast(
    actor: AuthenticatedUser,
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const existing = await this.prisma.broadcastMessage.findFirst({
      where: { id, mosqueId: actor.mosqueId },
    });

    if (!existing) {
      throw new NotFoundException(`Broadcast message with ID "${id}" not found.`);
    }

    await this.prisma.broadcastMessage.delete({ where: { id } });

    return { success: true, message: 'Broadcast message deleted successfully' };
  }
}


