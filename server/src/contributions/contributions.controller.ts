import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { ContributionsService } from './contributions.service';
import { ContributionEnrollmentQueryDto } from './dto/contribution-enrollment-query.dto';
import {
  ContributionEnrollmentListResponseDto,
  ContributionEnrollmentResponseDto,
} from './dto/contribution-enrollment-response.dto';
import { ContributionHistoryQueryDto } from './dto/contribution-history-query.dto';
import { ContributionHistoryListResponseDto } from './dto/contribution-history-response.dto';
import { ContributionMemberQueryDto } from './dto/contribution-member-query.dto';
import { ContributionMemberListResponseDto } from './dto/contribution-member-response.dto';
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

@ApiTags('Contributions')
@ApiBearerAuth('access-token')
@UseGuards(PermissionsGuard)
@Controller('contributions')
export class ContributionsController {
  constructor(private readonly contributionsService: ContributionsService) {}

  // -------------------------------------------------------------------------
  // Summary, Members, and History Reporting (Part 5)
  // -------------------------------------------------------------------------

  @Get('summary')
  @Permissions('contribution.view', 'contribution.viewOwn', 'contribution.manage', 'donation.view', 'finance.view')
  @ApiOperation({
    summary: 'Get recurring contribution financial commitment summary',
    description:
      'Retrieves aggregated expectedAmount, collectedAmount, outstandingAmount, overdueCount, ' +
      'paidMembers, and unpaidMembers with support for month/year or custom date range filters.',
  })
  @ApiOkResponse({
    type: ContributionSummaryResponseDto,
    description: 'Aggregated contribution summary.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permissions.' })
  async getSummary(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ContributionSummaryQueryDto,
  ): Promise<{ success: true; message: string; data: ContributionSummaryResponseDto }> {
    const data = await this.contributionsService.getSummary(actor, query);
    return {
      success: true,
      message: 'Contribution summary retrieved successfully',
      data,
    };
  }

  @Get('members')
  @Permissions('contribution.view', 'contribution.viewOwn', 'contribution.manage', 'donation.view')
  @ApiOperation({
    summary: 'Get member recurring contribution directory and individual commitment metrics',
    description:
      'Lists enrolled members with active plan pledges, cumulative expected vs paid amounts, and current period status.',
  })
  @ApiOkResponse({
    type: ContributionMemberListResponseDto,
    description: 'List of members and their contribution status.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permissions.' })
  async getMembers(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ContributionMemberQueryDto,
  ): Promise<{ success: true; message: string; data: any[]; meta: any }> {
    const { rows, meta } = await this.contributionsService.getMembers(actor, query);
    return {
      success: true,
      message: 'Contribution members retrieved successfully',
      data: rows,
      meta,
    };
  }

  @Get('history')
  @Permissions('contribution.view', 'contribution.viewOwn', 'contribution.manage', 'donation.view', 'finance.view')
  @ApiOperation({
    summary: 'Get contribution payment transaction history',
    description: 'Retrieves paginated history of recorded contribution payments with associated transactions and funds.',
  })
  @ApiOkResponse({
    type: ContributionHistoryListResponseDto,
    description: 'List of historical contribution payment records.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permissions.' })
  async getHistory(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ContributionHistoryQueryDto,
  ): Promise<{ success: true; message: string; data: any[]; meta: any }> {
    const { rows, meta } = await this.contributionsService.getHistory(actor, query);
    return {
      success: true,
      message: 'Contribution payment history retrieved successfully',
      data: rows,
      meta,
    };
  }

  // -------------------------------------------------------------------------
  // Contribution Payments (Part 4)
  // -------------------------------------------------------------------------

  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  @Permissions('contribution.record', 'contribution.manage', 'donation.record', 'finance.manage')
  @ApiOperation({
    summary: 'Record contribution payment against due period',
    description:
      'Records an actual payment against a contribution due period. Atomically creates ONE income Transaction ' +
      'in the financial ledger, updates the destination fund balance, and marks the period PAID/PARTIAL.',
  })
  @ApiOkResponse({
    type: PayContributionResponseDto,
    description: 'Payment recorded successfully, transaction created, and period updated.',
  })
  @ApiBadRequestResponse({ description: 'Already paid, payment exceeds remaining due, or invalid amount.' })
  @ApiNotFoundResponse({ description: 'Contribution due period not found for caller’s mosque.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permissions (contribution.record).' })
  async payContribution(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayContributionDto,
  ): Promise<{ success: true; message: string; data: PayContributionResponseDto }> {
    const data = await this.contributionsService.payContribution(actor, id, dto);
    return {
      success: true,
      message: 'Contribution payment recorded successfully',
      data,
    };
  }

  // -------------------------------------------------------------------------
  // Contribution Periods / Due (Part 3)
  // -------------------------------------------------------------------------

