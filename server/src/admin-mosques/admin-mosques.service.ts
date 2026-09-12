import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Position, Role } from '@prisma/client';
import * as argon2 from 'argon2';

import { AuditLogService } from '../audit/audit-log.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdditionalMosqueAdminDto } from './dto/create-mosque-admin.dto';
import { CreateMosqueDto } from './dto/create-mosque.dto';
import {
  AdminMosqueDetailDto,
  AdminMosqueSummaryDto,
  PlatformOverviewDto,
  MosqueComparisonRowDto,
  PlatformChartsDto,
} from './dto/admin-mosque-response.dto';
import { UpdateMosqueStatusDto } from './dto/update-mosque-status.dto';
import { UpdateMosqueAdminDto } from './dto/update-mosque.dto';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class AdminMosquesService {
  private readonly logger = new Logger(AdminMosquesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  /**
   * Comprehensive platform-wide analytics and overview across all mosques.
   * Calculates real metrics, chart distributions, and comparative standings.
   */
  async getPlatformOverview(): Promise<PlatformOverviewDto> {
    const [
      totalMosques,
      activeMosques,
      suspendedMosques,
      totalUsers,
      totalMembers,
      totalStaff,
      totalEvents,
      totalBookings,
      totalAnnouncements,
      donationsAgg,
      collectionsAgg,
      mosques,
    ] = await Promise.all([
      this.prisma.mosque.count(),
      this.prisma.mosque.count({ where: { status: 'active' } }),
      this.prisma.mosque.count({ where: { status: 'suspended' } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { role: Role.member, deletedAt: null } }),
      this.prisma.user.count({ where: { role: { not: Role.member }, deletedAt: null } }),
      this.prisma.event.count(),
      this.prisma.booking.count(),
      this.prisma.announcement.count(),
      this.prisma.donation.aggregate({
        _sum: { amount: true },
        where: { status: 'completed' },
      }),
      this.prisma.jummahCollection.aggregate({
        _sum: { amount: true },
      }),
      this.prisma.mosque.findMany({
        orderBy: [{ createdAt: 'asc' }],
        include: {
          _count: {
            select: {
              users: true,
              events: true,
              bookings: true,
              announcements: true,
            },
          },
          users: {
            where: { role: Role.mosque_admin, deletedAt: null },
            select: { id: true },
          },
          donations: {
            where: { status: 'completed' },
            select: { amount: true },
          },
          jummahCollections: {
            select: { amount: true },
          },
          auditLogs: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          },
        },
      }),
    ]);

    const totalDonations = donationsAgg._sum.amount ? Number(donationsAgg._sum.amount) : 0;
    const totalCollections = collectionsAgg._sum.amount ? Number(collectionsAgg._sum.amount) : 0;
    const totalRevenue = totalDonations + totalCollections;

    // Build comparison rows and chart points
    const comparison: MosqueComparisonRowDto[] = mosques.map((m) => {
      const donationSum = m.donations.reduce((sum, d) => sum + Number(d.amount), 0);
      const collectionSum = m.jummahCollections.reduce((sum, c) => sum + Number(c.amount), 0);
      const mosqueRevenue = donationSum + collectionSum;

      const lastActivity = m.auditLogs[0]?.createdAt.toISOString() || m.updatedAt.toISOString();

      return {
        id: m.id,
        name: m.name,
        code: m.code,
        slug: m.slug,
        city: m.city,
        country: m.country,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
        stats: {
          usersCount: m._count.users,
          adminsCount: m.users.length,
          eventsCount: m._count.events,
          bookingsCount: m._count.bookings,
          announcementsCount: m._count.announcements,
          totalRevenue: mosqueRevenue,
        },
        lastActivity,
      };
    });

    const charts: PlatformChartsDto = {
      mosqueStatus: [
        { label: 'Active', value: activeMosques },
        { label: 'Suspended', value: suspendedMosques },
      ],
      membersByMosque: comparison.map((c) => ({
        label: c.name,
        value: c.stats.usersCount,
      })),
      eventsByMosque: comparison.map((c) => ({
        label: c.name,
        value: c.stats.eventsCount,
      })),
      bookingsByMosque: comparison.map((c) => ({
        label: c.name,
        value: c.stats.bookingsCount,
      })),
      revenueByMosque: comparison.map((c) => ({
        label: c.name,
        value: c.stats.totalRevenue,
      })),
    };

    return {
      metrics: {
        totalMosques,
        activeMosques,
        suspendedMosques,
        totalUsers,
        totalMembers,
        totalStaff,
        totalEvents,
        totalBookings,
        totalAnnouncements,
        totalRevenue,
      },
      charts,
      comparison,
    };
  }

  /**
   * List all mosques on the platform with operational metrics.
   * Exclusively accessible by platform super administrators.
   */
  async listMosques(): Promise<AdminMosqueSummaryDto[]> {
    const mosques = await this.prisma.mosque.findMany({
      orderBy: [{ createdAt: 'asc' }],
      include: {
        _count: {
          select: {
            users: true,
            events: true,
            bookings: true,
            announcements: true,
          },
        },
        users: {
          where: { role: Role.mosque_admin, deletedAt: null },
          select: { id: true },
        },
      },
    });

    return mosques.map((m) => ({
      id: m.id,
      slug: m.slug,
      code: m.code,
      domain: m.domain,
      name: m.name,
      status: m.status,
      isActive: m.isActive,
      email: m.email,
      phone: m.phone,
      city: m.city,
      country: m.country,
      timezone: m.timezone,
      userCount: m._count.users,
      adminCount: m.users.length,
      eventCount: m._count.events,
      announcementCount: m._count.announcements,
      stats: {
        usersCount: m._count.users,
        adminsCount: m.users.length,
        eventsCount: m._count.events,
        announcementsCount: m._count.announcements,
        bookingsCount: m._count.bookings,
        totalRevenue: 0,
      },
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));
  }

  /**
   * Retrieve full details of a specific mosque including its administrators.
   */
  async getMosque(id: string): Promise<AdminMosqueDetailDto> {
    const mosque = await this.prisma.mosque.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            events: true,
            announcements: true,
          },
        },
        users: {
          where: {
            role: { in: [Role.mosque_admin, Role.super_admin] },
            deletedAt: null,
          },
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
          },
          orderBy: [{ fullName: 'asc' }],
        },
      },
    });

    if (!mosque) {
      throw new NotFoundException(`Mosque with ID "${id}" not found.`);
    }

    return {
      id: mosque.id,
      slug: mosque.slug,
      code: mosque.code,
      domain: mosque.domain,
      name: mosque.name,
      status: mosque.status,
      isActive: mosque.isActive,
      email: mosque.email,
      phone: mosque.phone,
      website: mosque.website,
      addressLine: mosque.addressLine,
      city: mosque.city,
      district: mosque.district,
      country: mosque.country,
      postalCode: mosque.postalCode,
      timezone: mosque.timezone,
      establishedYear: mosque.establishedYear,
      description: mosque.description,
      logoUrl: mosque.logoUrl,
      userCount: mosque._count.users,
      adminCount: mosque.users.length,
      eventCount: mosque._count.events,
      announcementCount: mosque._count.announcements,
      stats: {
        usersCount: mosque._count.users,
        adminsCount: mosque.users.length,
        eventsCount: mosque._count.events,
        announcementsCount: mosque._count.announcements,
        bookingsCount: 0,
        totalRevenue: 0,
      },
      administrators: mosque.users,
      createdAt: mosque.createdAt.toISOString(),
      updatedAt: mosque.updatedAt.toISOString(),
    };
  }

  /**
   * Create a new mosque tenant and its initial administrator in an atomic transaction.
   */
  async createMosqueWithAdmin(
    dto: CreateMosqueDto,
    actor: AuthenticatedUser,
  ): Promise<AdminMosqueDetailDto> {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    if (!slug) {
      throw new BadRequestException('A valid name or slug is required.');
    }

    // Check slug uniqueness
    const existingSlug = await this.prisma.mosque.findUnique({ where: { slug } });
    if (existingSlug) {
      throw new ConflictException(`A mosque with slug "${slug}" already exists.`);
    }

    const domain = dto.domain?.trim().toLowerCase() || null;
    if (domain) {
      const existingDomain = await this.prisma.mosque.findUnique({ where: { domain } });
      if (existingDomain) {
        throw new ConflictException(`A mosque with domain "${domain}" already exists.`);
      }
    }

    // Determine or generate unique business code
    let code = dto.code?.trim().toUpperCase();
    if (code) {
      const existingCode = await this.prisma.mosque.findUnique({ where: { code } });
      if (existingCode) {
        throw new ConflictException(`A mosque with code "${code}" already exists.`);
      }
    } else {
      // Auto-generate code like MOS-003
      const count = await this.prisma.mosque.count();
      code = `MOS-${String(count + 1).padStart(3, '0')}`;
    }

    // Hash admin password using argon2id
    const passwordHash = await argon2.hash(dto.adminPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });

    // Execute atomic creation
    const createdMosque = await this.prisma.$transaction(async (tx) => {
      const m = await tx.mosque.create({
        data: {
          name: dto.name.trim(),
          code,
          slug,
          domain,
          email: dto.email?.trim() || null,
          phone: dto.phone?.trim() || null,
          website: dto.website?.trim() || null,
          addressLine: dto.addressLine?.trim() || null,
          city: dto.city?.trim() || null,
          district: dto.district?.trim() || null,
          country: dto.country?.trim() || 'Bangladesh',
          postalCode: dto.postalCode?.trim() || null,
          timezone: dto.timezone?.trim() || 'Asia/Dhaka',
          establishedYear: dto.establishedYear || null,
          description: dto.description?.trim() || null,
          status: 'active',
          isActive: true,
          settings: {
            create: {
              defaultLanguage: 'en',
              currency: 'BDT',
              dateFormat: 'DD/MM/YYYY',
            },
          },
          prayerSettings: {
            create: {},
          },
        },
      });

      // Create initial Mosque Administrator
      await tx.user.create({
        data: {
          mosqueId: m.id,
          fullName: dto.adminFullName.trim(),
          email: dto.adminEmail.trim().toLowerCase(),
          phone: dto.adminPhone?.trim() || null,
          passwordHash,
          role: Role.mosque_admin,
          positions: [Position.president],
          isActive: true,
        },
      });

      return m;
    });

    // Record audit entry
    await this.audit.record({
      actorId: actor.id,
      actorName: actor.email,
      actorRole: actor.role,
      mosqueId: createdMosque.id,
      action: 'MOSQUE_CREATED',
      resource: 'mosque',
      resourceId: createdMosque.id,
      changes: {
        name: createdMosque.name,
        code: createdMosque.code,
        slug: createdMosque.slug,
        initialAdmin: dto.adminEmail.trim().toLowerCase(),
      },
      note: 'Platform Super Admin created new mosque tenant with initial administrator.',
    });

    return this.getMosque(createdMosque.id);
  }

  /**
   * Update mosque profile details.
   */
  async updateMosque(
    id: string,
    dto: UpdateMosqueAdminDto,
    actor: AuthenticatedUser,
  ): Promise<AdminMosqueDetailDto> {
    const existing = await this.prisma.mosque.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Mosque with ID "${id}" not found.`);
    }

    if (dto.code && dto.code !== existing.code) {
      const codeCheck = await this.prisma.mosque.findUnique({
        where: { code: dto.code.trim().toUpperCase() },
      });
      if (codeCheck && codeCheck.id !== id) {
        throw new ConflictException(`Code "${dto.code}" is already in use.`);
      }
    }

    if (dto.domain !== undefined) {
      const domain = dto.domain.trim().toLowerCase() || null;
      if (domain) {
        const domainCheck = await this.prisma.mosque.findUnique({ where: { domain } });
        if (domainCheck && domainCheck.id !== id) {
          throw new ConflictException(`Domain "${domain}" is already in use.`);
        }
      }
    }

    const updated = await this.prisma.mosque.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        code: dto.code !== undefined ? dto.code.trim().toUpperCase() : undefined,
        domain: dto.domain !== undefined ? dto.domain.trim().toLowerCase() || null : undefined,
        email: dto.email !== undefined ? dto.email?.trim() || null : undefined,
        phone: dto.phone !== undefined ? dto.phone?.trim() || null : undefined,
        website: dto.website !== undefined ? dto.website?.trim() || null : undefined,
        addressLine: dto.addressLine !== undefined ? dto.addressLine?.trim() || null : undefined,
        city: dto.city !== undefined ? dto.city?.trim() || null : undefined,
        district: dto.district !== undefined ? dto.district?.trim() || null : undefined,
        country: dto.country !== undefined ? dto.country?.trim() || null : undefined,
        postalCode: dto.postalCode !== undefined ? dto.postalCode?.trim() || null : undefined,
        timezone: dto.timezone !== undefined ? dto.timezone?.trim() : undefined,
        establishedYear: dto.establishedYear !== undefined ? dto.establishedYear : undefined,
        description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
      },
    });

    await this.audit.record({
      actorId: actor.id,
      actorName: actor.email,
      actorRole: actor.role,
      mosqueId: updated.id,
      action: 'MOSQUE_UPDATED',
      resource: 'mosque',
      resourceId: updated.id,
      changes: dto as Record<string, unknown>,
    });

    return this.getMosque(id);
  }

  /**
   * Set mosque operational status (active, suspended, inactive).
   * If suspended, normal staff logins are deactivated while keeping all data intact.
   */
  async setMosqueStatus(
    id: string,
    dto: UpdateMosqueStatusDto,
    actor: AuthenticatedUser,
  ): Promise<AdminMosqueDetailDto> {
    const existing = await this.prisma.mosque.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Mosque with ID "${id}" not found.`);
    }

    const isActive = dto.status === 'active';

    const updated = await this.prisma.mosque.update({
      where: { id },
      data: {
        status: dto.status,
        isActive,
      },
    });

    await this.audit.record({
      actorId: actor.id,
      actorName: actor.email,
      actorRole: actor.role,
      mosqueId: updated.id,
      action: 'MOSQUE_STATUS_CHANGED',
      resource: 'mosque',
      resourceId: updated.id,
      changes: {
        previousStatus: existing.status,
        newStatus: dto.status,
        isActive,
      },
      note: `Mosque status changed to ${dto.status}.`,
    });

    return this.getMosque(id);
  }

  /**
   * Add or assign an additional administrator to an existing mosque.
   */
  async addMosqueAdmin(
    id: string,
    dto: CreateAdditionalMosqueAdminDto,
    actor: AuthenticatedUser,
  ): Promise<AdminMosqueDetailDto> {
    const mosque = await this.prisma.mosque.findUnique({ where: { id } });
    if (!mosque) {
      throw new NotFoundException(`Mosque with ID "${id}" not found.`);
    }

    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { mosqueId_email: { mosqueId: id, email } },
    });

    if (existingUser) {
      throw new ConflictException(
        `An account with email "${email}" already exists in this mosque.`,
      );
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });

    const user = await this.prisma.user.create({
      data: {
        mosqueId: id,
        fullName: dto.fullName.trim(),
        email,
        phone: dto.phone?.trim() || null,
        passwordHash,
        role: Role.mosque_admin,
        positions: [Position.vice_president],
        isActive: true,
      },
    });

    await this.audit.record({
      actorId: actor.id,
      actorName: actor.email,
      actorRole: actor.role,
      mosqueId: id,
      action: 'USER_CREATED',
      resource: 'user',
      resourceId: user.id,
      changes: {
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
      note: `Additional mosque administrator added by Super Admin.`,
    });

    return this.getMosque(id);
  }
}
