import { ApiPropertyOptional } from '@nestjs/swagger';
import { SalaryStatus } from '@prisma/client';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

import { CURRENCY_MESSAGE, CURRENCY_PATTERN, normalizeCurrency } from '../../common/utils/currency';
import {
  POSITIVE_MONEY_MESSAGE,
  POSITIVE_MONEY_PATTERN,
  normalizeMoney,
} from '../../common/utils/money';
import { DATE_MESSAGE } from '../../donation-funds/dto/create-donation-fund.dto';
import { ISO_DATE_PATTERN } from '../../prayer-times/prayer-time.utils';
import { PAY_PERIOD_MESSAGE, PAY_PERIOD_PATTERN } from './create-salary-record.dto';

function normalizedMoney({ value }: TransformFnParams): unknown {
  return normalizeMoney(value as unknown);
}

function normalizedCurrency({ value }: TransformFnParams): unknown {
  return normalizeCurrency(value as unknown);
}

/**
 * `@ValidateIf` rather than `@IsOptional()` for every column the table requires.
 *
 * `@IsOptional()` skips the validators for `null` as well as for `undefined`, so `{ "amount": null }` would sail
 * past `@Matches` and reach Prisma as a null for a `NOT NULL` column — a 500 where a 400 belongs. These
 * predicates ask only whether the field was *sent*, so an explicit `null` is validated and rejected.
 *
 * `notes` is the one field genuinely nullable in the database, so it is the one field using `@IsOptional()`:
 * sending `null` there is how a note is cleared.
 */
const sentAmount = (dto: UpdateSalaryRecordDto): boolean => dto.amount !== undefined;
const sentCurrency = (dto: UpdateSalaryRecordDto): boolean => dto.currency !== undefined;
const sentPayPeriod = (dto: UpdateSalaryRecordDto): boolean => dto.payPeriod !== undefined;
const sentPaymentDate = (dto: UpdateSalaryRecordDto): boolean => dto.paymentDate !== undefined;
const sentStatus = (dto: UpdateSalaryRecordDto): boolean => dto.status !== undefined;

/**
 * Amending a salary record.
 *
 * **`userId` is deliberately absent, and that is the important line in this file.** Reassigning it would turn
 * one person's pay record into another's — the amount, the period and the paid status would stay put while the
 * name on them changed, and the payroll history of both people would be wrong with nothing in the row to show
 * it. A record raised against the wrong user is cancelled and a correct one is created.
 *
 * `mosqueId` is absent for the same reason it is absent from the create DTO: it comes from the token, never the
 * client, and `forbidNonWhitelisted` rejects a request that tries to send one.
 *
 * There is no DELETE route on this resource, so `status: cancelled` is how a record is retired. It stays
 * readable, and the financial reports stop counting it.
 */
export class UpdateSalaryRecordDto {
  @ApiPropertyOptional({
    description: 'A decimal string greater than zero. Never a float.',
    example: '36500.00',
  })
  @ValidateIf(sentAmount)
  @Transform(normalizedMoney)
  @IsString()
  @Matches(POSITIVE_MONEY_PATTERN, { message: `amount ${POSITIVE_MONEY_MESSAGE}` })
  amount?: string;

  @ApiPropertyOptional({
    description: 'ISO 4217 code.',
    example: 'BDT',
    minLength: 3,
    maxLength: 3,
  })
  @ValidateIf(sentCurrency)
  @Transform(normalizedCurrency)
  @IsString()
  @Matches(CURRENCY_PATTERN, { message: `currency ${CURRENCY_MESSAGE}` })
  currency?: string;

  @ApiPropertyOptional({
    description: 'The month this pay is for, as `YYYY-MM`.',
    example: '2026-08',
  })
  @ValidateIf(sentPayPeriod)
  @IsString()
  @Matches(PAY_PERIOD_PATTERN, { message: `payPeriod ${PAY_PERIOD_MESSAGE}` })
  payPeriod?: string;

  @ApiPropertyOptional({
    description: 'The day the money moved, as `YYYY-MM-DD`.',
    example: '2026-09-03',
  })
  @ValidateIf(sentPaymentDate)
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: `paymentDate ${DATE_MESSAGE}` })
  paymentDate?: string;

  @ApiPropertyOptional({
    description:
      'Moving to `paid` is what makes a financial report count this record; moving to `cancelled` is how a ' +
      'record is retired, since there is no DELETE route.',
    enum: SalaryStatus,
  })
  @ValidateIf(sentStatus)
  @IsEnum(SalaryStatus, {
    message: `status must be one of: ${Object.values(SalaryStatus).join(', ')}`,
  })
  status?: SalaryStatus;

  @ApiPropertyOptional({
    description: 'Send `null` to clear the note.',
    maxLength: 2000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiPropertyOptional({
    description: 'Fund to disburse salary from.',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  fundId?: string | null;
}
