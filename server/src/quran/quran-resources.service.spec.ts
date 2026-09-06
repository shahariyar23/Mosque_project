import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Role, QuranFormat, QuranResourceType, QuranStatus } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';

import { AuditLogService } from '../audit/audit-log.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { QuranResourcesService } from './quran-resources.service';

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';
const OTHER_MOSQUE_ID = 'd0b80121-7ac0-11d1-898c-00c04fd8d5c1';
const RESOURCE_ID = '1b4e28ba-2fa1-11d2-883f-0016d3cca427';

const ACTOR: AuthenticatedUser = {
  id: 'actor-123',
  mosqueId: MOSQUE_ID,
  email: 'admin@noor.org',
  role: Role.mosque_admin,
  permissions: [
    'quran.view',
    'quran.create',
    'quran.update',
    'quran.delete',
    'quran.publish',
    'quran.schedule',
    'quran.manage',
  ],
  deniedPermissions: [],
  isActive: true,
};

const OTHER_ACTOR: AuthenticatedUser = {
  id: 'actor-456',
  mosqueId: OTHER_MOSQUE_ID,
  email: 'other.admin@noor.org',
  role: Role.mosque_admin,
  permissions: ['quran.view', 'quran.create', 'quran.update', 'quran.delete'],
  deniedPermissions: [],
  isActive: true,
};

function mockResourceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: RESOURCE_ID,
    mosqueId: MOSQUE_ID,
    title: 'Surah Ya-Sin — Thursday evening recitation',
    summary: 'A measured recitation of Ya-Sin.',
    description: 'Filmed during the mosque’s Thursday gathering.',
    type: QuranResourceType.recitation,
    format: QuranFormat.audio,
    status: QuranStatus.draft,
    surah: 'Ya-Sin',
    reference: 'Surah 36 · Ayah 1–83',
    ayahStart: null,
    ayahEnd: null,
    reciter: 'Qari Saifullah Ansari',
    author: null,
    language: 'Arabic',
    mediaUrl: null,
    thumbnailUrl: null,
    duration: '22 min',
    isFeatured: false,
    publishedAt: null,
    scheduledAt: null,
    archivedAt: null,
    createdAt: new Date('2026-08-01T10:00:00.000Z'),
    updatedAt: new Date('2026-08-01T10:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

const AUDIT_ROW: Record<string, unknown> = {};

describe('QuranResourcesService', () => {
  let service: QuranResourcesService;
  let prisma: {
    quranResource: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let audit: { record: jest.Mock };

  beforeEach(async () => {
    prisma = {
      quranResource: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    audit = { record: jest.fn().mockResolvedValue(AUDIT_ROW) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuranResourcesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: audit },
      ],
    }).compile();

    service = module.get(QuranResourcesService);
  });

  describe('tenant scoping', () => {
    it('findOne refuses a resource that belongs to another mosque', async () => {
      prisma.quranResource.findFirst.mockResolvedValue(null);

      await expect(service.findOne(OTHER_MOSQUE_ID, RESOURCE_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.quranResource.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: RESOURCE_ID, mosqueId: OTHER_MOSQUE_ID }),
        }),
      );
    });

    it('update refuses a resource that belongs to another mosque', async () => {
      prisma.quranResource.findFirst.mockResolvedValue(null);

      await expect(service.update(OTHER_ACTOR, RESOURCE_ID, { title: 'Hijack' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.quranResource.update).not.toHaveBeenCalled();
    });

    it('delete refuses a resource that belongs to another mosque', async () => {
      prisma.quranResource.findFirst.mockResolvedValue(null);

      await expect(service.remove(OTHER_ACTOR, RESOURCE_ID)).rejects.toThrow(NotFoundException);
      expect(prisma.quranResource.update).not.toHaveBeenCalled();
    });

    it('publish refuses a resource that belongs to another mosque', async () => {
      prisma.quranResource.findFirst.mockResolvedValue(null);

      await expect(service.publish(OTHER_ACTOR, RESOURCE_ID)).rejects.toThrow(NotFoundException);
      expect(prisma.quranResource.update).not.toHaveBeenCalled();
    });

    it('create always writes the actor’s mosque, never a body-supplied one', async () => {
      prisma.quranResource.create.mockResolvedValue(mockResourceRow({ status: QuranStatus.draft }));

      await service.create(ACTOR, {
        title: 'Tafsir of Al-Kahf',
        description: 'A Bangla tafsir.',
        type: QuranResourceType.tafsir,
        format: QuranFormat.video,
        surah: 'Al-Kahf',
      });

      expect(prisma.quranResource.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ mosqueId: MOSQUE_ID }),
        }),
      );
    });
  });

  describe('list query building', () => {
    it('passes mosqueId, search, filters, orderBy and pagination to the database', async () => {
      prisma.quranResource.count.mockResolvedValue(25);
      prisma.quranResource.findMany.mockResolvedValue([
        mockResourceRow({ status: QuranStatus.published, publishedAt: new Date() }),
      ]);

      const result = await service.findAll(MOSQUE_ID, {
        page: 2,
        pageSize: 20,
        search: 'tafsir',
        status: QuranStatus.published,
        type: QuranResourceType.tafsir,
        sortBy: 'title',
        sortDir: 'asc',
      });

      expect(prisma.quranResource.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            mosqueId: MOSQUE_ID,
            deletedAt: null,
            status: QuranStatus.published,
            type: QuranResourceType.tafsir,
            OR: expect.any(Array),
          }),
        }),
      );
      expect(prisma.quranResource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
          orderBy: [{ title: 'asc' }],
        }),
      );
      expect(result.total).toBe(25);
      expect(result.page).toBe(2);
    });

    it('filters on published date range when provided', async () => {
      prisma.quranResource.count.mockResolvedValue(0);
      prisma.quranResource.findMany.mockResolvedValue([]);

      await service.findAll(MOSQUE_ID, {
        publishedFrom: '2026-01-01',
        publishedTo: '2026-12-31',
      });

      expect(prisma.quranResource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            publishedAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('does not load the whole table when pageSize is omitted', async () => {
      prisma.quranResource.count.mockResolvedValue(100);
      prisma.quranResource.findMany.mockResolvedValue([]);

      await service.findAll(MOSQUE_ID, {});

      expect(prisma.quranResource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });
  });

  describe('status transitions', () => {
    it('publishing from draft sets publishedAt', async () => {
      const existing = mockResourceRow({ status: QuranStatus.draft });
      prisma.quranResource.findFirst.mockResolvedValue(existing);
      prisma.quranResource.update.mockResolvedValue(
        mockResourceRow({
          status: QuranStatus.published,
          publishedAt: new Date('2026-09-02T00:00:00.000Z'),
        }),
      );

      const dto = await service.publish(ACTOR, RESOURCE_ID);

      expect(dto.status).toBe(QuranStatus.published);
      expect(dto.publishedAt).not.toBeNull();
    });

    it('scheduling requires a scheduledAt date', async () => {
      const existing = mockResourceRow({ status: QuranStatus.draft });
      prisma.quranResource.findFirst.mockResolvedValue(existing);

      await expect(
        service.update(ACTOR, RESOURCE_ID, { status: QuranStatus.scheduled }),
      ).rejects.toThrow(BadRequestException);
    });

    it('scheduling with a date stores scheduledAt and clears publishedAt', async () => {
      const existing = mockResourceRow({ status: QuranStatus.draft });
      prisma.quranResource.findFirst.mockResolvedValue(existing);
      prisma.quranResource.update.mockResolvedValue(
        mockResourceRow({
          status: QuranStatus.scheduled,
          scheduledAt: new Date('2026-09-10T00:00:00.000Z'),
        }),
      );

      await service.schedule(ACTOR, RESOURCE_ID, '2026-09-10');

      expect(prisma.quranResource.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: QuranStatus.scheduled,
            scheduledAt: new Date('2026-09-10T00:00:00.000Z'),
            publishedAt: null,
          }),
        }),
      );
    });

    it('archiving sets archivedAt', async () => {
      const existing = mockResourceRow({ status: QuranStatus.published });
      prisma.quranResource.findFirst.mockResolvedValue(existing);
      prisma.quranResource.update.mockResolvedValue(
        mockResourceRow({ status: QuranStatus.archived, archivedAt: new Date() }),
      );

      const dto = await service.archive(ACTOR, RESOURCE_ID);

      expect(dto.status).toBe(QuranStatus.archived);
      expect(prisma.quranResource.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: QuranStatus.archived,
            archivedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('create', () => {
    it('creates a draft without dates by default', async () => {
      prisma.quranResource.create.mockResolvedValue(mockResourceRow({ status: QuranStatus.draft }));

      const dto = await service.create(ACTOR, {
        title: 'Tajweed — Noon Sakinah',
        description: 'A worked guide to the four rulings.',
        type: QuranResourceType.tajweed,
        format: QuranFormat.video,
        surah: 'Various',
      });

      expect(dto.status).toBe(QuranStatus.draft);
      expect(dto.publishedAt).toBeNull();
      expect(dto.scheduledAt).toBeNull();
      expect(prisma.quranResource.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ createdById: ACTOR.id }),
        }),
      );
    });

    it('records an audit entry on create', async () => {
      prisma.quranResource.create.mockResolvedValue(mockResourceRow());

      await service.create(ACTOR, {
        title: 'Surah Yusuf — Bangla translation',
        description: 'A Bangla rendering.',
        type: QuranResourceType.translation,
        format: QuranFormat.document,
        surah: 'Yusuf',
      });

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'QURAN_RESOURCE_CREATED',
          resource: 'quran_resource',
          mosqueId: MOSQUE_ID,
          resourceId: RESOURCE_ID,
        }),
      );
    });
  });

  describe('update / remove', () => {
    it('records an audit entry on update', async () => {
      const existing = mockResourceRow();
      prisma.quranResource.findFirst.mockResolvedValue(existing);
      prisma.quranResource.update.mockResolvedValue(mockResourceRow({ title: 'Updated title' }));

      await service.update(ACTOR, RESOURCE_ID, { title: 'Updated title' });

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'QURAN_RESOURCE_UPDATED',
          resource: 'quran_resource',
          resourceId: RESOURCE_ID,
        }),
      );
    });

    it('soft-deletes and records an audit entry', async () => {
      prisma.quranResource.findFirst.mockResolvedValue(mockResourceRow());
      prisma.quranResource.update.mockResolvedValue(mockResourceRow({ deletedAt: new Date() }));

      const result = await service.remove(ACTOR, RESOURCE_ID);

      expect(result.success).toBe(true);
      expect(prisma.quranResource.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: RESOURCE_ID },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'QURAN_RESOURCE_DELETED' }),
      );
    });
  });

  describe('stats', () => {
    it('counts by status for the actor’s mosque only', async () => {
      prisma.quranResource.count.mockResolvedValue(10);

      const stats = await service.getStats(ACTOR);

      expect(stats).toEqual({ total: 10, published: 10, scheduled: 10, drafted: 10, archived: 10 });
      expect(prisma.quranResource.count).toHaveBeenCalledTimes(5);
      expect(prisma.quranResource.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ mosqueId: MOSQUE_ID, deletedAt: null }),
        }),
      );
    });
  });
});
