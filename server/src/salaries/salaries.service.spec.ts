import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, SalaryStatus } from '@prisma/client';

import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSalaryRecordDto } from './dto/create-salary-record.dto';
import type { UpdateSalaryRecordDto } from './dto/update-salary-record.dto';
import { SalariesService } from './salaries.service';

/**
 * Salary records.
 *
 * Five things carry the weight here.
 *
 * The mosque comes from the token and from nowhere else, which the last block asserts directly.
 *
 * **The named user has to be one of this mosque's own**, checked against the database and not assumed from the
 * foreign key — which can only say "some user exists". Without that check a treasurer could attach a salary row
 * to a stranger belonging to another mosque, so it is asserted here from both sides: the lookup carries the
 * caller's own `mosqueId`, and a miss stops the write.
 *
 * **Whose records you may read is a query, not a filter applied afterwards.** A treasurer sees the mosque's
 * payroll; an imam holds only `salary.viewOwn` and is pinned to their own `userId` in the `where` clause, whatever
 * they ask for. That is the assertion that keeps one person's pay from another's screen.
 *
 * Money never becomes a float — in as a `Prisma.Decimal`, out as an exact string, with one case using a value
 * binary floating point cannot hold.
 *
 * And `userId` is not patchable. Reassigning it would move an amount, a period and a `paid` flag from one person
 * to another with nothing in the row to show it, so the update path is asserted to ignore one that is smuggled in.
 */

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';
const OTHER_MOSQUE_ID = 'd0b80121-7ac0-11d1-898c-00c04fd8d5c1';
const SALARY_ID = '7a9c6cfe-6fe5-11d2-883f-0016d3cca432';
const EMPLOYEE_ID = '1b2c3d4e-5f60-4712-8834-9a0b1c2d3e4f';
const OTHER_EMPLOYEE_ID = '2c3d4e5f-6071-4823-9945-ab1c2d3e4f50';

/** A treasurer of `MOSQUE_ID`. Their role carries `salary.view` and `salary.manage`. */
const ACTOR: AuthenticatedUser = {
  id: '9c8b7a65-4321-4f6a-8c11-2d5e7a9b0c31',
  mosqueId: MOSQUE_ID,
  email: 'treasurer@noor.example',
  role: 'treasurer',
  permissions: [],
  deniedPermissions: [],
  isActive: true,
};

/** An imam of the same mosque. Their role carries `salary.viewOwn` and nothing wider. */
const IMAM: AuthenticatedUser = {
  id: EMPLOYEE_ID,
  mosqueId: MOSQUE_ID,
  email: 'imam@noor.example',
  role: 'imam',
  permissions: [],
  deniedPermissions: [],
  isActive: true,
};

/** A member. No salary permission at all, so the service refuses before it reads anything. */
const MEMBER: AuthenticatedUser = {
  id: 'f0e1d2c3-b4a5-4967-8899-0a1b2c3d4e5f',
  mosqueId: MOSQUE_ID,
  email: 'member@noor.example',
  role: 'member',
  permissions: [],
  deniedPermissions: [],
  isActive: true,
};

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: SALARY_ID,
    amount: new Prisma.Decimal('35000.00'),
    currency: 'BDT',
    payPeriod: '2026-08',
    paymentDate: new Date('2026-09-03T00:00:00.000Z'),
    status: SalaryStatus.pending,
    notes: null,
    createdAt: new Date('2026-09-01T09:00:00.000Z'),
    updatedAt: new Date('2026-09-01T09:00:00.000Z'),
    user: { id: EMPLOYEE_ID, fullName: 'Ahmed Hasan' },
    ...overrides,
  };
}

/** The minimum a create needs: who is paid, how much, for which month, and on what day. */
function newSalary(overrides: Partial<CreateSalaryRecordDto> = {}): CreateSalaryRecordDto {
  return {
    userId: EMPLOYEE_ID,
    amount: '35000.00',
    payPeriod: '2026-08',
    paymentDate: '2026-09-03',
    ...overrides,
  };
}

