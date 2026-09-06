import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AnnouncementStatus,
  AnnouncementAudience,
  EventStatus,
  FundStatus,
  Role,
  ServiceStatus,
} from '@prisma/client';

import { AnnouncementsService } from '../announcements/announcements.service';
import { JumuahService } from '../jumuah/jumuah.service';
import { PrayerTimesService } from '../prayer-times/prayer-times.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicTransparencyService } from '../public-transparency/public-transparency.service';
import { EventsService } from '../events/events.service';
import { ServicesService } from '../services/services.service';
import {
  PublicCommunityStatsDto,
  PublicEventDto,
  PublicJumuahEntryDto,
  PublicMosqueDto,
  PublicServiceDto,
} from './dto/public-home.dto';

/**
 * One mosque's public home page, assembled from the existing domain services.
 *
 * No business logic lives here: prayer times come from `PrayerTimesService`, Jumu'ah from
 * `JumuahService`, funds from `PublicTransparencyService`, announcements from
 * `AnnouncementsService.findPublic`, events from `EventsService`, services from `ServicesService`.
 * This module only resolves the mosque by slug (so every call is tenant-scoped) and projects the
 * responses down to what a public visitor may see.
 */
@Injectable()
export class PublicHomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prayerTimes: PrayerTimesService,
    private readonly jumuah: JumuahService,
    private readonly services: ServicesService,
    private readonly events: EventsService,
    private readonly announcements: AnnouncementsService,
    private readonly transparency: PublicTransparencyService,
  ) {}

  /**
   * Resolves the mosque behind a public slug, or 404s.
   */
  private async getPublicMosque(slug: string) {
    const mosque = await this.prisma.mosque.findUnique({
      where: { slug, isActive: true },
      select: { id: true },
    });

    if (!mosque) {
      throw new NotFoundException({
        code: 'PUBLIC_MOSQUE_NOT_FOUND',
        message: 'The mosque was not found or is not active.',
      });
    }

    return mosque;
  }

  async getMosque(slug: string): Promise<PublicMosqueDto | null> {
    const mosque = await this.prisma.mosque.findUnique({
      where: { slug, isActive: true },
      select: {
        slug: true,
        name: true,
        description: true,
        addressLine: true,
        city: true,
        district: true,
        country: true,
        establishedYear: true,
        logoUrl: true,
      },
    });

    return mosque;
  }

  /**
   * Today's prayer times via the existing calculation service, scoped to the mosque by slug.
   * `null` when the mosque has no coordinates (nothing can be calculated) or upstream is down.
   */
  async getTodayPrayerTimes(slug: string) {
    const mosque = await this.getPublicMosque(slug);
    try {
      return await this.prayerTimes.getPrayerTimes(mosque.id, {});
    } catch {
      return null;
    }
  }

  /**
   * The mosque's active Jumu'ah schedules via the existing service. Only the public fields are
   * projected — internal ids and timestamps are dropped.
   */
  async getJumuahSchedules(slug: string): Promise<PublicJumuahEntryDto[]> {
    const mosque = await this.getPublicMosque(slug);
    const rows = await this.jumuah.findAll(mosque.id, { isActive: true });
    return rows.map((row) => PublicJumuahEntryDto.from(row));
  }

  /**
   * Active services via the existing service, projected to the public card fields.
   */
  async getServices(slug: string, limit = 4): Promise<PublicServiceDto[]> {
    const mosque = await this.getPublicMosque(slug);
    const rows = await this.services.findAll(mosque.id, {
      status: ServiceStatus.active,
      pageSize: Math.min(Math.max(limit, 1), 8),
    });

    const list = Array.isArray(rows) ? rows : rows.rows;
    return list.map((row) => PublicServiceDto.from(row));
  }

  /**
   * Published upcoming events via the existing service, projected to the public card fields.
   */
  async getUpcomingEvents(slug: string, limit = 3): Promise<PublicEventDto[]> {
    const mosque = await this.getPublicMosque(slug);
    const rows = await this.events.findAll(mosque.id, {
      timeframe: 'upcoming',
      pageSize: Math.min(Math.max(limit, 1), 8),
    });

    const list = Array.isArray(rows) ? rows : rows.rows;
    return list.map((row) => PublicEventDto.from(row));
  }

  /**
   * Public published announcements via the existing public finder. The DTO already carries only
   * what a visitor may see; this projects the smallest card shape on top.
   */
  async getAnnouncements(slug: string, limit = 5) {
    const { rows } = await this.announcements.findPublic(slug, {
      limit: Math.min(Math.max(limit, 1), 20),
    });

    return rows.map((row) => ({
      title: row.title,
      summary: row.summary ?? null,
      content: row.content,
      category: row.category,
      author: row.author,
      publishedAt: row.publishedAt ?? null,
      expiresAt: row.expiresAt ?? null,
    }));
  }

  /**
   * Lightweight community statistics for the home page stat strip.
   *
   * Only public-safe counts: active services, published upcoming events, public funds, and active
   * members (accounts with the `member` role that have not been soft-deleted). Staff accounts are
   * deliberately excluded — this is the community count, not the user directory.
   */
  async getCommunityStats(slug: string): Promise<PublicCommunityStatsDto | null> {
    const mosque = await this.getPublicMosque(slug);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [activeServices, upcomingEvents, publicFunds, members] = await Promise.all([
      this.prisma.service.count({
        where: { mosqueId: mosque.id, status: ServiceStatus.active, deletedAt: null },
      }),
      this.prisma.event.count({
        where: {
          mosqueId: mosque.id,
          deletedAt: null,
          isPublished: true,
          status: { in: [EventStatus.upcoming, EventStatus.ongoing] },
          date: { gte: today },
        },
      }),
      this.prisma.donationFund.count({
        where: {
          mosqueId: mosque.id,
          isPublic: true,
          status: { in: [FundStatus.active, FundStatus.completed] },
        },
      }),
      this.prisma.user.count({
        where: { mosqueId: mosque.id, role: Role.member, isActive: true, deletedAt: null },
      }),
    ]);

    return { activeServices, upcomingEvents, publicFunds, members };
  }

  /**
   * Public funds via the existing transparency service, already projected for the public site.
   */
  async getPublicFunds(slug: string) {
    return this.transparency.getPublicFunds(slug);
  }

  /**
   * The number of real, published rows behind each optional home page section. When a section's
   * count is zero the section should not render at all — the page shows no empty cards.
   */
  async getSectionAvailability(slug: string) {
    const mosque = await this.getPublicMosque(slug);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [services, events, announcements, funds, jumuah] = await Promise.all([
      this.prisma.service.count({
        where: { mosqueId: mosque.id, status: ServiceStatus.active, deletedAt: null },
      }),
      this.prisma.event.count({
        where: {
          mosqueId: mosque.id,
          deletedAt: null,
          isPublished: true,
          status: { in: [EventStatus.upcoming, EventStatus.ongoing] },
          date: { gte: today },
        },
      }),
      this.prisma.announcement.count({
        where: {
          mosqueId: mosque.id,
          status: AnnouncementStatus.published,
          audience: AnnouncementAudience.everyone,
          publishedAt: { lte: new Date() },
        },
      }),
      this.prisma.donationFund.count({
        where: {
          mosqueId: mosque.id,
          isPublic: true,
          status: { in: [FundStatus.active, FundStatus.completed] },
        },
      }),
      this.prisma.jumuahSchedule.count({
        where: { mosqueId: mosque.id, isActive: true },
      }),
    ]);

    return {
      services,
      events,
      announcements,
      funds,
      jumuah,
    };
  }
}
