import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseStatus, PaymentMethod } from '@prisma/client';

import { fromDateOnly } from '../../common/utils/date-only';
import { fromMoney } from '../../common/utils/money';
import type { SelectedExpense } from '../types/expense.types';

/**
 * Just enough of the person who booked the expense to name them.
 *
 * Deliberately not the user record: their email, phone, address and role are readable at `/users/:id` by
 * someone entitled to read them, and an expense list is not that entitlement.
 */
export class ExpenseAuthorRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Ahmed Hasan' })
  fullName!: string;
}

/**
 * The expense, as the API returns it.
 *
 * `amount` leaves as an exact decimal string rather than a float, for the reason `common/utils/money` gives:
 * the rule that money is `Decimal` and never `Float` is only kept if the value never becomes a JavaScript
 * number on either side of the database either. `currency` travels beside it, because a bare `Decimal` has no
 * unit and a figure without one is not an amount.
 *
 * `expenseDate` is a calendar date, `YYYY-MM-DD`, and not a timestamp. It is the day the payment is booked
 * to; serialising it as an instant would attach a time nobody recorded and a zone nobody chose.
 *
 * `mosqueId` is dropped: a caller can only ever read their own mosque's expenses.
 *
 * There is no `budgetRemaining`, `monthToDate` or `runningTotal`. An expense reports itself. Totals are
 * derived from these rows when financial reports arrive in a later part.
 *
 * `ExpenseAuthorRefDto` above is declared before this class because it has to be. `emitDecoratorMetadata`
 * writes an eager `design:type` reference for every decorated property whose type is a single class, so a
 * `createdBy!: ExpenseAuthorRefDto` sitting above the class would read it inside its temporal dead zone and
 * throw the moment the module loads. The `type: () => X` thunk is for Swagger and does not save it.
 */
export class ExpenseResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Utilities' })
  category!: string;

  @ApiProperty({ example: 'Electricity bill for August 2026' })
  description!: string;

  @ApiProperty({
    example: '4500.00',
    description: 'A decimal string, never a float. Always paired with `currency`.',
  })
  amount!: string;

  @ApiProperty({
    example: 'BDT',
    description: 'ISO 4217, as stored on the row when it was written.',
  })
  currency!: string;

  @ApiProperty({ enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @ApiProperty({ enum: ExpenseStatus })
  status!: ExpenseStatus;

  @ApiProperty({
    format: 'date',
    example: '2026-08-21',
    description: 'The day the money was spent. A calendar date, not a timestamp.',
  })
  expenseDate!: string;

  @ApiPropertyOptional({ nullable: true, example: 'INV-88213' })
  reference!: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Internal.' })
  notes!: string | null;

  @ApiProperty({
    type: () => ExpenseAuthorRefDto,
    description: 'Who entered this expense. Set from the access token and never reassigned.',
  })
  createdBy!: ExpenseAuthorRefDto;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  /** Builds the response from a row read with `EXPENSE_SELECT`. The only way one of these is made. */
  static from(expense: SelectedExpense): ExpenseResponseDto {
    return {
      id: expense.id,
      category: expense.category,
      description: expense.description,
      amount: fromMoney(expense.amount),
      currency: expense.currency,
      paymentMethod: expense.paymentMethod,
      status: expense.status,
      expenseDate: fromDateOnly(expense.expenseDate),
      reference: expense.reference,
      notes: expense.notes,
      createdBy: { id: expense.createdBy.id, fullName: expense.createdBy.fullName },
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }
}

/**
 * What a delete returns.
 *
 * Enough to confirm what went, and no more: the row is gone, so this is the last chance anyone has to see
 * what it said. `amount` and `currency` are here for exactly that reason — "expense deleted" without the
 * figure is not a confirmation anybody can check.
 */
export class DeletedExpenseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Utilities' })
  category!: string;

  @ApiProperty({ example: 'Electricity bill for August 2026' })
  description!: string;

  @ApiProperty({ example: '4500.00' })
  amount!: string;

  @ApiProperty({ example: 'BDT' })
  currency!: string;
}

/** Paging figures that accompany a list response. */
export class ExpenseListMetaDto {
  @ApiProperty({ example: 1, description: '1-based, echoing what was asked for.' })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3, description: 'Rows matching the filter, ignoring paging.' })
  total!: number;

  @ApiProperty({ example: 1, description: 'Zero when nothing matches.' })
  totalPages!: number;
}

/** The envelope every expenses endpoint returns. `success` is always true — failures go to the filter. */
export class ExpenseEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Expense retrieved successfully' })
  message!: string;

  @ApiProperty({ type: ExpenseResponseDto })
  data!: ExpenseResponseDto;
}

export class ExpenseListEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Expenses retrieved successfully' })
  message!: string;

  @ApiProperty({ type: [ExpenseResponseDto] })
  data!: ExpenseResponseDto[];

  @ApiProperty({ type: ExpenseListMetaDto })
  meta!: ExpenseListMetaDto;
}

export class DeletedExpenseEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Expense deleted successfully' })
  message!: string;

  @ApiProperty({ type: DeletedExpenseDto })
  data!: DeletedExpenseDto;
}
