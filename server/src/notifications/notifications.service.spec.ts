import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from './notifications.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';

describe('NotificationsService (PART 7 Verification)', () => {
  let service: NotificationsService;

  const mockMosqueId = 'mosque-notif-1';
  const mockOtherMosqueId = 'mosque-notif-2';
  const mockUserId1 = 'user-notif-1';
  const mockUserId2 = 'user-notif-2';

  const actorUser1: AuthenticatedUser = {
    id: mockUserId1,
    email: 'treasurer@noormosque.org',
    role: Role.treasurer,
    mosqueId: mockMosqueId,
    permissions: ['notification.viewOwn', 'finance.manage'],
    deniedPermissions: [],
    isActive: true,
  };

  const actorUser2: AuthenticatedUser = {
    id: mockUserId2,
    email: 'member@noormosque.org',
    role: Role.member,
    mosqueId: mockMosqueId,
    permissions: ['notification.viewOwn'],
    deniedPermissions: [],
    isActive: true,
  };

  const actorOtherMosque: AuthenticatedUser = {
    id: 'user-other-mosque',
    email: 'admin@othermosque.org',
    role: Role.mosque_admin,
    mosqueId: mockOtherMosqueId,
    permissions: ['notification.viewOwn'],
    deniedPermissions: [],
    isActive: true,
  };

  let notificationsDb: any[] = [];
  let usersDb: any[] = [];

  beforeEach(async () => {
    notificationsDb = [];
    usersDb = [
      {
        id: mockUserId1,
        mosqueId: mockMosqueId,
        role: Role.treasurer,
        isActive: true,
        deletedAt: null,
      },
      {
        id: 'admin-1',
        mosqueId: mockMosqueId,
        role: Role.mosque_admin,
        isActive: true,
        deletedAt: null,
      },
      {
        id: mockUserId2,
        mosqueId: mockMosqueId,
        role: Role.member,
        isActive: true,
        deletedAt: null,
      },
    ];

    const mockPrismaService = {
      notification: {
        create: jest.fn().mockImplementation(async ({ data }) => {
          const item = {
            id: `notif-${Date.now()}-${Math.random()}`,
            ...data,
            isRead: false,
            readAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          notificationsDb.push(item);
          return item;
        }),
        createMany: jest.fn().mockImplementation(async ({ data }) => {
          const createdList = data.map((d: any) => ({
            id: `notif-${Date.now()}-${Math.random()}`,
            ...d,
            isRead: false,
            readAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));
          notificationsDb.push(...createdList);
          return { count: createdList.length };
        }),
        findMany: jest.fn().mockImplementation(async ({ where, skip = 0, take = 20 }) => {
          return notificationsDb
            .filter((n) => {
              if (where.mosqueId && n.mosqueId !== where.mosqueId) return false;
              if (where.userId && n.userId !== where.userId) return false;
              if (where.isRead !== undefined && n.isRead !== where.isRead) return false;
              if (where.category && n.category !== where.category) return false;
              if (where.type && n.type !== where.type) return false;
              return true;
            })
            .slice(skip, skip + take);
        }),
        count: jest.fn().mockImplementation(async ({ where }) => {
          return notificationsDb.filter((n) => {
            if (where.mosqueId && n.mosqueId !== where.mosqueId) return false;
            if (where.userId && n.userId !== where.userId) return false;
            if (where.isRead !== undefined && n.isRead !== where.isRead) return false;
            if (where.category && n.category !== where.category) return false;
            if (where.type && n.type !== where.type) return false;
            return true;
          }).length;
        }),
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          return (
            notificationsDb.find((n) => {
              if (where.id && n.id !== where.id) return false;
              if (where.userId && n.userId !== where.userId) return false;
              if (where.mosqueId && n.mosqueId !== where.mosqueId) return false;
              return true;
            }) || null
          );
        }),
        update: jest.fn().mockImplementation(async ({ where, data }) => {
          const idx = notificationsDb.findIndex((n) => n.id === where.id);
          if (idx >= 0) {
            notificationsDb[idx] = { ...notificationsDb[idx], ...data };
            return notificationsDb[idx];
          }
          return null;
        }),
        updateMany: jest.fn().mockImplementation(async ({ where, data }) => {
          let count = 0;
          for (let i = 0; i < notificationsDb.length; i++) {
            const n = notificationsDb[i];
            if (where.mosqueId && n.mosqueId !== where.mosqueId) continue;
            if (where.userId && n.userId !== where.userId) continue;
            if (where.isRead !== undefined && n.isRead !== where.isRead) continue;
            notificationsDb[i] = { ...n, ...data };
            count++;
          }
          return { count };
        }),
        delete: jest.fn().mockImplementation(async ({ where }) => {
          const idx = notificationsDb.findIndex((n) => n.id === where.id);
          if (idx >= 0) {
            notificationsDb.splice(idx, 1);
            return { id: where.id };
          }
          return null;
        }),
      },
      broadcastMessage: {
        create: jest.fn().mockImplementation(async ({ data }) => {
          const item = {
            id: `broadcast-${Date.now()}-${Math.random()}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          notificationsDb.push(item);
          return item;
        }),
        createMany: jest.fn().mockImplementation(async ({ data }) => {
          const createdList = data.map((d: any) => ({
            id: `broadcast-${Date.now()}-${Math.random()}`,
            ...d,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));
          notificationsDb.push(...createdList);
          return { count: createdList.length };
        }),
        findMany: jest.fn().mockImplementation(async ({ where, skip = 0, take = 20 }) => {
          return notificationsDb
            .filter((b) => b.channel && (!where.mosqueId || b.mosqueId === where.mosqueId))
            .slice(skip, skip + take);
        }),
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          return (
            notificationsDb.find(
              (b) => b.channel && (!where.id || b.id === where.id) && (!where.mosqueId || b.mosqueId === where.mosqueId),
            ) || null
          );
        }),
        count: jest.fn().mockImplementation(async ({ where }) => {
          return notificationsDb.filter((b) => b.channel && (!where.mosqueId || b.mosqueId === where.mosqueId)).length;
        }),
        update: jest.fn().mockImplementation(async ({ where, data }) => {
          const idx = notificationsDb.findIndex((b) => b.id === where.id);
          if (idx >= 0) {
            notificationsDb[idx] = { ...notificationsDb[idx], ...data };
            return notificationsDb[idx];
          }
          return null;
        }),
        delete: jest.fn().mockImplementation(async ({ where }) => {
          const idx = notificationsDb.findIndex((b) => b.id === where.id);
          if (idx >= 0) {
            notificationsDb.splice(idx, 1);
            return { id: where.id };
          }
          return null;
        }),
      },
      user: {
        count: jest.fn().mockImplementation(async () => usersDb.length),
        findMany: jest.fn().mockImplementation(async ({ where }) => {
          return usersDb.filter((u) => {
            if (where.mosqueId && u.mosqueId !== where.mosqueId) return false;
            if (where.isActive !== undefined && u.isActive !== where.isActive) return false;
            if (where.deletedAt !== undefined && u.deletedAt !== where.deletedAt) return false;
            if (where.role && where.role.in && !where.role.in.includes(u.role)) return false;
            if (where.id && where.id.not && u.id === where.id.not) return false;
            return true;
          });
        }),
      },
    };

    const mockMailService = {
      isConfigured: jest.fn().mockReturnValue(true),
      sendMail: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-test-123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('Notification Dispatch & Event Processing', () => {
    it('TEST 1: Creates a notification for a specific user', async () => {
      const notif = await service.create(mockMosqueId, {
        userId: mockUserId2,
        title: 'Payment Receipt Ready',
        message: 'Your receipt REC-2026-00001 is ready.',
        type: NotificationType.receipt_ready,
        category: 'finance',
        resourceType: 'receipt',
        resourceId: 'rec-1',
        actionUrl: '/account/donations',
      });

      expect(notif).toBeDefined();
      expect(notif?.userId).toBe(mockUserId2);
      expect(notif?.title).toBe('Payment Receipt Ready');
      expect(notif?.isRead).toBe(false);
    });

    it('TEST 2: Broadcasts notification to all active finance admins on Jummah collection or expense event', async () => {
      await service.notifyFinanceAdmins(mockMosqueId, {
        title: 'Friday Collection Recorded',
        message: '৳10,000 recorded for Friday 2026-08-28 (Imam Salary Fund)',
        type: NotificationType.jummah_collection,
        category: 'jumuah',
        resourceType: 'jummah_collection',
        resourceId: 'col-1',
        actionUrl: '/dashboard/jumuah',
      });

      // Expected: notifications sent to treasurer (mockUserId1) and mosque_admin (admin-1)
      expect(notificationsDb).toHaveLength(2);
      expect(notificationsDb.map((n) => n.userId)).toContain(mockUserId1);
      expect(notificationsDb.map((n) => n.userId)).toContain('admin-1');
      expect(notificationsDb.map((n) => n.userId)).not.toContain(mockUserId2); // Normal member excluded
    });

    it('TEST 3: Queries paginated notifications and tracks unread counts accurately', async () => {
      // Create 3 notifications for User 1
      await service.create(mockMosqueId, {
        userId: mockUserId1,
        title: 'Notif 1',
        message: 'Msg 1',
        type: NotificationType.general,
      });
      await service.create(mockMosqueId, {
        userId: mockUserId1,
        title: 'Notif 2',
        message: 'Msg 2',
        type: NotificationType.general,
      });
      await service.create(mockMosqueId, {
        userId: mockUserId1,
        title: 'Notif 3',
        message: 'Msg 3',
        type: NotificationType.general,
      });

      const list = await service.findMany(actorUser1, { page: 1, limit: 10 });
      expect(list.data).toHaveLength(3);
      expect(list.meta.total).toBe(3);
      expect(list.meta.unreadCount).toBe(3);

      const unreadRes = await service.getUnreadCount(actorUser1);
      expect(unreadRes.unreadCount).toBe(3);
    });

    it('TEST 4: Marks a single notification as read and decrements unread count', async () => {
      const created = await service.create(mockMosqueId, {
        userId: mockUserId1,
        title: 'Notif 1',
        message: 'Msg 1',
        type: NotificationType.general,
      });

      expect(created?.isRead).toBe(false);

      const updated = await service.markAsRead(actorUser1, created!.id);
      expect(updated.isRead).toBe(true);
      expect(updated.readAt).toBeDefined();

      const unreadRes = await service.getUnreadCount(actorUser1);
      expect(unreadRes.unreadCount).toBe(0);
    });

    it('TEST 5: Marks all unread notifications as read atomically', async () => {
      await service.create(mockMosqueId, {
        userId: mockUserId1,
        title: 'N1',
        message: 'M1',
      });
      await service.create(mockMosqueId, {
        userId: mockUserId1,
        title: 'N2',
        message: 'M2',
      });

      const before = await service.getUnreadCount(actorUser1);
      expect(before.unreadCount).toBe(2);

      await service.markAllAsRead(actorUser1);

      const after = await service.getUnreadCount(actorUser1);
      expect(after.unreadCount).toBe(0);
    });

    it('TEST 6: Multi-tenant and recipient isolation is strictly enforced', async () => {
      // Create notification for User 1 in Mosque A
      const notif1 = await service.create(mockMosqueId, {
        userId: mockUserId1,
        title: 'Private Mosque A notification',
        message: 'Confidential finance info',
      });

      // User 2 (same mosque) attempts to read User 1's notification -> Rejected
      await expect(service.markAsRead(actorUser2, notif1!.id)).rejects.toThrow();

      // Actor in Mosque B attempts to read Mosque A notification -> Rejected
      await expect(service.markAsRead(actorOtherMosque, notif1!.id)).rejects.toThrow();

      // Mosque B queries notifications -> returns 0
      const listB = await service.findMany(actorOtherMosque, {});
      expect(listB.data).toHaveLength(0);
      expect(listB.meta.total).toBe(0);
    });

    it('TEST 7: Creates and retrieves broadcast campaigns with aggregate stats', async () => {
      const created = await service.createBroadcast(actorUser1, {
        title: 'Jumuah Parking Reminder',
        message: 'Please park in designated bays today.',
        channel: 'push' as any,
        audience: 'Whole community',
        status: 'sent' as any,
      });

      expect(created.title).toBe('Jumuah Parking Reminder');
      expect(created.channel).toBe('Push');
      expect(created.status).toBe('Sent');
      expect(created.recipients).toBeGreaterThanOrEqual(1);

      const broadcasts = await service.findBroadcasts(actorUser1, { page: 1, limit: 10 });
      expect(broadcasts.rows.length).toBeGreaterThanOrEqual(1);

      const stats = await service.getBroadcastStats(actorUser1);
      expect(stats.total).toBeGreaterThanOrEqual(1);
      expect(stats.sent).toBeGreaterThanOrEqual(1);
    });
  });
});

