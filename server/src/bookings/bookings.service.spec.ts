import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';

import { AuditLogService } from '../audit/audit-log.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsService } from './bookings.service';
import { BookingStatus, ServiceCategory } from './dto/booking.dto';

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';
const SERVICE_ID = '1b4e28ba-2fa1-11d2-883f-0016d3cca427';
const BOOKING_ID = '3d6e28ba-2fa1-11d2-883f-0016d3cca429';

const ACTOR: AuthenticatedUser = {
  id: 'actor-123',
  mosqueId: MOSQUE_ID,
  email: 'admin@noor.org',
  role: Role.mosque_admin,
  permissions: ['booking.view', 'booking.manage'],
  deniedPermissions: [],
  isActive: true,
};

function mockBookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING_ID,
    mosqueId: MOSQUE_ID,
    serviceId: SERVICE_ID,
    service: {
      name: 'Janazah (Funeral) Service',
      category: ServiceCategory.funeral,
    },
    userId: null,
    requesterName: 'Habibur Rahman',
    requesterPhone: '+880 1719-604182',
    requesterEmail: 'habibur@example.com',
    memberId: 'MEM-018',
    status: BookingStatus.confirmed,
    scheduledDate: new Date('2026-08-29T00:00:00.000Z'),
    scheduledTime: '13:45',
    submittedAt: new Date('2026-08-19T00:00:00.000Z'),
    location: 'Main prayer hall',
    partySize: 0,
    fee: new Prisma.Decimal('0.00'),
    assignedTo: 'Imam Abdul Karim',
    assignedToId: null,
    notes: 'Late father, Marhum Siddiqur Rahman.',
    createdAt: new Date('2026-08-19T10:00:00.000Z'),
    updatedAt: new Date('2026-08-19T10:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: {
    booking: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    service: {
      findFirst: jest.Mock;
    };
    user: {
      findFirst: jest.Mock;
    };
  };
  let audit: { record: jest.Mock };

  beforeEach(async () => {
    prisma = {
      booking: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      service: {
        findFirst: jest.fn(),
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
        BookingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: audit },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  describe('findAll', () => {
    it('returns a paginated list of bookings', async () => {
      const mockRow = mockBookingRow();
      prisma.booking.findMany.mockResolvedValue([mockRow]);
      prisma.booking.count.mockResolvedValue(1);

      const result = await service.findAll(MOSQUE_ID, { page: 1, pageSize: 10 });

      expect('rows' in result).toBe(true);
      if ('rows' in result) {
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].requesterName).toBe('Habibur Rahman');
        expect(result.rows[0].serviceName).toBe('Janazah (Funeral) Service');
        expect(result.total).toBe(1);
      }
    });

    it('returns array when query.all is true', async () => {
      const mockRow = mockBookingRow();
      prisma.booking.findMany.mockResolvedValue([mockRow]);

      const result = await service.findAll(MOSQUE_ID, { all: true });

      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) {
        expect(result).toHaveLength(1);
        expect(result[0].requesterName).toBe('Habibur Rahman');
      }
    });
  });

  describe('getStats', () => {
    it('calculates live booking stats correctly', async () => {
      prisma.booking.count
        .mockResolvedValueOnce(26) // total
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(10) // confirmed
        .mockResolvedValueOnce(10); // thisWeek

      const stats = await service.getStats(MOSQUE_ID);

      expect(stats).toEqual({
        total: 26,
        pending: 5,
        confirmed: 10,
        thisWeek: 10,
      });
    });
  });

  describe('findOne', () => {
    it('returns a single booking by id', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBookingRow());

      const result = await service.findOne(MOSQUE_ID, BOOKING_ID);

      expect(result.id).toBe(BOOKING_ID);
      expect(result.requesterName).toBe('Habibur Rahman');
    });

    it('throws NotFoundException when booking does not exist', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);

      await expect(service.findOne(MOSQUE_ID, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates a booking when service is active and valid', async () => {
      prisma.service.findFirst.mockResolvedValue({
        id: SERVICE_ID,
        name: 'Janazah (Funeral) Service',
        status: 'active',
        fee: new Prisma.Decimal('0.00'),
        coordinator: 'Imam Abdul Karim',
        coordinatorId: null,
      });

      prisma.booking.findFirst.mockResolvedValue(null); // no conflict
      prisma.booking.create.mockResolvedValue(mockBookingRow());

      const result = await service.create(ACTOR, {
        serviceId: SERVICE_ID,
        requesterName: 'Habibur Rahman',
        requesterPhone: '+880 1719-604182',
        scheduledDate: '2026-08-29',
        location: 'Main prayer hall',
      });

      expect(result.requesterName).toBe('Habibur Rahman');
      expect(prisma.booking.create).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BOOKING_CREATED',
          resource: 'booking',
        }),
      );
    });

    it('throws BadRequestException when service is inactive', async () => {
      prisma.service.findFirst.mockResolvedValue({
        id: SERVICE_ID,
        name: 'Janazah (Funeral) Service',
        status: 'paused',
      });

      await expect(
        service.create(ACTOR, {
          serviceId: SERVICE_ID,
          requesterName: 'Habibur Rahman',
          requesterPhone: '+880 1719-604182',
          scheduledDate: '2026-08-29',
          location: 'Main prayer hall',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException on duplicate booking conflict', async () => {
      prisma.service.findFirst.mockResolvedValue({
        id: SERVICE_ID,
        name: 'Janazah (Funeral) Service',
        status: 'active',
        fee: new Prisma.Decimal('0.00'),
      });

      prisma.booking.findFirst.mockResolvedValue(mockBookingRow()); // conflict found

      await expect(
        service.create(ACTOR, {
          serviceId: SERVICE_ID,
          requesterName: 'Habibur Rahman',
          requesterPhone: '+880 1719-604182',
          scheduledDate: '2026-08-29',
          location: 'Main prayer hall',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates booking details and records audit log', async () => {
      const existing = mockBookingRow();
      prisma.booking.findFirst.mockResolvedValue(existing);
      prisma.booking.update.mockResolvedValue({
        ...existing,
        location: 'Updated Community Room',
      });

      const result = await service.update(ACTOR, BOOKING_ID, {
        location: 'Updated Community Room',
      });

      expect(result.location).toBe('Updated Community Room');
      expect(prisma.booking.update).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BOOKING_UPDATED',
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('updates status and logs status change audit', async () => {
      const existing = mockBookingRow({ status: BookingStatus.pending });
      prisma.booking.findFirst.mockResolvedValue(existing);
      prisma.booking.update.mockResolvedValue({
        ...existing,
        status: BookingStatus.confirmed,
      });

      const result = await service.updateStatus(ACTOR, BOOKING_ID, {
        status: BookingStatus.confirmed,
        reason: 'Confirmed with Imam',
      });

      expect(result.status).toBe(BookingStatus.confirmed);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BOOKING_STATUS_CHANGED',
        }),
      );
    });
  });

  describe('remove', () => {
    it('cancels and soft-deletes the booking', async () => {
      const existing = mockBookingRow();
      prisma.booking.findFirst.mockResolvedValue(existing);
      prisma.booking.update.mockResolvedValue({
        ...existing,
        status: BookingStatus.cancelled,
        deletedAt: new Date(),
      });

      const result = await service.remove(ACTOR, BOOKING_ID);

      expect(result.id).toBe(BOOKING_ID);
      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: BookingStatus.cancelled,
            deletedAt: expect.any(Date),
          }),
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BOOKING_DELETED',
        }),
      );
    });
  });
});