  @Get('due')
  @Permissions('contribution.view', 'contribution.viewOwn', 'contribution.manage', 'donation.view')
  @ApiOperation({
    summary: 'List contribution due periods and obligations',
    description:
      'Lists expected contribution periods with status (pending, partial, paid, overdue, waived). ' +
      'Expected amounts do NOT affect fund balances until paid.',
  })
  @ApiOkResponse({
    type: ContributionPeriodListResponseDto,
    description: 'List of due contribution periods.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permissions.' })
  async getDueContributions(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ContributionPeriodQueryDto,
  ): Promise<{ success: true; message: string; data: any[]; meta: any }> {
    const { rows, meta } = await this.contributionsService.getDueContributions(actor, query);
    return {
      success: true,
      message: 'Due contributions retrieved successfully',
      data: rows,
      meta,
    };
  }

  // -------------------------------------------------------------------------
  // Contribution Plans (Part 1)
  // -------------------------------------------------------------------------

  @Post('plans')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('contribution.manage', 'donation.manage', 'finance.manage')
  @ApiOperation({
    summary: 'Create recurring contribution plan template',
    description:
      'Creates a new contribution plan commitment template (e.g. Standard Monthly, Supporter Pledge). ' +
      'Plan creation defines the commitment rules and does not create financial transactions directly.',
  })
  @ApiCreatedResponse({
    type: ContributionPlanResponseDto,
    description: 'Contribution plan created successfully.',
  })
  @ApiBadRequestResponse({ description: 'Invalid plan details, non-positive amount, or invalid frequency.' })
  @ApiNotFoundResponse({ description: 'Destination donation fund not found for caller’s mosque.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permissions (contribution.manage).' })
  async createPlan(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateContributionPlanDto,
  ): Promise<{ success: true; message: string; data: ContributionPlanResponseDto }> {
    const data = await this.contributionsService.createPlan(actor, dto);
    return {
      success: true,
      message: 'Contribution plan created successfully',
      data,
    };
  }

  @Get('plans')
  @Permissions('contribution.view', 'contribution.viewOwn', 'donation.view', 'finance.view')
  @ApiOperation({
    summary: 'List recurring contribution plans',
    description: 'Lists all contribution plans for the caller’s mosque with optional status and frequency filters.',
  })
  @ApiOkResponse({
    type: ContributionPlanListResponseDto,
    description: 'List of contribution plans.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permissions (contribution.view).' })
  async getPlans(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ContributionPlanQueryDto,
  ): Promise<{ success: true; message: string; data: any[]; meta: any }> {
    const { rows, meta } = await this.contributionsService.getPlans(actor, query);
    return {
      success: true,
      message: 'Contribution plans retrieved successfully',
      data: rows,
      meta,
    };
  }

  @Get('plans/:id')
  @Permissions('contribution.view', 'contribution.viewOwn', 'donation.view', 'finance.view')
  @ApiOperation({
    summary: 'Get single contribution plan details',
    description: 'Retrieves a single contribution plan by UUID, scoped to the caller’s mosque.',
  })
  @ApiOkResponse({
    type: ContributionPlanResponseDto,
    description: 'Contribution plan details.',
  })
  @ApiNotFoundResponse({ description: 'Contribution plan not found for caller’s mosque.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permissions (contribution.view).' })
  async getPlanById(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true; message: string; data: ContributionPlanResponseDto }> {
    const data = await this.contributionsService.getPlanById(actor, id);
    return {
      success: true,
      message: 'Contribution plan retrieved successfully',
      data,
    };
  }

  @Patch('plans/:id')
  @Permissions('contribution.manage', 'donation.manage', 'finance.manage')
  @ApiOperation({
    summary: 'Update contribution plan',
    description: 'Updates properties (name, description, amount, frequency, fund) of an existing contribution plan.',
  })
  @ApiOkResponse({
    type: ContributionPlanResponseDto,
    description: 'Contribution plan updated successfully.',
  })
  @ApiNotFoundResponse({ description: 'Contribution plan or fund not found for caller’s mosque.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permissions (contribution.manage).' })
  async updatePlan(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContributionPlanDto,
  ): Promise<{ success: true; message: string; data: ContributionPlanResponseDto }> {
    const data = await this.contributionsService.updatePlan(actor, id, dto);
    return {
      success: true,
      message: 'Contribution plan updated successfully',
      data,
    };
  }

