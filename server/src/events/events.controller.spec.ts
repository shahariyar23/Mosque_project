import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventCategory, EventStatus } from './dto/event.dto';

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';

const user = {
  id: 'user-123',
  email: 'admin@noor.org',
  mosqueId: MOSQUE_ID,
  name: 'Admin',
} as unknown as AuthenticatedUser;

describe('EventsController', () => {
  let controller: EventsController;
  let service: EventsService;
  const reflector = new Reflector();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventsService,
          useValue: {
            findAll: jest.fn().mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 10, pageCount: 1 }),
            findOne: jest.fn().mockResolvedValue({ id: 'evt-1', slug: 'youth-seminar', title: 'Youth Seminar' }),
            create: jest.fn().mockResolvedValue({ id: 'evt-1', slug: 'youth-seminar', title: 'Youth Seminar' }),
            update: jest.fn().mockResolvedValue({ id: 'evt-1', slug: 'youth-seminar', title: 'Youth Seminar' }),
            remove: jest.fn().mockResolvedValue({ id: 'evt-1', slug: 'youth-seminar', title: 'Youth Seminar' }),
          },
        },
      ],
    }).compile();

    controller = module.get(EventsController);
    service = module.get(EventsService);
  });

  describe('Permissions Declarations', () => {
    it('declares event.view on GET /events', () => {
      const perms = reflector.get(PERMISSIONS_KEY, controller.findAll);
      expect(perms).toEqual(['event.view']);
    });

    it('declares event.view on GET /events/:id', () => {
      const perms = reflector.get(PERMISSIONS_KEY, controller.findOne);
      expect(perms).toEqual(['event.view']);
    });

    it('declares event.create on POST /events', () => {
      const perms = reflector.get(PERMISSIONS_KEY, controller.create);
      expect(perms).toEqual(['event.create']);
    });

    it('declares event.update on PATCH /events/:id', () => {
      const perms = reflector.get(PERMISSIONS_KEY, controller.update);
      expect(perms).toEqual(['event.update']);
    });

    it('declares event.delete on DELETE /events/:id', () => {
      const perms = reflector.get(PERMISSIONS_KEY, controller.remove);
      expect(perms).toEqual(['event.delete']);
    });
  });

  describe('Route Handlers', () => {
    it('delegates findAll with mosqueId and query', async () => {
      const query = { page: 1, pageSize: 10 };
      await controller.findAll(user, query);
      expect(service.findAll).toHaveBeenCalledWith(MOSQUE_ID, query);
    });

    it('delegates findOne with mosqueId and idOrSlug', async () => {
      await controller.findOne(user, 'youth-seminar');
      expect(service.findOne).toHaveBeenCalledWith(MOSQUE_ID, 'youth-seminar');
    });

    it('delegates create with actor and dto', async () => {
      const dto = {
        title: 'Youth Seminar',
        category: EventCategory.youth,
        date: '2026-08-25',
        startTime: '19:30',
        location: 'Community Hall',
        description: 'Youth evening programme',
      };
      await controller.create(user, dto);
      expect(service.create).toHaveBeenCalledWith(user, dto);
    });

    it('delegates update with actor, id and dto', async () => {
      const dto = { title: 'Updated Title' };
      await controller.update(user, 'evt-1', dto);
      expect(service.update).toHaveBeenCalledWith(user, 'evt-1', dto);
    });

    it('delegates remove with actor and id', async () => {
      await controller.remove(user, 'evt-1');
      expect(service.remove).toHaveBeenCalledWith(user, 'evt-1');
    });
  });

  describe('ValidationPipe with ListEventsQueryDto', () => {
    it('accepts query parameters without 400 error', async () => {
      const { ValidationPipe } = await import('@nestjs/common');
      const { ListEventsQueryDto } = await import('./dto/event.dto');
      const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
        validateCustomDecorators: true,
      });

      const transformed = await pipe.transform(
        { category: 'youth', status: 'upcoming', all: 'true' },
        { type: 'query', metatype: ListEventsQueryDto },
      );

      expect(transformed.category).toBe('youth');
      expect(transformed.status).toBe('upcoming');
      expect(transformed.all).toBe(true);
    });
  });
});

