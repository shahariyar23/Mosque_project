import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BudgetStatus, Prisma } from '@prisma/client';

import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { BudgetsService } from './budgets.service';
import type { CreateBudgetDto } from './dto/create-budget.dto';
import type { UpdateBudgetDto } from './dto/update-budget.dto';

/**
 * Budgets.
 *
 * Four things carry the weight here.
 *
 * The mosque comes from the token and from nowhere else, which the last block asserts directly. So does
 * `createdById`: who set a figure is a fact about the request, and a body that asserts one is ignored.
 *
 * Money never becomes a float — in as a `Prisma.Decimal`, out as an exact string, with one case using a value
 * binary floating point cannot hold.
 *
 * `periodEnd` may not fall before `periodStart`, and on a patch that is checked against the *stored* value of
 * whichever end is not being moved. No per-field validator can see both, which is why it lives in the service.
 *
 * And `from`/`to` match budgets whose period **overlaps** the window rather than budgets contained in it. An
 * annual budget covers August without either endpoint falling in August; a containment filter would leave it
 * out, and that is the one answer that is certainly wrong.
 */

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';
const OTHER_MOSQUE_ID = 'd0b80121-7ac0-11d1-898c-00c04fd8d5c1';
const BUDGET_ID = '7a9c6cfe-6fe5-11d2-883f-0016d3cca432';

/** A treasurer of `MOSQUE_ID`. Nothing in the service reads the role; the route decorators hold the grants. */
const ACTOR: AuthenticatedUser = {
  id: '9c8b7a65-4321-4f6a-8c11-2d5e7a9b0c31',
  mosqueId: MOSQUE_ID,
  email: 'treasurer@noor.example',
  role: 'treasurer',
  permissions: [],
  deniedPermissions: [],
  isActive: true,
};

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: BUDGET_ID,
    name: 'Q3 Utilities',
    category: 'Utilities',
    amount: new Prisma.Decimal('50000.00'),
    currency: 'BDT',
    periodStart: new Date('2026-07-01T00:00:00.000Z'),
    periodEnd: new Date('2026-09-30T00:00:00.000Z'),
    status: BudgetStatus.draft,
    notes: null,
    createdAt: new Date('2026-06-25T09:00:00.000Z'),
    updatedAt: new Date('2026-06-25T09:00:00.000Z'),
    createdBy: { id: ACTOR.id, fullName: 'Ahmed Hasan' },
    ...overrides,
  };
}

/** The minimum a create needs: what the line is called, what it governs, how much, and over what days. */
function newBudget(overrides: Partial<CreateBudgetDto> = {}): CreateBudgetDto {
  return {
    name: 'Q3 Utilities',
    category: 'Utilities',
    amount: '50000.00',
    periodStart: '2026-07-01',
    periodEnd: '2026-09-30',
    ...overrides,
  };
}

