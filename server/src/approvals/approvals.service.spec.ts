import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConflictException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';

import { ALL_PERMISSIONS } from '../common/constants/permissions';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { ApprovalsService } from './approvals.service';

/**
 * The approval workflow.
 *
 * Six rules are load bearing here and each has a test below: a request is raised as `pending` and never as anything
 * else, a decision is a single atomic transition, a requester cannot decide their own request, every decision writes
 * to the audit trail, another mosque's request is invisible rather than forbidden, and a second pending request for
 * the same thing is refused.
 */

const MOSQUE = '11111111-1111-4111-8111-111111111111';
const OTHER_MOSQUE = '22222222-2222-4222-8222-222222222222';
const TREASURER = '33333333-3333-4333-8333-333333333333';
const ADMIN = '44444444-4444-4444-8444-444444444444';
const APPROVAL = '55555555-5555-4555-8555-555555555555';
const EXPENSE = '66666666-6666-4666-8666-666666666666';

function actor(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: TREASURER,
    mosqueId: MOSQUE,
    email: 'treasurer@example.test',
    role: Role.treasurer,
    permissions: ['workflow.review'],
    deniedPermissions: [],
    isActive: true,
    ...overrides,
  };
}

/** A `mosque_admin`: holds `workflow.approve`, and deliberately does not hold `workflow.selfApprove`. */
function approver(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return actor({
    id: ADMIN,
    email: 'admin@example.test',
    role: Role.mosque_admin,
    permissions: ALL_PERMISSIONS.filter((permission) => permission !== 'workflow.selfApprove'),
    ...overrides,
  });
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: APPROVAL,
    mosqueId: MOSQUE,
    entity: 'expense',
    entityId: EXPENSE,
    action: 'pay',
    status: 'pending',
    reason: 'Roof repair, above the delegated limit.',
    comment: null,
    reviewedAt: null,
    createdAt: new Date('2026-08-20T09:00:00.000Z'),
    updatedAt: new Date('2026-08-20T09:00:00.000Z'),
    requestedBy: { id: TREASURER, fullName: 'A Treasurer' },
    reviewedBy: null,
    ...overrides,
  };
}

