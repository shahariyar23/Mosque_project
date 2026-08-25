import { Test, TestingModule } from '@nestjs/testing';

import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrayerTimesController } from './prayer-times.controller';
import { PrayerTimesService } from './prayer-times.service';

/**
 * The controller's own job, which is small: take the mosque from the token, hand the query to the
 * service, and declare what each route requires.
 *
 * The mosque id is the whole of it. Every route reads `user.mosqueId` and no route accepts a mosque id
 * from the caller, which is what makes cross-mosque access unexpressible rather than merely refused.
 */

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';

const user = {
  id: '9f8b7c6d-5e4f-4a3b-2c1d-0e9f8a7b6c5d',
  email: 'imam@masjid.test',
  mosqueId: MOSQUE_ID,
  sessionId: 'session-1',
} as unknown as AuthenticatedUser;

/** A caller from another mosque, used to prove the response follows the token and not the request. */
const otherUser = {
  ...user,
  mosqueId: 'd0b80121-7ac0-11d1-898c-00c04fd8d5c1',
};

describe('PrayerTimesController', () => {
  let controller: PrayerTimesController;
  let service: PrayerTimesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrayerTimesController],
      providers: [
        {
          provide: PrayerTimesService,
          useValue: {
            getPrayerTimes: jest.fn().mockResolvedValue({ date: '2026-03-01' }),
            getSettings: jest.fn().mockResolvedValue({ method: null }),
            updateSettings: jest.fn().mockResolvedValue({ method: 3 }),
          },
        },
      ],
    })
      // The three global guards are bound in `AppModule` and are not under test here; this module has
      // none of them, so a handler is called directly and nothing needs stubbing to get past them.
      .compile();

    controller = module.get(PrayerTimesController);
    service = module.get(PrayerTimesService);
  });

  describe('GET /prayer-times', () => {
    it('passes the caller’s mosque and query straight through', async () => {
      await controller.getPrayerTimes(user, { date: '2026-03-01', method: 3 });

      expect(service.getPrayerTimes).toHaveBeenCalledWith(MOSQUE_ID, {
        date: '2026-03-01',
        method: 3,
      });
    });

    it('sends an empty query when none was given, leaving the default to the service', async () => {
      await controller.getPrayerTimes(user, {});

      expect(service.getPrayerTimes).toHaveBeenCalledWith(MOSQUE_ID, {});
    });

    it('follows the token, not the request, for which mosque this is', async () => {
      await controller.getPrayerTimes(otherUser, {});

      expect(service.getPrayerTimes).toHaveBeenCalledWith(otherUser.mosqueId, {});
    });
  });

  describe('GET /prayer-times/today', () => {
    it('asks for no date at all, so the service resolves today in the mosque’s zone', async () => {
      await controller.getToday(user, {});

      expect(service.getPrayerTimes).toHaveBeenCalledWith(MOSQUE_ID, {});
    });

    it('still honours the calculation parameters', async () => {
      await controller.getToday(user, { method: 5, school: 1 });

      expect(service.getPrayerTimes).toHaveBeenCalledWith(MOSQUE_ID, { method: 5, school: 1 });
    });
  });

  describe('GET /prayer-times/:date', () => {
    it('merges the path date into the query overrides', async () => {
      await controller.getByDate(user, '2026-03-01', { method: 2 });

      expect(service.getPrayerTimes).toHaveBeenCalledWith(MOSQUE_ID, {
        method: 2,
        date: '2026-03-01',
      });
    });

    /**
     * The path segment is not validated here. It reaches the service unchecked so that one date check
     * covers both this route and `?date=` — see the note on the handler.
     */
    it('forwards a malformed date rather than deciding about it', async () => {
      await controller.getByDate(user, 'yesterday', {});

      expect(service.getPrayerTimes).toHaveBeenCalledWith(MOSQUE_ID, { date: 'yesterday' });
    });
  });

  describe('settings', () => {
    it('reads for the caller’s mosque', async () => {
      await controller.getSettings(user);

      expect(service.getSettings).toHaveBeenCalledWith(MOSQUE_ID);
    });

    it('writes for the caller’s mosque', async () => {
      await controller.updateSettings(user, { fajrOffset: 5 });

      expect(service.updateSettings).toHaveBeenCalledWith(MOSQUE_ID, { fajrOffset: 5 });
    });
  });

  describe('declared permissions', () => {
    const permissionsOn = (handler: keyof PrayerTimesController): string[] =>
      Reflect.getMetadata(PERMISSIONS_KEY, PrayerTimesController.prototype[handler]) as string[];

    it.each<keyof PrayerTimesController>([
      'getPrayerTimes',
      'getToday',
      'getByDate',
      'getSettings',
    ])('%s requires prayer.view', (handler) => {
      expect(permissionsOn(handler)).toEqual(['prayer.view']);
    });

    // The one write on this controller. Reading the schedule is for everyone signed in; changing what the
    // mosque publishes is not.
    it('updateSettings requires prayer.manage', () => {
      expect(permissionsOn('updateSettings')).toEqual(['prayer.manage']);
    });

    it('leaves no route undeclared', () => {
      const handlers: Array<keyof PrayerTimesController> = [
        'getPrayerTimes',
        'getToday',
        'getByDate',
        'getSettings',
        'updateSettings',
      ];

      for (const handler of handlers) {
        expect(permissionsOn(handler)).toHaveLength(1);
      }
    });
  });
});
