import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseStatus, PaymentMethod } from '@prisma/client';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { CURRENCY_MESSAGE, CURRENCY_PATTERN, normalizeCurrency } from '../../common/utils/currency';
import {
  POSITIVE_MONEY_MESSAGE,
  POSITIVE_MONEY_PATTERN,
  normalizeMoney,
} from '../../common/utils/money';
import { DATE_MESSAGE } from '../../donation-funds/dto/create-donation-fund.dto';
import { ISO_DATE_PATTERN } from '../../prayer-times/prayer-time.utils';

/**
 * Recording an expense: money the mosque has spent, or is about to.
 *
 * There is no `mosqueId` here, and that is the whole cross-mosque guarantee for the write path. The mosque
 * comes from the access token; because the global pipe runs with `forbidNonWhitelisted`, a request that sends
 * a `mosqueId` is rejected with a 400 rather than having it quietly dropped, so an attempt to write into
 * another mosque's books fails loudly instead of appearing to succeed.
 *
 * There is no `createdById` either. Who entered the payment is the authenticated caller, taken from the same
 * token — it is a fact about the request, not a field the request gets to assert.
 *
 * **`category` is free text, not an enum.** One mosque's chart of accounts is "Utilities / Salaries /
 * Maintenance"; another's separates the generator from the water pump and files the imam's stipend under
 * something else entirely. A fixed vocabulary here would be this codebase deciding how every mosque keeps
 * its books.
 *
 * **Nothing here pays anything or draws anything down.** No budget line is reduced, no account debited, no
 * approval requested. `status: paid` is somebody recording that the money went out.
 */
function normalizedMoney({ value }: TransformFnParams): unknown {
  return normalizeMoney(value as unknown);
}

function normalizedCurrency({ value }: TransformFnParams): unknown {
  return normalizeCurrency(value as unknown);
}

export class CreateExpenseDto {
  @ApiProperty({
    description:
      'What kind of spending this is, in the mosque’s own words. Free text rather than a fixed list — see ' +
      'the note on this DTO. Kept short so it stays groupable.',
    example: 'Utilities',
    minLength: 2,
    maxLength: 120,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  category!: string;

  @ApiProperty({
    description:
      'What the money was for. Required — an expense nobody can explain is not a record.',
    example: 'Electricity bill for August 2026',
    minLength: 2,
    maxLength: 500,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  description!: string;

  @ApiProperty({
    description:
      'The amount spent, as a decimal string. Must be greater than zero — an expense of nothing is a ' +
      'mistake, not an event. A refund is not expressible here and is not part of this release. Never ' +
      'sent or returned as a float.',
    example: '4500.00',
  })
  @Transform(normalizedMoney)
  @IsString()
  @Matches(POSITIVE_MONEY_PATTERN, { message: `amount ${POSITIVE_MONEY_MESSAGE}` })
  amount!: string;

  @ApiPropertyOptional({
    description:
      'ISO 4217 code. Defaults to the mosque’s configured currency, and is then stored on the row — ' +
      'changing the mosque’s default later does not restate this payment.',
    example: 'BDT',
    minLength: 3,
    maxLength: 3,
  })
  @IsOptional()
  @Transform(normalizedCurrency)
  @IsString()
  @Matches(CURRENCY_PATTERN, { message: `currency ${CURRENCY_MESSAGE}` })
  currency?: string;

  @ApiProperty({
    description: 'How the money went out. Recorded, not processed.',
    enum: PaymentMethod,
  })
  @IsEnum(PaymentMethod, {
    message: `paymentMethod must be one of: ${Object.values(PaymentMethod).join(', ')}`,
  })
  paymentMethod!: PaymentMethod;

  @ApiProperty({
    description:
      'The day the money was spent, as a calendar date. A day rather than an instant: an expense is ' +
      'booked to a date on a statement, and the minute a bill was paid is not something anyone reconciles.',
    example: '2026-08-21',
  })
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: `expenseDate ${DATE_MESSAGE}` })
  expenseDate!: string;

  @ApiPropertyOptional({
    description:
      'Defaults to `pending`. `approved` and `paid` record decisions somebody has already made — no ' +
      'approval workflow runs behind them in this release.',
    enum: ExpenseStatus,
    default: ExpenseStatus.pending,
  })
  @IsOptional()
  @IsEnum(ExpenseStatus, {
    message: `status must be one of: ${Object.values(ExpenseStatus).join(', ')}`,
  })
  status?: ExpenseStatus;

  @ApiPropertyOptional({
    description:
      'The mosque’s own handle on the payment: an invoice number, a cheque number, a bank reference. ' +
      'Not unique — petty cash often has none.',
    example: 'INV-88213',
    maxLength: 120,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string | null;

  @ApiPropertyOptional({
    description: 'Anything the mosque wants on the record. Internal.',
    maxLength: 2000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiPropertyOptional({
    description: 'Fund to pay this expense from. When paid, balance is checked and deducted.',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  fundId?: string | null;
}
