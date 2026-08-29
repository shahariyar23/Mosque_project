import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContributionDueStatus,
  ContributionEnrollmentStatus,
  ContributionFrequency,
  PaymentMethod,
  Prisma,
  ReceiptStatus,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';

import { AuditLogService } from '../audit/audit-log.service';
import { MAX_PAGE_SIZE } from '../common/pagination/page';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { CURRENCY_PATTERN, FALLBACK_CURRENCY, normalizeCurrency } from '../common/utils/currency';
import { fromMoney, toMoney } from '../common/utils/money';
import { PrismaService } from '../prisma/prisma.service';
import { ContributionEnrollmentQueryDto } from './dto/contribution-enrollment-query.dto';
import {
  ContributionEnrollmentListResponseDto,
  ContributionEnrollmentResponseDto,
} from './dto/contribution-enrollment-response.dto';
import { ContributionHistoryQueryDto } from './dto/contribution-history-query.dto';
import {
  ContributionHistoryListResponseDto,
  ContributionHistoryItemDto,
} from './dto/contribution-history-response.dto';
import { ContributionMemberQueryDto } from './dto/contribution-member-query.dto';
import {
  ContributionMemberListResponseDto,
  ContributionMemberItemDto,
} from './dto/contribution-member-response.dto';
import { ContributionPeriodQueryDto } from './dto/contribution-period-query.dto';
import {
  ContributionPeriodListResponseDto,
  ContributionPeriodResponseDto,
} from './dto/contribution-period-response.dto';
import { ContributionPlanQueryDto } from './dto/contribution-plan-query.dto';
import {
  ContributionPlanListResponseDto,
  ContributionPlanResponseDto,
} from './dto/contribution-plan-response.dto';
import { ContributionSummaryQueryDto } from './dto/contribution-summary-query.dto';
import { ContributionSummaryResponseDto } from './dto/contribution-summary-response.dto';
import { CreateContributionEnrollmentDto } from './dto/create-contribution-enrollment.dto';
import { CreateContributionPlanDto } from './dto/create-contribution-plan.dto';
import { PayContributionDto } from './dto/pay-contribution.dto';
import { PayContributionResponseDto } from './dto/pay-contribution-response.dto';
import { UpdateContributionEnrollmentDto } from './dto/update-contribution-enrollment.dto';
import { UpdateContributionPlanDto } from './dto/update-contribution-plan.dto';
import { UpdateEnrollmentStatusDto } from './dto/update-enrollment-status.dto';
import { UpdatePlanStatusDto } from './dto/update-plan-status.dto';

const PLAN_SELECT = {
  id: true,
  mosqueId: true,
  name: true,
  description: true,
  amount: true,
  currency: true,
  frequency: true,
  fundId: true,
  fund: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

const ENROLLMENT_SELECT = {
  id: true,
  mosqueId: true,
  userId: true,
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
    },
  },
  planId: true,
  plan: {
    select: {
      id: true,
      name: true,
      frequency: true,
      fundId: true,
    },
  },
  amount: true,
  currency: true,
  frequency: true,
  startDate: true,
  endDate: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

