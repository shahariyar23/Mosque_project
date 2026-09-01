import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';

import { AuditLogService } from '../audit/audit-log.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from './events.service';
import { EventCategory, EventStatus } from './dto/event.dto';

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';
const OTHER_MOSQUE_ID = 'd0b80121-7ac0-11d1-898c-00c04fd8d5c1';
const EVENT_ID = '1b4e28ba-2fa1-11d2-883f-0016d3cca427';

const ACTOR: AuthenticatedUser = {
  id: 'actor-123',
  mosqueId: MOSQUE_ID,
  email: 'admin@noor.org',
  role: Role.mosque_admin,
  permissions: ['event.view', 'event.create', 'event.update', 'event.delete'],
  deniedPermissions: [],
  isActive: true,
};

const OTHER_ACTOR: AuthenticatedUser = {
  id: 'actor-456',
  mosqueId: OTHER_MOSQUE_ID,
  email: 'other.admin@noor.org',
  role: Role.mosque_admin,
  permissions: ['event.view', 'event.create', 'event.update', 'event.delete'],
  deniedPermissions: [],
  isActive: true,
};

function mockEventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: EVENT_ID,
    mosqueId: MOSQUE_ID,
    title: 'Youth Islamic Seminar',
    slug: 'youth-islamic-seminar',
    category: EventCategory.youth,
    status: EventStatus.upcoming,
    date: new Date('2026-08-25T00:00:00.000Z'),
    startTime: '19:30',
    endTime: '21:00',
    timeLabel: null,
    location: 'Community Hall',
    speaker: 'Dr. Abdullah Rahman',
    description: 'An evening for youth on holding onto faith.',
    capacity: 200,
    registrationRequired: true,
    contribution: new Prisma.Decimal('0.00'),
    imageUrl: null,
    isPublished: true,
    createdAt: new Date('2026-08-01T10:00:00.000Z'),
    updatedAt: new Date('2026-08-01T10:00:00.000Z'),
    deletedAt: null,
    registrations: [{ guests: 2 }, { guests: 0 }],
    ...overrides,
  };
}

describe('EventsService', () => {
  let service: EventsService;
  let prisma: PrismaService;
  let audit: AuditLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: PrismaService,
          useValue: {
            event: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              count: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            record: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(EventsService);
    prisma = module.get(PrismaService);
    audit = module.get(AuditLogService);
  });

  const table = () => prisma.event as unknown as Record<string, jest.Mock>;

  describe('findAll', () => {
    it('scopes query to the authenticated mosque and excludes deleted records', async () => {
      table().count.mockResolvedValue(1);
      table().findMany.mockResolvedValue([mockEventRow()]);

      const result = await service.findAll(MOSQUE_ID, { page: 1, pageSize: 10 });

      expect(table().findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ mosqueId: MOSQUE_ID, deletedAt: null }),
        }),
      );
      if (!Array.isArray(result)) {
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].title).toBe('Youth Islamic Seminar');
        expect(result.rows[0].registered).toBe(4); // 2 registrations + 2 guests
      }
    });

    it('returns array directly when all: true is requested', async () => {
      table().findMany.mockResolvedValue([mockEventRow()]);

      const result = await service.findAll(MOSQUE_ID, { all: true });

      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) {
        expect(result[0].slug).toBe('youth-islamic-seminar');
      }
    });
  });

  describe('findOne', () => {
    it('finds event by UUID id', async () => {
      table().findFirst.mockResolvedValue(mockEventRow());

      const result = await service.findOne(MOSQUE_ID, EVENT_ID);

      expect(result.id).toBe(EVENT_ID);
      expect(result.registered).toBe(4);
    });

    it('finds event by slug', async () => {
      table().findFirst.mockResolvedValue(mockEventRow());

      const result = await service.findOne(MOSQUE_ID, 'youth-islamic-seminar');

      expect(result.slug).toBe('youth-islamic-seminar');
    });

    it('throws NotFoundException when event is missing or belongs to another mosque', async () => {
      table().findFirst.mockResolvedValue(null);

      await expect(service.findOne(OTHER_MOSQUE_ID, EVENT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates an event with auto-derived slug and records audit log', async () => {
      table().findFirst.mockResolvedValue(null); // No slug conflict
      table().create.mockResolvedValue(mockEventRow({ registrations: [] }));

      const created = await service.create(ACTOR, {
        title: 'Youth Islamic Seminar',
        category: EventCategory.youth,
        date: '2026-08-25',
        startTime: '19:30',
        location: 'Community Hall',
        description: 'An evening for youth.',
      });

      expect(created.id).toBe(EVENT_ID);
      expect(table().create).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'EVENT_CREATED',
          resource: 'event',
          actorId: ACTOR.id,
          mosqueId: MOSQUE_ID,
        }),
      );
    });

    it('resolves unique slug if base slug already exists in mosque', async () => {
      table()
        .findFirst.mockResolvedValueOnce({ id: 'existing-1' }) // first attempt collides
        .mockResolvedValueOnce(null); // second attempt succeeds
      table().create.mockResolvedValue(mockEventRow({ slug: 'youth-islamic-seminar-2', registrations: [] }));

      const created = await service.create(ACTOR, {
        title: 'Youth Islamic Seminar',
        category: EventCategory.youth,
        date: '2026-08-25',
        startTime: '19:30',
        location: 'Community Hall',
        description: 'An evening for youth.',
      });

      expect(created.slug).toBe('youth-islamic-seminar-2');
    });
  });

  describe('update', () => {
    it('updates event fields and writes audit log', async () => {
      table().findFirst.mockResolvedValue(mockEventRow());
      table().update.mockResolvedValue(mockEventRow({ title: 'Updated Seminar' }));

      const updated = await service.update(ACTOR, EVENT_ID, {
        title: 'Updated Seminar',
      });

      expect(updated.title).toBe('Updated Seminar');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'EVENT_UPDATED',
          resource: 'event',
        }),
      );
    });

    it('rejects slug conflict with another event in the same mosque', async () => {
      table()
        .findFirst.mockResolvedValueOnce(mockEventRow()) // getOwned
        .mockResolvedValueOnce({ id: 'another-event-id' }); // slug conflict check

      await expect(
        service.update(ACTOR, EVENT_ID, { slug: 'conflicting-slug' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when updating an event from another mosque', async () => {
      table().findFirst.mockResolvedValue(null);

      await expect(
        service.update(OTHER_ACTOR, EVENT_ID, { title: 'Cross tenant update' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft deletes event and records audit log', async () => {
      table().findFirst.mockResolvedValue(mockEventRow());
      table().update.mockResolvedValue(mockEventRow({ deletedAt: new Date(), status: EventStatus.cancelled }));

      const removed = await service.remove(ACTOR, EVENT_ID);

      expect(removed.status).toBe(EventStatus.cancelled);
      expect(table().update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: EVENT_ID },
          data: expect.objectContaining({ status: EventStatus.cancelled }),
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'EVENT_DELETED',
          resource: 'event',
        }),
      );
    });

    it('throws NotFoundException when deleting event from another mosque', async () => {
      table().findFirst.mockResolvedValue(null);

      await expect(service.remove(OTHER_ACTOR, EVENT_ID)).rejects.toThrow(NotFoundException);
    });
  });
});

