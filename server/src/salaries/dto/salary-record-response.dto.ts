import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SalaryStatus } from '@prisma/client';

import { fromDateOnly } from '../../common/utils/date-only';
import { fromMoney } from '../../common/utils/money';
import type { SelectedSalaryRecord } from '../types/salary.types';

/**
 * Just enough of the person being paid to name them.
 *
 * The reduction is the security boundary, not an economy. Whoever may read the payroll is thereby able to read a
 * row about every member of staff; handing over each one's email, phone number, role and account state along
 * with it would make `salary.view` a back door to the user directory. Their password hash and tokens are not
 * selectable through this module at all.
 */
export class SalaryEmployeeRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Ahmed Hasan' })
  fullName!: string;
}

/**
 * The salary record, as the API returns it.
 *
 * `amount` leaves as an exact decimal string rather than a float, for the reason `common/utils/money` gives: the
 * rule that money is `Decimal` and never `Float` only holds if the value never becomes a JavaScript number on
 * either side of the database either. `currency` travels beside it, because a bare `Decimal` has no unit.
 *
 * `payPeriod` and `paymentDate` are both returned and they are not interchangeable. The first is the month the
 * pay was *for*; the second is the day it moved. A client that showed only one of them would be unable to say
 * whether a September payment settled August or September.
 *
 * `paymentDate` is a calendar date, `YYYY-MM-DD`, not a timestamp — nobody records the minute a salary was
 * handed over, and serialising it as an instant would attach a time nobody observed and a zone nobody chose.
 *
 * `mosqueId` is dropped: a caller can only ever read their own mosque's records.
 *
 * `SalaryEmployeeRefDto` above is declared before this class because it has to be. `emitDecoratorMetadata`
 * writes an eager `design:type` reference for every decorated property whose type is a single class, so a
 * `user!: SalaryEmployeeRefDto` sitting above the class would read it inside its temporal dead zone and throw
 * the moment the module loads. The `type: () => X` thunk is for Swagger and does not save it.
 */
export class SalaryRecordResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    type: () => SalaryEmployeeRefDto,
    description:
      'Who is being paid. An existing user of the same mosque; never reassigned after creation.',
  })
  user!: SalaryEmployeeRefDto;

  @ApiProperty({
    example: '35000.00',
    description: 'A decimal string, never a float. Always paired with `currency`.',
  })
  amount!: string;

  @ApiProperty({
    example: 'BDT',
    description: 'ISO 4217, as stored on the row when it was written.',
  })
  currency!: string;

  @ApiProperty({
    example: '2026-08',
    description: 'The month this pay is *for*, `YYYY-MM`.',
  })
  payPeriod!: string;

  @ApiProperty({
    format: 'date',
    example: '2026-09-03',
    description: 'The day the money moved. A calendar date, not a timestamp.',
  })
  paymentDate!: string;

  @ApiProperty({
    enum: SalaryStatus,
    description: 'Only `paid` is counted by a financial report as money that left.',
  })
  status!: SalaryStatus;

  @ApiPropertyOptional({ nullable: true, description: 'Internal.' })
  notes!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  /** Builds the response from a row read with `SALARY_SELECT`. The only way one of these is made. */
  static from(record: SelectedSalaryRecord): SalaryRecordResponseDto {
    return {
      id: record.id,
      user: { id: record.user.id, fullName: record.user.fullName },
      amount: fromMoney(record.amount),
      currency: record.currency,
      payPeriod: record.payPeriod,
      paymentDate: fromDateOnly(record.paymentDate),
      status: record.status,
      notes: record.notes,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}

/** Paging figures that accompany a list response. */
export class SalaryRecordListMetaDto {
  @ApiProperty({ example: 1, description: '1-based, echoing what was asked for.' })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3, description: 'Rows matching the filter, ignoring paging.' })
  total!: number;

  @ApiProperty({ example: 1, description: 'Zero when nothing matches.' })
  totalPages!: number;
}

/** The envelope every salaries endpoint returns. `success` is always true — failures go to the filter. */
export class SalaryRecordEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Salary record retrieved successfully' })
  message!: string;

  @ApiProperty({ type: SalaryRecordResponseDto })
  data!: SalaryRecordResponseDto;
}

export class SalaryRecordListEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Salary records retrieved successfully' })
  message!: string;

  @ApiProperty({ type: [SalaryRecordResponseDto] })
  data!: SalaryRecordResponseDto[];

  @ApiProperty({ type: SalaryRecordListMetaDto })
  meta!: SalaryRecordListMetaDto;
}
