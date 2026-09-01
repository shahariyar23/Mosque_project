import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { AuditLogService } from '../audit/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AnnouncementsService } from './announcements.service';
import {
  AnnouncementAudienceEnum,
  AnnouncementCategoryEnum,
  AnnouncementStatusEnum,
} from './dto/create-announcement.dto';

describe('AnnouncementsService', () => {
  let service: AnnouncementsService;
  let prisma: any;
  let notifications: any;

  const mockActor = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'admin@noormosque.org',
    role: Role.mosque_admin,
    mosqueId: '22222222-2222-4222-8222-222222222222',
    permissions: ['announcement.manage', 'announcement.publish', 'announcement.view'],
    deniedPermissions: [],
    isActive: true,
  };

  const storedAnnouncements: any[] = [];
  const dispatchedNotifications: any[] = [];

  const mockPrisma = {
    announcement: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const item = {
          id: `anc-${storedAnnouncements.length + 1}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: { fullName: 'Mosque Admin' },
        };
        storedAnnouncements.push(item);
        return item;
      }),
      findMany: jest.fn().mockImplementation(async ({ where, skip = 0, take = 10, orderBy }) => {
        return storedAnnouncements
          .filter((a) => {
            if (where.mosqueId && a.mosqueId !== where.mosqueId) return false;
            if (where.category && a.category !== where.category) return false;
            if (where.status && a.status !== where.status) return false;
            if (where.audience && a.audience !== where.audience) return false;
            if (where.isPinned !== undefined && a.isPinned !== where.isPinned) return false;
            return true;
          })
          .slice(skip, skip + take);
      }),
      count: jest.fn().mockImplementation(async ({ where }) => {
        return storedAnnouncements.filter((a) => {
          if (where.mosqueId && a.mosqueId !== where.mosqueId) return false;
          if (where.category && a.category !== where.category) return false;
          if (where.status && a.status !== where.status) return false;
          if (where.audience && a.audience !== where.audience) return false;
          if (where.isPinned !== undefined && a.isPinned !== where.isPinned) return false;
          return true;
        }).length;
      }),
      findFirst: jest.fn().mockImplementation(async ({ where }) => {
        return storedAnnouncements.find(
          (a) => a.id === where.id && (!where.mosqueId || a.mosqueId === where.mosqueId),
        ) || null;
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const idx = storedAnnouncements.findIndex((a) => a.id === where.id);
        if (idx === -1) throw new Error('Not found');
        const updated = {
          ...storedAnnouncements[idx],
          ...data,
          updatedAt: new Date(),
        };
        storedAnnouncements[idx] = updated;
        return updated;
      }),
      delete: jest.fn().mockImplementation(async ({ where }) => {
        const idx = storedAnnouncements.findIndex((a) => a.id === where.id);
        if (idx !== -1) storedAnnouncements.splice(idx, 1);
        return { success: true };
      }),
    },
    mosque: {
      findUnique: jest.fn().mockImplementation(async ({ where }) => {
        if (where.slug === 'noor-mosque') return { id: mockActor.mosqueId, slug: 'noor-mosque' };
        return null;
      }),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
      ]),
    },
  };

  const mockAudit = {
    record: jest.fn().mockResolvedValue(undefined),
  };

  const mockNotifications = {
    notifyUsers: jest.fn().mockImplementation(async (mosqueId, userIds, data) => {
      for (const uid of userIds) {
        dispatchedNotifications.push({ mosqueId, userId: uid, ...data });
      }
    }),
    create: jest.fn().mockImplementation(async (mosqueId, payload) => {
      dispatchedNotifications.push({ mosqueId, ...payload });
      return payload;
    }),
  };

  beforeEach(async () => {
    storedAnnouncements.length = 0;
    dispatchedNotifications.length = 0;
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAudit },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<AnnouncementsService>(AnnouncementsService);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('1. Creates an announcement in Draft state without notifications', async () => {
    const res = await service.create(mockActor, {
      title: 'Draft Announcement',
      content: 'Testing draft content',
      category: AnnouncementCategoryEnum.general,
      status: AnnouncementStatusEnum.draft,
    });

    expect(res.title).toBe('Draft Announcement');
    expect(res.status).toBe('Draft');
    expect(dispatchedNotifications).toHaveLength(0);
    expect(mockAudit.record).toHaveBeenCalled();
  });

  it('2. Creates a Published announcement and dispatches in-app notifications', async () => {
    const res = await service.create(mockActor, {
      title: 'Urgent Closure',
      content: 'Water pipe repair underway.',
      category: AnnouncementCategoryEnum.closure,
      status: AnnouncementStatusEnum.published,
      pinned: true,
    });

    expect(res.status).toBe('Published');
    expect(res.pinned).toBe(true);
    expect(dispatchedNotifications).toHaveLength(2); // user-1 and user-2
    expect(dispatchedNotifications[0].title).toContain('Urgent Closure');
  });

  it('3. Rejects scheduled announcement if scheduledAt is missing', async () => {
    await expect(
      service.create(mockActor, {
        title: 'Future Notice',
        content: 'Something for later',
        status: AnnouncementStatusEnum.scheduled,
      }),
    ).rejects.toThrow('Scheduled announcements require a scheduledAt date/time');
  });

  it('4. Filters announcements by category and status', async () => {
    await service.create(mockActor, {
      title: 'Prayer Timetable Update',
      content: 'New schedule',
      category: AnnouncementCategoryEnum.prayer,
      status: AnnouncementStatusEnum.published,
    });
    await service.create(mockActor, {
      title: 'Community Dinner',
      content: 'Weekend dinner',
      category: AnnouncementCategoryEnum.event,
      status: AnnouncementStatusEnum.draft,
    });

    const prayerOnly = await service.findAll(mockActor, {
      category: AnnouncementCategoryEnum.prayer,
    });
    expect(prayerOnly.rows).toHaveLength(1);
    expect(prayerOnly.rows[0].title).toBe('Prayer Timetable Update');

    const publishedOnly = await service.findAll(mockActor, {
      status: AnnouncementStatusEnum.published,
    });
    expect(publishedOnly.rows).toHaveLength(1);
    expect(publishedOnly.rows[0].category).toBe('Prayer');
  });

  it('5. Computes dashboard stats accurately', async () => {
    await service.create(mockActor, {
      title: 'Notice 1',
      content: 'Content 1',
      status: AnnouncementStatusEnum.published,
      pinned: true,
    });
    await service.create(mockActor, {
      title: 'Notice 2',
      content: 'Content 2',
      status: AnnouncementStatusEnum.scheduled,
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    });

    const stats = await service.getStats(mockActor);
    expect(stats.total).toBe(2);
    expect(stats.published).toBe(1);
    expect(stats.scheduled).toBe(1);
    expect(stats.pinned).toBe(1);
  });

  it('6. Publishes a draft and dispatches notifications', async () => {
    const draft = await service.create(mockActor, {
      title: 'Draft To Publish',
      content: 'Now ready for the community',
      status: AnnouncementStatusEnum.draft,
    });

    dispatchedNotifications.length = 0;

    const published = await service.publish(mockActor, draft.id);
    expect(published.status).toBe('Published');
    expect(dispatchedNotifications).toHaveLength(2);
  });

  it('7. Toggles pinned status', async () => {
    const item = await service.create(mockActor, {
      title: 'To Pin',
      content: 'Pin test',
      pinned: false,
    });

    const pinned = await service.togglePin(mockActor, item.id);
    expect(pinned.pinned).toBe(true);

    const unpinned = await service.togglePin(mockActor, item.id);
    expect(unpinned.pinned).toBe(false);
  });

  it('8. Finds public announcements for mosque slug', async () => {
    await service.create(mockActor, {
      title: 'Public Notice',
      content: 'For everyone',
      audience: AnnouncementAudienceEnum.everyone,
      status: AnnouncementStatusEnum.published,
    });
    await service.create(mockActor, {
      title: 'Internal Admin Notice',
      content: 'Admins only',
      audience: AnnouncementAudienceEnum.members,
      status: AnnouncementStatusEnum.published,
    });

    const pub = await service.findPublic('noor-mosque', {});
    expect(pub.rows).toHaveLength(1);
    expect(pub.rows[0].title).toBe('Public Notice');
  });

  it('9. Automatically publishes due scheduled announcements', async () => {
    const pastDate = new Date(Date.now() - 60000).toISOString();
    await service.create(mockActor, {
      title: 'Scheduled Past Notice',
      content: 'Time to go live',
      status: AnnouncementStatusEnum.scheduled,
      scheduledAt: pastDate,
    });

    dispatchedNotifications.length = 0;
    const processed = await service.processScheduledAnnouncements();
    expect(processed).toBe(1);
    expect(dispatchedNotifications).toHaveLength(2);
  });
});
