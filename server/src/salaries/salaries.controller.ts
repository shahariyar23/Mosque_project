import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AnyPermission, Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { CreateSalaryRecordDto } from './dto/create-salary-record.dto';
import { SalaryRecordQueryDto } from './dto/salary-record-query.dto';
import {
  SalaryRecordEnvelopeDto,
  SalaryRecordListEnvelopeDto,
} from './dto/salary-record-response.dto';
import { UpdateSalaryRecordDto } from './dto/update-salary-record.dto';
import { SalariesService } from './salaries.service';

/**
 * Salary records: what a member of staff is paid, for which month.
 *
 * Every route lives under `/api/v1/salaries` — the global prefix and URI versioning are set in `bootstrap.ts`, so
 * neither appears here.
 *
 * **There is no imam resource and no staff resource, on purpose.** A salary record points at an existing user, so
 * an imam is an ordinary user with rows in this table, and so is a caretaker or a teacher. The user must belong
 * to the caller's own mosque, which is checked against the database on every write — the foreign key can only say
 * "some user exists", not "a user of mine".
 *
 * **There is no DELETE.** A row here says a person was paid, and losing that is not a correction; `PATCH` to
 * `cancelled` retires a record while leaving it readable, and the financial reports stop counting it.
 *
 * Authorization: reading uses the same view/viewOwn split as donations — `salary.view` reads the mosque's
 * payroll, `salary.viewOwn` reads only your own record, and the service turns the difference into a `userId` in
 * the query rather than filtering rows afterwards. That split is what lets an imam open their own record without
 * seeing anybody else's pay. Writing requires `salary.manage`, which nobody holds "for their own record only": an
 * imam cannot raise their own salary. All three permissions resolve through the same registry the guards use, and
 * no role name is compared anywhere in this module.
 *
 * **No payroll runs behind any of this.** Nothing computes tax, deducts anything, or moves money. `status: paid`
 * records a decision taken elsewhere.
 *
 * The mosque is never read from the request. Each method hands the authenticated user to the service, which takes
 * `mosqueId` from the token.
 */
@ApiTags('Salaries')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'No valid access token was sent.' })
@Controller('salaries')
export class SalariesController {
  constructor(private readonly salaries: SalariesService) {}

  @Post()
  @Permissions('salary.manage')
  @ApiOperation({
    summary: 'Record a salary.',
    description:
      'Requires `salary.manage`. The record belongs to the caller’s mosque, taken from the access token — a ' +
      '`mosqueId` in the body is rejected. `userId` must be an existing, undeleted user **of that same ' +
      'mosque**, checked against the database; anything else is a 400. There is no separate imam or staff ' +
      'record, so an imam is simply a user named here. `amount` is a decimal string greater than zero, ' +
      'never a float; `currency` defaults to the mosque’s configured currency and is then stored on the ' +
      'row. `payPeriod` is the month the pay is *for*, as `YYYY-MM`, and `paymentDate` is the day the money ' +
      'moved — August’s salary paid on 3 September is `{"payPeriod":"2026-08","paymentDate":"2026-09-03"}`. ' +
      'Status defaults to `pending`, which is money owed; only `paid` is counted by a financial report as ' +
      'money that left. **Nothing here computes tax, deducts anything, or transfers money.**',
  })
  @ApiCreatedResponse({
    description: 'The salary record was created.',
    type: SalaryRecordEnvelopeDto,
  })
  @ApiBadRequestResponse({
    description:
      'A field failed validation — an unknown property, an amount that is not a positive decimal string, a ' +
      'malformed currency, a `payPeriod` that is not `YYYY-MM`, a `paymentDate` that is not `YYYY-MM-DD`, ' +
      'or a `userId` that does not match a user of this mosque.',
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `salary.manage`.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSalaryRecordDto,
  ): Promise<SalaryRecordEnvelopeDto> {
    return {
      success: true,
      message: 'Salary record created successfully',
      data: await this.salaries.create(user, dto),
    };
  }

  @Get()
  @AnyPermission('salary.view', 'salary.viewOwn')
  @ApiOperation({
    summary: 'List salary records.',
    description:
      'Requires `salary.view` or `salary.viewOwn`. Paginated, newest first, capped at 100 rows per page. ' +
      'Scoped to the caller’s mosque: another mosque’s records are not in the result set at all. **A caller ' +
      'holding only `salary.viewOwn` sees only their own records**, whatever `userId` they send — the ' +
      'restriction is applied in the query, not by filtering afterwards. `status` and `payPeriod` are exact ' +
      'matches. `from` and `to` filter on `paymentDate`, when the money moved, which is not the same as the ' +
      'month the pay was for: August’s salary paid on 3 September falls inside a September window. Each row ' +
      'names the person paid with an id and a name only — reading the payroll is not a way to read the user ' +
      'directory.',
  })
  @ApiOkResponse({ description: 'A page of salary records.', type: SalaryRecordListEnvelopeDto })
  @ApiBadRequestResponse({
    description:
      'A query parameter failed validation, including a `limit` above 100, a malformed date or ' +
      '`payPeriod`, or a `to` that falls before `from`.',
  })
  @ApiForbiddenResponse({
    description: 'Authenticated, but with neither `salary.view` nor `salary.viewOwn`.',
  })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SalaryRecordQueryDto,
  ): Promise<SalaryRecordListEnvelopeDto> {
    const { rows, meta } = await this.salaries.findMany(user, query);

    return {
      success: true,
      message: 'Salary records retrieved successfully',
      data: rows,
      meta,
    };
  }

