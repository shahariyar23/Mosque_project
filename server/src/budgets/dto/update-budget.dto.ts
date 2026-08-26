import { ApiPropertyOptional } from '@nestjs/swagger';
import { BudgetStatus } from '@prisma/client';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

import { CURRENCY_MESSAGE, CURRENCY_PATTERN, normalizeCurrency } from '../../common/utils/currency';
import {
  POSITIVE_MONEY_MESSAGE,
  POSITIVE_MONEY_PATTERN,
  normalizeMoney,
} from '../../common/utils/money';
import { DATE_MESSAGE } from '../../donation-funds/dto/create-donation-fund.dto';
import { ISO_DATE_PATTERN } from '../../prayer-times/prayer-time.utils';

/**
 * Revising a budget.
 *
 * Every field is optional and keeps its three-way meaning: absent leaves the column, an explicit `null` clears
 * a nullable one, a value sets it. `notes` is the only nullable column, so everything else uses `@ValidateIf`
 * rather than `@IsOptional()` — see below.
 *
 * `mosqueId` is absent, so moving a budget to another mosque is not expressible. `createdById` is absent too:
 * who set the figure is a fact about how the record came to exist, and reassigning it after the fact would make
 * the audit trail a thing anyone with edit rights could rewrite.
 *
 * Either end of the period may be moved alone. Whichever is sent is compared against the *stored* value of the
 * other, which is why `periodStart <= periodEnd` is enforced in the service and not here.
 */
function normalizedMoney({ value }: TransformFnParams): unknown {
  return normalizeMoney(value as unknown);
}

function normalizedCurrency({ value }: TransformFnParams): unknown {
  return normalizeCurrency(value as unknown);
}

/**
 * "Validate this field whenever it was sent, including when it was sent as `null`."
 *
 * The required columns below need this rather than `@IsOptional()`, which skips every validator when the value
 * is null as well as when it is absent — letting `"amount": null` past validation and into the service, where
 * it would try to build a `Decimal` from nothing. These predicates let the null through to `@IsString()` /
 * `@Matches`, which reject it with a field-level 400 instead.
 */
const sentName = (dto: UpdateBudgetDto): boolean => dto.name !== undefined;
const sentCategory = (dto: UpdateBudgetDto): boolean => dto.category !== undefined;
const sentAmount = (dto: UpdateBudgetDto): boolean => dto.amount !== undefined;
const sentCurrency = (dto: UpdateBudgetDto): boolean => dto.currency !== undefined;
const sentPeriodStart = (dto: UpdateBudgetDto): boolean => dto.periodStart !== undefined;
const sentPeriodEnd = (dto: UpdateBudgetDto): boolean => dto.periodEnd !== undefined;
const sentStatus = (dto: UpdateBudgetDto): boolean => dto.status !== undefined;

export class UpdateBudgetDto {
  @ApiPropertyOptional({
    description: 'Required column — may be changed, may not be cleared.',
    example: 'Q3 Utilities',
    minLength: 2,
    maxLength: 160,
  })
  @ValidateIf(sentName)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({
    description: 'Required column — may be changed, may not be cleared.',
    example: 'Utilities',
    minLength: 2,
    maxLength: 120,
  })
  @ValidateIf(sentCategory)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  category?: string;

  @ApiPropertyOptional({
    description: 'Required column — may be revised, may not be cleared. Must be greater than zero.',
    example: '55000.00',
  })
  @ValidateIf(sentAmount)
  @Transform(normalizedMoney)
  @IsString()
  @Matches(POSITIVE_MONEY_PATTERN, { message: `amount ${POSITIVE_MONEY_MESSAGE}` })
  amount?: string;

  @ApiPropertyOptional({
    description: 'Required column — may be corrected, may not be cleared.',
    example: 'BDT',
  })
  @ValidateIf(sentCurrency)
  @Transform(normalizedCurrency)
  @IsString()
  @Matches(CURRENCY_PATTERN, { message: `currency ${CURRENCY_MESSAGE}` })
  currency?: string;

  @ApiPropertyOptional({
    description:
      'Required column — may be moved, may not be cleared. Checked against the stored `periodEnd` when ' +
      'that is not being moved in the same request.',
    example: '2026-07-01',
  })
  @ValidateIf(sentPeriodStart)
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: `periodStart ${DATE_MESSAGE}` })
  periodStart?: string;

  @ApiPropertyOptional({
    description: 'Required column — may be moved, may not be cleared.',
    example: '2026-09-30',
  })
  @ValidateIf(sentPeriodEnd)
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: `periodEnd ${DATE_MESSAGE}` })
  periodEnd?: string;

  @ApiPropertyOptional({
    description:
      'Moving a draft to `active` is what puts the figure in force. `cancelled` abandons the line ' +
      'without losing the record of what was once planned; `closed` settles a period that is over.',
    enum: BudgetStatus,
  })
  @ValidateIf(sentStatus)
  @IsEnum(BudgetStatus, {
    message: `status must be one of: ${Object.values(BudgetStatus).join(', ')}`,
  })
  status?: BudgetStatus;

  @ApiPropertyOptional({ maxLength: 2000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
