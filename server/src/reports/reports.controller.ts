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
import { FinancialReportQueryDto } from '../financial-reports/dto/financial-report-query.dto';
import {
  DonationReportEnvelopeDto,
  ExpenseReportEnvelopeDto,
  FinancialSummaryEnvelopeDto,
} from '../financial-reports/dto/financial-report-response.dto';
import {
  EventReportEnvelopeDto,
  ReportSummaryEnvelopeDto,
  UserReportEnvelopeDto,
  VolunteerReportEnvelopeDto,
} from './dto/report-response.dto';
import { ReportsService } from './reports.service';

/**
 * Reports: read-only summaries of records other modules own.
 *
 * Every route lives under `/api/v1/reports`, is a `GET`, and writes nothing. There is no route here that creates,
 * edits or deletes anything, and the service holds no `create` or `update` call — "read-only" is a property of the
 * code, not a promise in a comment.
 *
 * **Every route requires two permissions, and that is the point of this controller.** `report.view` gets a caller
 * to the reports; the second grant is the subject. `report.view` on its own is *not* an entitlement to the mosque's
 * money or its member directory, and treating it as one would be a privilege escalation: the shipped role map gives
 * an `imam` `report.view` and gives them neither `finance.view` nor `user.view` nor `volunteer.view`. An imam is
 * meant to be able to see prayer and content reporting without being able to read the payroll.
 *
 * `PermissionsGuard` reads handler metadata with `getAllAndOverride`, so a handler-level `@Permissions` **replaces**
 * the class-level one rather than adding to it. That is why every route below names `report.view` again alongside
 * its subject grant. Forgetting it would not fail loudly — the route would simply stop requiring `report.view`,
 * which is exactly the kind of silent widening worth being explicit about.
 *
 * **`?from=YYYY-MM-DD&to=YYYY-MM-DD` is accepted everywhere, both optional, both inclusive.** The query DTO is
 * `FinancialReportQueryDto`, reused rather than reimplemented: it is already exactly this contract, already
 * validates the format, and already refuses a mosque id. The cost is its name showing up in the Swagger schema for
 * `/reports/users`, which is a cosmetic wart next to a second class that has to be kept in step with the first.
 *
 * **The mosque is never a parameter.** It comes from the access token on every route, so there is no shape of
 * request that reports on another mosque.
 */