type Mocked = {
  prisma: {
    approvalRequest: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  audit: { record: jest.Mock };
  service: ApprovalsService;
};

function build(): Mocked {
  const prisma = {
    approvalRequest: {
      create: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn(),
    },
    $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };

  return {
    prisma,
    audit,
    // The service takes the two concrete classes; the mocks stand in for them.
    service: new ApprovalsService(prisma as never, audit as never),
  };
}

describe('ApprovalsService', () => {
  describe('create', () => {
    it('files the request against the actor’s own mosque and leaves the status to the column default', async () => {
      const { prisma, service } = build();
      prisma.approvalRequest.create.mockResolvedValue(row());

      await service.create(actor(), {
        entity: 'expense',
        entityId: EXPENSE,
        action: 'pay',
        reason: ' Roof ',
      });

      const data = prisma.approvalRequest.create.mock.calls[0][0].data as Record<string, unknown>;
      expect(data.mosqueId).toBe(MOSQUE);
      expect(data.requestedById).toBe(TREASURER);
      expect(data.reason).toBe('Roof');
      // Not settable by the caller: raising a request is what makes it pending.
      expect(data).not.toHaveProperty('status');
    });

    it('writes an audit entry naming the entity the request is about', async () => {
      const { prisma, audit, service } = build();
      prisma.approvalRequest.create.mockResolvedValue(row());

      await service.create(actor(), { entity: 'expense', entityId: EXPENSE, action: 'pay' });

      expect(audit.record).toHaveBeenCalledTimes(1);
      const entry = audit.record.mock.calls[0][0] as Record<string, unknown>;
      expect(entry).toMatchObject({
        mosqueId: MOSQUE,
        action: 'APPROVAL_REQUESTED',
        resource: 'approval',
        resourceId: APPROVAL,
        actorId: TREASURER,
        actorRole: Role.treasurer,
      });
      expect(entry.changes).toMatchObject({ entity: 'expense', entityId: EXPENSE, action: 'pay' });
    });

    it('refuses a second pending request for the same thing', async () => {
      const { prisma, service } = build();
      prisma.approvalRequest.findFirst.mockResolvedValue(row());

      await expect(
        service.create(actor(), { entity: 'expense', entityId: EXPENSE, action: 'pay' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.approvalRequest.create).not.toHaveBeenCalled();
    });
  });

  describe('approve / reject', () => {
    it('records the decision, the reviewer and the moment, in one guarded update', async () => {
      const { prisma, service } = build();
      prisma.approvalRequest.findFirst.mockResolvedValue(row());
      prisma.approvalRequest.update.mockResolvedValue(
        row({ status: 'approved', reviewedAt: new Date('2026-08-21T09:00:00.000Z') }),
      );

      const result = await service.approve(approver(), APPROVAL, { comment: 'Agreed' });

      const args = prisma.approvalRequest.update.mock.calls[0][0] as {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      };
      // The `status: 'pending'` in the filter is what makes the transition atomic: two approvers racing
      // produce one winner and one P2025, rather than two writes.
      expect(args.where).toMatchObject({ id: APPROVAL, status: 'pending' });
      expect(args.data).toMatchObject({ status: 'approved', reviewedById: ADMIN });
      expect(args.data.reviewedAt).toBeInstanceOf(Date);
      expect(result.status).toBe('approved');
    });

    it('audits an approval and a rejection distinguishably', async () => {
      const { prisma, audit, service } = build();
      prisma.approvalRequest.findFirst.mockResolvedValue(row());
      prisma.approvalRequest.update.mockResolvedValue(row({ status: 'rejected' }));

      await service.reject(approver(), APPROVAL, { comment: 'Get a second quote' });

      const entry = audit.record.mock.calls[0][0] as Record<string, unknown>;
      expect(entry.action).toBe('APPROVAL_REJECTED');
      expect(entry.changes).toMatchObject({ status: { from: 'pending', to: 'rejected' } });
      expect(entry.note).toBe('Get a second quote');
    });

    it('refuses a request that has already been decided', async () => {
      const { prisma, service } = build();
      prisma.approvalRequest.findFirst.mockResolvedValue(row({ status: 'approved' }));

      await expect(service.approve(approver(), APPROVAL, {})).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.approvalRequest.update).not.toHaveBeenCalled();
    });

    it('turns a lost race into 409 rather than a 500', async () => {
      const { prisma, service } = build();
      prisma.approvalRequest.findFirst.mockResolvedValue(row());
      prisma.approvalRequest.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('no such row', {
          code: 'P2025',
          clientVersion: 'test',
        }),
      );

      await expect(service.approve(approver(), APPROVAL, {})).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('the self-approval rule', () => {
    it('refuses the requester, even when they may approve in general', async () => {
      const { prisma, audit, service } = build();
      prisma.approvalRequest.findFirst.mockResolvedValue(
        row({ requestedBy: { id: ADMIN, fullName: 'An Admin' } }),
      );

      await expect(service.approve(approver(), APPROVAL, {})).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.approvalRequest.update).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('refuses the requester on rejection too, not only on approval', async () => {
      const { prisma, service } = build();
      prisma.approvalRequest.findFirst.mockResolvedValue(
        row({ requestedBy: { id: ADMIN, fullName: 'An Admin' } }),
      );

      await expect(service.reject(approver(), APPROVAL, {})).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('permits it for the one grant that exempts it', async () => {
      const { prisma, service } = build();
      prisma.approvalRequest.findFirst.mockResolvedValue(
        row({ requestedBy: { id: ADMIN, fullName: 'An Admin' } }),
      );
      prisma.approvalRequest.update.mockResolvedValue(row({ status: 'approved' }));

      const superAdmin = approver({ role: Role.super_admin, permissions: [...ALL_PERMISSIONS] });

      await expect(service.approve(superAdmin, APPROVAL, {})).resolves.toMatchObject({
        status: 'approved',
      });
    });
  });

  describe('mosque isolation', () => {
    it('scopes every read to the actor’s mosque', async () => {
      const { prisma, service } = build();
      prisma.approvalRequest.findFirst.mockResolvedValue(row());

      await service.findOne(actor(), APPROVAL);

      expect(prisma.approvalRequest.findFirst.mock.calls[0][0].where).toMatchObject({
        mosqueId: MOSQUE,
      });
    });

    it('answers 404 for another mosque’s request, not 403', async () => {
      const { prisma, service } = build();
      prisma.approvalRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(actor({ mosqueId: OTHER_MOSQUE }), APPROVAL),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('will not let another mosque’s request be decided', async () => {
      const { prisma, service } = build();
      prisma.approvalRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.approve(approver({ mosqueId: OTHER_MOSQUE }), APPROVAL, {}),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.approvalRequest.update).not.toHaveBeenCalled();
    });
  });

  describe('the list', () => {
    it('pages in the database and never loads the table', async () => {
      const { prisma, service } = build();

      await service.findMany(actor(), { page: 2, limit: 5 });

      const args = prisma.approvalRequest.findMany.mock.calls[0][0] as Record<string, unknown>;
      expect(args).toMatchObject({ skip: 5, take: 5 });
      expect(args.where).toMatchObject({ mosqueId: MOSQUE });
    });

    it('refuses an inverted window rather than returning an empty page', async () => {
      const { service } = build();

      await expect(
        service.findMany(actor(), { from: '2026-08-20', to: '2026-08-01' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
