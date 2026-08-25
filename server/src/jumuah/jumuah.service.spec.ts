import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { JumuahService } from './jumuah.service';

/**
 * The Jumu'ah schedule.
 *
 * Two things carry the weight in this file. Every read and every write is scoped to the mosque the caller
 * was given, and a row from another mosque is a 404 rather than a 403 — so the tests below check not only
 * that access is refused but that the refusal says nothing about whether the row exists. And no path
 * anywhere reads a mosque id out of a DTO, which the last block asserts directly.
 */

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';
const OTHER_MOSQUE_ID = 'd0b80121-7ac0-11d1-898c-00c04fd8d5c1';
const ENTRY_ID = '1b4e28ba-2fa1-11d2-883f-0016d3cca427';

// 2026-03-06 is a Friday; 2026-03-05 is the Thursday before it.
const FRIDAY = '2026-03-06';
const THURSDAY = '2026-03-05';

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: ENTRY_ID,
    mosqueId: MOSQUE_ID,
    date: new Date('2026-03-06T00:00:00.000Z'),
    khutbahTime: '13:15',
    prayerTime: '13:45',
    imam: 'Shaykh Abdullah',
    location: 'Main Prayer Hall',
    notes: null,
    isActive: true,
    createdAt: new Date('2026-02-01T10:00:00.000Z'),
    updatedAt: new Date('2026-02-01T10:00:00.000Z'),
    ...overrides,
  };
}