  @Get(':id')
  @AnyPermission('salary.view', 'salary.viewOwn')
  @ApiOperation({
    summary: 'Read one salary record.',
    description:
      'Requires `salary.view` or `salary.viewOwn`. A record belonging to another mosque answers 404 rather ' +
      'than 403, and so does a colleague’s record for a caller limited to their own — a 403 would confirm ' +
      'the record exists, which for payroll is itself worth withholding.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The salary record.', type: SalaryRecordEnvelopeDto })
  @ApiForbiddenResponse({
    description: 'Authenticated, but with neither `salary.view` nor `salary.viewOwn`.',
  })
  @ApiNotFoundResponse({ description: 'No such salary record this caller may read.' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SalaryRecordEnvelopeDto> {
    return {
      success: true,
      message: 'Salary record retrieved successfully',
      data: await this.salaries.findOne(user, id),
    };
  }

  @Patch(':id')
  @Permissions('salary.manage')
  @ApiOperation({
    summary: 'Amend a salary record.',
    description:
      'Requires `salary.manage` — `salary.viewOwn` is not enough, so an imam cannot raise their own pay. ' +
      'Every field is optional and keeps its three-way meaning: omit to leave the value, send `null` to ' +
      'clear a nullable one, send a value to set it. `notes` is the only nullable field; `null` for any ' +
      'other is a 400. **`userId` cannot be changed** — reassigning it would move an amount, a period and a ' +
      '`paid` flag from one person to another with nothing in the row to show it, so a record raised ' +
      'against the wrong person is cancelled and a correct one created. Moving `status` to `paid` is what ' +
      'makes a financial report count the record; `cancelled` retires it, and since there is no DELETE ' +
      'route that is how a record is withdrawn.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The updated salary record.', type: SalaryRecordEnvelopeDto })
  @ApiBadRequestResponse({
    description: 'A field failed validation, or a required column was sent as `null`.',
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `salary.manage`.' })
  @ApiNotFoundResponse({ description: 'No such salary record in this mosque.' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSalaryRecordDto,
  ): Promise<SalaryRecordEnvelopeDto> {
    return {
      success: true,
      message: 'Salary record updated successfully',
      data: await this.salaries.update(user, id, dto),
    };
  }
}
