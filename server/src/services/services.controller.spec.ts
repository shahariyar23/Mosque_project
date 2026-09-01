import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { ServiceCategory, ServiceStatus } from './dto/service.dto';

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';

const user = {
  id: 'user-123',
  email: 'admin@noor.org',
  mosqueId: MOSQUE_ID,
  name: 'Admin',
} as unknown as AuthenticatedUser;

describe('ServicesController', () => {
  let controller: ServicesController;
  let service: ServicesService;
  const reflector = new Reflector();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServicesController],
      providers: [
        {
          provide: ServicesService,
          useValue: {
            findAll: jest.fn().mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 10, pageCount: 1 }),
            getStats: jest.fn().mockResolvedValue({ total: 12, active: 10, bookingsThisMonth: 43, free: 7 }),
            findOne: jest.fn().mockResolvedValue({ id: 'svc-1', slug: 'janazah-service', name: 'Janazah Service' }),
            create: jest.fn().mockResolvedValue({ id: 'svc-1', slug: 'janazah-service', name: 'Janazah Service' }),
            update: jest.fn().mockResolvedValue({ id: 'svc-1', slug: 'janazah-service', name: 'Janazah Service' }),
            remove: jest.fn().mockResolvedValue({ id: 'svc-1', slug: 'janazah-service', name: 'Janazah Service' }),
          },
        },
      ],
    }).compile();

    controller = module.get(ServicesController);
    service = module.get(ServicesService);
  });

  describe('Permissions Declarations', () => {
    it('declares service.view on GET /services', () => {
      const perms = reflector.get(PERMISSIONS_KEY, controller.findAll);
      expect(perms).toEqual(['service.view']);
    });

    it('declares service.view on GET /services/stats', () => {
      const perms = reflector.get(PERMISSIONS_KEY, controller.getStats);
      expect(perms).toEqual(['service.view']);
    });

    it('declares service.view on GET /services/:id', () => {
      const perms = reflector.get(PERMISSIONS_KEY, controller.findOne);
      expect(perms).toEqual(['service.view']);
    });

    it('declares service.manage on POST /services', () => {
      const perms = reflector.get(PERMISSIONS_KEY, controller.create);
      expect(perms).toEqual(['service.manage']);
    });

    it('declares service.manage on PATCH /services/:id', () => {
      const perms = reflector.get(PERMISSIONS_KEY, controller.update);
      expect(perms).toEqual(['service.manage']);
    });

    it('declares service.manage on DELETE /services/:id', () => {
      const perms = reflector.get(PERMISSIONS_KEY, controller.remove);
      expect(perms).toEqual(['service.manage']);
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
      await controller.findOne(user, 'svc-1');
      expect(service.findOne).toHaveBeenCalledWith(MOSQUE_ID, 'svc-1');
    });

    it('delegates create to service', async () => {
      const dto = {
        name: 'Janazah Service',
        category: ServiceCategory.funeral,
        summary: 'Funeral arrangement',
        description: 'Full janazah service',
        coordinator: 'Imam Abdul Karim',
        contactPhone: '+880 1713-668190',
        location: 'Main prayer hall',
        availability: '24 hours, every day',
        turnaround: 'Same day',
      };
      await controller.create(user, dto);
      expect(service.create).toHaveBeenCalledWith(user, dto);
    });

    it('delegates update to service', async () => {
      const dto = { name: 'Updated Name' };
      await controller.update(user, 'svc-1', dto);
      expect(service.update).toHaveBeenCalledWith(user, 'svc-1', dto);
    });

    it('delegates remove to service', async () => {
      await controller.remove(user, 'svc-1');
      expect(service.remove).toHaveBeenCalledWith(user, 'svc-1');
    });
  });
});

