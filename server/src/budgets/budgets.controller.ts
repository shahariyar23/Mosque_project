import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
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
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { BudgetsService } from './budgets.service';
import { BudgetQueryDto } from './dto/budget-query.dto';
import {
  BudgetEnvelopeDto,
  BudgetListEnvelopeDto,
  DeletedBudgetEnvelopeDto,
} from './dto/budget-response.dto';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

/**
 * Budgets: what the mosque intends to spend on something, over a period.
 *
 * Every route lives under `/api/v1/budgets` — the global prefix and URI versioning are set in `bootstrap.ts`,
 * so neither appears here.
 *
 * **A budget records an intention, not money.** Nothing in this module caps an expense, blocks one, requires an
 * approval for one, or draws anything down. A category can be overspent freely; the reports say afterwards
 * whether the plan was kept, and that is the whole of the relationship between this table and the expenses
 * table.
 *
 * That is also why **`DELETE` here has no status rule**, unlike expenses, where anything past `pending` is a
 * financial record and can only be cancelled. Deleting a budget loses a plan; every expense booked while it
 * existed is still there and still adds to the same total. `cancelled` is offered for a mosque that would
 * rather keep the record of what it once planned, but it is not required.
 *
 * Authorization is entirely in the route decorators: `budget.view` to read, `budget.manage` to change. The read
 * grant is split from the write grant for the same reason `expense.view` is split from `expense.manage` —
 * someone may need to see what was planned for a category without being trusted to change the plan. There is no
 * own-records reading, because a budget has no owner: `createdBy` says who set the figure, not whose money it
 * is. Both permissions resolve through the same registry the guards use, and no role name is compared anywhere
 * in this module.
 *
 * The mosque is never read from the request, and neither is the author. Each method hands the authenticated
 * user to the service, which takes `mosqueId` and `createdById` from the token.
 */
