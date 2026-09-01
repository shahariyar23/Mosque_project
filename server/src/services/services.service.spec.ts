import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';

import { AuditLogService } from '../audit/audit-log.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { ServicesService } from './services.service';
import { ServiceCategory, ServiceStatus } from './dto/service.dto';

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';
const SERVICE_ID = '1b4e28ba-2fa1-11d2-883f-0016d3cca427';
const COORDINATOR_USER_ID = '2c5e28ba-2fa1-11d2-883f-0016d3cca428';

const ACTOR: AuthenticatedUser = {
  id: 'actor-123',
  mosqueId: MOSQUE_ID,
  email: 'admin@noor.org',
  role: Role.mosque_admin,
  permissions: ['service.view', 'service.manage'],
  deniedPermissions: [],
  isActive: true,
};

function mockServiceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: SERVICE_ID,
    mosqueId: MOSQUE_ID,
    name: 'Janazah (Funeral) Service',
    slug: 'janazah-funeral-service',
    category: ServiceCategory.funeral,
    status: ServiceStatus.active,
    summary: 'Full funeral arrangement — ghusl, kafan, janazah prayer and burial coordination.',
    description: 'The mosque arranges the whole janazah from the moment a family calls.',
    coordinator: 'Imam Abdul Karim',
    coordinatorId: null,
    contactPhone: '+880 1713-668190',
    location: 'Main prayer hall & mortuary room',
    availability: '24 hours, every day',
    fee: new Prisma.Decimal('0.00'),
    requiresBooking: true,
    turnaround: 'Same day',
    createdAt: new Date('2026-08-01T10:00:00.000Z'),
    updatedAt: new Date('2026-08-01T10:00:00.000Z'),
    deletedAt: null,
    bookings: [
      { id: 'bkg-1', submittedAt: new Date() },
      { id: 'bkg-2', submittedAt: new Date() },
    ],
    ...overrides,
  };
}

describe('ServicesService', () => {
  let service: ServicesService;
  let prisma: {
    service: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    booking: {
      count: jest.Mock;
    };
    user: {
      findFirst: jest.Mock;
    };
  };
  let audit: { record: jest.Mock };

  beforeEach(async () => {
    prisma = {
      service: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      booking: {
        count: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
      },
    };

    audit = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: audit },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
  });

  describe('findAll', () => {
    it('returns a paginated list of services with booking metrics', async () => {
      const mockRow = mockServiceRow();
      prisma.service.findMany.mockResolvedValue([mockRow]);
      prisma.service.count.mockResolvedValue(1);

      const result = await service.findAll(MOSQUE_ID, { page: 1, pageSize: 10 });

      expect('rows' in result).toBe(true);
      if ('rows' in result) {
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].name).toBe('Janazah (Funeral) Service');
        expect(result.rows[0].totalBookings).toBe(2);
        expect(result.total).toBe(1);
      }
    });

    it('returns array when query.all is true', async () => {
      const mockRow = mockServiceRow();
      prisma.service.findMany.mockResolvedValue([mockRow]);

      const result = await service.findAll(MOSQUE_ID, { all: true });

      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) {
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Janazah (Funeral) Service');
      }
    });
  });

  describe('getStats', () => {
    it('calculates live service stats correctly', async () => {
      prisma.service.count
        .mockResolvedValueOnce(12) // total
        .mockResolvedValueOnce(10) // active
        .mockResolvedValueOnce(7); // free

      prisma.booking.count.mockResolvedValueOnce(43); // bookingsThisMonth

      const stats = await service.getStats(MOSQUE_ID);

      expect(stats).toEqual({
        total: 12,
        active: 10,
        bookingsThisMonth: 43,
        free: 7,
      });
    });
  });

  describe('findOne', () => {
    it('returns a single service by id', async () => {
      prisma.service.findFirst.mockResolvedValue(mockServiceRow());

      const result = await service.findOne(MOSQUE_ID, SERVICE_ID);

      expect(result.id).toBe(SERVICE_ID);
      expect(result.name).toBe('Janazah (Funeral) Service');
    });

    it('throws NotFoundException when service does not exist', async () => {
      prisma.service.findFirst.mockResolvedValue(null);

      await expect(service.findOne(MOSQUE_ID, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates a service and logs audit trail', async () => {
      prisma.service.findFirst.mockResolvedValue(null); // slug available
      const createdRow = mockServiceRow({ fee: new Prisma.Decimal('500.00') });
      prisma.service.create.mockResolvedValue(createdRow);

      const result = await service.create(ACTOR, {
        name: 'Marriage Certificate Attestation',
        category: ServiceCategory.certificate,
        summary: 'Attested copies of nikah',
        description: 'Detailed description',
        coordinator: 'Shahed Alam',
        contactPhone: '+880 1714-889201',
        location: 'Mosque office',
        availability: 'Office hours, Sun-Thu',
        fee: 500,
        turnaround: '2-3 days',
      });

      expect(result.name).toBe('Janazah (Funeral) Service');
      expect(prisma.service.create).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SERVICE_CREATED',
          resource: 'service',
        }),
      );
    });

    it('validates coordinator user existence if coordinatorId is provided', async () => {
      prisma.user.findFirst.mockResolvedValue(null); // user not found

      await expect(
        service.create(ACTOR, {
          name: 'Marriage Certificate Attestation',
          category: ServiceCategory.certificate,
          summary: 'Attested copies of nikah',
          description: 'Detailed description',
          coordinator: 'Shahed Alam',
          coordinatorId: COORDINATOR_USER_ID,
          contactPhone: '+880 1714-889201',
          location: 'Mosque office',
          availability: 'Office hours, Sun-Thu',
          turnaround: '2-3 days',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('updates service and records audit log', async () => {
      const existing = mockServiceRow();
      prisma.service.findFirst.mockResolvedValue(existing);
      prisma.service.update.mockResolvedValue({
        ...existing,
        name: 'Updated Janazah Service',
      });

      const result = await service.update(ACTOR, SERVICE_ID, {
        name: 'Updated Janazah Service',
      });

      expect(result.name).toBe('Updated Janazah Service');
      expect(prisma.service.update).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SERVICE_UPDATED',
        }),
      );
    });

    it('throws ConflictException on slug collision', async () => {
      const existing = mockServiceRow();
      prisma.service.findFirst
        .mockResolvedValueOnce(existing) // existing found
        .mockResolvedValueOnce({ id: 'other-id', slug: 'conflicting-slug' }); // collision found

      await expect(
        service.update(ACTOR, SERVICE_ID, {
          slug: 'conflicting-slug',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('soft-deletes the service and logs audit trail', async () => {
      const existing = mockServiceRow();
      prisma.service.findFirst.mockResolvedValue(existing);
      prisma.service.update.mockResolvedValue({
        ...existing,
        deletedAt: new Date(),
      });

      const result = await service.remove(ACTOR, SERVICE_ID);

      expect(result.id).toBe(SERVICE_ID);
      expect(prisma.service.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SERVICE_DELETED',
        }),
      );
    });
  });
});

