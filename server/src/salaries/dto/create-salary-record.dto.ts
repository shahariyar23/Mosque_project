import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SalaryStatus } from '@prisma/client';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

import { CURRENCY_MESSAGE, CURRENCY_PATTERN, normalizeCurrency } from '../../common/utils/currency';
import {
  POSITIVE_MONEY_MESSAGE,
  POSITIVE_MONEY_PATTERN,
  normalizeMoney,
} from '../../common/utils/money';
import { DATE_MESSAGE } from '../../donation-funds/dto/create-donation-fund.dto';
import { ISO_DATE_PATTERN } from '../../prayer-times/prayer-time.utils';

/**
 * Recording what a member of staff is paid.
 *
 * **`userId` is an existing user of the same mosque, and there is no staff or imam record anywhere.** An imam
 * is an ordinary user who has rows in this table; so is a caretaker, so is a teacher. That the user belongs to
 * the caller's mosque is checked in the service against the database, because a foreign key can only say "some
 * user" and not "a user of mine" — without that check, a treasurer could name a user id belonging to another
 * mosque and quietly attach a salary row to a stranger.
 *
 * There is no `mosqueId` here, and that is the cross-mosque guarantee for the write path. The mosque comes from
 * the access token; because the global pipe runs with `forbidNonWhitelisted`, a request that sends a `mosqueId`
 * is rejected with a 400 rather than having it quietly dropped.
 *
 * **`payPeriod` and `paymentDate` are two different facts and both are needed.** `payPeriod` is the month the
 * pay is *for*, as `YYYY-MM`; `paymentDate` is the day the money actually moved. August's salary paid on the
 * 3rd of September is `{ payPeriod: "2026-08", paymentDate: "2026-09-03" }`, and collapsing them would make a
 * report either misdate the work or misdate the payment.
 *
 * **No payroll runs behind this.** Nothing computes tax, deducts anything, works out gross from net, or pays
 * anybody. `status: paid` records a decision somebody made elsewhere, and a report counts it; it does not
 * transfer money.
 */
function normalizedMoney({ value }: TransformFnParams): unknown {
  return normalizeMoney(value as unknown);
}

function normalizedCurrency({ value }: TransformFnParams): unknown {
  return normalizeCurrency(value as unknown);
}

/**
 * `YYYY-MM`, with the month between 01 and 12.
 *
 * A fixed shape rather than free text, so that "2026-08" and "August 2026" cannot both exist in the column and
 * be counted as two separate periods by a report that groups on it.
 */
export const PAY_PERIOD_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])$/;

export const PAY_PERIOD_MESSAGE = 'must be a month in YYYY-MM form, e.g. 2026-08';

export class CreateSalaryRecordDto {
  @ApiProperty({
    description:
      'The user being paid. Must be an existing, active user of the caller’s own mosque — there is no ' +
      'separate staff or imam record, so an imam is simply a user with rows in this table.',
    format: 'uuid',
  })
  @IsUUID()
  userId!: string;

  @ApiProperty({
    description:
      'What is being paid, as a decimal string greater than zero. Never sent or returned as a float. ' +
      'This is the figure agreed; nothing here deducts tax or computes it from anything else.',
    example: '35000.00',
  })
  @Transform(normalizedMoney)
  @IsString()
  @Matches(POSITIVE_MONEY_PATTERN, { message: `amount ${POSITIVE_MONEY_MESSAGE}` })
  amount!: string;

  @ApiPropertyOptional({
    description:
      'ISO 4217 code. Defaults to the mosque’s configured currency and is then stored on the row, so ' +
      'changing the mosque’s default later does not restate what was already paid.',
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
    description:
      'The month this pay is *for*, as `YYYY-MM`. Distinct from `paymentDate`: August’s salary is ' +
      'routinely paid in September, and a report that grouped by the payment day would file it under the ' +
      'wrong month.',
    example: '2026-08',
  })
  @IsString()
  @Matches(PAY_PERIOD_PATTERN, { message: `payPeriod ${PAY_PERIOD_MESSAGE}` })
  payPeriod!: string;

  @ApiProperty({
    description:
      'The day the money moved, or is due to. A calendar date, not an instant — nobody records the ' +
      'minute a salary was handed over.',
    example: '2026-09-03',
  })
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: `paymentDate ${DATE_MESSAGE}` })
  paymentDate!: string;

  @ApiPropertyOptional({
    description:
      'Defaults to `pending`, which is money owed rather than money gone. Only `paid` is counted by a ' +
      'financial report as money that left.',
    enum: SalaryStatus,
    default: SalaryStatus.pending,
  })
  @IsOptional()
  @IsEnum(SalaryStatus, {
    message: `status must be one of: ${Object.values(SalaryStatus).join(', ')}`,
  })
  status?: SalaryStatus;

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
    description: 'Fund to disburse salary from. When paid, balance is checked and deducted.',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  fundId?: string | null;
}