const PERIOD_SELECT = {
  id: true,
  mosqueId: true,
  enrollmentId: true,
  userId: true,
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
    },
  },
  planId: true,
  plan: {
    select: {
      id: true,
      name: true,
      frequency: true,
      fundId: true,
      fund: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },
  periodStart: true,
  periodEnd: true,
  dueDate: true,
  expectedAmount: true,
  paidAmount: true,
  currency: true,
  status: true,
  transactionId: true,
  transaction: {
    select: {
      id: true,
      paymentMethod: true,
      reference: true,
      transactedAt: true,
      status: true,
    },
  },
  paidAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

import { MailService } from '../mail/mail.service';

@Injectable()
export class ContributionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly mailService: MailService,
  ) {}

  // -------------------------------------------------------------------------
  // Contribution Plans (Part 1)
  // -------------------------------------------------------------------------

  async createPlan(
    actor: AuthenticatedUser,
    dto: CreateContributionPlanDto,
  ): Promise<ContributionPlanResponseDto> {
    if (dto.fundId) {
      await this.assertFundOwned(actor.mosqueId, dto.fundId);
    }

    const amountDecimal = toMoney(dto.amount);
    if (amountDecimal.lte(0)) {
      throw new BadRequestException({
        code: 'INVALID_AMOUNT',
        message: 'Plan contribution amount must be greater than zero.',
      });
    }

    const currency = await this.resolveCurrency(actor.mosqueId, dto.currency);

    const created = await this.prisma.contributionPlan.create({
      data: {
        mosqueId: actor.mosqueId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        amount: amountDecimal,
        currency,
        frequency: dto.frequency,
        fundId: dto.fundId || null,
        isActive: dto.isActive ?? true,
      },
      select: PLAN_SELECT,
    });

    await this.audit.record({
      mosqueId: actor.mosqueId,
      actorId: actor.id,
      actorName: actor.email,
      actorRole: actor.role,
      action: 'PLAN_CREATED' as any,
      resource: 'contribution_plan' as any,
      resourceId: created.id,
      changes: {
        name: created.name,
        amount: fromMoney(created.amount),
        currency: created.currency,
        frequency: created.frequency,
        fundId: created.fundId,
        isActive: created.isActive,
      },
    });

    return this.serializePlan(created);
  }

  async getPlans(
    actor: AuthenticatedUser,
    query: ContributionPlanQueryDto,
  ): Promise<ContributionPlanListResponseDto> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ContributionPlanWhereInput = {
      mosqueId: actor.mosqueId,
      ...(query.status === 'active'
        ? { isActive: true }
        : query.status === 'inactive'
          ? { isActive: false }
          : {}),
      ...(query.frequency ? { frequency: query.frequency } : {}),
      ...(query.fundId ? { fundId: query.fundId } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { name: { contains: query.search.trim(), mode: 'insensitive' } },
              { description: { contains: query.search.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.contributionPlan.count({ where }),
      this.prisma.contributionPlan.findMany({
        where,
        select: PLAN_SELECT,
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      rows: rows.map((r) => this.serializePlan(r)),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getPlanById(
    actor: AuthenticatedUser,
    id: string,
  ): Promise<ContributionPlanResponseDto> {
    const plan = await this.prisma.contributionPlan.findFirst({
      where: {
        id,
        mosqueId: actor.mosqueId,
      },
      select: PLAN_SELECT,
    });

    if (!plan) {
      throw new NotFoundException({
        code: 'PLAN_NOT_FOUND',
        message: 'Contribution plan not found for the caller’s mosque.',
      });
    }

    return this.serializePlan(plan);
  }

  async updatePlan(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateContributionPlanDto,
  ): Promise<ContributionPlanResponseDto> {
    await this.getPlanById(actor, id);

    if (dto.fundId) {
      await this.assertFundOwned(actor.mosqueId, dto.fundId);
    }

    let amountDecimal: Prisma.Decimal | undefined;
    if (dto.amount !== undefined) {
      amountDecimal = toMoney(dto.amount);
      if (amountDecimal.lte(0)) {
        throw new BadRequestException({
          code: 'INVALID_AMOUNT',
          message: 'Plan contribution amount must be greater than zero.',
        });
      }
    }

    const updated = await this.prisma.contributionPlan.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(amountDecimal !== undefined ? { amount: amountDecimal } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.frequency !== undefined ? { frequency: dto.frequency } : {}),
        ...(dto.fundId !== undefined ? { fundId: dto.fundId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      select: PLAN_SELECT,
    });

    await this.audit.record({
      mosqueId: actor.mosqueId,
      actorId: actor.id,
      actorName: actor.email,
      actorRole: actor.role,
      action: 'PLAN_UPDATED' as any,
      resource: 'contribution_plan' as any,
      resourceId: updated.id,
      changes: {
        name: updated.name,
        amount: fromMoney(updated.amount),
        frequency: updated.frequency,
        fundId: updated.fundId,
        isActive: updated.isActive,
      },
    });

    return this.serializePlan(updated);
  }

  async updatePlanStatus(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdatePlanStatusDto,
  ): Promise<ContributionPlanResponseDto> {
    await this.getPlanById(actor, id);

    const updated = await this.prisma.contributionPlan.update({
      where: { id },
      data: {
        isActive: dto.isActive,
      },
      select: PLAN_SELECT,
    });

    await this.audit.record({
      mosqueId: actor.mosqueId,
      actorId: actor.id,
      actorName: actor.email,
      actorRole: actor.role,
      action: 'PLAN_STATUS_CHANGED' as any,
      resource: 'contribution_plan' as any,
      resourceId: updated.id,
      changes: {
        isActive: updated.isActive,
      },
    });

    return this.serializePlan(updated);
  }

  // -------------------------------------------------------------------------
  // Contribution Enrollments (Part 2)
  // -------------------------------------------------------------------------

  async createEnrollment(
    actor: AuthenticatedUser,
    dto: CreateContributionEnrollmentDto,
  ): Promise<ContributionEnrollmentResponseDto> {
    const plan = await this.prisma.contributionPlan.findFirst({
      where: {
        id: dto.planId,
        mosqueId: actor.mosqueId,
      },
    });

    if (!plan) {
      throw new NotFoundException({
        code: 'PLAN_NOT_FOUND',
        message: 'Contribution plan not found for the caller’s mosque.',
      });
    }

    if (!plan.isActive) {
      throw new BadRequestException({
        code: 'PLAN_INACTIVE',
        message: 'Inactive contribution plans cannot receive new donor enrollments.',
      });
    }

    const targetUserId = dto.userId || actor.id;
    if (targetUserId !== actor.id && !this.canManageContributions(actor)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to enroll other users into contribution plans.',
      });
    }

    const user = await this.prisma.user.findFirst({
      where: { id: targetUserId, mosqueId: actor.mosqueId, deletedAt: null },
      select: { id: true, email: true, fullName: true },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Enrolled member user not found for the caller’s mosque.',
      });
    }

    const existingActive = await this.prisma.contributionEnrollment.findFirst({
      where: {
        mosqueId: actor.mosqueId,
        userId: targetUserId,
        planId: dto.planId,
        status: { in: [ContributionEnrollmentStatus.active, ContributionEnrollmentStatus.paused] },
      },
    });

    if (existingActive) {
      throw new BadRequestException({
        code: 'DUPLICATE_ENROLLMENT',
        message: 'This user is already actively enrolled in this contribution plan.',
      });
    }

    const amountDecimal = dto.amount ? toMoney(dto.amount) : plan.amount;
    if (amountDecimal.lte(0)) {
      throw new BadRequestException({
        code: 'INVALID_AMOUNT',
        message: 'Enrollment commitment amount must be greater than zero.',
      });
    }

    const frequency = dto.frequency || plan.frequency;
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    if (endDate && endDate <= startDate) {
      throw new BadRequestException({
        code: 'INVALID_DATE_RANGE',
        message: 'Commitment end date must be after start date.',
      });
    }

    const created = await this.prisma.contributionEnrollment.create({
      data: {
        mosqueId: actor.mosqueId,
        userId: targetUserId,
        planId: dto.planId,
        amount: amountDecimal,
        currency: plan.currency,
        frequency,
        startDate,
        endDate,
        status: ContributionEnrollmentStatus.active,
      },
      select: ENROLLMENT_SELECT,
    });

    await this.audit.record({
      mosqueId: actor.mosqueId,
      actorId: actor.id,
      actorName: actor.email,
      actorRole: actor.role,
      action: 'ENROLLMENT_CREATED' as any,
      resource: 'contribution_enrollment' as any,
      resourceId: created.id,
      changes: {
        userId: created.userId,
        planId: created.planId,
        amount: fromMoney(created.amount),
        currency: created.currency,
        frequency: created.frequency,
        status: created.status,
      },
    });

    await this.ensurePeriodForEnrollment(created, startDate);

    return this.serializeEnrollment(created);
  }

  async getEnrollments(
    actor: AuthenticatedUser,
    query: ContributionEnrollmentQueryDto,
  ): Promise<ContributionEnrollmentListResponseDto> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const isPrivileged = this.canManageContributions(actor) || actor.permissions.includes('contribution.view');
    const userScope = isPrivileged && query.userId ? query.userId : isPrivileged ? undefined : actor.id;

    const where: Prisma.ContributionEnrollmentWhereInput = {
      mosqueId: actor.mosqueId,
      ...(userScope ? { userId: userScope } : {}),
      ...(query.planId ? { planId: query.planId } : {}),
      ...(query.status && query.status !== 'all'
        ? { status: query.status.toLowerCase() as ContributionEnrollmentStatus }
        : {}),
      ...(query.frequency ? { frequency: query.frequency } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { user: { fullName: { contains: query.search.trim(), mode: 'insensitive' } } },
              { user: { email: { contains: query.search.trim(), mode: 'insensitive' } } },
              { plan: { name: { contains: query.search.trim(), mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.contributionEnrollment.count({ where }),
      this.prisma.contributionEnrollment.findMany({
        where,
        select: ENROLLMENT_SELECT,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      rows: rows.map((r) => this.serializeEnrollment(r)),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getEnrollmentById(
    actor: AuthenticatedUser,
    id: string,
  ): Promise<ContributionEnrollmentResponseDto> {
    const enrollment = await this.prisma.contributionEnrollment.findFirst({
      where: {
        id,
        mosqueId: actor.mosqueId,
      },
      select: ENROLLMENT_SELECT,
    });

    if (!enrollment) {
      throw new NotFoundException({
        code: 'ENROLLMENT_NOT_FOUND',
        message: 'Contribution enrollment not found for the caller’s mosque.',
      });
    }

    if (
      enrollment.userId !== actor.id &&
      !this.canManageContributions(actor) &&
      !actor.permissions.includes('contribution.view')
    ) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to view this contribution enrollment.',
      });
    }

    return this.serializeEnrollment(enrollment);
  }

  async updateEnrollment(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateContributionEnrollmentDto,
  ): Promise<ContributionEnrollmentResponseDto> {
    const existing = await this.getEnrollmentById(actor, id);

    let amountDecimal: Prisma.Decimal | undefined;
    if (dto.amount !== undefined) {
      amountDecimal = toMoney(dto.amount);
      if (amountDecimal.lte(0)) {
        throw new BadRequestException({
          code: 'INVALID_AMOUNT',
          message: 'Enrollment commitment amount must be greater than zero.',
        });
      }
    }

    const updated = await this.prisma.contributionEnrollment.update({
      where: { id },
      data: {
        ...(amountDecimal !== undefined ? { amount: amountDecimal } : {}),
        ...(dto.frequency !== undefined ? { frequency: dto.frequency } : {}),
        ...(dto.startDate !== undefined ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate !== undefined
          ? { endDate: dto.endDate ? new Date(dto.endDate) : null }
          : {}),
      },
      select: ENROLLMENT_SELECT,
    });

    await this.audit.record({
      mosqueId: actor.mosqueId,
      actorId: actor.id,
      actorName: actor.email,
      actorRole: actor.role,
      action: 'ENROLLMENT_UPDATED' as any,
      resource: 'contribution_enrollment' as any,
      resourceId: updated.id,
      changes: {
        amount: fromMoney(updated.amount),
        frequency: updated.frequency,
        startDate: updated.startDate,
        endDate: updated.endDate,
      },
    });

    return this.serializeEnrollment(updated);
  }

  async updateEnrollmentStatus(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateEnrollmentStatusDto,
  ): Promise<ContributionEnrollmentResponseDto> {
    const existing = await this.getEnrollmentById(actor, id);

    const updated = await this.prisma.contributionEnrollment.update({
      where: { id },
      data: {
        status: dto.status,
      },
      select: ENROLLMENT_SELECT,
    });

    await this.audit.record({
      mosqueId: actor.mosqueId,
      actorId: actor.id,
      actorName: actor.email,
      actorRole: actor.role,
      action: 'ENROLLMENT_STATUS_CHANGED' as any,
      resource: 'contribution_enrollment' as any,
      resourceId: updated.id,
      changes: {
        previousStatus: existing.status,
        newStatus: updated.status,
        reason: dto.reason || null,
      },
    });

    return this.serializeEnrollment(updated);
  }

  // -------------------------------------------------------------------------
  // Contribution Periods / Dues / Summary / Members / History (Part 3 & 5)
  // -------------------------------------------------------------------------

  async getDueContributions(
    actor: AuthenticatedUser,
    query: ContributionPeriodQueryDto,
  ): Promise<ContributionPeriodListResponseDto> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    await this.generateActiveEnrollmentPeriods(actor.mosqueId);

    const now = new Date();
    await this.prisma.contributionPeriod.updateMany({
      where: {
        mosqueId: actor.mosqueId,
        status: { in: [ContributionDueStatus.pending, ContributionDueStatus.partial] },
        dueDate: { lt: now },
      },
      data: {
        status: ContributionDueStatus.overdue,
      },
    });

    const isPrivileged = this.canManageContributions(actor) || actor.permissions.includes('contribution.view');
    const userScope = isPrivileged && query.userId ? query.userId : isPrivileged ? undefined : actor.id;

    const where: Prisma.ContributionPeriodWhereInput = {
      mosqueId: actor.mosqueId,
      ...(userScope ? { userId: userScope } : {}),
      ...(query.planId ? { planId: query.planId } : {}),
      ...(query.enrollmentId ? { enrollmentId: query.enrollmentId } : {}),
      ...(query.status && query.status !== 'all'
        ? { status: query.status.toLowerCase() as ContributionDueStatus }
        : {}),
      ...(query.from || query.to
        ? {
            periodStart: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { user: { fullName: { contains: query.search.trim(), mode: 'insensitive' } } },
              { user: { email: { contains: query.search.trim(), mode: 'insensitive' } } },
              { plan: { name: { contains: query.search.trim(), mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.contributionPeriod.count({ where }),
      this.prisma.contributionPeriod.findMany({
        where,
        select: PERIOD_SELECT,
        orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      rows: rows.map((r) => this.serializePeriod(r)),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Part 5: Comprehensive Contribution Financial Summary with period window support.
   */
  async getSummary(
    actor: AuthenticatedUser,
    query: ContributionSummaryQueryDto = {},
  ): Promise<ContributionSummaryResponseDto> {
    const mosqueId = actor.mosqueId;
    const currency = await this.resolveCurrency(mosqueId);

    const isPrivileged = this.canManageContributions(actor) || actor.permissions.includes('contribution.view');
    const userScope = isPrivileged && query.userId ? query.userId : isPrivileged ? undefined : actor.id;

    // Resolve date window
    let dateFilter: { gte?: Date; lte?: Date } | undefined;
    if (query.year && query.month) {
      dateFilter = {
        gte: new Date(Date.UTC(query.year, query.month - 1, 1)),
        lte: new Date(Date.UTC(query.year, query.month, 0)),
      };
    } else if (query.year) {
      dateFilter = {
        gte: new Date(Date.UTC(query.year, 0, 1)),
        lte: new Date(Date.UTC(query.year, 11, 31)),
      };
    } else if (query.from || query.to) {
      dateFilter = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const periodWhere: Prisma.ContributionPeriodWhereInput = {
      mosqueId,
      ...(userScope ? { userId: userScope } : {}),
      ...(query.planId ? { planId: query.planId } : {}),
      ...(dateFilter ? { periodStart: dateFilter } : {}),
    };

    const [expectedAgg, paidAgg, overdueCount, enrolledMembers, paidMembersAgg, unpaidMembersAgg] =
      await this.prisma.$transaction([
        this.prisma.contributionPeriod.aggregate({
          where: { ...periodWhere, status: { not: ContributionDueStatus.waived } },
          _sum: { expectedAmount: true },
        }),
        this.prisma.contributionPeriod.aggregate({
          where: periodWhere,
          _sum: { paidAmount: true },
        }),
        this.prisma.contributionPeriod.count({
          where: { ...periodWhere, status: ContributionDueStatus.overdue },
        }),
        this.prisma.contributionEnrollment.findMany({
          where: {
            mosqueId,
            status: ContributionEnrollmentStatus.active,
            ...(userScope ? { userId: userScope } : {}),
            ...(query.planId ? { planId: query.planId } : {}),
          },
          distinct: ['userId'],
          select: { userId: true },
        }),
        this.prisma.contributionPeriod.findMany({
          where: { ...periodWhere, status: ContributionDueStatus.paid },
          distinct: ['userId'],
          select: { userId: true },
        }),
        this.prisma.contributionPeriod.findMany({
          where: {
            ...periodWhere,
            status: { in: [ContributionDueStatus.pending, ContributionDueStatus.partial, ContributionDueStatus.overdue] },
          },
          distinct: ['userId'],
          select: { userId: true },
        }),
      ]);

    const expectedDecimal = expectedAgg._sum.expectedAmount ?? new Prisma.Decimal(0);
    const collectedDecimal = paidAgg._sum.paidAmount ?? new Prisma.Decimal(0);
    const outstandingDecimal = Prisma.Decimal.max(0, expectedDecimal.sub(collectedDecimal));

    return {
      enrolledMembers: enrolledMembers.length,
      totalEnrolledMembers: enrolledMembers.length,
      expectedAmount: fromMoney(expectedDecimal),
      collectedAmount: fromMoney(collectedDecimal),
      outstandingAmount: fromMoney(outstandingDecimal),
      overdueCount,
      paidMembers: paidMembersAgg.length,
      unpaidMembers: unpaidMembersAgg.length,
      currency,
    };
  }

  /**
   * Part 5: Member Contribution Directory & Metrics (Avoids N+1 queries).
   */
  async getMembers(
    actor: AuthenticatedUser,
    query: ContributionMemberQueryDto,
  ): Promise<ContributionMemberListResponseDto> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const isPrivileged = this.canManageContributions(actor) || actor.permissions.includes('contribution.view');
    const userScope = isPrivileged ? undefined : actor.id;

    const userWhere: Prisma.UserWhereInput = {
      mosqueId: actor.mosqueId,
      deletedAt: null,
      ...(userScope ? { id: userScope } : {}),
      contributionEnrollments: {
        some: {
          mosqueId: actor.mosqueId,
          ...(query.planId ? { planId: query.planId } : {}),
          ...(query.status === 'active' ? { status: ContributionEnrollmentStatus.active } : {}),
        },
      },
      ...(query.search?.trim()
        ? {
            OR: [
              { fullName: { contains: query.search.trim(), mode: 'insensitive' } },
              { email: { contains: query.search.trim(), mode: 'insensitive' } },
              { phone: { contains: query.search.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where: userWhere }),
      this.prisma.user.findMany({
        where: userWhere,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          contributionEnrollments: {
            where: { mosqueId: actor.mosqueId },
            select: {
              id: true,
              amount: true,
              frequency: true,
              status: true,
              plan: {
                select: { id: true, name: true },
              },
            },
          },
          contributionPeriods: {
            where: { mosqueId: actor.mosqueId },
            select: {
              id: true,
              expectedAmount: true,
              paidAmount: true,
              status: true,
              dueDate: true,
              paidAt: true,
            },
            orderBy: [{ dueDate: 'desc' }],
          },
        },
        orderBy: [{ fullName: 'asc' }],
        skip,
        take: limit,
      }),
    ]);

    const rows: ContributionMemberItemDto[] = users.map((u) => {
      const activePlans = u.contributionEnrollments.map((e) => ({
        id: e.plan.id,
        name: e.plan.name,
        amount: fromMoney(e.amount),
        frequency: e.frequency,
        status: e.status,
      }));

      let totalExpectedDec = new Prisma.Decimal(0);
      let totalPaidDec = new Prisma.Decimal(0);
      let latestPaidAt: Date | null = null;
      let currentPeriodStatus = 'none';

      if (u.contributionPeriods.length > 0) {
        const latestPeriod = u.contributionPeriods[0];
        currentPeriodStatus = latestPeriod.status;

        for (const p of u.contributionPeriods) {
          totalExpectedDec = totalExpectedDec.add(p.expectedAmount);
          totalPaidDec = totalPaidDec.add(p.paidAmount);
          if (p.paidAt && (!latestPaidAt || p.paidAt > latestPaidAt)) {
            latestPaidAt = p.paidAt;
          }
        }
      }

      const outstandingDec = Prisma.Decimal.max(0, totalExpectedDec.sub(totalPaidDec));

      return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        activePlans,
        totalExpected: fromMoney(totalExpectedDec),
        totalPaid: fromMoney(totalPaidDec),
        totalOutstanding: fromMoney(outstandingDec),
        currentPeriodStatus,
        lastPaymentDate: latestPaidAt ? latestPaidAt.toISOString() : null,
      };
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      rows,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Part 5: Contribution Payment History Ledger.
   */
  async getHistory(
    actor: AuthenticatedUser,
    query: ContributionHistoryQueryDto,
  ): Promise<ContributionHistoryListResponseDto> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const isPrivileged = this.canManageContributions(actor) || actor.permissions.includes('contribution.view');
    const userScope = isPrivileged && query.userId ? query.userId : isPrivileged ? undefined : actor.id;

    // Date range filter
    let dateFilter: { gte?: Date; lte?: Date } | undefined;
    if (query.year && query.month) {
      dateFilter = {
        gte: new Date(Date.UTC(query.year, query.month - 1, 1)),
        lte: new Date(Date.UTC(query.year, query.month, 0)),
      };
    } else if (query.from || query.to) {
      dateFilter = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const where: Prisma.ContributionPeriodWhereInput = {
      mosqueId: actor.mosqueId,
      paidAmount: { gt: 0 },
      ...(userScope ? { userId: userScope } : {}),
      ...(query.planId ? { planId: query.planId } : {}),
      ...(query.status ? { status: query.status.toLowerCase() as ContributionDueStatus } : {}),
      ...(dateFilter ? { paidAt: dateFilter } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { user: { fullName: { contains: query.search.trim(), mode: 'insensitive' } } },
              { user: { email: { contains: query.search.trim(), mode: 'insensitive' } } },
              { plan: { name: { contains: query.search.trim(), mode: 'insensitive' } } },
              { transaction: { reference: { contains: query.search.trim(), mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.contributionPeriod.count({ where }),
      this.prisma.contributionPeriod.findMany({
        where,
        select: PERIOD_SELECT,
        orderBy: [{ paidAt: 'desc' }, { updatedAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    const historyItems: ContributionHistoryItemDto[] = rows.map((r) => ({
      id: r.id,
      periodId: r.id,
      transactionId: r.transactionId,
      user: r.user,
      plan: {
        id: r.plan.id,
        name: r.plan.name,
        frequency: r.plan.frequency,
        fundId: r.plan.fundId,
      },
      fund: r.plan.fund,
      amount: fromMoney(r.paidAmount),
      currency: r.currency,
      paymentMethod: r.transaction?.paymentMethod || 'cash',
      reference: r.transaction?.reference || null,
      status: r.transaction?.status || 'completed',
      paidAt: r.paidAt ? r.paidAt.toISOString() : r.updatedAt.toISOString(),
      periodStart: r.periodStart.toISOString().split('T')[0],
      periodEnd: r.periodEnd.toISOString().split('T')[0],
    }));

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      rows: historyItems,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Contribution Payments (Part 4)
  // -------------------------------------------------------------------------

  async payContribution(
    actor: AuthenticatedUser,
    periodId: string,
    dto: PayContributionDto,
  ): Promise<PayContributionResponseDto> {
    const period = await this.prisma.contributionPeriod.findFirst({
      where: {
        id: periodId,
        mosqueId: actor.mosqueId,
      },
      select: PERIOD_SELECT,
    });

    if (!period) {
      throw new NotFoundException({
        code: 'PERIOD_NOT_FOUND',
        message: 'Contribution due period not found for the caller’s mosque.',
      });
    }

    if (period.status === ContributionDueStatus.paid) {
      throw new BadRequestException({
        code: 'ALREADY_PAID',
        message: 'This contribution period is already fully paid.',
      });
    }

    if (period.status === ContributionDueStatus.waived) {
      throw new BadRequestException({
        code: 'PERIOD_WAIVED',
        message: 'This contribution period has been waived and cannot accept payments.',
      });
    }

    const remainingDue = period.expectedAmount.sub(period.paidAmount);
    if (remainingDue.lte(0)) {
      throw new BadRequestException({
        code: 'NO_DUE_REMAINING',
        message: 'No remaining balance due on this contribution period.',
      });
    }

    const paymentAmountDecimal = dto.amount ? toMoney(dto.amount) : remainingDue;
    if (paymentAmountDecimal.lte(0)) {
      throw new BadRequestException({
        code: 'INVALID_PAYMENT_AMOUNT',
        message: 'Payment amount must be greater than zero.',
      });
    }

    if (paymentAmountDecimal.gt(remainingDue)) {
      throw new BadRequestException({
        code: 'OVERPAYMENT_NOT_PERMITTED',
        message: `Payment exceeds remaining balance. Maximum payable is ${fromMoney(remainingDue)} ${period.currency}.`,
      });
    }

    const destinationFundId = dto.fundId || period.plan.fundId || null;
    if (dto.fundId) {
      await this.assertFundOwned(actor.mosqueId, dto.fundId);
    }

    const transactedAt = dto.paymentDate ? new Date(dto.paymentDate) : new Date();
    const year = transactedAt.getFullYear();
    const prefix = `REC-${year}-`;
    const lockKey = `receipt_seq:${actor.mosqueId}:${year}`;

    const { updatedPeriod, transaction, receipt } = await this.prisma.$transaction(async (tx) => {
      // 1. Acquire transaction-level advisory lock for sequence generation
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      // 2. Query highest current sequence number for this mosque and year
      const latest = await tx.receipt.findFirst({
        where: {
          mosqueId: actor.mosqueId,
          receiptNumber: { startsWith: prefix },
        },
        orderBy: { receiptNumber: 'desc' },
        select: { receiptNumber: true },
      });

      let nextSeq = 1;
      if (latest?.receiptNumber) {
        const parts = latest.receiptNumber.split('-');
        const parsed = parseInt(parts[parts.length - 1] ?? '0', 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
          nextSeq = parsed + 1;
        }
      }

      const receiptNumber = `${prefix}${String(nextSeq).padStart(5, '0')}`;

      // 3. Create ONE income Transaction
      const createdTx = await tx.transaction.create({
        data: {
          mosqueId: actor.mosqueId,
          type: TransactionType.income,
          status: TransactionStatus.completed,
          amount: paymentAmountDecimal,
          currency: period.currency,
          fundId: destinationFundId,
          category: 'Monthly Contribution',
          description:
            dto.notes?.trim() ||
            `Monthly contribution - ${period.plan.name} (${period.user.fullName})`,
          paymentMethod: dto.paymentMethod || PaymentMethod.cash,
          reference: receiptNumber,
          transactedAt,
          createdById: actor.id,
        },
      });

      // 4. Create one linked Receipt record
      const createdReceipt = await tx.receipt.create({
        data: {
          mosqueId: actor.mosqueId,
          receiptNumber,
          fundId: destinationFundId,
          userId: period.userId,
          amount: paymentAmountDecimal,
          currency: period.currency,
          status: ReceiptStatus.issued,
          issuedAt: transactedAt,
        },
      });

      // Link receiptId on transaction
      await tx.transaction.update({
        where: { id: createdTx.id },
        data: { receiptId: createdReceipt.id },
      });

      // 5. Update ContributionPeriod
      const newPaidAmount = period.paidAmount.add(paymentAmountDecimal);
      const newStatus = newPaidAmount.gte(period.expectedAmount)
        ? ContributionDueStatus.paid
        : ContributionDueStatus.partial;

      const updated = await tx.contributionPeriod.update({
        where: { id: period.id },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
          transactionId: createdTx.id,
          paidAt: transactedAt,
        },
        select: PERIOD_SELECT,
      });

      return { updatedPeriod: updated, transaction: createdTx, receipt: createdReceipt };
    }, {
      maxWait: 10000,
      timeout: 20000,
    });

    // 6. Record Audit Logs
    await this.audit.record({
      mosqueId: actor.mosqueId,
      actorId: actor.id,
      actorName: actor.email,
      actorRole: actor.role,
      action: 'CONTRIBUTION_PAYMENT_RECORDED' as any,
      resource: 'contribution_period' as any,
      resourceId: updatedPeriod.id,
      changes: {
        paymentAmount: fromMoney(paymentAmountDecimal),
        totalPaid: fromMoney(updatedPeriod.paidAmount),
        status: updatedPeriod.status,
        transactionId: transaction.id,
        receiptId: receipt.id,
        receiptNumber: receipt.receiptNumber,
        fundId: destinationFundId,
        paymentMethod: transaction.paymentMethod,
      },
    });

    await this.audit.record({
      mosqueId: actor.mosqueId,
      actorId: actor.id,
      actorName: actor.email,
      actorRole: actor.role,
      action: 'RECEIPT_ISSUED',
      resource: 'receipt',
      resourceId: receipt.id,
      changes: {
        receiptNumber: receipt.receiptNumber,
        amount: fromMoney(receipt.amount),
        transactionId: transaction.id,
      },
      note: `Automatic receipt ${receipt.receiptNumber} generated for contribution payment`,
    });

    // 7. If contributor has an email address, send receipt email asynchronously
    const contributorEmail = updatedPeriod.user?.email;
    if (contributorEmail && contributorEmail.trim() && contributorEmail.includes('@')) {
      (async () => {
        try {
          const mosque = await this.prisma.mosque.findUnique({
            where: { id: actor.mosqueId },
            select: { name: true, addressLine: true, website: true, email: true },
          });

          await this.mailService.sendReceiptIssuedEmail(contributorEmail.trim(), {
            receiptNumber: receipt.receiptNumber,
            amount: fromMoney(paymentAmountDecimal),
            currency: period.currency,
            fundName: updatedPeriod.plan.fund?.name || 'General Fund',
            donorName: updatedPeriod.user.fullName,
            paymentMethod: transaction.paymentMethod,
            issuedAt: transactedAt.toISOString().split('T')[0],
            mosqueName: mosque?.name || undefined,
            mosqueAddress: mosque?.addressLine || undefined,
            websiteUrl: mosque?.website || undefined,
            supportEmail: mosque?.email || undefined,
          });
        } catch {
          // Graceful ignore
        }
      })().catch(() => undefined);
    }

    return {
      period: this.serializePeriod(updatedPeriod),
      transaction: {
        id: transaction.id,
        type: transaction.type,
        status: transaction.status,
        amount: fromMoney(transaction.amount),
        currency: transaction.currency,
        fundId: transaction.fundId,
        paymentMethod: transaction.paymentMethod,
        description: transaction.description,
      },
      receipt: {
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        amount: fromMoney(receipt.amount),
        currency: receipt.currency,
        status: receipt.status,
        issuedAt: receipt.issuedAt.toISOString(),
      },
    };
  }

  private async generateActiveEnrollmentPeriods(mosqueId: string): Promise<void> {
    const activeEnrollments = await this.prisma.contributionEnrollment.findMany({
      where: {
        mosqueId,
        status: ContributionEnrollmentStatus.active,
      },
      select: {
        id: true,
        mosqueId: true,
        userId: true,
        planId: true,
        amount: true,
        currency: true,
        frequency: true,
        startDate: true,
        endDate: true,
      },
    });

    const now = new Date();

    for (const enrollment of activeEnrollments) {
      if (enrollment.endDate && enrollment.endDate < now) {
        continue;
      }
      await this.ensurePeriodForEnrollment(enrollment, now);
    }
  }

  private async ensurePeriodForEnrollment(
    enrollment: {
      id: string;
      mosqueId: string;
      userId: string;
      planId: string;
      amount: Prisma.Decimal;
      currency: string;
      frequency: ContributionFrequency;
    },
    referenceDate: Date,
  ): Promise<void> {
    const { periodStart, periodEnd, dueDate } = this.calculatePeriodDates(
      enrollment.frequency,
      referenceDate,
    );

    const existing = await this.prisma.contributionPeriod.findUnique({
      where: {
        enrollmentId_periodStart: {
          enrollmentId: enrollment.id,
          periodStart,
        },
      },
      select: { id: true },
    });

    if (!existing) {
      const isPastDue = dueDate < new Date();
      await this.prisma.contributionPeriod.create({
        data: {
          mosqueId: enrollment.mosqueId,
          enrollmentId: enrollment.id,
          userId: enrollment.userId,
          planId: enrollment.planId,
          periodStart,
          periodEnd,
          dueDate,
          expectedAmount: enrollment.amount,
          paidAmount: new Prisma.Decimal(0),
          currency: enrollment.currency,
          status: isPastDue ? ContributionDueStatus.overdue : ContributionDueStatus.pending,
        },
      });
    }
  }

  private calculatePeriodDates(
    frequency: ContributionFrequency,
    date: Date,
  ): { periodStart: Date; periodEnd: Date; dueDate: Date } {
    const y = date.getFullYear();
    const m = date.getMonth();

    if (frequency === ContributionFrequency.yearly) {
      const periodStart = new Date(Date.UTC(y, 0, 1));
      const periodEnd = new Date(Date.UTC(y, 11, 31));
      const dueDate = new Date(Date.UTC(y, 0, 15));
      return { periodStart, periodEnd, dueDate };
    }

    if (frequency === ContributionFrequency.quarterly) {
      const qStartMonth = Math.floor(m / 3) * 3;
      const periodStart = new Date(Date.UTC(y, qStartMonth, 1));
      const periodEnd = new Date(Date.UTC(y, qStartMonth + 3, 0));
      const dueDate = new Date(Date.UTC(y, qStartMonth, 15));
      return { periodStart, periodEnd, dueDate };
    }

    // Default: monthly
    const periodStart = new Date(Date.UTC(y, m, 1));
    const periodEnd = new Date(Date.UTC(y, m + 1, 0));
    const dueDate = new Date(Date.UTC(y, m, 10));
    return { periodStart, periodEnd, dueDate };
  }

  private canManageContributions(actor: AuthenticatedUser): boolean {
    return (
      actor.role === 'super_admin' ||
      actor.role === 'mosque_admin' ||
      actor.role === 'treasurer' ||
      actor.role === 'cashier' ||
      actor.permissions.includes('contribution.manage') ||
      actor.permissions.includes('contribution.record')
    );
  }

  private async assertFundOwned(mosqueId: string, fundId: string): Promise<void> {
    const fund = await this.prisma.donationFund.findFirst({
      where: { id: fundId, mosqueId },
      select: { id: true },
    });

    if (!fund) {
      throw new NotFoundException({
        code: 'FUND_NOT_FOUND',
        message: 'Destination donation fund not found for the caller’s mosque.',
      });
    }
  }

  private async resolveCurrency(mosqueId: string, override?: string): Promise<string> {
    if (override && CURRENCY_PATTERN.test(override)) {
      return override.toUpperCase();
    }

    const settings = await this.prisma.mosqueSettings.findUnique({
      where: { mosqueId },
      select: { currency: true },
    });

    const configured = normalizeCurrency(settings?.currency);
    return typeof configured === 'string' && CURRENCY_PATTERN.test(configured)
      ? configured
      : FALLBACK_CURRENCY;
  }

  private serializePlan(plan: {
    id: string;
    mosqueId: string;
    name: string;
    description: string | null;
    amount: Prisma.Decimal;
    currency: string;
    frequency: any;
    fundId: string | null;
    fund: { id: string; name: string; slug: string } | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): ContributionPlanResponseDto {
    return {
      id: plan.id,
      mosqueId: plan.mosqueId,
      name: plan.name,
      description: plan.description,
      amount: fromMoney(plan.amount),
      currency: plan.currency,
      frequency: plan.frequency,
      fundId: plan.fundId,
      fund: plan.fund,
      isActive: plan.isActive,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    };
  }

  private serializeEnrollment(enrollment: {
    id: string;
    mosqueId: string;
    userId: string;
    user: { id: string; fullName: string; email: string; phone: string | null };
    planId: string;
    plan: { id: string; name: string; frequency: any; fundId: string | null };
    amount: Prisma.Decimal;
    currency: string;
    frequency: any;
    startDate: Date;
    endDate: Date | null;
    status: ContributionEnrollmentStatus;
    createdAt: Date;
    updatedAt: Date;
  }): ContributionEnrollmentResponseDto {
    return {
      id: enrollment.id,
      mosqueId: enrollment.mosqueId,
      userId: enrollment.userId,
      user: enrollment.user,
      planId: enrollment.planId,
      plan: enrollment.plan,
      amount: fromMoney(enrollment.amount),
      currency: enrollment.currency,
      frequency: enrollment.frequency,
      startDate: enrollment.startDate.toISOString(),
      endDate: enrollment.endDate ? enrollment.endDate.toISOString() : null,
      status: enrollment.status,
      createdAt: enrollment.createdAt.toISOString(),
      updatedAt: enrollment.updatedAt.toISOString(),
    };
  }

  private serializePeriod(period: {
    id: string;
    mosqueId: string;
    enrollmentId: string;
    userId: string;
    user: { id: string; fullName: string; email: string; phone: string | null };
    planId: string;
    plan: { id: string; name: string; frequency: any; fundId: string | null };
    periodStart: Date;
    periodEnd: Date;
    dueDate: Date;
    expectedAmount: Prisma.Decimal;
    paidAmount: Prisma.Decimal;
    currency: string;
    status: ContributionDueStatus;
    transactionId: string | null;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): ContributionPeriodResponseDto {
    return {
      id: period.id,
      mosqueId: period.mosqueId,
      enrollmentId: period.enrollmentId,
      userId: period.userId,
      user: period.user,
      planId: period.planId,
      plan: period.plan,
      periodStart: period.periodStart.toISOString().split('T')[0],
      periodEnd: period.periodEnd.toISOString().split('T')[0],
      dueDate: period.dueDate.toISOString().split('T')[0],
      expectedAmount: fromMoney(period.expectedAmount),
      paidAmount: fromMoney(period.paidAmount),
      currency: period.currency,
      status: period.status,
      transactionId: period.transactionId,
      paidAt: period.paidAt ? period.paidAt.toISOString() : null,
      createdAt: period.createdAt.toISOString(),
      updatedAt: period.updatedAt.toISOString(),
    };
  }
}
