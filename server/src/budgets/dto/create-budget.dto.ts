import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BudgetStatus } from '@prisma/client';
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
 * Setting a budget: what the mosque intends to spend on something over a period.
 *
 * There is no `mosqueId` here, and that is the whole cross-mosque guarantee for the write path. The mosque
 * comes from the access token; because the global pipe runs with `forbidNonWhitelisted`, a request that sends a
 * `mosqueId` is rejected with a 400 rather than having it quietly dropped, so an attempt to write into another
 * mosque's books fails loudly instead of appearing to succeed.
 *
 * There is no `createdById` either. Who set the figure is the authenticated caller, taken from the same token.
 *
 * **`category` is free text, and it does not have to exist yet.** It is compared against `Expense.category` by
 * the reports, and the match is by convention rather than by constraint: budgeting for "Generator fuel" before
 * a single litre has been bought is the normal case, and requiring the category to already appear on an expense
 * would mean a mosque could only budget for what it had already spent.
 *
 * **Nothing here restricts spending.** Creating a budget does not cap an expense, block one, or require
 * approval for one. It records an intention, and the reports say afterwards whether it was kept.
 *
 * `periodStart` must not fall after `periodEnd`. That is checked in the service rather than here: a
 * class-validator constraint sees one property at a time, and the comparison needs both.
 */
function normalizedMoney({ value }: TransformFnParams): unknown {
  return normalizeMoney(value as unknown);
}

function normalizedCurrency({ value }: TransformFnParams): unknown {
  return normalizeCurrency(value as unknown);
}

export class CreateBudgetDto {
  @ApiProperty({
    description: 'What this budget line is called on the paper it came from.',
    example: 'Q3 Utilities',
    minLength: 2,
    maxLength: 160,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiProperty({
    description:
      'The spending category this budget governs, in the mosque’s own words. Compared against an ' +
      'expense’s `category` by the financial reports. Free text rather than a fixed list, and it need ' +
      'not already appear on any expense.',
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
      'The figure being budgeted, as a decimal string. Must be greater than zero — a budget of nothing ' +
      'is not a plan. Never sent or returned as a float.',
    example: '50000.00',
  })
  @Transform(normalizedMoney)
  @IsString()
  @Matches(POSITIVE_MONEY_PATTERN, { message: `amount ${POSITIVE_MONEY_MESSAGE}` })
  amount!: string;

  @ApiPropertyOptional({
    description:
      'ISO 4217 code. Defaults to the mosque’s configured currency, and is then stored on the row — ' +
      'changing the mosque’s default later does not restate what was budgeted.',
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
    description: 'First day the budget covers, inclusive. A calendar date, not an instant.',
    example: '2026-07-01',
  })
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: `periodStart ${DATE_MESSAGE}` })
  periodStart!: string;

  @ApiProperty({
    description:
      'Last day the budget covers, inclusive. Must not fall before `periodStart`; a single-day period ' +
      'is allowed.',
    example: '2026-09-30',
  })
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: `periodEnd ${DATE_MESSAGE}` })
  periodEnd!: string;

  @ApiPropertyOptional({
    description:
      'Defaults to `draft`. Only an `active` budget is counted when a report works out remaining budget.',
    enum: BudgetStatus,
    default: BudgetStatus.draft,
  })
  @IsOptional()
  @IsEnum(BudgetStatus, {
    message: `status must be one of: ${Object.values(BudgetStatus).join(', ')}`,
  })
  status?: BudgetStatus;

  @ApiPropertyOptional({
    description: 'Anything the mosque wants on the record — how the figure was arrived at. Internal.',
    maxLength: 2000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