describe('JumuahService', () => {
  let service: JumuahService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JumuahService,
        {
          provide: PrismaService,
          useValue: {
            jumuahSchedule: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get(JumuahService);
    prisma = module.get(PrismaService);
  });

  const schedule = () => prisma.jumuahSchedule as unknown as Record<string, jest.Mock>;

  /** The `data` a write was given, typed so an assertion is not reading `any` off a jest mock. */
  const writtenData = (call: jest.Mock): Record<string, unknown> =>
    (call.mock.calls[0][0] as { data: Record<string, unknown> }).data;

  describe('findAll', () => {
    it('reads only this mosque’s rows', async () => {
      schedule().findMany.mockResolvedValue([]);

      await service.findAll(MOSQUE_ID);

      expect(schedule().findMany).toHaveBeenCalledWith({
        where: { mosqueId: MOSQUE_ID },
        orderBy: [{ date: { sort: 'asc', nulls: 'first' } }, { prayerTime: 'asc' }],
      });
    });

    // The standing weekly schedule has a null date and belongs at the top, which is what `nulls: 'first'`
    // is for — Postgres would otherwise sort nulls last on an ascending order.
    it('puts the standing weekly schedule before the dated Fridays', async () => {
      schedule().findMany.mockResolvedValue([]);

      await service.findAll(MOSQUE_ID);

      const { orderBy } = schedule().findMany.mock.calls[0][0];
      expect(orderBy[0]).toEqual({ date: { sort: 'asc', nulls: 'first' } });
    });

    it('narrows to published entries when asked', async () => {
      schedule().findMany.mockResolvedValue([]);

      await service.findAll(MOSQUE_ID, { isActive: true });

      expect(schedule().findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { mosqueId: MOSQUE_ID, isActive: true } }),
      );
    });

    it('narrows to unpublished entries for an explicit false', async () => {
      schedule().findMany.mockResolvedValue([]);

      await service.findAll(MOSQUE_ID, { isActive: false });

      expect(schedule().findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { mosqueId: MOSQUE_ID, isActive: false } }),
      );
    });

    it('returns both when the filter is omitted', async () => {
      schedule().findMany.mockResolvedValue([]);

      await service.findAll(MOSQUE_ID, {});

      const { where } = schedule().findMany.mock.calls[0][0];
      expect(where).not.toHaveProperty('isActive');
    });

    it('serves the calendar day as YYYY-MM-DD, not a midnight timestamp', async () => {
      schedule().findMany.mockResolvedValue([row()]);

      const [entry] = await service.findAll(MOSQUE_ID);

      expect(entry.date).toBe('2026-03-06');
    });

    it('serves the standing schedule with a null date', async () => {
      schedule().findMany.mockResolvedValue([row({ date: null })]);

      const [entry] = await service.findAll(MOSQUE_ID);

      expect(entry.date).toBeNull();
    });

    // An internal identifier the caller can never act on, on every element of every list.
    it('does not echo the mosque id back', async () => {
      schedule().findMany.mockResolvedValue([row()]);

      const [entry] = await service.findAll(MOSQUE_ID);

      expect(entry).not.toHaveProperty('mosqueId');
    });
  });

  describe('findOne', () => {
    it('matches on the id and the mosque together', async () => {
      schedule().findFirst.mockResolvedValue(row());

      await service.findOne(MOSQUE_ID, ENTRY_ID);

      expect(schedule().findFirst).toHaveBeenCalledWith({
        where: { id: ENTRY_ID, mosqueId: MOSQUE_ID },
      });
    });

    it('answers 404 for a row belonging to another mosque', async () => {
      // What the query above returns when the uuid is real but the mosque is not the caller's.
      schedule().findFirst.mockResolvedValue(null);

      await expect(service.findOne(OTHER_MOSQUE_ID, ENTRY_ID)).rejects.toThrow(NotFoundException);
    });

    it('says nothing about whether the row exists', async () => {
      schedule().findFirst.mockResolvedValue(null);

      await expect(service.findOne(OTHER_MOSQUE_ID, ENTRY_ID)).rejects.toThrow(
        'Jumu’ah schedule not found',
      );
    });
  });

  describe('create', () => {
    beforeEach(() => schedule().create.mockResolvedValue(row()));

    it('takes the mosque from its argument', async () => {
      await service.create(MOSQUE_ID, { khutbahTime: '13:15', prayerTime: '13:45' });

      expect(schedule().create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ mosqueId: MOSQUE_ID }) }),
      );
    });

    it('stores a Friday as a UTC calendar day', async () => {
      await service.create(MOSQUE_ID, {
        date: FRIDAY,
        khutbahTime: '13:15',
        prayerTime: '13:45',
      });

      const { data } = schedule().create.mock.calls[0][0];
      expect(data.date).toEqual(new Date('2026-03-06T00:00:00.000Z'));
    });

    it('treats an omitted date as the standing weekly schedule', async () => {
      await service.create(MOSQUE_ID, { khutbahTime: '13:15', prayerTime: '13:45' });

      expect(writtenData(schedule().create).date).toBeNull();
    });

    it('treats an explicit null the same way', async () => {
      await service.create(MOSQUE_ID, { date: null, khutbahTime: '13:15', prayerTime: '13:45' });

      expect(writtenData(schedule().create).date).toBeNull();
    });

    it('publishes by default', async () => {
      await service.create(MOSQUE_ID, { khutbahTime: '13:15', prayerTime: '13:45' });

      expect(writtenData(schedule().create).isActive).toBe(true);
    });

    it('honours an explicit false', async () => {
      await service.create(MOSQUE_ID, {
        khutbahTime: '13:15',
        prayerTime: '13:45',
        isActive: false,
      });

      expect(writtenData(schedule().create).isActive).toBe(false);
    });

    it('writes the optional fields as null rather than leaving them undefined', async () => {
      await service.create(MOSQUE_ID, { khutbahTime: '13:15', prayerTime: '13:45' });

      const { data } = schedule().create.mock.calls[0][0];
      expect(data).toMatchObject({ imam: null, location: null, notes: null });
    });

    /**
     * Jumu'ah is the Friday prayer. A Thursday here is an admin slipping a day while typing next
     * quarter's dates, and it is worth catching before a khutbah time is published on the wrong day.
     */
    it('refuses a date that is not a Friday', async () => {
      await expect(
        service.create(MOSQUE_ID, { date: THURSDAY, khutbahTime: '13:15', prayerTime: '13:45' }),
      ).rejects.toThrow(BadRequestException);
      expect(schedule().create).not.toHaveBeenCalled();
    });

    it('says which date is wrong and what to do instead', async () => {
      await expect(
        service.create(MOSQUE_ID, { date: THURSDAY, khutbahTime: '13:15', prayerTime: '13:45' }),
      ).rejects.toThrow(/2026-03-05 is not a Friday.*omit the date/s);
    });
  });

  describe('update', () => {
    it('establishes ownership before writing', async () => {
      schedule().findFirst.mockResolvedValue(row());
      schedule().update.mockResolvedValue(row({ prayerTime: '14:00' }));

      await service.update(MOSQUE_ID, ENTRY_ID, { prayerTime: '14:00' });

      expect(schedule().findFirst).toHaveBeenCalledWith({
        where: { id: ENTRY_ID, mosqueId: MOSQUE_ID },
      });
      expect(schedule().update).toHaveBeenCalledWith({
        where: { id: ENTRY_ID },
        data: { prayerTime: '14:00' },
      });
    });

    it('does not write at all for another mosque’s row', async () => {
      schedule().findFirst.mockResolvedValue(null);

      await expect(
        service.update(OTHER_MOSQUE_ID, ENTRY_ID, { prayerTime: '14:00' }),
      ).rejects.toThrow(NotFoundException);
      expect(schedule().update).not.toHaveBeenCalled();
    });

    it('touches only the fields sent', async () => {
      schedule().findFirst.mockResolvedValue(row());
      schedule().update.mockResolvedValue(row());

      await service.update(MOSQUE_ID, ENTRY_ID, { imam: 'Shaykh Yusuf' });

      expect(Object.keys(writtenData(schedule().update))).toEqual(['imam']);
    });

    /** The three-way meaning of `date`: absent leaves it, null unpins it, a date pins it. */
    it('turns a dated Friday back into the standing schedule for an explicit null', async () => {
      schedule().findFirst.mockResolvedValue(row());
      schedule().update.mockResolvedValue(row({ date: null }));

      await service.update(MOSQUE_ID, ENTRY_ID, { date: null });

      expect(writtenData(schedule().update).date).toBeNull();
    });

    it('leaves the date alone when it is not mentioned', async () => {
      schedule().findFirst.mockResolvedValue(row());
      schedule().update.mockResolvedValue(row());

      await service.update(MOSQUE_ID, ENTRY_ID, { notes: 'Doors open at 12:45.' });

      expect(writtenData(schedule().update)).not.toHaveProperty('date');
    });

    it('applies the Friday rule on update as well as create', async () => {
      schedule().findFirst.mockResolvedValue(row());

      await expect(service.update(MOSQUE_ID, ENTRY_ID, { date: THURSDAY })).rejects.toThrow(
        BadRequestException,
      );
      expect(schedule().update).not.toHaveBeenCalled();
    });

    it('accepts an empty patch without writing anything unexpected', async () => {
      schedule().findFirst.mockResolvedValue(row());
      schedule().update.mockResolvedValue(row());

      await service.update(MOSQUE_ID, ENTRY_ID, {});

      expect(schedule().update).toHaveBeenCalledWith({ where: { id: ENTRY_ID }, data: {} });
    });
  });

  describe('remove', () => {
    it('establishes ownership, then deletes', async () => {
      schedule().findFirst.mockResolvedValue(row());
      schedule().delete.mockResolvedValue(row());

      await service.remove(MOSQUE_ID, ENTRY_ID);

      expect(schedule().findFirst).toHaveBeenCalledWith({
        where: { id: ENTRY_ID, mosqueId: MOSQUE_ID },
      });
      expect(schedule().delete).toHaveBeenCalledWith({ where: { id: ENTRY_ID } });
    });

    it('does not delete another mosque’s row', async () => {
      schedule().findFirst.mockResolvedValue(null);

      await expect(service.remove(OTHER_MOSQUE_ID, ENTRY_ID)).rejects.toThrow(NotFoundException);
      expect(schedule().delete).not.toHaveBeenCalled();
    });

    it('returns what it removed', async () => {
      schedule().findFirst.mockResolvedValue(row());
      schedule().delete.mockResolvedValue(row());

      const removed = await service.remove(MOSQUE_ID, ENTRY_ID);

      expect(removed).toMatchObject({ id: ENTRY_ID, date: '2026-03-06', prayerTime: '13:45' });
    });
  });

  describe('mosque id from the token only', () => {
    /**
     * `forbidNonWhitelisted` already rejects a request carrying `mosqueId`, so this can only happen if a
     * later DTO change adds the field. The assertion is that even then the service would ignore it.
     */
    it('ignores a mosqueId that reaches the DTO', async () => {
      schedule().create.mockResolvedValue(row());

      await service.create(MOSQUE_ID, {
        khutbahTime: '13:15',
        prayerTime: '13:45',
        mosqueId: OTHER_MOSQUE_ID,
      } as never);

      expect(writtenData(schedule().create).mosqueId).toBe(MOSQUE_ID);
    });

    it('ignores one on update too', async () => {
      schedule().findFirst.mockResolvedValue(row());
      schedule().update.mockResolvedValue(row());

      await service.update(MOSQUE_ID, ENTRY_ID, { mosqueId: OTHER_MOSQUE_ID } as never);

      expect(writtenData(schedule().update)).not.toHaveProperty('mosqueId');
    });
  });
});
