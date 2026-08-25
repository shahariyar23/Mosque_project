import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { RamadanService } from './ramadan.service';

/**
 * The Ramadan schedule.
 *
 * Same tenancy shape as Jumu'ah — every read and write scoped to the mosque from the token, a foreign row
 * answered with a 404 — plus the one thing this table has that the other does not: a unique day per
 * mosque per year, and a 409 phrased in terms of days rather than indexes when an admin enters one twice.
 */

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';
const OTHER_MOSQUE_ID = 'd0b80121-7ac0-11d1-898c-00c04fd8d5c1';
const ENTRY_ID = '1b4e28ba-2fa1-11d2-883f-0016d3cca427';

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: ENTRY_ID,
    mosqueId: MOSQUE_ID,
    year: 1447,
    date: new Date('2026-03-01T00:00:00.000Z'),
    fastingStart: '04:35',
    fastingEnd: '18:23',
    suhoorTime: '04:20',
    iftarTime: '18:23',
    taraweehTime: '20:15',
    notes: null,
    createdAt: new Date('2026-02-01T10:00:00.000Z'),
    updatedAt: new Date('2026-02-01T10:00:00.000Z'),
    ...overrides,
  };
}

/** The minimum a create needs. */
const newDay = {
  year: 1447,
  date: '2026-03-01',
  fastingStart: '04:35',
  fastingEnd: '18:23',
};

/** The error Postgres raises through Prisma when `(mosqueId, year, date)` is entered twice. */
function duplicateDay(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '6.0.0',
    meta: { target: ['mosqueId', 'year', 'date'] },
  });
}