@ApiTags('Budgets')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'No valid access token was sent.' })
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgets: BudgetsService) {}

  @Post()
  @Permissions('budget.manage')
  @ApiOperation({
    summary: 'Set a budget.',
    description:
      'Requires `budget.manage`. The budget belongs to the caller’s mosque and is attributed to the ' +
      'caller, both taken from the access token — a `mosqueId` or `createdById` in the body is rejected. ' +
      '`category` is free text and need not already appear on any expense: budgeting for something before ' +
      'a penny has been spent on it is the normal case. `amount` is a decimal string greater than zero, ' +
      'never a float; `currency` defaults to the mosque’s configured currency and is then stored on the ' +
      'row. `periodStart` and `periodEnd` are calendar dates, both inclusive, and `periodEnd` must not ' +
      'fall before `periodStart`. Status defaults to `draft`. **Overlapping budgets are allowed** — a ' +
      'draft may sit alongside the active line it is meant to replace, and a month and the year ' +
      'containing it may both be budgeted.',
  })
  @ApiCreatedResponse({ description: 'The budget was set.', type: BudgetEnvelopeDto })
  @ApiBadRequestResponse({
    description:
      'A field failed validation: an unknown property, an amount that is not a positive decimal string, ' +
      'a malformed currency, a date that is not `YYYY-MM-DD`, or a `periodEnd` before `periodStart`.',
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `budget.manage`.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBudgetDto,
  ): Promise<BudgetEnvelopeDto> {
    return {
      success: true,
      message: 'Budget created successfully',
      data: await this.budgets.create(user, dto),
    };
  }

  @Get()
  @Permissions('budget.view')
  @ApiOperation({
    summary: 'List budgets.',
    description:
      'Requires `budget.view`. Paginated, newest first, capped at 100 rows per page. Scoped to the ' +
      'caller’s mosque: another mosque’s budgets are not in the result set at all. `search` matches name ' +
      'and category case-insensitively — not notes. `status` filters on budget state and `category` is an ' +
      'exact match on the stored value. **`from` and `to` match budgets whose period overlaps the window, ' +
      'not budgets contained in it** — an annual budget covers August without either of its endpoints ' +
      'falling in August, so asking for August returns it. Either end is usable alone: `from` means ' +
      '"still running on or after this day", `to` means "had already started by this day". No spent or ' +
      'remaining figure is returned; `GET /financial-reports/budget` is what puts a plan beside what was ' +
      'actually spent against it.',
  })
  @ApiOkResponse({ description: 'A page of budgets.', type: BudgetListEnvelopeDto })
  @ApiBadRequestResponse({
    description:
      'A query parameter failed validation, including a `limit` above 100, a malformed date, or a `to` ' +
      'that falls before `from`.',
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `budget.view`.' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: BudgetQueryDto,
  ): Promise<BudgetListEnvelopeDto> {
    const { rows, meta } = await this.budgets.findMany(user, query);

    return {
      success: true,
      message: 'Budgets retrieved successfully',
      data: rows,
      meta,
    };
  }

  @Get(':id')
  @Permissions('budget.view')
  @ApiOperation({
    summary: 'Read one budget.',
    description:
      'Requires `budget.view`. A budget belonging to another mosque answers 404 rather than 403 — a 403 ' +
      'would confirm the record exists.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The budget.', type: BudgetEnvelopeDto })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `budget.view`.' })
  @ApiNotFoundResponse({ description: 'No such budget in this mosque.' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BudgetEnvelopeDto> {
    return {
      success: true,
      message: 'Budget retrieved successfully',
      data: await this.budgets.findOne(user, id),
    };
  }

  @Patch(':id')
  @Permissions('budget.manage')
  @ApiOperation({
    summary: 'Revise a budget.',
    description:
      'Requires `budget.manage`. Every field is optional and keeps its three-way meaning — omit to leave ' +
      'the value, send `null` to clear a nullable one, send a value to set it. `notes` is the only ' +
      'nullable field; `null` for any other is a 400. `createdBy` cannot be reassigned, because an audit ' +
      'trail anyone with edit rights can rewrite is not one. Either end of the period may be moved alone, ' +
      'and whichever is sent is checked against the stored value of the other. Moving `status` to ' +
      '`active` is what puts the figure in force — it is the only state a remaining-budget figure is ' +
      'computed from; `closed` settles a period that is over, and `cancelled` abandons the line without ' +
      'losing the record of what was planned.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The updated budget.', type: BudgetEnvelopeDto })
  @ApiBadRequestResponse({
    description:
      'A field failed validation, a required column was sent as `null`, or the resulting period would ' +
      'end before it starts.',
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `budget.manage`.' })
  @ApiNotFoundResponse({ description: 'No such budget in this mosque.' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBudgetDto,
  ): Promise<BudgetEnvelopeDto> {
    return {
      success: true,
      message: 'Budget updated successfully',
      data: await this.budgets.update(user, id, dto),
    };
  }

  @Delete(':id')
  @Permissions('budget.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a budget.',
    description:
      'Requires `budget.manage`. Any budget may be deleted, in any state — and that is the difference ' +
      'between this and `DELETE /expenses/:id`, which refuses anything past `pending`. An expense records ' +
      'money that moved, so removing one erases a fact an auditor would need; a budget records an ' +
      'intention, and every expense booked while it existed is untouched and still adds to the same ' +
      'total. Nothing is reconciled against a budget, so nothing breaks when one goes. A mosque that ' +
      'would rather keep the record of what it once planned can `PATCH` it to `cancelled` instead. ' +
      'Deleting twice is a 404.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The budget was deleted.', type: DeletedBudgetEnvelopeDto })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `budget.manage`.' })
  @ApiNotFoundResponse({ description: 'No such budget in this mosque, or it was already deleted.' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DeletedBudgetEnvelopeDto> {
    return {
      success: true,
      message: 'Budget deleted successfully',
      data: await this.budgets.remove(user, id),
    };
  }
}
