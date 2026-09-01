import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { IftarSponsorshipController } from './iftar-sponsorship.controller';
import { IftarSponsorshipService } from './iftar-sponsorship.service';
import { IftarSponsorshipStatus } from './dto/iftar-sponsorship.dto';

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';

const user = {
  id: 'user-123',
  email: 'admin@noor.org',
  mosqueId: MOSQUE_ID,
  name: 'Admin',
} as unknown as AuthenticatedUser;

describe('IftarSponsorshipController', () => {
  let controller: IftarSponsorshipController;
  let service: IftarSponsorshipService;
  const reflector = new Reflector();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IftarSponsorshipController],
      providers: [
        {
          provide: IftarSponsorshipService,
          useValue: {
            findAll: jest.fn().mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 10, pageCount: 1 }),
            findOne: jest.fn().mockResolvedValue({ id: 'spon-1', date: '2026-03-01' }),
            create: jest.fn().mockResolvedValue({ id: 'spon-1', date: '2026-03-01' }),
            update: jest.fn().mockResolvedValue({ id: 'spon-1', date: '2026-03-01' }),
            remove: jest.fn().mockResolvedValue({ id: 'spon-1', date: '2026-03-01' }),
          },
        },
      ],
    }).compile();

    controller = module.get(IftarSponsorshipController);
    service = module.get(IftarSponsorshipService);
  });

  describe('Permissions Declarations', () => {
    it('declares prayer.view on GET /iftar-sponsorships', () => {
      const perms = reflector.get(PERMISSIONS_KEY, controller.findAll);
      expect(perms).toEqual(['prayer.view']);
    });

    it('declares prayer.view on GET /iftar-sponsorships/:id', () => {
      const perms = reflector.get(PERMISSIONS_KEY, controller.findOne);
      expect(perms).toEqual(['prayer.view']);
    });

    it('declares ramadan.manage on POST /iftar-sponsorships', () => {
      const perms = reflector.get(PERMISSIONS_KEY, controller.create);
      expect(perms).toEqual(['ramadan.manage']);
    });

    it('declares ramadan.manage on PATCH /iftar-sponsorships/:id', () => {
      const perms = reflector.get(PERMISSIONS_KEY, controller.update);
      expect(perms).toEqual(['ramadan.manage']);
    });

    it('declares ramadan.manage on DELETE /iftar-sponsorships/:id', () => {
      const perms = reflector.get(PERMISSIONS_KEY, controller.remove);
      expect(perms).toEqual(['ramadan.manage']);
    });
  });

  describe('Route Handlers', () => {
    it('delegates findAll with the user mosqueId and query', async () => {
      await controller.findAll(user, { year: 1447 });
      expect(service.findAll).toHaveBeenCalledWith(MOSQUE_ID, { year: 1447 });
    });

    it('delegates findOne with mosqueId and id', async () => {
      await controller.findOne(user, 'spon-1');
      expect(service.findOne).toHaveBeenCalledWith(MOSQUE_ID, 'spon-1');
    });

    it('delegates create with actor and dto', async () => {
      const dto = {
        year: 1447,
        date: '2026-03-01',
        sponsorName: 'Abdul Karim',
      };
      await controller.create(user, dto);
      expect(service.create).toHaveBeenCalledWith(MOSQUE_ID, dto);
    });

    it('delegates update with actor, id and dto', async () => {
      const dto = {
        numberOfServings: 200,
      };
      await controller.update(user, 'spon-1', dto);
      expect(service.update).toHaveBeenCalledWith(MOSQUE_ID, 'spon-1', dto);
    });

    it('delegates remove with actor and id', async () => {
      await controller.remove(user, 'spon-1');
      expect(service.remove).toHaveBeenCalledWith(MOSQUE_ID, 'spon-1');
    });
  });
});