  @Patch('plans/:id/status')
  @Permissions('contribution.manage', 'donation.manage', 'finance.manage')
  @ApiOperation({
    summary: 'Toggle or update contribution plan active status',
    description: 'Enables or disables a contribution plan. Inactive plans cannot receive new pledges.',
  })
  @ApiOkResponse({
    type: ContributionPlanResponseDto,
    description: 'Contribution plan status updated successfully.',
  })
  @ApiNotFoundResponse({ description: 'Contribution plan not found for caller’s mosque.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permissions (contribution.manage).' })
  async updatePlanStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanStatusDto,
  ): Promise<{ success: true; message: string; data: ContributionPlanResponseDto }> {
    const data = await this.contributionsService.updatePlanStatus(actor, id, dto);
    return {
      success: true,
      message: 'Contribution plan status updated successfully',
      data,
    };
  }

  // -------------------------------------------------------------------------
  // Contribution Enrollments (Part 2)
  // -------------------------------------------------------------------------

  @Post('enrollments')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('contribution.record', 'contribution.manage', 'contribution.viewOwn', 'donation.record', 'donation.manage')
  @ApiOperation({
    summary: 'Enroll donor into recurring contribution plan',
    description:
      'Enrolls a member/user into an active recurring plan. Snapshots amount, currency, and frequency. ' +
      'Does not create financial transactions directly on enrollment.',
  })
  @ApiCreatedResponse({
    type: ContributionEnrollmentResponseDto,
    description: 'Contribution enrollment created successfully.',
  })
  @ApiBadRequestResponse({ description: 'Plan is inactive, duplicate active enrollment exists, or invalid amount.' })
  @ApiNotFoundResponse({ description: 'Contribution plan or user not found for caller’s mosque.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permissions.' })
  async createEnrollment(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateContributionEnrollmentDto,
  ): Promise<{ success: true; message: string; data: ContributionEnrollmentResponseDto }> {
    const data = await this.contributionsService.createEnrollment(actor, dto);
    return {
      success: true,
      message: 'Contribution enrollment created successfully',
      data,
    };
  }

  @Get('enrollments')
  @Permissions('contribution.view', 'contribution.viewOwn', 'contribution.manage', 'donation.view')
  @ApiOperation({
    summary: 'List contribution enrollments',
    description:
      'Lists recurring contribution enrollments with filters for status, plan, user, frequency, and search. ' +
      'Regular members only see their own enrollments.',
  })
  @ApiOkResponse({
    type: ContributionEnrollmentListResponseDto,
    description: 'List of contribution enrollments.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permissions.' })
  async getEnrollments(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ContributionEnrollmentQueryDto,
  ): Promise<{ success: true; message: string; data: any[]; meta: any }> {
    const { rows, meta } = await this.contributionsService.getEnrollments(actor, query);
    return {
      success: true,
      message: 'Contribution enrollments retrieved successfully',
      data: rows,
      meta,
    };
  }

  @Get('enrollments/:id')
  @Permissions('contribution.view', 'contribution.viewOwn', 'contribution.manage', 'donation.view')
  @ApiOperation({
    summary: 'Get single contribution enrollment details',
    description: 'Retrieves a single contribution enrollment by UUID.',
  })
  @ApiOkResponse({
    type: ContributionEnrollmentResponseDto,
    description: 'Contribution enrollment details.',
  })
  @ApiNotFoundResponse({ description: 'Contribution enrollment not found.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permissions.' })
  async getEnrollmentById(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true; message: string; data: ContributionEnrollmentResponseDto }> {
    const data = await this.contributionsService.getEnrollmentById(actor, id);
    return {
      success: true,
      message: 'Contribution enrollment retrieved successfully',
      data,
    };
  }

  @Patch('enrollments/:id')
  @Permissions('contribution.manage', 'contribution.record', 'donation.manage')
  @ApiOperation({
    summary: 'Update contribution enrollment commitment details',
    description: 'Updates pledge amount, frequency, and start/end dates for an enrollment.',
  })
  @ApiOkResponse({
    type: ContributionEnrollmentResponseDto,
    description: 'Contribution enrollment updated successfully.',
  })
  @ApiNotFoundResponse({ description: 'Contribution enrollment not found.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permissions.' })
  async updateEnrollment(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContributionEnrollmentDto,
  ): Promise<{ success: true; message: string; data: ContributionEnrollmentResponseDto }> {
    const data = await this.contributionsService.updateEnrollment(actor, id, dto);
    return {
      success: true,
      message: 'Contribution enrollment updated successfully',
      data,
    };
  }

  @Patch('enrollments/:id/status')
  @Permissions('contribution.manage', 'contribution.record', 'donation.manage')
  @ApiOperation({
    summary: 'Update contribution enrollment status',
    description: 'Changes status of an enrollment (active, paused, cancelled) and records an audit log.',
  })
  @ApiOkResponse({
    type: ContributionEnrollmentResponseDto,
    description: 'Contribution enrollment status updated successfully.',
  })
  @ApiNotFoundResponse({ description: 'Contribution enrollment not found.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permissions.' })
  async updateEnrollmentStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEnrollmentStatusDto,
  ): Promise<{ success: true; message: string; data: ContributionEnrollmentResponseDto }> {
    const data = await this.contributionsService.updateEnrollmentStatus(actor, id, dto);
    return {
      success: true,
      message: 'Contribution enrollment status updated successfully',
      data,
    };
  }
}
