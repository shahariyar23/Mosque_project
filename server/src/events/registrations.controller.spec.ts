import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { RegistrationsController } from './registrations.controller';
import { EventsService } from './events.service';
import { RegistrationStatus } from './dto/event.dto';

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';

const user = {
  id: 'user-123',
  email: 'admin@noor.org',
  mosqueId: MOSQUE_ID,
  name: 'Admin',
} as unknown as AuthenticatedUser;

describe('RegistrationsController', () => {
  let controller: RegistrationsController;
  let service: EventsService;
  const reflector = new Reflector();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegistrationsController],
      providers: [
        {
          provide: EventsService,
          useValue: {
            findAllRegistrations: jest
              .fn()
              .mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 50, pageCount: 0 }),
            getRegistration: jest
              .fn()
              .mockResolvedValue({ id: 'reg-1', participantName: 'Ahmad' }),
            updateRegistration: jest
              .fn()
              .mockResolvedValue({ id: 'reg-1', status: RegistrationStatus.confirmed }),
            deleteRegistration: jest
              .fn()
              .mockResolvedValue({ success: true, message: 'Registration cancelled.' }),
          },
        },
      ],
    }).compile();

    controller = module.get(RegistrationsController);
    service = module.get(EventsService);
  });

  describe('findAllRegistrations', () => {
    it('requires event.view permission', () => {
      const permissions = reflector.get<string[]>(PERMISSIONS_KEY, controller.findAllRegistrations);
      expect(permissions).toEqual(['event.view']);
    });

    it('delegates to eventsService.findAllRegistrations', async () => {
      const query = { page: 1, pageSize: 50 };
      await controller.findAllRegistrations(user, query);
      expect(service.findAllRegistrations).toHaveBeenCalledWith(user, query);
    });
  });

  describe('getRegistration', () => {
    it('requires event.view permission', () => {
      const permissions = reflector.get<string[]>(PERMISSIONS_KEY, controller.getRegistration);
      expect(permissions).toEqual(['event.view']);
    });

    it('delegates to eventsService.getRegistration', async () => {
      await controller.getRegistration(user, 'reg-1');
      expect(service.getRegistration).toHaveBeenCalledWith(user, 'reg-1');
    });
  });

  describe('updateRegistration', () => {
    it('requires event.update permission', () => {
      const permissions = reflector.get<string[]>(PERMISSIONS_KEY, controller.updateRegistration);
      expect(permissions).toEqual(['event.update']);
    });

    it('delegates to eventsService.updateRegistration', async () => {
      const dto = { status: RegistrationStatus.confirmed };
      await controller.updateRegistration(user, 'reg-1', dto);
      expect(service.updateRegistration).toHaveBeenCalledWith(user, 'reg-1', dto);
    });
  });

  describe('deleteRegistration', () => {
    it('requires event.update permission', () => {
      const permissions = reflector.get<string[]>(PERMISSIONS_KEY, controller.deleteRegistration);
      expect(permissions).toEqual(['event.update']);
    });

    it('delegates to eventsService.deleteRegistration', async () => {
      await controller.deleteRegistration(user, 'reg-1');
      expect(service.deleteRegistration).toHaveBeenCalledWith(user, 'reg-1');
    });
  });
});

