import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';
import { AlAdhanClient, AlAdhanUnavailableError, type AlAdhanRequest } from './aladhan.client';
import type { AlAdhanDay } from './aladhan.types';
import { PRAYER_KEYS } from './prayer-times.constants';
import { PrayerTimesCache } from './prayer-times.cache';
import { PrayerTimesService } from './prayer-times.service';
import { todayInZone } from './prayer-time.utils';

/**
 * `PrayerTimesService` with the network removed.
 *
 * `AlAdhanClient` is a jest double throughout — no test in this file makes an external call. The cache is
 * the real one, because the caching behaviour is part of what needs proving and a stubbed cache would
 * only prove the stub.
 */

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';
const OTHER_MOSQUE_ID = 'd0b80121-7ac0-11d1-898c-00c04fd8d5c1';

/** The nine calculated timings. Fajr is 04:35, which is the example the specification works through. */
function aladhanDay(overrides: Partial<AlAdhanDay> = {}): AlAdhanDay {
  return {
    timings: {
      imsak: '04:25',
      fajr: '04:35',
      sunrise: '05:52',
      dhuhr: '12:08',
      asr: '15:29',
      sunset: '18:23',
      maghrib: '18:23',
      isha: '19:39',
      midnight: '00:08',
    },
    gregorianDate: '2026-03-01',
    hijri: { date: '12-09-1447', day: 12, month: 9, monthName: 'Ramaḍān', year: 1447 },
    timezone: 'Asia/Dhaka',
    ...overrides,
  };
}

/** All nine offset columns at zero, so a fixture only has to name the one it changes. */
const NO_OFFSETS = {
  imsakOffset: 0,
  fajrOffset: 0,
  sunriseOffset: 0,
  dhuhrOffset: 0,
  asrOffset: 0,
  sunsetOffset: 0,
  maghribOffset: 0,
  ishaOffset: 0,
  midnightOffset: 0,
};

interface MosqueFixture {
  id?: string;
  latitude?: string | null;
  longitude?: string | null;
  timezone?: string;
  settings?: { calculationMethod: string; asrMethod: string } | null;
  prayerSettings?: Record<string, unknown> | null;
}

function mosque(fixture: MosqueFixture = {}) {
  const {
    id = MOSQUE_ID,
    latitude = '23.810331',
    longitude = '90.412521',
    timezone = 'Asia/Dhaka',
    settings = { calculationMethod: 'MuslimWorldLeague', asrMethod: 'Standard' },
    prayerSettings = null,
  } = fixture;

  return {
    id,
    // Decimal, not number: the service calls `.toNumber()` on these, so a plain number fixture would
    // pass a test the real column would fail.
    latitude: latitude === null ? null : new Prisma.Decimal(latitude),
    longitude: longitude === null ? null : new Prisma.Decimal(longitude),
    timezone,
    settings,
    prayerSettings,
  };
}

/** A `PrayerSettings` row: every override null and every offset zero unless named. */
function prayerSettings(overrides: Record<string, unknown> = {}) {
  return {
    mosqueId: MOSQUE_ID,
    method: null,
    school: null,
    latitude: null,
    longitude: null,
    timezone: null,
    ...NO_OFFSETS,
    updatedAt: new Date('2026-02-01T09:30:00.000Z'),
    ...overrides,
  };
}

