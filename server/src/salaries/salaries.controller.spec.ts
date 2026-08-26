import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { SalaryStatus } from '@prisma/client';

import { ANY_PERMISSION_KEY, PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import type { CreateSalaryRecordDto } from './dto/create-salary-record.dto';
import type { SalaryRecordResponseDto } from './dto/salary-record-response.dto';
import { SalariesController } from './salaries.controller';
import { SalariesService } from './salaries.service';

/**
 * The salaries controller.
 *
 * It shapes envelopes and nothing else — no filtering, no scope decision, no mosque of its own — so the service is
 * mocked and this file checks the authenticated user reaching it, the envelope's shape, and the permissions written
 * on each route.
 *
 * The last block reads that metadata off the handlers rather than trusting the source to look right, and for
 * salaries it is carrying more weight than usual. Reads use the view/viewOwn split, so they must use the *any-of*
 * key: a `@Permissions('salary.view', 'salary.viewOwn')` there would demand both and lock the imam out of their own
 * record. Writes must use the *all-of* key with `salary.manage` alone: an `@AnyPermission('salary.view',
 * 'salary.manage')` on the patch route would let anyone who can read the payroll rewrite an amount, and one
 * carrying `salary.viewOwn` would let an imam raise their own pay. Neither mistake is visible from reading the
 * handler body.
 */

const ACTOR: AuthenticatedUser = {
  id: '9c8b7a65-4321-4f6a-8c11-2d5e7a9b0c31',
  mosqueId: 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0',
  email: 'treasurer@noor.example',
  role: 'treasurer',
  permissions: [],
  deniedPermissions: [],
  isActive: true,
};

const SALARY_ID = '7a9c6cfe-6fe5-11d2-883f-0016d3cca432';
const EMPLOYEE_ID = '1b2c3d4e-5f60-4712-8834-9a0b1c2d3e4f';

const SAMPLE: SalaryRecordResponseDto = {
  id: SALARY_ID,
  user: { id: EMPLOYEE_ID, fullName: 'Ahmed Hasan' },
  amount: '35000.00',
  currency: 'BDT',
  payPeriod: '2026-08',
  paymentDate: '2026-09-03',
  status: SalaryStatus.pending,
  notes: null,
  createdAt: '2026-09-01T09:00:00.000Z',
  updatedAt: '2026-09-01T09:00:00.000Z',
};

const NEW_SALARY: CreateSalaryRecordDto = {
  userId: EMPLOYEE_ID,
  amount: '35000.00',
  payPeriod: '2026-08',
  paymentDate: '2026-09-03',
};

type ServiceMock = Record<'create' | 'findMany' | 'findOne' | 'update', jest.Mock>;

describe('SalariesController', () => {
  let controller: SalariesController;
  let salaries: ServiceMock;

  beforeEach(async () => {
    salaries = {
      create: jest.fn().mockResolvedValue(SAMPLE),
      findMany: jest.fn().mockResolvedValue({
        rows: [SAMPLE],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
      findOne: jest.fn().mockResolvedValue(SAMPLE),
      update: jest.fn().mockResolvedValue(SAMPLE),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalariesController],
      providers: [{ provide: SalariesService, useValue: salaries }],
    }).compile();

    controller = module.get(SalariesController);
  });

  describe('POST /salaries', () => {
    it('hands the authenticated user and the body to the service', async () => {
      await controller.create(ACTOR, NEW_SALARY);

      expect(salaries.create).toHaveBeenCalledWith(ACTOR, NEW_SALARY);
    });

    it('answers the new record in the standard envelope', async () => {
      const response = await controller.create(ACTOR, NEW_SALARY);

      expect(response).toEqual({
        success: true,
        message: 'Salary record created successfully',
        data: SAMPLE,
      });
    });
  });

  describe('GET /salaries', () => {
    it('passes the query through untouched', async () => {
      const query = { page: 2, limit: 50, status: SalaryStatus.paid, payPeriod: '2026-08' };

      await controller.findAll(ACTOR, query);

      expect(salaries.findMany).toHaveBeenCalledWith(ACTOR, query);
    });

    // The controller does not decide whose records these are. It forwards the caller, and the service turns
    // `salary.view` against `salary.viewOwn` into a `userId` in the query.
    it('does not narrow the query itself', async () => {
      await controller.findAll(ACTOR, { userId: EMPLOYEE_ID });

      expect(salaries.findMany).toHaveBeenCalledWith(ACTOR, { userId: EMPLOYEE_ID });
    });

    it('puts the rows in `data` and the figures in `meta`', async () => {
      const response = await controller.findAll(ACTOR, {});

      expect(response).toEqual({
        success: true,
        message: 'Salary records retrieved successfully',
        data: [SAMPLE],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
    });

    it('adds nothing of its own to the list envelope', async () => {
      const response = await controller.findAll(ACTOR, {});

      expect(Object.keys(response)).toEqual(['success', 'message', 'data', 'meta']);
    });
  });

  describe('GET /salaries/:id', () => {
    it('asks the service for the id on behalf of the caller', async () => {
      await controller.findOne(ACTOR, SALARY_ID);

      expect(salaries.findOne).toHaveBeenCalledWith(ACTOR, SALARY_ID);
    });

    it('answers the record in the standard envelope', async () => {
      const response = await controller.findOne(ACTOR, SALARY_ID);

      expect(response).toEqual({
        success: true,
        message: 'Salary record retrieved successfully',
        data: SAMPLE,
      });
      expect(Object.keys(response)).toEqual(['success', 'message', 'data']);
    });

    // The amount arrives from the service as an exact string and is passed along as one. A controller that
    // rebuilt the payload could turn it into a number on the way out.
    it('returns the amount as the string the service gave it', async () => {
      const response = await controller.findOne(ACTOR, SALARY_ID);

      expect(response.data.amount).toBe('35000.00');
      expect(typeof response.data.amount).toBe('string');
    });
  });

  describe('PATCH /salaries/:id', () => {
    it('hands the id and the patch to the service', async () => {
      await controller.update(ACTOR, SALARY_ID, { status: SalaryStatus.paid });

      expect(salaries.update).toHaveBeenCalledWith(ACTOR, SALARY_ID, {
        status: SalaryStatus.paid,
      });
    });

    it('answers the updated record in the standard envelope', async () => {
      const response = await controller.update(ACTOR, SALARY_ID, { amount: '36500.00' });

      expect(response).toEqual({
        success: true,
        message: 'Salary record updated successfully',
        data: SAMPLE,
      });
    });
  });

  /**
   * There is no DELETE route.
   *
   * A row here says a person was paid, and losing that is not a correction — `PATCH` to `cancelled` retires it
   * while leaving it readable. Asserted on the controller because a handler is all it would take: the method
   * would be routable the moment somebody added it.
   */
  it('exposes no delete handler', () => {
    const handlers = controller as unknown as Record<string, unknown>;

    expect(handlers.remove).toBeUndefined();
    expect(handlers.delete).toBeUndefined();
  });

  it('never echoes the mosque id', async () => {
    const response = await controller.findOne(ACTOR, SALARY_ID);

    expect(JSON.stringify(response)).not.toContain(ACTOR.mosqueId);
  });

  // The payroll names the person paid, and nothing more about them. If the response shape ever widened, this is
  // the line that would notice before an email address reached whoever may read salaries.
  it('names the person paid with an id and a name only', async () => {
    const response = await controller.findOne(ACTOR, SALARY_ID);

    expect(Object.keys(response.data.user).sort()).toEqual(['fullName', 'id']);
  });

  /**
   * What the guards will enforce, read off the handlers.
   */
  describe('what each route requires', () => {
    const reflector = new Reflector();
    const handlers = SalariesController.prototype as unknown as Record<string, () => void>;
    const routes = ['create', 'findAll', 'findOne', 'update'];

    /** Permissions the caller must hold *all* of. */
    const requiresAll = (method: string): string[] | undefined =>
      reflector.get<string[]>(PERMISSIONS_KEY, handlers[method]);

    /** Permissions the caller must hold *at least one* of. */
    const requiresAny = (method: string): string[] | undefined =>
      reflector.get<string[]>(ANY_PERMISSION_KEY, handlers[method]);

    // Any-of, not all-of. Requiring both would lock out the imam, who holds only `salary.viewOwn`.
    it.each(['findAll', 'findOne'])('lets either salary.view or salary.viewOwn %s', (method) => {
      expect(requiresAny(method)).toEqual(['salary.view', 'salary.viewOwn']);
      expect(requiresAll(method)).toBeUndefined();
    });

    it.each(['create', 'update'])('needs salary.manage to %s', (method) => {
      expect(requiresAll(method)).toEqual(['salary.manage']);
    });

    // Reading the payroll is not amending it, and reading your own record is certainly not amending it. Either
    // permission on a write route would be a way to change an amount.
    it.each(['create', 'update'])('does not let a read permission satisfy %s', (method) => {
      expect(requiresAll(method)).not.toContain('salary.view');
      expect(requiresAll(method)).not.toContain('salary.viewOwn');
      expect(requiresAny(method)).toBeUndefined();
    });

    it('leaves no route unguarded', () => {
      for (const method of routes) {
        const required = (requiresAll(method) ?? []).length + (requiresAny(method) ?? []).length;

        expect(required).toBeGreaterThan(0);
      }
    });

    it('has no fifth route to guard', () => {
      expect(handlers.remove).toBeUndefined();
    });
  });
});