describe('SalariesService', () => {
  let service: SalariesService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalariesService,
        {
          provide: PrismaService,
          useValue: {
            salaryRecord: {
              count: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            // Resolves by default, so the create tests exercise the write rather than the membership check.
            user: { findFirst: jest.fn().mockResolvedValue({ id: EMPLOYEE_ID }) },
            mosqueSettings: { findUnique: jest.fn().mockResolvedValue({ currency: 'BDT' }) },
            $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
          },
        },
      ],
    }).compile();

    service = module.get(SalariesService);
    prisma = module.get(PrismaService);
  });

  const salaries = () => prisma.salaryRecord as unknown as Record<string, jest.Mock>;
  const users = () => prisma.user as unknown as Record<string, jest.Mock>;
  const settings = () => prisma.mosqueSettings as unknown as Record<string, jest.Mock>;

  /** The `data` a write was given, typed so an assertion is not reading `any` off a jest mock. */
  const writtenData = (call: jest.Mock): Record<string, unknown> =>
    (call.mock.calls[0][0] as { data: Record<string, unknown> }).data;

  /** The `where` a query was given. */
  const queriedWhere = (call: jest.Mock): Record<string, unknown> =>
    (call.mock.calls[0][0] as { where: Record<string, unknown> }).where;

  /** The `select` a query was given. */
  const queriedSelect = (call: jest.Mock): Record<string, unknown> =>
    (call.mock.calls[0][0] as { select: Record<string, unknown> }).select;

  describe('create', () => {
    it('writes the record against the caller’s own mosque and the named user', async () => {
      salaries().create.mockResolvedValue(row());

      const created = await service.create(ACTOR, newSalary());

      const data = writtenData(salaries().create);
      expect(data.mosqueId).toBe(MOSQUE_ID);
      expect(data.userId).toBe(EMPLOYEE_ID);
      expect(created.user).toEqual({ id: EMPLOYEE_ID, fullName: 'Ahmed Hasan' });
    });

    it('stores the amount as a Decimal, not a number', async () => {
      salaries().create.mockResolvedValue(row());

      await service.create(ACTOR, newSalary({ amount: '35000.00' }));

      const amount = writtenData(salaries().create).amount;
      expect(amount).toBeInstanceOf(Prisma.Decimal);
      expect((amount as Prisma.Decimal).toFixed(2)).toBe('35000.00');
    });

    // 1234567.89 is not representable in binary floating point. If anything on the way in or out became a
    // JavaScript number, this is the assertion that would notice.
    it('round-trips a figure a float would round', async () => {
      salaries().create.mockResolvedValue(row({ amount: new Prisma.Decimal('1234567.89') }));

      const created = await service.create(ACTOR, newSalary({ amount: '1234567.89' }));

      expect(String(writtenData(salaries().create).amount)).toBe('1234567.89');
      expect(created.amount).toBe('1234567.89');
    });

    it('stores the payment date as a whole day in UTC, with no time on it', async () => {
      salaries().create.mockResolvedValue(row());

      await service.create(ACTOR, newSalary({ paymentDate: '2026-09-03' }));

      expect(writtenData(salaries().create).paymentDate).toEqual(
        new Date('2026-09-03T00:00:00.000Z'),
      );
    });

    // The month the pay is *for* and the day it moved are two different facts, and the row keeps both. August's
    // salary paid in September is the ordinary case, not an anomaly.
    it('keeps payPeriod separate from paymentDate', async () => {
      salaries().create.mockResolvedValue(row());

      const created = await service.create(
        ACTOR,
        newSalary({ payPeriod: '2026-08', paymentDate: '2026-09-03' }),
      );

      expect(writtenData(salaries().create).payPeriod).toBe('2026-08');
      expect(created.payPeriod).toBe('2026-08');
      expect(created.paymentDate).toBe('2026-09-03');
    });

    it('leaves status to the column default when the caller does not say', async () => {
      salaries().create.mockResolvedValue(row());

      await service.create(ACTOR, newSalary());

      expect(writtenData(salaries().create)).not.toHaveProperty('status');
    });

    it('records the status when one is sent', async () => {
      salaries().create.mockResolvedValue(row({ status: SalaryStatus.paid }));

      const created = await service.create(ACTOR, newSalary({ status: SalaryStatus.paid }));

      expect(writtenData(salaries().create).status).toBe(SalaryStatus.paid);
      expect(created.status).toBe(SalaryStatus.paid);
    });

    // The write is built field by field, so a column added to the DTO later cannot reach the database until
    // someone names it here. This is the assertion that fails if anyone reaches for a spread.
    it('writes exactly the columns it means to', async () => {
      salaries().create.mockResolvedValue(row());

      await service.create(ACTOR, newSalary());

      expect(Object.keys(writtenData(salaries().create)).sort()).toEqual([
        'amount',
        'currency',
        'mosqueId',
        'notes',
        'payPeriod',
        'paymentDate',
        'userId',
      ]);
    });

    it('defaults the currency to the mosque’s configured one', async () => {
      salaries().create.mockResolvedValue(row());

      await service.create(ACTOR, newSalary());

      expect(settings().findUnique).toHaveBeenCalledWith({
        where: { mosqueId: MOSQUE_ID },
        select: { currency: true },
      });
      expect(writtenData(salaries().create).currency).toBe('BDT');
    });

    it('keeps the currency the caller sent', async () => {
      salaries().create.mockResolvedValue(row({ currency: 'USD' }));

      await service.create(ACTOR, newSalary({ currency: 'USD' }));

      expect(writtenData(salaries().create).currency).toBe('USD');
      expect(settings().findUnique).not.toHaveBeenCalled();
    });

    // The settings column is a free-form VarChar, so a mosque could be holding "Taka" in it. It is re-checked
    // rather than trusted, and an unusable value falls back rather than being written onto the row.
    it.each([['Taka'], [null], ['']])(
      'falls back to BDT when the configured currency is %p',
      async (configured) => {
        settings().findUnique.mockResolvedValue({ currency: configured });
        salaries().create.mockResolvedValue(row());

        await service.create(ACTOR, newSalary());

        expect(writtenData(salaries().create).currency).toBe('BDT');
      },
    );

    it('falls back to BDT when the mosque has no settings row at all', async () => {
      settings().findUnique.mockResolvedValue(null);
      salaries().create.mockResolvedValue(row());

      await service.create(ACTOR, newSalary());

      expect(writtenData(salaries().create).currency).toBe('BDT');
    });
  });

  /**
   * The user must belong to the same mosque.
   *
   * The foreign key cannot express this — it can only say some user exists — so it is a query, and the query
   * carries the caller's own mosque id. Everything in this block is the difference between "a salary row for one
   * of our staff" and "a salary row attached to a stranger".
   */
  describe('the person being paid', () => {
    it('looks the user up inside the caller’s own mosque, and only undeleted ones', async () => {
      salaries().create.mockResolvedValue(row());

      await service.create(ACTOR, newSalary());

      expect(users().findFirst).toHaveBeenCalledWith({
        where: { id: EMPLOYEE_ID, mosqueId: MOSQUE_ID, deletedAt: null },
        select: { id: true },
      });
    });

    it('refuses a user who is not one of this mosque’s, with a 400', async () => {
      users().findFirst.mockResolvedValue(null);

      await expect(service.create(ACTOR, newSalary({ userId: OTHER_EMPLOYEE_ID }))).rejects.toThrow(
        BadRequestException,
      );
    });

    it('names the fault without confirming the id exists elsewhere', async () => {
      users().findFirst.mockResolvedValue(null);

      await expect(
        service.create(ACTOR, newSalary({ userId: OTHER_EMPLOYEE_ID })),
      ).rejects.toMatchObject({
        response: {
          code: 'SALARY_USER_NOT_FOUND',
          message: 'userId does not match a user of this mosque.',
        },
      });
    });

    // The check has to stop the write, not merely precede it.
    it('writes nothing when the user does not belong to the mosque', async () => {
      users().findFirst.mockResolvedValue(null);

      await expect(service.create(ACTOR, newSalary())).rejects.toThrow(BadRequestException);

      expect(salaries().create).not.toHaveBeenCalled();
    });

    // A deleted member is not payable. The `deletedAt: null` above is what excludes them; this is the same fact
    // from the other side.
    it('refuses a soft-deleted user', async () => {
      users().findFirst.mockResolvedValue(null);

      await expect(service.create(ACTOR, newSalary())).rejects.toMatchObject({
        response: { code: 'SALARY_USER_NOT_FOUND' },
      });
    });
  });

  /**
   * Who may read what.
   *
   * `salary.view` reads the mosque's payroll; `salary.viewOwn` reads one person's own records. The narrowing is a
   * `userId` in the `where` clause, so an imam's own record is the only row the database is ever asked for.
   */
  describe('scope', () => {
    beforeEach(() => {
      salaries().count.mockResolvedValue(0);
      salaries().findMany.mockResolvedValue([]);
    });

    it('does not narrow by user for a caller who may read the whole payroll', async () => {
      await service.findMany(ACTOR, {});

      expect(queriedWhere(salaries().findMany)).not.toHaveProperty('userId');
    });

    it('pins a viewOwn caller to their own records', async () => {
      await service.findMany(IMAM, {});

      expect(queriedWhere(salaries().findMany).userId).toBe(IMAM.id);
    });

    // The filter narrows within the scope; it cannot widen it. Otherwise `?userId=` would be the whole payroll.
    it('ignores a userId filter that points at somebody else, for a viewOwn caller', async () => {
      await service.findMany(IMAM, { userId: OTHER_EMPLOYEE_ID });

      expect(queriedWhere(salaries().findMany).userId).toBe(IMAM.id);
    });

    it('honours a userId filter for a caller who may read the whole payroll', async () => {
      await service.findMany(ACTOR, { userId: OTHER_EMPLOYEE_ID });

      expect(queriedWhere(salaries().findMany).userId).toBe(OTHER_EMPLOYEE_ID);
    });

    it('refuses a caller with neither permission', async () => {
      await expect(service.findMany(MEMBER, {})).rejects.toThrow(ForbiddenException);
      expect(salaries().findMany).not.toHaveBeenCalled();
    });

    // `effectivePermissions` returns nothing for a deactivated account, whatever their role says.
    it('refuses a deactivated treasurer', async () => {
      await expect(service.findMany({ ...ACTOR, isActive: false }, {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('honours a denied permission over the role that grants it', async () => {
      await expect(
        service.findMany({ ...ACTOR, deniedPermissions: ['salary.view'] }, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    // Authorization first: a caller who may not read the payroll is refused rather than told which of their
    // query parameters was malformed.
    it('refuses an unauthorized caller before it validates their date window', async () => {
      await expect(
        service.findMany(MEMBER, { from: '2026-09-30', to: '2026-09-01' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('narrows a single read to the caller’s own record for a viewOwn caller', async () => {
      salaries().findFirst.mockResolvedValue(row());

      await service.findOne(IMAM, SALARY_ID);

      expect(queriedWhere(salaries().findFirst)).toEqual({
        id: SALARY_ID,
        mosqueId: MOSQUE_ID,
        userId: IMAM.id,
      });
    });

    // A colleague's record answers the same way another mosque's does. A 403 would confirm it exists.
    it('answers 404 for a colleague’s record, not 403', async () => {
      salaries().findFirst.mockResolvedValue(null);

      await expect(service.findOne(IMAM, SALARY_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findMany', () => {
    beforeEach(() => {
      salaries().count.mockResolvedValue(1);
      salaries().findMany.mockResolvedValue([row()]);
    });

    it('always scopes the query to the caller’s mosque', async () => {
      await service.findMany(ACTOR, {});

      expect(queriedWhere(salaries().findMany).mosqueId).toBe(MOSQUE_ID);
      expect(queriedWhere(salaries().count).mosqueId).toBe(MOSQUE_ID);
    });

    it('defaults to the first page of 20', async () => {
      await service.findMany(ACTOR, {});

      expect(salaries().findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('caps the page size at 100 however large a limit is asked for', async () => {
      await service.findMany(ACTOR, { limit: 5000 });

      expect(salaries().findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
    });

    it('orders newest first and breaks ties on id, so no row lands on two pages', async () => {
      await service.findMany(ACTOR, {});

      expect(salaries().findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] }),
      );
    });

    it('filters on status', async () => {
      await service.findMany(ACTOR, { status: SalaryStatus.paid });

      expect(queriedWhere(salaries().findMany).status).toBe(SalaryStatus.paid);
    });

    // A fixed `YYYY-MM`, so there is nothing to match loosely.
    it('matches payPeriod exactly rather than as a prefix', async () => {
      await service.findMany(ACTOR, { payPeriod: '2026-08' });

      expect(queriedWhere(salaries().findMany).payPeriod).toBe('2026-08');
    });

    // The window is on when the money moved. August's pay settled on 3 September falls in a September window,
    // and a caller who wanted the month the pay was *for* asks for `payPeriod` instead.
    it('filters the window on paymentDate, not on payPeriod', async () => {
      await service.findMany(ACTOR, { from: '2026-09-01', to: '2026-09-30' });

      const where = queriedWhere(salaries().findMany);
      expect(where).not.toHaveProperty('payPeriod');
      expect(where.paymentDate).toEqual({
        gte: new Date('2026-09-01T00:00:00.000Z'),
        lte: new Date('2026-09-30T00:00:00.000Z'),
      });
    });

    it('accepts an open-ended window from either side', async () => {
      await service.findMany(ACTOR, { from: '2026-09-01' });
      expect(queriedWhere(salaries().findMany).paymentDate).toEqual({
        gte: new Date('2026-09-01T00:00:00.000Z'),
      });

      salaries().findMany.mockClear();
      await service.findMany(ACTOR, { to: '2026-09-30' });
      expect(queriedWhere(salaries().findMany).paymentDate).toEqual({
        lte: new Date('2026-09-30T00:00:00.000Z'),
      });
    });

    it('leaves paymentDate out of the query when no window was asked for', async () => {
      await service.findMany(ACTOR, {});

      expect(queriedWhere(salaries().findMany)).not.toHaveProperty('paymentDate');
    });

    // An inverted window is a mistake in the request. An empty page would hide it.
    it('rejects a window that ends before it starts', async () => {
      await expect(
        service.findMany(ACTOR, { from: '2026-09-30', to: '2026-09-01' }),
      ).rejects.toMatchObject({
        response: { code: 'INVALID_DATE_RANGE', message: 'to must not fall before from.' },
      });

      expect(salaries().findMany).not.toHaveBeenCalled();
    });

    it('allows a window of a single day', async () => {
      await service.findMany(ACTOR, { from: '2026-09-03', to: '2026-09-03' });

      expect(queriedWhere(salaries().findMany).paymentDate).toEqual({
        gte: new Date('2026-09-03T00:00:00.000Z'),
        lte: new Date('2026-09-03T00:00:00.000Z'),
      });
    });

    it('reports the paging figures', async () => {
      salaries().count.mockResolvedValue(45);

      const { meta } = await service.findMany(ACTOR, { page: 2, limit: 20 });

      expect(meta).toEqual({ page: 2, limit: 20, total: 45, totalPages: 3 });
    });

    it('counts and reads in one transaction, so the total describes the page', async () => {
      await service.findMany(ACTOR, {});

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * What a salary record hands over about the person on it.
   *
   * Whoever may read the payroll can read a row about every member of staff. If those rows carried each one's
   * email, phone number and account state, `salary.view` would be a back door to the user directory — so the
   * select is asserted, not just the response.
   */
  describe('what is exposed', () => {
    it('reduces the user to an id and a name', async () => {
      salaries().findFirst.mockResolvedValue(row());

      await service.findOne(ACTOR, SALARY_ID);

      const user = queriedSelect(salaries().findFirst).user as { select: Record<string, unknown> };
      expect(Object.keys(user.select).sort()).toEqual(['fullName', 'id']);
    });

    it.each(['passwordHash', 'email', 'phone', 'role', 'refreshToken', 'deletedAt'])(
      'never selects %s from the user',
      async (column) => {
        salaries().findFirst.mockResolvedValue(row());

        await service.findOne(ACTOR, SALARY_ID);

        const user = queriedSelect(salaries().findFirst).user as {
          select: Record<string, unknown>;
        };
        expect(user.select).not.toHaveProperty(column);
      },
    );

    it('does not return the mosque id', async () => {
      salaries().findFirst.mockResolvedValue(row());

      const found = await service.findOne(ACTOR, SALARY_ID);

      expect(found).not.toHaveProperty('mosqueId');
      expect(JSON.stringify(found)).not.toContain(MOSQUE_ID);
    });

    it('returns the amount as an exact string beside its currency', async () => {
      salaries().findFirst.mockResolvedValue(row({ amount: new Prisma.Decimal('35000.5') }));

      const found = await service.findOne(ACTOR, SALARY_ID);

      expect(found.amount).toBe('35000.50');
      expect(found.currency).toBe('BDT');
    });
  });

  describe('findOne', () => {
    it('asks for the id and the mosque together', async () => {
      salaries().findFirst.mockResolvedValue(row());

      await service.findOne(ACTOR, SALARY_ID);

      expect(queriedWhere(salaries().findFirst)).toEqual({ id: SALARY_ID, mosqueId: MOSQUE_ID });
    });

    it('answers 404 for a record of another mosque', async () => {
      salaries().findFirst.mockResolvedValue(null);

      await expect(service.findOne(ACTOR, SALARY_ID)).rejects.toMatchObject({
        response: {
          code: 'SALARY_RECORD_NOT_FOUND',
          message: 'We could not find that salary record.',
        },
      });
    });
  });

  describe('update', () => {
    beforeEach(() => {
      salaries().findFirst.mockResolvedValue(row());
      salaries().update.mockResolvedValue(row());
    });

    it('touches only the fields that were sent', async () => {
      await service.update(ACTOR, SALARY_ID, { status: SalaryStatus.paid });

      expect(writtenData(salaries().update)).toEqual({ status: SalaryStatus.paid });
    });

    it('converts a new amount to a Decimal', async () => {
      await service.update(ACTOR, SALARY_ID, { amount: '36500.00' });

      const amount = writtenData(salaries().update).amount;
      expect(amount).toBeInstanceOf(Prisma.Decimal);
      expect((amount as Prisma.Decimal).toFixed(2)).toBe('36500.00');
    });

    it('converts a new payment date to a whole UTC day', async () => {
      await service.update(ACTOR, SALARY_ID, { paymentDate: '2026-09-10' });

      expect(writtenData(salaries().update).paymentDate).toEqual(
        new Date('2026-09-10T00:00:00.000Z'),
      );
    });

    it('clears a note when null is sent, and leaves it alone when the field is omitted', async () => {
      await service.update(ACTOR, SALARY_ID, { notes: null });
      expect(writtenData(salaries().update).notes).toBeNull();

      salaries().update.mockClear();
      await service.update(ACTOR, SALARY_ID, { amount: '1.00' });
      expect(writtenData(salaries().update)).not.toHaveProperty('notes');
    });

    /**
     * `userId` cannot be reassigned.
     *
     * Moving it would carry the amount, the period and the `paid` flag from one person to another with nothing
     * in the row to show it, and both people's payroll history would then be wrong. The DTO has no such field,
     * so this smuggles one past the compiler to prove the service ignores it rather than relying on validation
     * alone.
     */
    it('ignores a userId smuggled into the patch', async () => {
      const patch = {
        userId: OTHER_EMPLOYEE_ID,
        status: SalaryStatus.paid,
      } as unknown as UpdateSalaryRecordDto;

      await service.update(ACTOR, SALARY_ID, patch);

      expect(writtenData(salaries().update)).not.toHaveProperty('userId');
    });

    it('ignores a mosqueId smuggled into the patch', async () => {
      const patch = {
        mosqueId: OTHER_MOSQUE_ID,
        status: SalaryStatus.paid,
      } as unknown as UpdateSalaryRecordDto;

      await service.update(ACTOR, SALARY_ID, patch);

      expect(writtenData(salaries().update)).not.toHaveProperty('mosqueId');
    });

    it('checks the record belongs to the caller’s mosque before writing', async () => {
      salaries().findFirst.mockResolvedValue(null);

      await expect(service.update(ACTOR, SALARY_ID, { status: SalaryStatus.paid })).rejects.toThrow(
        NotFoundException,
      );

      expect(salaries().update).not.toHaveBeenCalled();
    });

    /**
     * A write is not narrowed to the caller's own record.
     *
     * The route requires `salary.manage`, which nobody holds "for their own record only" — so the narrowing that
     * applies to reads would be wrong here: it would let anyone with the write grant amend their own pay while
     * blocking them from amending anyone else's, which is the opposite of the intent. An imam cannot reach this
     * method at all, because the guard refuses them first.
     */
    it('does not narrow the lookup to the caller’s own record', async () => {
      await service.update(ACTOR, SALARY_ID, { status: SalaryStatus.paid });

      expect(queriedWhere(salaries().findFirst)).toEqual({ id: SALARY_ID, mosqueId: MOSQUE_ID });
    });

    it('turns a row that vanished mid-write into a 404', async () => {
      salaries().update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('gone', {
          code: 'P2025',
          clientVersion: 'test',
        }),
      );

      await expect(service.update(ACTOR, SALARY_ID, { status: SalaryStatus.paid })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lets an unrecognised database fault through, rather than inventing a 4xx for it', async () => {
      const fault = new Prisma.PrismaClientKnownRequestError('connection lost', {
        code: 'P1001',
        clientVersion: 'test',
      });
      salaries().update.mockRejectedValue(fault);

      await expect(service.update(ACTOR, SALARY_ID, { status: SalaryStatus.paid })).rejects.toBe(
        fault,
      );
    });
  });

  /**
   * A salary record is never deleted.
   *
   * The row says a person was paid, and removing it is not a correction — `cancelled` retires the record while
   * leaving it readable, and the reports stop counting it. There is no route, and there is no method behind one.
   */
  it('offers no way to delete a record', () => {
    const methods = service as unknown as Record<string, unknown>;

    expect(methods.remove).toBeUndefined();
    expect(methods.delete).toBeUndefined();
    expect(salaries().delete).toBeUndefined();
  });

  /**
   * The mosque comes from the token.
   *
   * Every path is asserted from the same angle: a body or a query naming another mosque changes nothing, because
   * nothing anywhere reads a mosque id from the request.
   */
  describe('mosque id from the token only', () => {
    it('ignores a mosqueId in the create body', async () => {
      salaries().create.mockResolvedValue(row());
      const smuggled = {
        ...newSalary(),
        mosqueId: OTHER_MOSQUE_ID,
      } as unknown as CreateSalaryRecordDto;

      await service.create(ACTOR, smuggled);

      expect(writtenData(salaries().create).mosqueId).toBe(MOSQUE_ID);
    });

    it('ignores a mosqueId in the list query', async () => {
      salaries().count.mockResolvedValue(0);
      salaries().findMany.mockResolvedValue([]);

      await service.findMany(ACTOR, { mosqueId: OTHER_MOSQUE_ID } as never);

      expect(queriedWhere(salaries().findMany).mosqueId).toBe(MOSQUE_ID);
    });

    it('looks a user up in the caller’s mosque, never in one they named', async () => {
      salaries().create.mockResolvedValue(row());
      const smuggled = {
        ...newSalary(),
        mosqueId: OTHER_MOSQUE_ID,
      } as unknown as CreateSalaryRecordDto;

      await service.create(ACTOR, smuggled);

      expect(users().findFirst).toHaveBeenCalledWith({
        where: { id: EMPLOYEE_ID, mosqueId: MOSQUE_ID, deletedAt: null },
        select: { id: true },
      });
    });

    it('reads and writes one record only inside the caller’s mosque', async () => {
      salaries().findFirst.mockResolvedValue(row());
      salaries().update.mockResolvedValue(row());

      await service.update(ACTOR, SALARY_ID, { status: SalaryStatus.paid });

      expect(queriedWhere(salaries().findFirst).mosqueId).toBe(MOSQUE_ID);
    });
  });
});