@ApiTags('Reports')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'No valid access token was sent.' })
// The floor, so a route added later is born requiring at least this rather than born open. Each handler restates it
// beside its subject grant, because handler metadata overrides rather than merges.
@Permissions('report.view')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Everything the caller is entitled to see, in one response.',
    description:
      'Requires `report.view`. **Each block is filtered by permission and omitted blocks are never queried:** ' +
      '`users` needs `user.view`, `volunteers` needs `volunteer.view`, `finance` needs `finance.view`. A caller ' +
      'holding only `report.view` gets the range and an empty events block, which is the correct answer — this ' +
      'endpoint is a convenience, not a way round the per-subject grants. Headcounts ignore the window; `joined` ' +
      'figures respect it.',
  })
  @ApiOkResponse({ description: 'The summary.', type: ReportSummaryEnvelopeDto })
  @ApiBadRequestResponse({
    description: 'A malformed date, or a `to` that falls before `from`.',
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `report.view`.' })
  async summary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FinancialReportQueryDto,
  ): Promise<ReportSummaryEnvelopeDto> {
    return {
      success: true,
      message: 'Report summary retrieved successfully',
      data: await this.reports.summary(user, query),
    };
  }

  @Get('users')
  @Permissions('report.view', 'user.view')
  @ApiOperation({
    summary: 'Headcount, activity and role breakdown.',
    description:
      'Requires `report.view` **and** `user.view`. Soft-deleted users are excluded from every figure. `total`, ' +
      '`active`, `volunteers` and `byRole` are headcounts as of now and ignore the window; `joined` counts users ' +
      'created inside it. No names, emails or phone numbers are returned — this is a report, and a report that ' +
      'listed the directory would be a directory.',
  })
  @ApiOkResponse({ description: 'The people report.', type: UserReportEnvelopeDto })
  @ApiBadRequestResponse({ description: 'A malformed date, or a `to` that falls before `from`.' })
  @ApiForbiddenResponse({
    description: 'Authenticated, but without both `report.view` and `user.view`.',
  })
  async users(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FinancialReportQueryDto,
  ): Promise<UserReportEnvelopeDto> {
    return {
      success: true,
      message: 'User report retrieved successfully',
      data: await this.reports.users(user, query),
    };
  }

  @Get('donations')
  @Permissions('report.view', 'donation.view')
  @ApiOperation({
    summary: 'Donations received, by status and by how the money arrived.',
    description:
      'Requires `report.view` **and** `donation.view`. Produced by `FinancialReportsService`, so the figures are ' +
      'identical to `/financial-reports/donations`; the difference is the grant. That route is gated on ' +
      '`finance.view`, which is held only by people already trusted with budgets and payroll, so a fundraising ' +
      'volunteer could not read donation figures without being handed the payroll grant as well. The headline ' +
      'total counts `completed` donations only; the status breakdown shows what was left out.',
  })
  @ApiOkResponse({ description: 'The donation report.', type: DonationReportEnvelopeDto })
  @ApiBadRequestResponse({ description: 'A malformed date, or a `to` that falls before `from`.' })
  @ApiForbiddenResponse({
    description: 'Authenticated, but without both `report.view` and `donation.view`.',
  })
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
  @Permissions('report.view', 'expense.view')
  @ApiOperation({
    summary: 'Money spent, by status and by category.',
    description:
      'Requires `report.view` **and** `expense.view` — the read grant, which the registry keeps separate from ' +
      '`expense.manage` precisely so someone can see what was spent without being trusted to record it. Produced ' +
      'by `FinancialReportsService`. The headline total counts `paid` expenses only.',
  })
  @ApiOkResponse({ description: 'The expense report.', type: ExpenseReportEnvelopeDto })
  @ApiBadRequestResponse({ description: 'A malformed date, or a `to` that falls before `from`.' })
  @ApiForbiddenResponse({
    description: 'Authenticated, but without both `report.view` and `expense.view`.',
  })
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

  @Get('events')
  @Permissions('report.view', 'event.view')
  @ApiOperation({
    summary: 'Events over the window — present, but not yet tracked.',
    description:
      'Requires `report.view` **and** `event.view`. **There is no events table in this schema yet**, so `tracked` ' +
      'is `false` and every figure is `null`. Zeroes are not returned in their place: `0` asserts "this mosque ran ' +
      'no events", which is a claim about the mosque, when the truth is a claim about the software. The route is ' +
      'documented and guarded now so that a client written against it keeps working unchanged when the model ' +
      'lands and `tracked` becomes `true`.',
  })
  @ApiOkResponse({ description: 'The event report.', type: EventReportEnvelopeDto })
  @ApiBadRequestResponse({ description: 'A malformed date, or a `to` that falls before `from`.' })
  @ApiForbiddenResponse({
    description: 'Authenticated, but without both `report.view` and `event.view`.',
  })
  events(@Query() query: FinancialReportQueryDto): EventReportEnvelopeDto {
    return {
      success: true,
      message: 'Event report retrieved successfully',
      data: this.reports.events(query),
    };
  }

  @Get('volunteers')
  @Permissions('report.view', 'volunteer.view')
  @ApiOperation({
    summary: 'Volunteers, by state.',
    description:
      'Requires `report.view` **and** `volunteer.view`. A volunteer record carries no mosque of its own — it ' +
      'hangs off a user, and the user carries the mosque — so the scope goes through that relation, which also ' +
      'means a volunteer whose user has been deleted drops out. `total` and `byStatus` are counts as of now; ' +
      '`joined` respects the window.',
  })
  @ApiOkResponse({ description: 'The volunteer report.', type: VolunteerReportEnvelopeDto })
  @ApiBadRequestResponse({ description: 'A malformed date, or a `to` that falls before `from`.' })
  @ApiForbiddenResponse({
    description: 'Authenticated, but without both `report.view` and `volunteer.view`.',
  })
  async volunteers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FinancialReportQueryDto,
  ): Promise<VolunteerReportEnvelopeDto> {
    return {
      success: true,
      message: 'Volunteer report retrieved successfully',
      data: await this.reports.volunteers(user, query),
    };
  }

  @Get('finance')
  @Permissions('report.view', 'finance.view')
  @ApiOperation({
    summary: 'Donations, expenses, salaries, budget and net balance in one response.',
    description:
      'Requires `report.view` **and** `finance.view`. Produced by `FinancialReportsService` — four aggregates in ' +
      'one transaction, so the figures describe a single moment rather than four. Totals count money that ' +
      'actually moved: `completed` donations, `paid` expenses, `paid` salaries and `active` budgets. `netBalance` ' +
      'goes negative when more went out than came in, which is a fact worth reporting rather than clamping.',
  })
  @ApiOkResponse({ description: 'The financial summary.', type: FinancialSummaryEnvelopeDto })
  @ApiBadRequestResponse({ description: 'A malformed date, or a `to` that falls before `from`.' })
  @ApiForbiddenResponse({
    description: 'Authenticated, but without both `report.view` and `finance.view`.',
  })
  async finance(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FinancialReportQueryDto,
  ): Promise<FinancialSummaryEnvelopeDto> {
    return {
      success: true,
      message: 'Financial report retrieved successfully',
      data: await this.reports.finance(user, query),
    };
  }
}
