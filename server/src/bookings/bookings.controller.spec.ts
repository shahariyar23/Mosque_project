import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingStatus, ServiceCategory } from './dto/booking.dto';

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';
const BOOKING_ID = '3d6e28ba-2fa1-11d2-883f-0016d3cca429';

const user = {
  id: 'user-123',
  email: 'admin@noor.org',
  mosqueId: MOSQUE_ID,
  name: 'Admin',
} as unknown as AuthenticatedUser;

describe('BookingsController', () => {
  let controller: BookingsController;
  let service: BookingsService;
  const reflector = new Reflector();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        {
          provide: BookingsService,
          useValue: {
            findAll: jest.fn().mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 10, pageCount: 1 }),
            getStats: jest.fn().mockResolvedValue({ total: 26, pending: 5, confirmed: 10, thisWeek: 10 }),
            findOne: jest.fn().mockResolvedValue({ id: BOOKING_ID, requesterName: 'Habibur Rahman' }),
            create: jest.fn().mockResolvedValue({ id: BOOKING_ID, requesterName: 'Habibur Rahman' }),
            update: jest.fn().mockResolvedValue({ id: BOOKING_ID, requesterName: 'Habibur Rahman' }),
            updateStatus: jest.fn().mockResolvedValue({ id: BOOKING_ID, status: BookingStatus.confirmed }),
            remove: jest.fn().mockResolvedValue({ id: BOOKING_ID, status: BookingStatus.cancelled }),
          },
        },
      ],
    }).compile();

    controller = module.get(BookingsController);
    service = module.get(BookingsService);
  });

  describe('Permissions Declarations', () => {
    it('declares booking.view on GET /bookings', () => {
      const perms = reflector.get(PERMISSIONS_KEY, controller.findAll);
      expect(perms).toEqual(['booking.view']);
    });

    it('declares booking.view on GET /bookings/stats', () => {
      const perms = reflector.get(PERMISSIONS_KEY, controller.getStats);
      expect(perms).toEqual(['booking.view']);
    });

    it('declares booking.view on GET /bookings/:id', () => {
      const perms = reflector.get(PERMISSIONS_KEY, controller.findOne);
      expect(perms).toEqual(['booking.view']);
    });

    it('declares booking.manage on POST /bookings', () => {
      const perms = reflector.get(PERMISSIONS_KEY, controller.create);
      expect(perms).toEqual(['booking.manage']);
    });

    it('declares booking.manage on PATCH /bookings/:id', () => {
      const perms = reflector.get(PERMISSIONS_KEY, controller.update);
      expect(perms).toEqual(['booking.manage']);
    });

    it('declares booking.manage on PATCH /bookings/:id/status', () => {
      const perms = reflector.get(PERMISSIONS_KEY, controller.updateStatus);
      expect(perms).toEqual(['booking.manage']);
    });

    it('declares booking.manage on DELETE /bookings/:id', () => {
      const perms = reflector.get(PERMISSIONS_KEY, controller.remove);
      expect(perms).toEqual(['booking.manage']);
    });
  });

  describe('Route Handlers', () => {
    it('delegates findAll to service', async () => {
      const query = { page: 1, pageSize: 10 };
      await controller.findAll(user, query);
      expect(service.findAll).toHaveBeenCalledWith(MOSQUE_ID, query);
    });

    it('delegates getStats to service', async () => {
      await controller.getStats(user);
      expect(service.getStats).toHaveBeenCalledWith(MOSQUE_ID);
    });

    it('delegates findOne to service', async () => {
      await controller.findOne(user, BOOKING_ID);
      expect(service.findOne).toHaveBeenCalledWith(MOSQUE_ID, BOOKING_ID);
    });

    it('delegates create to service', async () => {
      const dto = {
        serviceId: '1b4e28ba-2fa1-11d2-883f-0016d3cca427',
        requesterName: 'Habibur Rahman',
        requesterPhone: '+880 1719-604182',
        scheduledDate: '2026-08-29',
        location: 'Main prayer hall',
      };
      await controller.create(user, dto);
      expect(service.create).toHaveBeenCalledWith(user, dto);
    });

    it('delegates update to service', async () => {
      const dto = { location: 'Community Room' };
      await controller.update(user, BOOKING_ID, dto);
      expect(service.update).toHaveBeenCalledWith(user, BOOKING_ID, dto);
    });

    it('delegates updateStatus to service', async () => {
      const dto = { status: BookingStatus.confirmed, reason: 'Confirmed' };
      await controller.updateStatus(user, BOOKING_ID, dto);
      expect(service.updateStatus).toHaveBeenCalledWith(user, BOOKING_ID, dto);
    });

    it('delegates remove to service', async () => {
      await controller.remove(user, BOOKING_ID);
      expect(service.remove).toHaveBeenCalledWith(user, BOOKING_ID);
    });
  });
});

