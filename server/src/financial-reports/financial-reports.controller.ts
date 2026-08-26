import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { FinancialReportQueryDto } from './dto/financial-report-query.dto';
import {
  BudgetReportEnvelopeDto,
  DonationReportEnvelopeDto,
  ExpenseReportEnvelopeDto,
  FinancialSummaryEnvelopeDto,
  SalaryReportEnvelopeDto,
} from './dto/financial-report-response.dto';
import { FinancialReportsService } from './financial-reports.service';

/**
 * Financial reports: what the mosque received, spent, paid out and planned.
 *
 * Every route lives under `/api/v1/financial-reports` — the global prefix and URI versioning are set in
 * `bootstrap.ts`, so neither appears here.
 *
 * **Read-only, and stateless.** There is no `POST`, no `PATCH`, no `DELETE`, and no report table behind any of
 * this. Each response is computed from the donations, expenses, budgets and salary records that already exist, so
 * a report cannot disagree with the rows it describes.
 *
 * **Every route requires `finance.view`.** That is a deliberate reading of the brief, which suggested a new
 * `financial_reports.view`: a new permission would start out held by nobody and have to be granted by hand to
 * every treasurer, and `finance.view` already means exactly this — permission to see the mosque's money as a
 * whole. It is held by the treasurer, the mosque admin and the platform admin.
 *
 * `report.view` would have been the other candidate and is the wrong one. It is also held by the secretary, whom
 * the permission registry walls off from all finance and all donations on purpose, and by the imam, who holds
 * `salary.viewOwn` precisely so they can see their own pay and not the payroll. Gating these routes on
 * `report.view` would hand both of them the whole mosque's finances through a side door — and one of these
 * endpoints reports on salaries.
 *
 * The mosque is never read from the request. Each method hands the authenticated user to the service, which takes
 * `mosqueId` from the token and puts it in every `where` it builds. The query DTO has no `mosqueId` field, so one
 * sent anyway is a 400 rather than something to be careful about.
 */
@ApiTags('Financial reports')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'No valid access token was sent.' })
@Controller('financial-reports')
export class FinancialReportsController {
  constructor(private readonly reports: FinancialReportsService) {}

