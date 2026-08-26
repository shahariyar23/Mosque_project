import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseStatus, PaymentMethod } from '@prisma/client';
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
 * Correcting an expense.
 *
 * Every field is optional and keeps its three-way meaning: absent leaves the column, an explicit `null`
 * clears a nullable one, a value sets it. Only `reference` and `notes` are nullable, so everything else uses
 * `@ValidateIf` rather than `@IsOptional()` — see below.
 *
 * `mosqueId` is absent, so moving an expense to another mosque is not expressible. `createdById` is absent
 * too: who entered the payment is a fact about how the record came to exist, and reassigning it after the
 * fact would make the audit trail a thing anyone with edit rights could rewrite.
 *
 * **`status: cancelled` is how a paid or approved expense is withdrawn.** `DELETE` only removes one that is
 * still `pending`; past that, the record stays and this is what retires it.
 *
 * **Nothing here pays anything or draws anything down.** Moving `status` to `paid` records that the money
 * went out; it does not send it, reduce a budget line, or debit an account. There is no such thing to debit
 * yet.
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
 * The required columns below need this rather than `@IsOptional()`, which skips every validator when the
 * value is null as well as when it is absent — letting `"amount": null` past validation and into the service,
 * where it would try to build a `Decimal` from nothing. These predicates let the null through to
 * `@IsString()` / `@Matches`, which reject it with a field-level 400 instead.
 */
const sentCategory = (dto: UpdateExpenseDto): boolean => dto.category !== undefined;
const sentDescription = (dto: UpdateExpenseDto): boolean => dto.description !== undefined;
const sentAmount = (dto: UpdateExpenseDto): boolean => dto.amount !== undefined;
const sentCurrency = (dto: UpdateExpenseDto): boolean => dto.currency !== undefined;
const sentPaymentMethod = (dto: UpdateExpenseDto): boolean => dto.paymentMethod !== undefined;
const sentExpenseDate = (dto: UpdateExpenseDto): boolean => dto.expenseDate !== undefined;
const sentStatus = (dto: UpdateExpenseDto): boolean => dto.status !== undefined;

export class UpdateExpenseDto {
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
    description: 'Required column — may be changed, may not be cleared.',
    example: 'Electricity bill for August 2026',
    minLength: 2,
    maxLength: 500,
  })
  @ValidateIf(sentDescription)
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description:
      'Required column — may be corrected, may not be cleared. Must be greater than zero.',
    example: '4500.00',
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

  @ApiPropertyOptional({ enum: PaymentMethod })
  @ValidateIf(sentPaymentMethod)
  @IsEnum(PaymentMethod, {
    message: `paymentMethod must be one of: ${Object.values(PaymentMethod).join(', ')}`,
  })
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Required column — may be corrected, may not be cleared.',
    example: '2026-08-21',
  })
  @ValidateIf(sentExpenseDate)
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: `expenseDate ${DATE_MESSAGE}` })
  expenseDate?: string;

  @ApiPropertyOptional({
    description:
      'How an expense that has been approved or paid is withdrawn: `cancelled` retires it without ' +
      'removing the record. No approval workflow runs behind any of these values.',
    enum: ExpenseStatus,
  })
  @ValidateIf(sentStatus)
  @IsEnum(ExpenseStatus, {
    message: `status must be one of: ${Object.values(ExpenseStatus).join(', ')}`,
  })
  status?: ExpenseStatus;

  @ApiPropertyOptional({ example: 'INV-88213', maxLength: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string | null;

  @ApiPropertyOptional({ maxLength: 2000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