describe('BudgetsService', () => {
  let service: BudgetsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        {
          provide: PrismaService,
          useValue: {
            budget: {
              count: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            mosqueSettings: { findUnique: jest.fn().mockResolvedValue({ currency: 'BDT' }) },
            $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
          },
        },
      ],
    }).compile();

    service = module.get(BudgetsService);
    prisma = module.get(PrismaService);
  });

  const budgets = () => prisma.budget as unknown as Record<string, jest.Mock>;
  const settings = () => prisma.mosqueSettings as unknown as Record<string, jest.Mock>;

  /** The `data` a write was given, typed so an assertion is not reading `any` off a jest mock. */
  const writtenData = (call: jest.Mock): Record<string, unknown> =>
    (call.mock.calls[0][0] as { data: Record<string, unknown> }).data;

  /** The `where` a query was given. */
  const queriedWhere = (call: jest.Mock): Record<string, unknown> =>
    (call.mock.calls[0][0] as { where: Record<string, unknown> }).where;

  describe('create', () => {
    it('sets the budget against the caller’s own mosque and names them as its author', async () => {
      budgets().create.mockResolvedValue(row());

      const created = await service.create(ACTOR, newBudget());

      const data = writtenData(budgets().create);
      expect(data.mosqueId).toBe(MOSQUE_ID);
      expect(data.createdById).toBe(ACTOR.id);
      expect(created.createdBy).toEqual({ id: ACTOR.id, fullName: 'Ahmed Hasan' });
    });

    it('stores the amount as a Decimal, not a number', async () => {
      budgets().create.mockResolvedValue(row());

      await service.create(ACTOR, newBudget());

      const stored = writtenData(budgets().create).amount;
      expect(stored).toBeInstanceOf(Prisma.Decimal);
      expect(typeof stored).not.toBe('number');
    });

    // The point of Decimal, stated as a value: 1234567.89 has no exact binary representation.
    it('keeps an amount a float would round, in and out', async () => {
      budgets().create.mockResolvedValue(row({ amount: new Prisma.Decimal('1234567.89') }));

      const created = await service.create(ACTOR, newBudget({ amount: '1234567.89' }));

      expect((writtenData(budgets().create).amount as Prisma.Decimal).toFixed(2)).toBe(
        '1234567.89',
      );
      expect(created.amount).toBe('1234567.89');
      expect(typeof created.amount).toBe('string');
    });

    // Days, not instants: midnight UTC in, the same calendar dates out, on any server.
    it('stores the period as calendar days and returns them as days', async () => {
      budgets().create.mockResolvedValue(row());

      const created = await service.create(ACTOR, newBudget());

      const data = writtenData(budgets().create);
      expect((data.periodStart as Date).toISOString()).toBe('2026-07-01T00:00:00.000Z');
      expect((data.periodEnd as Date).toISOString()).toBe('2026-09-30T00:00:00.000Z');
      expect(created.periodStart).toBe('2026-07-01');
      expect(created.periodEnd).toBe('2026-09-30');
    });

    // The cross-field rule the DTO cannot express, refused before anything is written.
    it('refuses a period that ends before it starts', async () => {
      await expect(
        service.create(ACTOR, newBudget({ periodStart: '2026-09-30', periodEnd: '2026-07-01' })),
      ).rejects.toMatchObject({ response: { code: 'INVALID_BUDGET_PERIOD' } });

      expect(budgets().create).not.toHaveBeenCalled();
    });

    it('allows a period of a single day', async () => {
      budgets().create.mockResolvedValue(row());

      await expect(
        service.create(ACTOR, newBudget({ periodStart: '2026-07-01', periodEnd: '2026-07-01' })),
      ).resolves.toBeDefined();
    });

    it('trims the name and the category', async () => {
      budgets().create.mockResolvedValue(row());

      await service.create(
        ACTOR,
        newBudget({ name: '  Q3 Utilities  ', category: '  Utilities  ' }),
      );

      const data = writtenData(budgets().create);
      expect(data.name).toBe('Q3 Utilities');
      expect(data.category).toBe('Utilities');
    });

    it('defaults the currency to the mosque’s configured one and writes it onto the row', async () => {
      settings().findUnique.mockResolvedValue({ currency: 'usd' });
      budgets().create.mockResolvedValue(row({ currency: 'USD' }));

      await service.create(ACTOR, newBudget());

      expect(queriedWhere(settings().findUnique)).toEqual({ mosqueId: MOSQUE_ID });
      expect(writtenData(budgets().create).currency).toBe('USD');
    });

    // The column is a VarChar with no format constraint, so a mosque could be holding "Taka" in it.
    it('falls back to BDT when the configured currency is not a currency code, or is missing', async () => {
      settings().findUnique.mockResolvedValue({ currency: 'Taka' });
      budgets().create.mockResolvedValue(row());
      await service.create(ACTOR, newBudget());
      expect(writtenData(budgets().create).currency).toBe('BDT');

      budgets().create.mockClear();
      settings().findUnique.mockResolvedValue(null);
      await service.create(ACTOR, newBudget());
      expect(writtenData(budgets().create).currency).toBe('BDT');
    });

    // Left out of the `data` entirely, so the column default (`draft`) decides rather than the service guessing.
    it('leaves the status to the database when it was not sent', async () => {
      budgets().create.mockResolvedValue(row());

      await service.create(ACTOR, newBudget());

      expect(writtenData(budgets().create)).not.toHaveProperty('status');
    });

    it('records an active budget when the caller says the figure is already in force', async () => {
      budgets().create.mockResolvedValue(row({ status: BudgetStatus.active }));

      const created = await service.create(ACTOR, newBudget({ status: BudgetStatus.active }));

      expect(writtenData(budgets().create).status).toBe(BudgetStatus.active);
      expect(created.status).toBe(BudgetStatus.active);
    });

    it('does not write any field the DTO did not name', async () => {
      budgets().create.mockResolvedValue(row());

      await service.create(ACTOR, newBudget());

      expect(Object.keys(writtenData(budgets().create)).sort()).toEqual([
        'amount',
        'category',
        'createdById',
        'currency',
        'mosqueId',
        'name',
        'notes',
        'periodEnd',
        'periodStart',
      ]);
    });

    // A budget is an intention. Nothing is reserved, capped or drawn down by setting one.
    it('caps nothing and reserves nothing', async () => {
      budgets().create.mockResolvedValue(row({ status: BudgetStatus.active }));

      await service.create(ACTOR, newBudget({ status: BudgetStatus.active }));

      // The only other table this path reads is the settings row, for the currency.
      expect(Object.keys(settings())).toEqual(['findUnique']);
      expect(budgets().update).not.toHaveBeenCalled();
    });
  });

  describe('findMany', () => {
    beforeEach(() => {
      budgets().count.mockResolvedValue(0);
      budgets().findMany.mockResolvedValue([]);
    });

    it('scopes every list to the caller’s mosque', async () => {
      await service.findMany(ACTOR, {});

      expect(queriedWhere(budgets().findMany)).toEqual({ mosqueId: MOSQUE_ID });
      expect(queriedWhere(budgets().count).mosqueId).toBe(MOSQUE_ID);
    });

    it('defaults to page 1 of 20 and caps the page size at 100', async () => {
      await service.findMany(ACTOR, {});
      expect(budgets().findMany.mock.calls[0][0]).toMatchObject({ skip: 0, take: 20 });

      budgets().findMany.mockClear();
      await service.findMany(ACTOR, { limit: 5000 });
      expect((budgets().findMany.mock.calls[0][0] as { take: number }).take).toBe(100);
    });

    it('orders newest first, with the id breaking ties', async () => {
      await service.findMany(ACTOR, {});

      expect((budgets().findMany.mock.calls[0][0] as { orderBy: unknown }).orderBy).toEqual([
        { createdAt: 'desc' },
        { id: 'asc' },
      ]);
    });

    it('filters on status and on an exact category', async () => {
      await service.findMany(ACTOR, { status: BudgetStatus.active, category: '  Utilities  ' });

      expect(queriedWhere(budgets().findMany)).toEqual({
        mosqueId: MOSQUE_ID,
        status: BudgetStatus.active,
        category: 'Utilities',
      });
    });

    /**
     * The filter is an overlap, not a containment: a budget matches when its period and the window share a
     * day. `periodStart <= to` and `periodEnd >= from` is exactly that, and it is what returns an annual
     * budget to somebody asking about August.
     */
    it('matches budgets whose period overlaps the window rather than sits inside it', async () => {
      await service.findMany(ACTOR, { from: '2026-08-01', to: '2026-08-31' });

      const where = queriedWhere(budgets().findMany) as {
        periodStart: { lte: Date };
        periodEnd: { gte: Date };
      };
      expect(where.periodStart.lte.toISOString()).toBe('2026-08-31T00:00:00.000Z');
      expect(where.periodEnd.gte.toISOString()).toBe('2026-08-01T00:00:00.000Z');
      // Neither end is bounded from the other side, which is what a containment filter would add.
      expect(Object.keys(where.periodStart)).toEqual(['lte']);
      expect(Object.keys(where.periodEnd)).toEqual(['gte']);
    });

    it('accepts an open-ended window from either side', async () => {
      await service.findMany(ACTOR, { from: '2026-08-01' });
      const fromOnly = queriedWhere(budgets().findMany);
      expect(fromOnly).toHaveProperty('periodEnd');
      expect(fromOnly).not.toHaveProperty('periodStart');

      budgets().findMany.mockClear();
      await service.findMany(ACTOR, { to: '2026-08-31' });
      const toOnly = queriedWhere(budgets().findMany);
      expect(toOnly).toHaveProperty('periodStart');
      expect(toOnly).not.toHaveProperty('periodEnd');
    });

    it('leaves the date filter out entirely when neither end was given', async () => {
      await service.findMany(ACTOR, {});

      const where = queriedWhere(budgets().findMany);
      expect(where).not.toHaveProperty('periodStart');
      expect(where).not.toHaveProperty('periodEnd');
    });

    // An empty page would hide the mistake.
    it('refuses an inverted window with a 400 rather than returning nothing', async () => {
      await expect(
        service.findMany(ACTOR, { from: '2026-08-31', to: '2026-08-01' }),
      ).rejects.toMatchObject({ response: { code: 'INVALID_DATE_RANGE' } });
      expect(budgets().findMany).not.toHaveBeenCalled();
    });

    it('searches name and category case-insensitively, and not the notes', async () => {
      await service.findMany(ACTOR, { search: 'utilit' });

      const clauses = queriedWhere(budgets().findMany).OR as Record<string, unknown>[];
      expect(clauses).toEqual([
        { name: { contains: 'utilit', mode: 'insensitive' } },
        { category: { contains: 'utilit', mode: 'insensitive' } },
      ]);
      expect(clauses.some((clause) => 'notes' in clause)).toBe(false);
    });

    it('reports paging figures that match the filter, not the page', async () => {
      budgets().count.mockResolvedValue(7);
      budgets().findMany.mockResolvedValue([row()]);

      const { meta } = await service.findMany(ACTOR, { page: 2, limit: 3 });

      expect(meta).toEqual({ page: 2, limit: 3, total: 7, totalPages: 3 });
    });

    it('counts and reads in one transaction', async () => {
      await service.findMany(ACTOR, {});

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    /**
     * No `spent` and no `remaining` here. Those are this row measured against the expenses booked to its
     * category, which this module never reads — `GET /financial-reports/budget` is where the two meet, and a
     * figure published here would be one nothing kept current.
     */
    it('returns exact amounts and no derived spend figures', async () => {
      budgets().count.mockResolvedValue(2);
      budgets().findMany.mockResolvedValue([
        row({ amount: new Prisma.Decimal('50000.00') }),
        row({ amount: new Prisma.Decimal('0.05') }),
      ]);

      const { rows } = await service.findMany(ACTOR, {});

      expect(rows.map((r) => r.amount)).toEqual(['50000.00', '0.05']);
      const body = JSON.stringify(rows);
      for (const derived of ['spent', 'remaining', 'balance', 'utilised', 'sum']) {
        expect(body).not.toContain(derived);
      }
    });

    it('never returns the mosque id, and names the author without handing over their account', async () => {
      budgets().count.mockResolvedValue(1);
      budgets().findMany.mockResolvedValue([row()]);

      const { rows } = await service.findMany(ACTOR, {});

      expect(rows[0]).not.toHaveProperty('mosqueId');
      expect(rows[0].createdBy).toEqual({ id: ACTOR.id, fullName: 'Ahmed Hasan' });
      const body = JSON.stringify(rows[0]);
      for (const secret of ['passwordHash', 'email', 'phone', 'role', 'refreshToken']) {
        expect(body).not.toContain(secret);
      }
    });
  });

  describe('findOne', () => {
    it('asks for the id inside the caller’s mosque, not the id alone', async () => {
      budgets().findFirst.mockResolvedValue(row());

      await service.findOne(ACTOR, BUDGET_ID);

      expect(queriedWhere(budgets().findFirst)).toEqual({ id: BUDGET_ID, mosqueId: MOSQUE_ID });
    });

    it('answers 404 for another mosque’s budget, never 403', async () => {
      // What the mosque-scoped lookup returns for a row that exists but belongs to somebody else. A 403
      // would confirm the record exists.
      budgets().findFirst.mockResolvedValue(null);

      await expect(service.findOne(ACTOR, BUDGET_ID)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(ACTOR, BUDGET_ID)).rejects.toMatchObject({
        response: { code: 'BUDGET_NOT_FOUND' },
      });
    });

    it('serialises the amount, the days and the timestamps in their own formats', async () => {
      budgets().findFirst.mockResolvedValue(row());

      const budget = await service.findOne(ACTOR, BUDGET_ID);

      expect(budget.amount).toBe('50000.00');
      expect(budget.periodStart).toBe('2026-07-01');
      expect(budget.periodEnd).toBe('2026-09-30');
      expect(budget.createdAt).toBe('2026-06-25T09:00:00.000Z');
    });
  });

  describe('update', () => {
    it('refuses before writing when the budget is another mosque’s', async () => {
      budgets().findFirst.mockResolvedValue(null);

      await expect(service.update(ACTOR, BUDGET_ID, { notes: 'Revised' })).rejects.toThrow(
        NotFoundException,
      );
      expect(budgets().update).not.toHaveBeenCalled();
    });

    it('touches only the fields that were sent', async () => {
      budgets().findFirst.mockResolvedValue(row());
      budgets().update.mockResolvedValue(row({ notes: 'Revised' }));

      await service.update(ACTOR, BUDGET_ID, { notes: 'Revised' });

      expect(writtenData(budgets().update)).toEqual({ notes: 'Revised' });
    });

    it('writes a revised amount as a Decimal', async () => {
      budgets().findFirst.mockResolvedValue(row());
      budgets().update.mockResolvedValue(row({ amount: new Prisma.Decimal('55000.00') }));

      const updated = await service.update(ACTOR, BUDGET_ID, { amount: '55000.00' });

      expect(writtenData(budgets().update).amount).toBeInstanceOf(Prisma.Decimal);
      expect(updated.amount).toBe('55000.00');
    });

    it('puts a draft in force by moving it to active', async () => {
      budgets().findFirst.mockResolvedValue(row());
      budgets().update.mockResolvedValue(row({ status: BudgetStatus.active }));

      const updated = await service.update(ACTOR, BUDGET_ID, { status: BudgetStatus.active });

      expect(writtenData(budgets().update)).toEqual({ status: BudgetStatus.active });
      expect(updated.status).toBe(BudgetStatus.active);
    });

    /**
     * The reason the period rule is in the service. Only `periodStart` is being moved, so the comparison has
     * to be against the `periodEnd` already in the database — which no per-field validator can see.
     */
    it('checks a moved period start against the stored end', async () => {
      // Stored period is 2026-07-01 to 2026-09-30; moving the start past the stored end is a 400.
      budgets().findFirst.mockResolvedValue(row());

      await expect(
        service.update(ACTOR, BUDGET_ID, { periodStart: '2026-12-01' }),
      ).rejects.toMatchObject({ response: { code: 'INVALID_BUDGET_PERIOD' } });
      expect(budgets().update).not.toHaveBeenCalled();
    });

    it('checks a moved period end against the stored start', async () => {
      budgets().findFirst.mockResolvedValue(row());

      await expect(
        service.update(ACTOR, BUDGET_ID, { periodEnd: '2026-01-01' }),
      ).rejects.toMatchObject({ response: { code: 'INVALID_BUDGET_PERIOD' } });
      expect(budgets().update).not.toHaveBeenCalled();
    });

    it('allows both ends to move together to a period that would be invalid one at a time', async () => {
      budgets().findFirst.mockResolvedValue(row());
      budgets().update.mockResolvedValue(
        row({
          periodStart: new Date('2026-12-01T00:00:00.000Z'),
          periodEnd: new Date('2026-12-31T00:00:00.000Z'),
        }),
      );

      const updated = await service.update(ACTOR, BUDGET_ID, {
        periodStart: '2026-12-01',
        periodEnd: '2026-12-31',
      });

      expect(updated.periodStart).toBe('2026-12-01');
      expect(updated.periodEnd).toBe('2026-12-31');
    });

    it('clears the notes on an explicit null', async () => {
      budgets().findFirst.mockResolvedValue(row());
      budgets().update.mockResolvedValue(row({ notes: null }));

      await service.update(ACTOR, BUDGET_ID, { notes: null });

      expect(writtenData(budgets().update)).toEqual({ notes: null });
    });

    // An audit trail anyone with edit rights can rewrite is not one.
    it('cannot reassign who set the budget', async () => {
      budgets().findFirst.mockResolvedValue(row());
      budgets().update.mockResolvedValue(row());

      // Neither field is on the DTO and the global pipe rejects both over HTTP; this asserts the service
      // would not honour them even if they arrived.
      const smuggled = {
        notes: 'Revised',
        createdById: '00000000-0000-4000-8000-000000000000',
      } as unknown as UpdateBudgetDto;

      await service.update(ACTOR, BUDGET_ID, smuggled);

      const data = writtenData(budgets().update);
      expect(data).toEqual({ notes: 'Revised' });
      expect(data).not.toHaveProperty('createdById');
    });

    it('answers 404 when the row vanished between the read and the write', async () => {
      budgets().findFirst.mockResolvedValue(row());
      budgets().update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '6.0.0',
        }),
      );

      await expect(service.update(ACTOR, BUDGET_ID, { notes: 'Revised' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('deletes the budget and reports what went', async () => {
      budgets().findFirst.mockResolvedValue(row());
      budgets().delete.mockResolvedValue(row());

      const deleted = await service.remove(ACTOR, BUDGET_ID);

      expect(budgets().delete).toHaveBeenCalledWith({ where: { id: BUDGET_ID } });
      expect(deleted).toEqual({
        id: BUDGET_ID,
        name: 'Q3 Utilities',
        category: 'Utilities',
        amount: '50000.00',
        currency: 'BDT',
      });
    });

    it('checks ownership before deleting, and answers 404 for another mosque’s budget', async () => {
      budgets().findFirst.mockResolvedValue(null);

      await expect(service.remove(ACTOR, BUDGET_ID)).rejects.toThrow(NotFoundException);

      expect(queriedWhere(budgets().findFirst)).toEqual({ id: BUDGET_ID, mosqueId: MOSQUE_ID });
      expect(budgets().delete).not.toHaveBeenCalled();
    });

    /**
     * Where this parts company with expenses, on purpose. An expense past `pending` records money that moved
     * and may only be cancelled; a budget records an intention, so removing one loses no financial fact and
     * every state is deletable.
     */
    it.each([BudgetStatus.draft, BudgetStatus.active, BudgetStatus.closed, BudgetStatus.cancelled])(
      'deletes a %s budget, because a plan is not a financial record',
      async (status) => {
        budgets().findFirst.mockResolvedValue(row({ status }));
        budgets().delete.mockResolvedValue(row({ status }));

        await expect(service.remove(ACTOR, BUDGET_ID)).resolves.toMatchObject({ id: BUDGET_ID });
        expect(budgets().delete).toHaveBeenCalled();
      },
    );

    it('answers 404 when the budget was deleted a moment earlier', async () => {
      budgets().findFirst.mockResolvedValue(row());
      budgets().delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '6.0.0',
        }),
      );

      await expect(service.remove(ACTOR, BUDGET_ID)).rejects.toThrow(NotFoundException);
    });

    it('reports the amount of the deleted row as an exact string', async () => {
      budgets().findFirst.mockResolvedValue(row({ amount: new Prisma.Decimal('1234567.89') }));
      budgets().delete.mockResolvedValue(row());

      const deleted = await service.remove(ACTOR, BUDGET_ID);

      // The row is gone, so this is the last chance anyone has to see what it said.
      expect(deleted.amount).toBe('1234567.89');
      expect(typeof deleted.amount).toBe('string');
    });
  });

  /**
   * The mosque and the author both come from the token, and there is no other way to supply either.
   */
  describe('mosque id from the token only', () => {
    const intruder: AuthenticatedUser = {
      ...ACTOR,
      id: 'a1b2c3d4-5678-4f6a-8c11-2d5e7a9b0c33',
      mosqueId: OTHER_MOSQUE_ID,
    };

    it('scopes a read to whichever mosque the token names', async () => {
      budgets().findFirst.mockResolvedValue(null);

      await expect(service.findOne(intruder, BUDGET_ID)).rejects.toThrow(NotFoundException);

      expect(queriedWhere(budgets().findFirst)).toEqual({
        id: BUDGET_ID,
        mosqueId: OTHER_MOSQUE_ID,
      });
    });

    it('ignores a mosqueId and a createdById smuggled into a create body', async () => {
      budgets().create.mockResolvedValue(row());

      // Neither field is on the DTO and the global pipe rejects both over HTTP; this asserts the service
      // would not honour them even if they arrived.
      const smuggled = {
        ...newBudget(),
        mosqueId: OTHER_MOSQUE_ID,
        createdById: '00000000-0000-4000-8000-000000000000',
      } as unknown as CreateBudgetDto;

      await service.create(ACTOR, smuggled);

      const data = writtenData(budgets().create);
      expect(data.mosqueId).toBe(MOSQUE_ID);
      expect(data.createdById).toBe(ACTOR.id);
    });

    it('ignores a mosqueId smuggled into a patch body', async () => {
      budgets().findFirst.mockResolvedValue(row());
      budgets().update.mockResolvedValue(row());

      const smuggled = {
        notes: 'Revised',
        mosqueId: OTHER_MOSQUE_ID,
      } as unknown as UpdateBudgetDto;

      await service.update(ACTOR, BUDGET_ID, smuggled);

      expect(writtenData(budgets().update)).toEqual({ notes: 'Revised' });
    });

    it('scopes a delete to the token’s mosque before it removes anything', async () => {
      budgets().findFirst.mockResolvedValue(null);

      await expect(service.remove(intruder, BUDGET_ID)).rejects.toThrow(NotFoundException);

      expect(queriedWhere(budgets().findFirst).mosqueId).toBe(OTHER_MOSQUE_ID);
      expect(budgets().delete).not.toHaveBeenCalled();
    });
  });

  // The two cross-field rules the DTOs cannot express, both 400s rather than an empty page or a bad row.
  it('treats an inverted window and an inverted period as bad requests', async () => {
    await expect(service.findMany(ACTOR, { from: '2026-12-01', to: '2026-01-01' })).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      service.create(ACTOR, newBudget({ periodStart: '2026-12-01', periodEnd: '2026-01-01' })),
    ).rejects.toThrow(BadRequestException);
  });
});
