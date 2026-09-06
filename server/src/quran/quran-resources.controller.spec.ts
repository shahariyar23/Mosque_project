import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { ANY_PERMISSION_KEY } from '../common/decorators/permissions.decorator';
import { QuranResourcesController } from './quran-resources.controller';
import { QuranResourcesService } from './quran-resources.service';

describe('QuranResourcesController', () => {
  let controller: QuranResourcesController;
  let service: QuranResourcesService;
  const reflector = new Reflector();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuranResourcesController],
      providers: [
        {
          provide: QuranResourcesService,
          useValue: {
            findAll: jest
              .fn()
              .mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 10, pageCount: 1 }),
            findOne: jest.fn().mockResolvedValue({ id: 'qrs-1' }),
            getStats: jest
              .fn()
              .mockResolvedValue({ total: 0, published: 0, scheduled: 0, drafted: 0, archived: 0 }),
            create: jest.fn().mockResolvedValue({ id: 'qrs-1' }),
            update: jest.fn().mockResolvedValue({ id: 'qrs-1' }),
            publish: jest.fn().mockResolvedValue({ id: 'qrs-1' }),
            schedule: jest.fn().mockResolvedValue({ id: 'qrs-1' }),
            archive: jest.fn().mockResolvedValue({ id: 'qrs-1' }),
            remove: jest.fn().mockResolvedValue({ success: true, message: 'deleted' }),
          },
        },
      ],
    }).compile();

    controller = module.get(QuranResourcesController);
    service = module.get(QuranResourcesService);
  });

  const anyOf = (handler: (...args: unknown[]) => unknown): string[] =>
    reflector.get(ANY_PERMISSION_KEY, handler as never);

  describe('permission declarations', () => {
    it('GET / allows quran.view or quran.manage', () => {
      expect(anyOf(controller.findAll)).toEqual(['quran.view', 'quran.manage']);
    });

    it('GET /:id allows quran.view or quran.manage', () => {
      expect(anyOf(controller.findOne)).toEqual(['quran.view', 'quran.manage']);
    });

    it('POST / allows quran.create or quran.manage', () => {
      expect(anyOf(controller.create)).toEqual(['quran.create', 'quran.manage']);
    });

    it('PATCH /:id allows quran.update or quran.manage', () => {
      expect(anyOf(controller.update)).toEqual(['quran.update', 'quran.manage']);
    });

    it('POST /:id/publish allows quran.publish or quran.manage', () => {
      expect(anyOf(controller.publish)).toEqual(['quran.publish', 'quran.manage']);
    });

    it('POST /:id/schedule allows quran.schedule or quran.manage', () => {
      expect(anyOf(controller.schedule)).toEqual(['quran.schedule', 'quran.manage']);
    });

    it('DELETE /:id allows quran.delete or quran.manage', () => {
      expect(anyOf(controller.remove)).toEqual(['quran.delete', 'quran.manage']);
    });
  });

  describe('route wiring', () => {
    it('findAll delegates to service with the actor’s mosqueId', async () => {
      const actor = { mosqueId: 'mosque-1' } as never;
      await controller.findAll(actor, {});
      expect(service.findAll).toHaveBeenCalledWith('mosque-1', {});
    });

    it('findOne delegates to service with the actor’s mosqueId', async () => {
      const actor = { mosqueId: 'mosque-1' } as never;
      await controller.findOne(actor, 'qrs-1');
      expect(service.findOne).toHaveBeenCalledWith('mosque-1', 'qrs-1');
    });

    it('remove delegates to service', async () => {
      const actor = { mosqueId: 'mosque-1' } as never;
      await controller.remove(actor, 'qrs-1');
      expect(service.remove).toHaveBeenCalledWith(actor, 'qrs-1');
    });
  });
});
