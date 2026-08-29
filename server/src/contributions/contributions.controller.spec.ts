import { Test, TestingModule } from '@nestjs/testing';
import {
  ContributionDueStatus,
  ContributionEnrollmentStatus,
  ContributionFrequency,
} from '@prisma/client';

import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { ContributionsController } from './contributions.controller';
import { ContributionsService } from './contributions.service';

const ACTOR: AuthenticatedUser = {
  id: 'a0000000-0000-0000-0000-000000000001',
  email: 'treasurer@testmosque.org',
  role: 'treasurer',
  mosqueId: 'm0000000-0000-0000-0000-000000000001',
  permissions: ['contribution.manage', 'contribution.view', 'contribution.record'],
  deniedPermissions: [],
  isActive: true,
};

describe('ContributionsController', () => {
  let controller: ContributionsController;
  let service: any;

  beforeEach(async () => {
    service = {
      createPlan: jest.fn(),
      getPlans: jest.fn(),
      getPlanById: jest.fn(),
      updatePlan: jest.fn(),
      updatePlanStatus: jest.fn(),
      createEnrollment: jest.fn(),
      getEnrollments: jest.fn(),
      getEnrollmentById: jest.fn(),
      updateEnrollment: jest.fn(),
      updateEnrollmentStatus: jest.fn(),
      getDueContributions: jest.fn(),
      getSummary: jest.fn(),
      getMembers: jest.fn(),
      getHistory: jest.fn(),
      payContribution: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContributionsController],
      providers: [{ provide: ContributionsService, useValue: service }],
    }).compile();

    controller = module.get<ContributionsController>(ContributionsController);
  });

  describe('Part 5 Summary, Members, and History Endpoints', () => {
    it('returns summary envelope with paid and unpaid members', async () => {
      service.getSummary.mockResolvedValue({
        enrolledMembers: 10,
        totalEnrolledMembers: 10,
        expectedAmount: '10000.00',
        collectedAmount: '7500.00',
        outstandingAmount: '2500.00',
        overdueCount: 2,
        paidMembers: 8,
        unpaidMembers: 2,
        currency: 'BDT',
      });

      const res = await controller.getSummary(ACTOR, { month: 8, year: 2026 });

      expect(res.success).toBe(true);
      expect(res.data.expectedAmount).toBe('10000.00');
      expect(res.data.paidMembers).toBe(8);
      expect(res.data.unpaidMembers).toBe(2);
    });

    it('returns members list envelope', async () => {
      service.getMembers.mockResolvedValue({
        rows: [
          {
            id: 'u1',
            fullName: 'Abdullah Member',
            email: 'abdullah@test.org',
            phone: null,
            activePlans: [],
            totalExpected: '500.00',
            totalPaid: '500.00',
            totalOutstanding: '0.00',
            currentPeriodStatus: 'paid',
            lastPaymentDate: '2026-08-15T00:00:00.000Z',
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const res = await controller.getMembers(ACTOR, { page: 1, limit: 20 });

      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
    });

    it('returns payment history envelope', async () => {
      service.getHistory.mockResolvedValue({
        rows: [
          {
            id: 'cp1',
            amount: '500.00',
            paymentMethod: 'cash',
            paidAt: '2026-08-15T00:00:00.000Z',
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const res = await controller.getHistory(ACTOR, { page: 1, limit: 20 });

      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
    });
  });
});