describe('PrayerTimesService', () => {
  let service: PrayerTimesService;
  let prisma: PrismaService;
  let aladhan: AlAdhanClient;
  let cache: PrayerTimesCache;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrayerTimesService,
        PrayerTimesCache,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              ({
                ALADHAN_BASE_URL: 'https://aladhan.test/v1',
                ALADHAN_TIMEOUT_MS: 8000,
                PRAYER_CACHE_TTL_SECONDS: 3600,
              })[key],
          },
        },
        {
          provide: PrismaService,
          useValue: {
            mosque: { findUnique: jest.fn() },
            prayerSettings: { upsert: jest.fn() },
          },
        },
        { provide: AlAdhanClient, useValue: { getTimings: jest.fn() } },
      ],
    }).compile();

    service = module.get(PrayerTimesService);
    prisma = module.get(PrismaService);
    aladhan = module.get(AlAdhanClient);
    cache = module.get(PrayerTimesCache);

    cache.clear();
    (aladhan.getTimings as jest.Mock).mockResolvedValue(aladhanDay());
  });

  /** Shorthand: whatever `getTimings` was asked for on the most recent call. */
  function lastRequest(): AlAdhanRequest {
    const calls = (aladhan.getTimings as jest.Mock).mock.calls;

    return calls[calls.length - 1][0] as AlAdhanRequest;
  }

  /** The upsert's arguments, typed so an assertion is not reading `any` off a jest mock. */
  function lastUpsert(): { where: unknown; update: Record<string, unknown>; create: unknown } {
    return (prisma.prayerSettings.upsert as jest.Mock).mock.calls[0][0] as ReturnType<
      typeof lastUpsert
    >;
  }

  function mosqueIs(fixture: MosqueFixture = {}) {
    (prisma.mosque.findUnique as jest.Mock).mockResolvedValue(mosque(fixture));
  }

  describe('normalized response', () => {
    beforeEach(() => mosqueIs());

    it('publishes the nine timings under NOOR’s own keys', async () => {
      const result = await service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' });

      expect(Object.keys(result.timings)).toEqual([...PRAYER_KEYS]);
    });

    it('reports each timing as calculated, adjustment and published time', async () => {
      const result = await service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' });

      expect(result.timings.fajr).toEqual({ calculated: '04:35', adjustment: 0, time: '04:35' });
    });

    it('leaks nothing of AlAdhan’s own shape', async () => {
      const result = await service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' });
      const serialized = JSON.stringify(result);

      for (const upstreamKey of ['Fajr', 'Firstthird', 'Lastthird', '(+06)', 'timezonestring']) {
        expect(serialized).not.toContain(upstreamKey);
      }
    });

    it('names the method and school rather than only numbering them', async () => {
      const result = await service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' });

      expect(result.method).toEqual({ id: 3, name: 'Muslim World League' });
      expect(result.school).toEqual({ id: 0, name: 'Standard (Shafi, Maliki, Hanbali)' });
    });

    it('prefers the date and zone upstream echoed over the ones requested', async () => {
      (aladhan.getTimings as jest.Mock).mockResolvedValue(
        aladhanDay({ gregorianDate: '2026-03-02', timezone: 'Asia/Kolkata' }),
      );

      const result = await service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' });

      expect(result.date).toBe('2026-03-02');
      expect(result.timezone).toBe('Asia/Kolkata');
    });

    it('marks an unadjusted schedule as not adjusted', async () => {
      const result = await service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' });

      expect(result.adjusted).toBe(false);
    });
  });

  describe('mosque adjustments', () => {
    /** The specification's worked example: calculated 04:35, adjustment +5, published 04:40. */
    it('adds the mosque’s saved offset to the calculated time', async () => {
      mosqueIs({ prayerSettings: prayerSettings({ fajrOffset: 5 }) });

      const result = await service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' });

      expect(result.timings.fajr).toEqual({ calculated: '04:35', adjustment: 5, time: '04:40' });
      expect(result.adjusted).toBe(true);
    });

    it('leaves the other eight timings alone', async () => {
      mosqueIs({ prayerSettings: prayerSettings({ fajrOffset: 5 }) });

      const result = await service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' });

      expect(result.timings.dhuhr).toEqual({ calculated: '12:08', adjustment: 0, time: '12:08' });
    });

    it('moves a time earlier for a negative offset', async () => {
      mosqueIs({ prayerSettings: prayerSettings({ ishaOffset: -10 }) });

      const result = await service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' });

      expect(result.timings.isha.time).toBe('19:29');
    });

    it('wraps backwards across midnight rather than producing a negative time', async () => {
      mosqueIs({ prayerSettings: prayerSettings({ midnightOffset: -10 }) });

      const result = await service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' });

      expect(result.timings.midnight.time).toBe('23:58');
    });

    /**
     * The constraint the specification states outright: the external data is not to be modified. The
     * offsets are applied to the reply, so upstream is never asked for pre-adjusted times — which is also
     * what keeps `calculated` reportable and the adjustment reversible.
     */
    it('never sends the saved offsets upstream as a tune', async () => {
      mosqueIs({ prayerSettings: prayerSettings({ fajrOffset: 5, ishaOffset: -10 }) });

      await service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' });

      expect(lastRequest().tune).toBeNull();
    });

    it('adds a caller’s one-off tune on top of the saved offset', async () => {
      mosqueIs({ prayerSettings: prayerSettings({ fajrOffset: 5 }) });

      // AlAdhan's tune ordering: imsak, fajr, sunrise, dhuhr, asr, maghrib, sunset, isha, midnight.
      const result = await service.getPrayerTimes(MOSQUE_ID, {
        date: '2026-03-01',
        tune: '0,2,0,0,0,0,0,0,0',
      });

      expect(result.timings.fajr.adjustment).toBe(7);
      expect(result.timings.fajr.time).toBe('04:42');
    });

    it('reads a one-off tune in AlAdhan’s ordering, maghrib before sunset', async () => {
      mosqueIs();

      const result = await service.getPrayerTimes(MOSQUE_ID, {
        date: '2026-03-01',
        tune: '0,0,0,0,0,3,0,0,0',
      });

      expect(result.timings.maghrib.adjustment).toBe(3);
      expect(result.timings.sunset.adjustment).toBe(0);
    });
  });

  describe('configuration precedence', () => {
    it('translates the method named in mosque settings into AlAdhan’s id', async () => {
      mosqueIs({ settings: { calculationMethod: 'Karachi', asrMethod: 'Hanafi' } });

      const result = await service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' });

      expect(result.method.id).toBe(1);
      expect(result.school).toEqual({ id: 1, name: 'Hanafi' });
    });

    it('falls back to Muslim World League when the stored method is unrecognisable', async () => {
      mosqueIs({ settings: { calculationMethod: 'whatever the imam said', asrMethod: '' } });

      const result = await service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' });

      expect(result.method.id).toBe(3);
      expect(result.school.id).toBe(0);
    });

    it('lets PrayerSettings override the mosque’s own settings', async () => {
      mosqueIs({
        settings: { calculationMethod: 'MuslimWorldLeague', asrMethod: 'Standard' },
        prayerSettings: prayerSettings({ method: 2, school: 1, timezone: 'Asia/Karachi' }),
      });

      await service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' });

      expect(lastRequest()).toMatchObject({ method: 2, school: 1, timezone: 'Asia/Karachi' });
    });

    it('lets a request override both', async () => {
      mosqueIs({ prayerSettings: prayerSettings({ method: 2 }) });

      await service.getPrayerTimes(MOSQUE_ID, {
        date: '2026-03-01',
        method: 5,
        school: 1,
        latitude: 51.5074,
        longitude: -0.1278,
        timezone: 'Europe/London',
      });

      expect(lastRequest()).toMatchObject({
        method: 5,
        school: 1,
        latitude: 51.5074,
        longitude: -0.1278,
        timezone: 'Europe/London',
      });
    });

    it('prefers PrayerSettings coordinates to the mosque’s', async () => {
      mosqueIs({
        prayerSettings: prayerSettings({
          latitude: new Prisma.Decimal('21.422487'),
          longitude: new Prisma.Decimal('39.826206'),
        }),
      });

      const result = await service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' });

      expect(result.coordinates).toEqual({ latitude: 21.422487, longitude: 39.826206 });
    });

    it('asks for today in the mosque’s timezone, not the server’s', async () => {
      mosqueIs({ timezone: 'Pacific/Kiritimati' });

      await service.getPrayerTimes(MOSQUE_ID);

      expect(lastRequest().date).toBe(todayInZone('Pacific/Kiritimati'));
    });
  });

  describe('missing coordinates', () => {
    it('answers 400 rather than calling upstream with NaN', async () => {
      mosqueIs({ latitude: null, longitude: null });

      await expect(service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' })).rejects.toThrow(
        BadRequestException,
      );
      expect(aladhan.getTimings).not.toHaveBeenCalled();
    });

    it('says where to go and fix it', async () => {
      mosqueIs({ latitude: null, longitude: null });

      await expect(service.getPrayerTimes(MOSQUE_ID)).rejects.toThrow(/latitude and longitude/);
    });

    it('accepts request coordinates when the mosque has none', async () => {
      mosqueIs({ latitude: null, longitude: null });

      const result = await service.getPrayerTimes(MOSQUE_ID, {
        date: '2026-03-01',
        latitude: 23.810331,
        longitude: 90.412521,
      });

      expect(result.coordinates).toEqual({ latitude: 23.810331, longitude: 90.412521 });
    });

    it('refuses one coordinate without the other', async () => {
      mosqueIs({ latitude: null, longitude: null });

      await expect(
        service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01', latitude: 23.810331 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('date validation', () => {
    beforeEach(() => mosqueIs());

    // The path form of the route has no DTO, so this check has to live in the service to cover both.
    it.each(['today', '01-03-2026', '2026-3-1', '2026-13-01', '2026-02-30x'])(
      'rejects %s',
      async (date) => {
        await expect(service.getPrayerTimes(MOSQUE_ID, { date })).rejects.toThrow(
          BadRequestException,
        );
        expect(aladhan.getTimings).not.toHaveBeenCalled();
      },
    );

    it('accepts a well-formed date', async () => {
      await expect(
        service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' }),
      ).resolves.toBeDefined();
    });
  });

  describe('upstream failure', () => {
    let logged: jest.SpyInstance;

    beforeEach(() => {
      mosqueIs();
      // Every test here provokes a logged failure. Silencing it keeps the suite's output meaningful —
      // an error printed during a green run trains everyone to ignore the ones that matter.
      logged = jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
    });

    afterEach(() => logged.mockRestore());

    it('answers 503 rather than crashing', async () => {
      (aladhan.getTimings as jest.Mock).mockRejectedValue(
        new AlAdhanUnavailableError('timeout', 'no reply within 8000ms'),
      );

      await expect(service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' })).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('tells the caller to retry and nothing else', async () => {
      (aladhan.getTimings as jest.Mock).mockRejectedValue(
        new AlAdhanUnavailableError('network', 'connect ECONNREFUSED 104.21.0.1:443'),
      );

      await expect(service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' })).rejects.toThrow(
        'Prayer times are temporarily unavailable. Please try again shortly.',
      );
    });

    it('keeps the upstream detail out of the response and in the log', async () => {
      (aladhan.getTimings as jest.Mock).mockRejectedValue(
        new AlAdhanUnavailableError('http', 'status 502'),
      );

      const error = await service
        .getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' })
        .catch((caught: Error) => caught);

      expect((error as Error).message).not.toMatch(/502|aladhan/i);
      expect(logged).toHaveBeenCalledWith(expect.stringContaining('status 502'));
      expect(logged).toHaveBeenCalledWith(expect.stringContaining('2026-03-01'));
    });

    it('does not cache a failure', async () => {
      (aladhan.getTimings as jest.Mock).mockRejectedValueOnce(
        new AlAdhanUnavailableError('timeout', 'no reply'),
      );

      await expect(service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' })).rejects.toThrow();
      const result = await service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' });

      expect(result.source).toBe('aladhan');
    });

    it('rethrows anything that is not an upstream failure, so a bug is not reported as an outage', async () => {
      (aladhan.getTimings as jest.Mock).mockRejectedValue(
        new TypeError('cannot read x of undefined'),
      );

      await expect(service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' })).rejects.toThrow(
        TypeError,
      );
    });
  });

  describe('caching', () => {
    it('serves a repeated lookup without calling upstream again', async () => {
      mosqueIs();

      const first = await service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' });
      const second = await service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' });

      expect(first.source).toBe('aladhan');
      expect(second.source).toBe('cache');
      expect(aladhan.getTimings).toHaveBeenCalledTimes(1);
    });

    it('shares an entry between two mosques with the same calculation inputs', async () => {
      (prisma.mosque.findUnique as jest.Mock)
        .mockResolvedValueOnce(mosque())
        .mockResolvedValueOnce(mosque({ id: OTHER_MOSQUE_ID }));

      await service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' });
      const second = await service.getPrayerTimes(OTHER_MOSQUE_ID, { date: '2026-03-01' });

      expect(second.source).toBe('cache');
      expect(aladhan.getTimings).toHaveBeenCalledTimes(1);
    });

    it('keys on the calculation, so a different method is a different entry', async () => {
      mosqueIs();

      await service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' });
      await service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01', method: 2 });

      expect(aladhan.getTimings).toHaveBeenCalledTimes(2);
    });

    /**
     * The reason the cache holds the calculation rather than the finished response: an offset changes the
     * answer without changing the calculation, so a cached day still yields the new published time and
     * there is nothing to invalidate.
     */
    it('applies a changed offset to a cached calculation', async () => {
      mosqueIs();
      const first = await service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' });
      expect(first.timings.fajr.time).toBe('04:35');

      mosqueIs({ prayerSettings: prayerSettings({ fajrOffset: 5 }) });
      const second = await service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' });

      expect(second.source).toBe('cache');
      expect(second.timings.fajr.time).toBe('04:40');
      expect(aladhan.getTimings).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSettings', () => {
    it('reports nothing overridden and the mosque’s own values as effective', async () => {
      mosqueIs();

      const result = await service.getSettings(MOSQUE_ID);

      expect(result).toEqual({
        method: null,
        school: null,
        latitude: null,
        longitude: null,
        timezone: null,
        fajrTime: null,
        sunriseTime: null,
        dhuhrTime: null,
        asrTime: null,
        maghribTime: null,
        ishaTime: null,
        fajrIqamah: null,
        dhuhrIqamah: null,
        asrIqamah: null,
        maghribIqamah: null,
        ishaIqamah: null,
        effectiveMethod: { id: 3, name: 'Muslim World League' },
        effectiveSchool: { id: 0, name: 'Standard (Shafi, Maliki, Hanbali)' },
        effectiveCoordinates: { latitude: 23.810331, longitude: 90.412521 },
        effectiveTimezone: 'Asia/Dhaka',
        offsets: {
          imsak: 0,
          fajr: 0,
          sunrise: 0,
          dhuhr: 0,
          asr: 0,
          sunset: 0,
          maghrib: 0,
          isha: 0,
          midnight: 0,
        },
        updatedAt: null,
      });
    });

    it('reports the saved override alongside what it resolves to', async () => {
      mosqueIs({ prayerSettings: prayerSettings({ method: 2, fajrOffset: 5 }) });

      const result = await service.getSettings(MOSQUE_ID);

      expect(result.method).toBe(2);
      expect(result.effectiveMethod).toEqual({
        id: 2,
        name: 'Islamic Society of North America (ISNA)',
      });
      expect(result.offsets.fajr).toBe(5);
      expect(result.updatedAt).toBe('2026-02-01T09:30:00.000Z');
    });

    // A settings screen has to be able to report that coordinates are missing rather than fail to load.
    it('loads for a mosque with no coordinates', async () => {
      mosqueIs({ latitude: null, longitude: null });

      const result = await service.getSettings(MOSQUE_ID);

      expect(result.effectiveCoordinates).toBeNull();
    });

    it('does not create a row by reading', async () => {
      mosqueIs();

      await service.getSettings(MOSQUE_ID);

      expect(prisma.prayerSettings.upsert).not.toHaveBeenCalled();
    });
  });

  describe('updateSettings', () => {
    it('writes only the fields sent, and scopes the row to the caller’s mosque', async () => {
      mosqueIs();

      await service.updateSettings(MOSQUE_ID, { fajrOffset: 5 });

      expect(prisma.prayerSettings.upsert).toHaveBeenCalledWith({
        where: { mosqueId: MOSQUE_ID },
        update: { fajrOffset: 5 },
        create: { fajrOffset: 5, mosqueId: MOSQUE_ID },
      });
    });

    it('passes an explicit null through so an override can be cleared', async () => {
      mosqueIs();

      await service.updateSettings(MOSQUE_ID, { method: null, timezone: null });

      expect(prisma.prayerSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { method: null, timezone: null } }),
      );
    });

    it('leaves an omitted field alone rather than writing undefined', async () => {
      mosqueIs();

      await service.updateSettings(MOSQUE_ID, { school: 1 });

      const { update } = lastUpsert();
      expect(Object.keys(update)).toEqual(['school']);
    });

    it('writes coordinates as plain numbers for the Decimal columns', async () => {
      mosqueIs();

      await service.updateSettings(MOSQUE_ID, { latitude: 21.422487, longitude: 39.826206 });

      expect(prisma.prayerSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { latitude: 21.422487, longitude: 39.826206 } }),
      );
    });

    it('returns the settings as they now read', async () => {
      (prisma.mosque.findUnique as jest.Mock)
        .mockResolvedValueOnce(mosque())
        .mockResolvedValueOnce(mosque({ prayerSettings: prayerSettings({ fajrOffset: 5 }) }));

      const result = await service.updateSettings(MOSQUE_ID, { fajrOffset: 5 });

      expect(result.offsets.fajr).toBe(5);
    });

    it('refuses to write against a mosque that does not exist', async () => {
      (prisma.mosque.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.updateSettings(MOSQUE_ID, { fajrOffset: 5 })).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.prayerSettings.upsert).not.toHaveBeenCalled();
    });
  });

  describe('mosque scoping', () => {
    it('looks the mosque up by the id it was given and nothing from the request', async () => {
      mosqueIs();

      await service.getPrayerTimes(MOSQUE_ID, { date: '2026-03-01' });

      expect(prisma.mosque.findUnique).toHaveBeenCalledWith({
        where: { id: MOSQUE_ID },
        include: { settings: true, prayerSettings: true },
      });
    });
  });
});
