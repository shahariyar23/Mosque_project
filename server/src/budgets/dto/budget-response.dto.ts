import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BudgetStatus } from '@prisma/client';

import { fromDateOnly } from '../../common/utils/date-only';
import { fromMoney } from '../../common/utils/money';
import type { SelectedBudget } from '../types/budget.types';

/**
 * Just enough of the person who set the budget to name them.
 *
 * Deliberately not the user record: their email, phone, address and role are readable at `/users/:id` by
 * someone entitled to read them, and a budget list is not that entitlement.
 */
export class BudgetAuthorRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Ahmed Hasan' })
  fullName!: string;
}

/**
 * The budget, as the API returns it.
 *
 * `amount` leaves as an exact decimal string rather than a float, for the reason `common/utils/money` gives:
 * the rule that money is `Decimal` and never `Float` is only kept if the value never becomes a JavaScript
 * number on either side of the database either. `currency` travels beside it, because a bare `Decimal` has no
 * unit and a figure without one is not an amount.
 *
 * `periodStart` and `periodEnd` are calendar dates, `YYYY-MM-DD`, and not timestamps. A budget covers days;
 * serialising them as instants would attach times nobody recorded and a zone nobody chose.
 *
 * `mosqueId` is dropped: a caller can only ever read their own mosque's budgets.
 *
 * There is no `spent` and no `remaining`. Those are the difference between this row and the expenses booked
 * against its category, which this module does not read — `GET /financial-reports/budget` puts the two side by
 * side, and a figure published here would be one nothing kept current.
 *
 * `BudgetAuthorRefDto` above is declared before this class because it has to be. `emitDecoratorMetadata`
 * writes an eager `design:type` reference for every decorated property whose type is a single class, so a
 * `createdBy!: BudgetAuthorRefDto` sitting above the class would read it inside its temporal dead zone and
 * throw the moment the module loads. The `type: () => X` thunk is for Swagger and does not save it.
 */
export class BudgetResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Q3 Utilities' })
  name!: string;

  @ApiProperty({ example: 'Utilities' })
  category!: string;

  @ApiProperty({
    example: '50000.00',
    description: 'A decimal string, never a float. Always paired with `currency`.',
  })
  amount!: string;

  @ApiProperty({
    example: 'BDT',
    description: 'ISO 4217, as stored on the row when it was written.',
  })
  currency!: string;

  @ApiProperty({
    format: 'date',
    example: '2026-07-01',
    description: 'First day covered, inclusive. A calendar date, not a timestamp.',
  })
  periodStart!: string;

  @ApiProperty({
    format: 'date',
    example: '2026-09-30',
    description: 'Last day covered, inclusive.',
  })
  periodEnd!: string;

  @ApiProperty({ enum: BudgetStatus })
  status!: BudgetStatus;

  @ApiPropertyOptional({ nullable: true, description: 'Internal.' })
  notes!: string | null;

  @ApiProperty({
    type: () => BudgetAuthorRefDto,
    description: 'Who set this budget. Taken from the access token and never reassigned.',
  })
  createdBy!: BudgetAuthorRefDto;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  /** Builds the response from a row read with `BUDGET_SELECT`. The only way one of these is made. */
  static from(budget: SelectedBudget): BudgetResponseDto {
    return {
      id: budget.id,
      name: budget.name,
      category: budget.category,
      amount: fromMoney(budget.amount),
      currency: budget.currency,
      periodStart: fromDateOnly(budget.periodStart),
      periodEnd: fromDateOnly(budget.periodEnd),
      status: budget.status,
      notes: budget.notes,
      createdBy: { id: budget.createdBy.id, fullName: budget.createdBy.fullName },
      createdAt: budget.createdAt.toISOString(),
      updatedAt: budget.updatedAt.toISOString(),
    };
  }
}

/**
 * What a delete returns.
 *
 * Enough to confirm what went, and no more: the row is gone, so this is the last chance anyone has to see what
 * it said. `amount` and `currency` are here for exactly that reason — "budget deleted" without the figure is
 * not a confirmation anybody can check.
 */
export class DeletedBudgetDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Q3 Utilities' })
  name!: string;

  @ApiProperty({ example: 'Utilities' })
  category!: string;

  @ApiProperty({ example: '50000.00' })
  amount!: string;

  @ApiProperty({ example: 'BDT' })
  currency!: string;
}

/** Paging figures that accompany a list response. */
export class BudgetListMetaDto {
  @ApiProperty({ example: 1, description: '1-based, echoing what was asked for.' })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3, description: 'Rows matching the filter, ignoring paging.' })
  total!: number;

  @ApiProperty({ example: 1, description: 'Zero when nothing matches.' })
  totalPages!: number;
}

/** The envelope every budgets endpoint returns. `success` is always true — failures go to the filter. */
export class BudgetEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Budget retrieved successfully' })
  message!: string;

  @ApiProperty({ type: BudgetResponseDto })
  data!: BudgetResponseDto;
}

export class BudgetListEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Budgets retrieved successfully' })
  message!: string;

  @ApiProperty({ type: [BudgetResponseDto] })
  data!: BudgetResponseDto[];

  @ApiProperty({ type: BudgetListMetaDto })
  meta!: BudgetListMetaDto;
}

export class DeletedBudgetEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Budget deleted successfully' })
  message!: string;

  @ApiProperty({ type: DeletedBudgetDto })
  data!: DeletedBudgetDto;
}
