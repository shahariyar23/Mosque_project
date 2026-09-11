import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';

import { ANY_PERMISSION_KEY, PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { AdminMosquesController } from './admin-mosques.controller';
import { AdminMosquesService } from './admin-mosques.service';

const SUPER_ACTOR: AuthenticatedUser = {
  id: '5e4d3c2b-1a09-4f6a-8c11-2d5e7a9b0c31',
  mosqueId: '3f1a7c2e-9b4d-4f6a-8c11-2d5e7a9b0c31',
  email: 'super@noor.example',
  role: Role.super_admin,
  permissions: ['platform.manage', 'mosque.create', 'audit.view'],
  deniedPermissions: [],
  isActive: true,
};

const SAMPLE_MOSQUE = {
  id: '3f1a7c2e-9b4d-4f6a-8c11-2d5e7a9b0c31',
  slug: 'noor-jame-masjid',
  code: 'MOS-001',
  name: 'Noor Jame Masjid',
  status: 'active',
  isActive: true,
  email: 'contact@noormosque.org',
  phone: '+880 1712 345678',
  city: 'Dhaka',
  country: 'Bangladesh',
  timezone: 'Asia/Dhaka',
  userCount: 7,
  adminCount: 1,
  eventCount: 2,
  announcementCount: 4,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('AdminMosquesController', () => {
  let controller: AdminMosquesController;
  let service: Record<
    | 'getPlatformOverview'
    | 'listMosques'
    | 'getMosque'
    | 'createMosqueWithAdmin'
    | 'updateMosque'
    | 'setMosqueStatus'
    | 'addMosqueAdmin',
    jest.Mock
  >;

  beforeEach(async () => {
    service = {
      getPlatformOverview: jest.fn().mockResolvedValue({
        metrics: {
          totalMosques: 2,
          activeMosques: 2,
          suspendedMosques: 0,
          totalUsers: 12,
          totalMembers: 8,
          totalStaff: 4,
          totalEvents: 3,
          totalBookings: 2,
          totalAnnouncements: 2,
          totalRevenue: 50000,
        },
        charts: {
          mosqueStatus: [{ label: 'Active', value: 2 }],
          membersByMosque: [],
          eventsByMosque: [],
          bookingsByMosque: [],
          revenueByMosque: [],
        },
        comparison: [],
      }),
      listMosques: jest.fn().mockResolvedValue([SAMPLE_MOSQUE]),
      getMosque: jest.fn().mockResolvedValue({
        ...SAMPLE_MOSQUE,
        administrators: [],
      }),
      createMosqueWithAdmin: jest.fn().mockResolvedValue({
        ...SAMPLE_MOSQUE,
        administrators: [],
      }),
      updateMosque: jest.fn().mockResolvedValue({
        ...SAMPLE_MOSQUE,
        administrators: [],
      }),
      setMosqueStatus: jest.fn().mockResolvedValue({
        ...SAMPLE_MOSQUE,
        status: 'suspended',
        isActive: false,
        administrators: [],
      }),
      addMosqueAdmin: jest.fn().mockResolvedValue({
        ...SAMPLE_MOSQUE,
        administrators: [],
      }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AdminMosquesController],
      providers: [{ provide: AdminMosquesService, useValue: service }],
    }).compile();

    controller = moduleRef.get(AdminMosquesController);
  });

  it('lists all mosques for super admin', async () => {
    const result = await controller.listMosques();
    expect(service.listMosques).toHaveBeenCalled();
    expect(result).toEqual({ success: true, data: [SAMPLE_MOSQUE] });
  });

  it('creates mosque with initial admin', async () => {
    const dto = {
      name: 'Uttara Central Masjid',
      code: 'MOS-002',
      adminFullName: 'Tariqul Islam',
      adminEmail: 'admin@uttara.example',
      adminPassword: 'Password123!',
    };

    const result = await controller.createMosque(dto, SUPER_ACTOR);
    expect(service.createMosqueWithAdmin).toHaveBeenCalledWith(dto, SUPER_ACTOR);
    expect(result.success).toBe(true);
    expect(result.message).toContain('created successfully');
  });

  it('updates mosque status', async () => {
    const result = await controller.setMosqueStatus(
      SAMPLE_MOSQUE.id,
      { status: 'suspended' },
      SUPER_ACTOR,
    );

    expect(service.setMosqueStatus).toHaveBeenCalledWith(
      SAMPLE_MOSQUE.id,
      { status: 'suspended' },
      SUPER_ACTOR,
    );
    expect(result.success).toBe(true);
    expect(result.data.status).toBe('suspended');
  });

  it('returns platform overview metrics', async () => {
    const result = await controller.getPlatformOverview();
    expect(service.getPlatformOverview).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.data.metrics.totalMosques).toBe(2);
  });

  describe('route protection and authorization metadata', () => {
    const reflector = new Reflector();
    const handlers = AdminMosquesController.prototype as unknown as Record<
      string,
      () => void
    >;

    const requires = (method: string): string[] | undefined =>
      reflector.get<string[]>(PERMISSIONS_KEY, handlers[method]);

    const requiresAnyOf = (method: string): string[] | undefined =>
      reflector.get<string[]>(ANY_PERMISSION_KEY, handlers[method]);

    it('leaves no route public and none ungated', () => {
      const routes = [
        'getPlatformOverview',
        'listMosques',
        'createMosque',
        'getMosque',
        'updateMosque',
        'setMosqueStatus',
        'addMosqueAdmin',
      ];

      for (const route of routes) {
        expect(
          reflector.get<boolean>(IS_PUBLIC_KEY, handlers[route]),
        ).toBeUndefined();
        expect(requires(route) ?? requiresAnyOf(route)).toBeDefined();
      }
    });

    it('gates platform operations on platform.manage', () => {
      expect(requires('getPlatformOverview')).toEqual(['platform.manage']);
      expect(requires('listMosques')).toEqual(['platform.manage']);
      expect(requires('getMosque')).toEqual(['platform.manage']);
      expect(requires('updateMosque')).toEqual(['platform.manage']);
      expect(requires('setMosqueStatus')).toEqual(['platform.manage']);
      expect(requires('addMosqueAdmin')).toEqual(['platform.manage']);
      expect(requiresAnyOf('createMosque')).toEqual([
        'platform.manage',
        'mosque.create',
      ]);
    });
  });
});