describe('RamadanService', () => {
  let service: RamadanService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RamadanService,
        {
          provide: PrismaService,
          useValue: {
            ramadanSchedule: {
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

    service = module.get(RamadanService);
    prisma = module.get(PrismaService);
  });

  const table = () => prisma.ramadanSchedule as unknown as Record<string, jest.Mock>;

  /** The `data` a write was given, typed so an assertion is not reading `any` off a jest mock. */
  const writtenData = (call: jest.Mock): Record<string, unknown> =>
    (call.mock.calls[0][0] as { data: Record<string, unknown> }).data;

  describe('findAll', () => {
    it('reads only this mosque’s rows', async () => {
      table().findMany.mockResolvedValue([]);

      await service.findAll(MOSQUE_ID);

      expect(table().findMany).toHaveBeenCalledWith({
        where: { mosqueId: MOSQUE_ID },
        orderBy: [{ year: 'desc' }, { date: 'asc' }],
      });
    });

    // Newest year first so an unfiltered read opens on the current Ramadan; calendar order within it.
    it('orders by year descending, then date ascending', async () => {
      table().findMany.mockResolvedValue([]);

      await service.findAll(MOSQUE_ID);

      expect(table().findMany.mock.calls[0][0].orderBy).toEqual([
        { year: 'desc' },
        { date: 'asc' },
      ]);
    });

    it('narrows to one Hijri year when asked', async () => {
      table().findMany.mockResolvedValue([]);

      await service.findAll(MOSQUE_ID, { year: 1447 });

      expect(table().findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { mosqueId: MOSQUE_ID, year: 1447 } }),
      );
    });

    it('returns every year when the filter is omitted', async () => {
      table().findMany.mockResolvedValue([]);

      await service.findAll(MOSQUE_ID, {});

      expect(table().findMany.mock.calls[0][0].where).not.toHaveProperty('year');
    });

    it('serves the calendar day as YYYY-MM-DD', async () => {
      table().findMany.mockResolvedValue([row()]);

      const [entry] = await service.findAll(MOSQUE_ID);

      expect(entry.date).toBe('2026-03-01');
    });

    it('does not echo the mosque id back', async () => {
      table().findMany.mockResolvedValue([row()]);

      const [entry] = await service.findAll(MOSQUE_ID);

      expect(entry).not.toHaveProperty('mosqueId');
    });
  });

  describe('findOne', () => {
    it('matches on the id and the mosque together', async () => {
      table().findFirst.mockResolvedValue(row());

      await service.findOne(MOSQUE_ID, ENTRY_ID);

      expect(table().findFirst).toHaveBeenCalledWith({
        where: { id: ENTRY_ID, mosqueId: MOSQUE_ID },
      });
    });

    it('answers 404 for another mosque’s row', async () => {
      table().findFirst.mockResolvedValue(null);

      await expect(service.findOne(OTHER_MOSQUE_ID, ENTRY_ID)).rejects.toThrow(NotFoundException);
    });

    it('says nothing about whether the row exists', async () => {
      table().findFirst.mockResolvedValue(null);

      await expect(service.findOne(OTHER_MOSQUE_ID, ENTRY_ID)).rejects.toThrow(
        'Ramadan schedule not found',
      );
    });
  });

  describe('create', () => {
    beforeEach(() => table().create.mockResolvedValue(row()));

    it('takes the mosque from its argument', async () => {
      await service.create(MOSQUE_ID, newDay);

      expect(writtenData(table().create).mosqueId).toBe(MOSQUE_ID);
    });

    it('stores the date as a UTC calendar day', async () => {
      await service.create(MOSQUE_ID, newDay);

      expect(writtenData(table().create).date).toEqual(new Date('2026-03-01T00:00:00.000Z'));
    });

    it('keeps the wall-clock times as entered', async () => {
      await service.create(MOSQUE_ID, {
        ...newDay,
        suhoorTime: '04:20',
        iftarTime: '18:23',
        taraweehTime: '20:15',
      });

      expect(writtenData(table().create)).toMatchObject({
        fastingStart: '04:35',
        fastingEnd: '18:23',
        suhoorTime: '04:20',
        iftarTime: '18:23',
        taraweehTime: '20:15',
      });
    });

    it('writes the optional times as null rather than undefined', async () => {
      await service.create(MOSQUE_ID, newDay);

      expect(writtenData(table().create)).toMatchObject({
        suhoorTime: null,
        iftarTime: null,
        taraweehTime: null,
        notes: null,
      });
    });

    /**
     * A mosque has one set of times per day, so the same day twice is a mistake rather than a second
     * schedule. The filter already turns P2002 into a 409 — the service exists here for the wording.
     */
    it('reports a duplicate day as a conflict about days', async () => {
      table().create.mockRejectedValue(duplicateDay());

      await expect(service.create(MOSQUE_ID, newDay)).rejects.toThrow(ConflictException);
    });

    it('tells the admin to update the existing entry', async () => {
      table().create.mockRejectedValue(duplicateDay());

      await expect(service.create(MOSQUE_ID, newDay)).rejects.toThrow(
        'This mosque already has a Ramadan schedule for that day. Update the existing entry instead.',
      );
    });

    it('names no constraint or column in the message', async () => {
      table().create.mockRejectedValue(duplicateDay());

      const error = await service.create(MOSQUE_ID, newDay).catch((caught: Error) => caught);

      expect((error as Error).message).not.toMatch(/mosqueId|constraint|P2002/);
    });

    it('leaves any other Prisma error to the global filter', async () => {
      const foreignKey = new Prisma.PrismaClientKnownRequestError('FK failed', {
        code: 'P2003',
        clientVersion: '6.0.0',
      });
      table().create.mockRejectedValue(foreignKey);

      await expect(service.create(MOSQUE_ID, newDay)).rejects.toMatchObject({ code: 'P2003' });
    });
  });

  describe('update', () => {
    it('establishes ownership before writing', async () => {
      table().findFirst.mockResolvedValue(row());
      table().update.mockResolvedValue(row({ iftarTime: '18:30' }));

      await service.update(MOSQUE_ID, ENTRY_ID, { iftarTime: '18:30' });

      expect(table().findFirst).toHaveBeenCalledWith({
        where: { id: ENTRY_ID, mosqueId: MOSQUE_ID },
      });
      expect(table().update).toHaveBeenCalledWith({
        where: { id: ENTRY_ID },
        data: { iftarTime: '18:30' },
      });
    });

    it('does not write at all for another mosque’s row', async () => {
      table().findFirst.mockResolvedValue(null);

      await expect(
        service.update(OTHER_MOSQUE_ID, ENTRY_ID, { iftarTime: '18:30' }),
      ).rejects.toThrow(NotFoundException);
      expect(table().update).not.toHaveBeenCalled();
    });

    it('touches only the fields sent', async () => {
      table().findFirst.mockResolvedValue(row());
      table().update.mockResolvedValue(row());

      await service.update(MOSQUE_ID, ENTRY_ID, { taraweehTime: '20:30' });

      expect(Object.keys(writtenData(table().update))).toEqual(['taraweehTime']);
    });

    it('converts a moved date to a calendar day', async () => {
      table().findFirst.mockResolvedValue(row());
      table().update.mockResolvedValue(row({ date: new Date('2026-03-02T00:00:00.000Z') }));

      await service.update(MOSQUE_ID, ENTRY_ID, { date: '2026-03-02' });

      expect(writtenData(table().update).date).toEqual(new Date('2026-03-02T00:00:00.000Z'));
    });

    it('clears an optional time for an explicit null', async () => {
      table().findFirst.mockResolvedValue(row());
      table().update.mockResolvedValue(row({ taraweehTime: null }));

      await service.update(MOSQUE_ID, ENTRY_ID, { taraweehTime: null });

      expect(writtenData(table().update).taraweehTime).toBeNull();
    });

    it('reports a move onto an occupied day as a conflict', async () => {
      table().findFirst.mockResolvedValue(row());
      table().update.mockRejectedValue(duplicateDay());

      await expect(service.update(MOSQUE_ID, ENTRY_ID, { date: '2026-03-02' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('accepts an empty patch', async () => {
      table().findFirst.mockResolvedValue(row());
      table().update.mockResolvedValue(row());

      await service.update(MOSQUE_ID, ENTRY_ID, {});

      expect(table().update).toHaveBeenCalledWith({ where: { id: ENTRY_ID }, data: {} });
    });
  });

  describe('remove', () => {
    it('establishes ownership, then deletes', async () => {
      table().findFirst.mockResolvedValue(row());
      table().delete.mockResolvedValue(row());

      await service.remove(MOSQUE_ID, ENTRY_ID);

      expect(table().findFirst).toHaveBeenCalledWith({
        where: { id: ENTRY_ID, mosqueId: MOSQUE_ID },
      });
      expect(table().delete).toHaveBeenCalledWith({ where: { id: ENTRY_ID } });
    });

    it('does not delete another mosque’s row', async () => {
      table().findFirst.mockResolvedValue(null);

      await expect(service.remove(OTHER_MOSQUE_ID, ENTRY_ID)).rejects.toThrow(NotFoundException);
      expect(table().delete).not.toHaveBeenCalled();
    });

    it('returns what it removed', async () => {
      table().findFirst.mockResolvedValue(row());
      table().delete.mockResolvedValue(row());

      const removed = await service.remove(MOSQUE_ID, ENTRY_ID);

      expect(removed).toMatchObject({ id: ENTRY_ID, year: 1447, date: '2026-03-01' });
    });
  });

  describe('mosque id from the token only', () => {
    it('ignores a mosqueId that reaches the DTO', async () => {
      table().create.mockResolvedValue(row());

      await service.create(MOSQUE_ID, { ...newDay, mosqueId: OTHER_MOSQUE_ID } as never);

      expect(writtenData(table().create).mosqueId).toBe(MOSQUE_ID);
    });

    it('ignores one on update too', async () => {
      table().findFirst.mockResolvedValue(row());
      table().update.mockResolvedValue(row());

      await service.update(MOSQUE_ID, ENTRY_ID, { mosqueId: OTHER_MOSQUE_ID } as never);

      expect(writtenData(table().update)).not.toHaveProperty('mosqueId');
    });
  });
});
