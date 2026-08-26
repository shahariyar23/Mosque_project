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
  ApiConflictResponse,
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
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseQueryDto } from './dto/expense-query.dto';
import {
  DeletedExpenseEnvelopeDto,
  ExpenseEnvelopeDto,
  ExpenseListEnvelopeDto,
} from './dto/expense-response.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

/**
 * Expenses: money the mosque has spent, or is about to.
 *
 * Every route lives under `/api/v1/expenses` — the global prefix and URI versioning are set in
 * `bootstrap.ts`, so neither appears here.
 *
 * **`DELETE` only removes a `pending` expense.** Past that, the record has a history and `PATCH` with
 * `{ "status": "cancelled" }` is the way to withdraw it. See the delete route for the reasoning.
 *
 * **No approval workflow runs behind any of this.** `status: approved` and `status: paid` record decisions
 * somebody has already made elsewhere; nothing here requests an approval, routes one, or notifies anyone.
 * Nothing draws down a budget or debits an account either — there is no such thing to draw down yet.
 *
 * Authorization is entirely in the route decorators: `expense.view` to read, `expense.manage` to change.
 * Unlike donations there is no own-records reading, because an expense has no owner to read it — `createdBy`
 * says who typed it, not whose money it was. Both permissions resolve through the same registry the guards
 * use; there is no role comparison in this module.
 *
 * The mosque is never read from the request, and neither is the author. Each method hands the authenticated
 * user to the service, which takes `mosqueId` and `createdById` from the token.
 */
@ApiTags('Expenses')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'No valid access token was sent.' })
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Post()
  @Permissions('expense.manage')
  @ApiOperation({
    summary: 'Record an expense.',
    description:
      'Requires `expense.manage`. The expense belongs to the caller’s mosque and is attributed to the ' +
      'caller, both taken from the access token — a `mosqueId` or `createdById` in the body is rejected. ' +
      '`category` is free text, because one mosque’s chart of accounts is not another’s. `amount` is a ' +
      'decimal string greater than zero, never a float; `currency` defaults to the mosque’s configured ' +
      'currency and is then stored on the row. `expenseDate` is a calendar date, the day the payment is ' +
      'booked to. Nothing is paid, no budget is reduced and no approval is requested.',
  })
  @ApiCreatedResponse({ description: 'The expense was recorded.', type: ExpenseEnvelopeDto })
  @ApiBadRequestResponse({
    description:
      'A field failed validation: an unknown property, an amount that is not a positive decimal string, ' +
      'a malformed currency, or an `expenseDate` that is not `YYYY-MM-DD`.',
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `expense.manage`.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExpenseDto,
  ): Promise<ExpenseEnvelopeDto> {
    return {
      success: true,
      message: 'Expense recorded successfully',
      data: await this.expenses.create(user, dto),
    };
  }

  @Get()
  @Permissions('expense.view')
  @ApiOperation({
    summary: 'List expenses.',
    description:
      'Requires `expense.view`. Paginated, newest first, capped at 100 rows per page. Scoped to the ' +
      'caller’s mosque: another mosque’s expenses are not in the result set at all. `search` matches ' +
      'category, description and reference case-insensitively — not notes. `status` filters on expense ' +
      'state, `category` is an exact match on the stored value, and `from`/`to` filter on `expenseDate` — ' +
      'the day the money was spent, not the day the row was written — with both ends inclusive and either ' +
      'usable alone. No total or balance is returned.',
  })
  @ApiOkResponse({ description: 'A page of expenses.', type: ExpenseListEnvelopeDto })
  @ApiBadRequestResponse({
    description:
      'A query parameter failed validation, including a `limit` above 100, a malformed date, or a `to` ' +
      'that falls before `from`.',
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `expense.view`.' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ExpenseQueryDto,
  ): Promise<ExpenseListEnvelopeDto> {
    const { rows, meta } = await this.expenses.findMany(user, query);

    return {
      success: true,
      message: 'Expenses retrieved successfully',
      data: rows,
      meta,
    };
  }

  @Get(':id')
  @Permissions('expense.view')
  @ApiOperation({
    summary: 'Read one expense.',
    description:
      'Requires `expense.view`. An expense belonging to another mosque answers 404 rather than 403 — a ' +
      '403 would confirm the record exists.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The expense.', type: ExpenseEnvelopeDto })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `expense.view`.' })
  @ApiNotFoundResponse({ description: 'No such expense in this mosque.' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ExpenseEnvelopeDto> {
    return {
      success: true,
      message: 'Expense retrieved successfully',
      data: await this.expenses.findOne(user, id),
    };
  }

  @Patch(':id')
  @Permissions('expense.manage')
  @ApiOperation({
    summary: 'Correct or withdraw an expense.',
    description:
      'Requires `expense.manage`. Every field is optional and keeps its three-way meaning — omit to leave ' +
      'the value, send `null` to clear a nullable one, send a value to set it. Only `reference` and ' +
      '`notes` are nullable; `null` for any other field is a 400. `createdBy` cannot be reassigned, ' +
      'because an audit trail anyone with edit rights can rewrite is not one. **This is how an approved ' +
      'or paid expense is withdrawn:** `{ "status": "cancelled" }` retires it without losing the record, ' +
      'and it is what `DELETE` refuses to do. Moving `status` to `paid` records that the money went out; ' +
      'it sends nothing and reduces no budget.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The updated expense.', type: ExpenseEnvelopeDto })
  @ApiBadRequestResponse({
    description: 'A field failed validation, or a required column was sent as `null`.',
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `expense.manage`.' })
  @ApiNotFoundResponse({ description: 'No such expense in this mosque.' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseDto,
  ): Promise<ExpenseEnvelopeDto> {
    return {
      success: true,
      message: 'Expense updated successfully',
      data: await this.expenses.update(user, id, dto),
    };
  }

  @Delete(':id')
  @Permissions('expense.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a pending expense.',
    description:
      'Requires `expense.manage`. **Only a `pending` expense can be deleted** — that is a draft nobody ' +
      'has acted on, and removing a mistyped one is housekeeping. Once an expense is `approved`, `paid` ' +
      'or `cancelled` it has a history, and this answers 409: send `PATCH /expenses/:id` with ' +
      '`{ "status": "cancelled" }` instead, which withdraws it and leaves the figure and the date where ' +
      'an auditor can still see them. Deleting twice is a 404.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The expense was deleted.', type: DeletedExpenseEnvelopeDto })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `expense.manage`.' })
  @ApiNotFoundResponse({
    description: 'No such expense in this mosque, or it was already deleted.',
  })
  @ApiConflictResponse({
    description:
      'The expense is approved, paid or cancelled, so it is a financial record rather than a draft. ' +
      'Cancel it with `PATCH` instead.',
  })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DeletedExpenseEnvelopeDto> {
    return {
      success: true,
      message: 'Expense deleted successfully',
      data: await this.expenses.remove(user, id),
    };
  }
}