  @Get('summary')
  @Permissions('finance.view')
  @ApiOperation({
    summary: 'The whole financial picture over a window.',
    description:
      'Requires `finance.view`. Donations received, expenses paid, salaries paid out, budget in force, what ' +
      'remains of it, and the net movement — in one response, from four aggregate queries run together so ' +
      'the figures describe a single moment. Only money that moved is counted: donations when `completed`, ' +
      'expenses and salaries when `paid`, budgets when `active`. `from` and `to` are both optional and both ' +
      'inclusive; omitting both reports on everything the mosque has ever recorded. `budget.remaining` is ' +
      '`null` when no active budget overlaps the window, and negative when the plan has been overspent. ' +
      'Every figure is an exact decimal string.',
  })
  @ApiOkResponse({ description: 'The summary.', type: FinancialSummaryEnvelopeDto })
  @ApiBadRequestResponse({
    description: 'A date is not `YYYY-MM-DD`, or `to` falls before `from`.',
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `finance.view`.' })
  async summary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FinancialReportQueryDto,
  ): Promise<FinancialSummaryEnvelopeDto> {
    return {
      success: true,
      message: 'Financial summary retrieved successfully',
      data: await this.reports.summary(user, query),
    };
  }

  @Get('donations')
  @Permissions('finance.view')
  @ApiOperation({
    summary: 'Donations received over a window.',
    description:
      'Requires `finance.view`. The `completed` total, then every status present and every payment method ' +
      'used. The status breakdown is unfiltered on purpose — a pending donation is a promise rather than ' +
      'money, so it is not in the headline, but it should not vanish either. The payment-method breakdown ' +
      'counts completed donations only, so its parts sum to the headline. The window matches on ' +
      '`donatedAt`, when the money was given, not when the row was written; because that is a full ' +
      'timestamp, the whole of the `to` day counts, including a gift recorded in the evening. No donor is ' +
      'named anywhere in this response.',
  })
  @ApiOkResponse({ description: 'The donation report.', type: DonationReportEnvelopeDto })
  @ApiBadRequestResponse({
    description: 'A date is not `YYYY-MM-DD`, or `to` falls before `from`.',
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `finance.view`.' })
  async donations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FinancialReportQueryDto,
  ): Promise<DonationReportEnvelopeDto> {
    return {
      success: true,
      message: 'Donation report retrieved successfully',
      data: await this.reports.donations(user, query),
    };
  }

  @Get('expenses')
  @Permissions('finance.view')
  @ApiOperation({
    summary: 'Expenses over a window.',
    description:
      'Requires `finance.view`. The `paid` total, then every status present and every category spent on. ' +
      '`pending` and `approved` appear in the status breakdown as money owed but not yet gone. The category ' +
      'breakdown counts paid expenses only, so its parts sum to the headline. The window matches on ' +
      '`expenseDate`, the day the expense is booked to, and both ends are inclusive.',
  })
  @ApiOkResponse({ description: 'The expense report.', type: ExpenseReportEnvelopeDto })
  @ApiBadRequestResponse({
    description: 'A date is not `YYYY-MM-DD`, or `to` falls before `from`.',
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `finance.view`.' })
  async expenses(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FinancialReportQueryDto,
  ): Promise<ExpenseReportEnvelopeDto> {
    return {
      success: true,
      message: 'Expense report retrieved successfully',
      data: await this.reports.expenses(user, query),
    };
  }

  @Get('budget')
  @Permissions('finance.view')
  @ApiOperation({
    summary: 'Budgets in force over a window, against what was spent.',
    description:
      'Requires `finance.view`. The `active` total, every status present, and a line per category putting ' +
      'the plan beside the paid expenses in that category. **A budget counts if its period overlaps the ' +
      'window, not if it falls inside it** — a quarterly budget governs each of its months, so a monthly ' +
      'report returns it. Categories are matched on the stored string, which is the only relationship ' +
      'between a budget and an expense; a category with spending and no budget appears with `planned` at ' +
      "zero and a negative `remaining`, which is unbudgeted expenditure. A line's `spent` counts expenses " +
      "only, since a salary record has no category — the summary's `remaining` is the figure that accounts " +
      'for payroll.',
  })
  @ApiOkResponse({ description: 'The budget report.', type: BudgetReportEnvelopeDto })
  @ApiBadRequestResponse({
    description: 'A date is not `YYYY-MM-DD`, or `to` falls before `from`.',
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `finance.view`.' })
  async budget(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FinancialReportQueryDto,
  ): Promise<BudgetReportEnvelopeDto> {
    return {
      success: true,
      message: 'Budget report retrieved successfully',
      data: await this.reports.budget(user, query),
    };
  }

  @Get('salary')
  @Permissions('finance.view')
  @ApiOperation({
    summary: 'Payroll paid out over a window.',
    description:
      'Requires `finance.view`. The `paid` total, every status present, and a total per pay period, newest ' +
      'first. **Not broken down by person** — anyone needing that can list `/api/v1/salaries`, where the ' +
      'view/viewOwn split applies and a caller holding only `salary.viewOwn` sees themselves. The window ' +
      'matches on `paymentDate`, when the money left the account, which is why a September window can show ' +
      "an August pay period: that is August's salary, paid in September. Both ends are inclusive.",
  })
  @ApiOkResponse({ description: 'The salary report.', type: SalaryReportEnvelopeDto })
  @ApiBadRequestResponse({
    description: 'A date is not `YYYY-MM-DD`, or `to` falls before `from`.',
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `finance.view`.' })
  async salary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FinancialReportQueryDto,
  ): Promise<SalaryReportEnvelopeDto> {
    return {
      success: true,
      message: 'Salary report retrieved successfully',
      data: await this.reports.salary(user, query),
    };
  }
}
