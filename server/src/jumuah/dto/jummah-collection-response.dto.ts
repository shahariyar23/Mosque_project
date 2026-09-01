import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JummahCollectionStatus, type Prisma } from '@prisma/client';
import { fromDateOnly } from '../../common/utils/date-only';
import { fromMoney } from '../../common/utils/money';

export class JummahCollectionFundRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Mosque Building Fund' })
  name!: string;

  @ApiProperty({ example: 'mosque-building-fund' })
  slug!: string;
}

export class JummahCollectionScheduleRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '13:15' })
  khutbahTime!: string;

  @ApiProperty({ example: '13:45' })
  prayerTime!: string;

  @ApiPropertyOptional({ example: 'Shaykh Abdullah', nullable: true })
  imam?: string | null;
}

export class JummahCollectionUserRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Kazi Mostak' })
  fullName!: string;

  @ApiProperty({ example: 'treasurer@noor.org' })
  email!: string;
}

export class JummahCollectionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '2026-09-04', description: 'The Friday date in YYYY-MM-DD format.' })
  date!: string;

  @ApiProperty({ example: '10000.00', description: 'Decimal monetary amount.' })
  amount!: string;

  @ApiProperty({ example: 'BDT' })
  currency!: string;

  @ApiProperty({ enum: JummahCollectionStatus, example: 'completed' })
  status!: JummahCollectionStatus;

  @ApiPropertyOptional({ example: 'BOX-01-MAIN-HALL', nullable: true })
  reference!: string | null;

  @ApiPropertyOptional({ example: 'Counted by committee members', nullable: true })
  notes!: string | null;

  @ApiProperty({ example: true })
  isPublic!: boolean;

  @ApiProperty({ type: JummahCollectionFundRefDto })
  fund!: JummahCollectionFundRefDto;

  @ApiPropertyOptional({ type: JummahCollectionScheduleRefDto, nullable: true })
  schedule!: JummahCollectionScheduleRefDto | null;

  @ApiProperty({ type: JummahCollectionUserRefDto })
  createdBy!: JummahCollectionUserRefDto;

  @ApiProperty({ example: '2026-09-04T08:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-09-04T08:00:00.000Z' })
  updatedAt!: string;

  static from(row: {
    id: string;
    date: Date;
    amount: Prisma.Decimal | { toFixed(digits?: number): string } | string | number;
    currency: string;
    status: JummahCollectionStatus;
    reference: string | null;
    notes: string | null;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
    fund: { id: string; name: string; slug: string };
    schedule?: { id: string; khutbahTime: string; prayerTime: string; imam: string | null } | null;
    createdBy: { id: string; fullName: string; email: string };
  }): JummahCollectionResponseDto {
    const formattedAmount =
      typeof row.amount === 'string'
        ? row.amount
        : typeof row.amount === 'object' && row.amount && 'toFixed' in row.amount
          ? (row.amount as any).toFixed(2)
          : fromMoney(row.amount as any) ?? String(row.amount);

    return {
      id: row.id,
      date: fromDateOnly(row.date),
      amount: formattedAmount,
      currency: row.currency,
      status: row.status,
      reference: row.reference,
      notes: row.notes,
      isPublic: row.isPublic,
      fund: {
        id: row.fund.id,
        name: row.fund.name,
        slug: row.fund.slug,
      },
      schedule: row.schedule
        ? {
            id: row.schedule.id,
            khutbahTime: row.schedule.khutbahTime,
            prayerTime: row.schedule.prayerTime,
            imam: row.schedule.imam,
          }
        : null,
      createdBy: {
        id: row.createdBy.id,
        fullName: row.createdBy.fullName,
        email: row.createdBy.email,
      },
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

export class JummahCollectionEnvelopeDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Jummah collection recorded successfully' })
  message!: string;

  @ApiProperty({ type: JummahCollectionResponseDto })
  data!: JummahCollectionResponseDto;
}

export class JummahCollectionListMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 45 })
  total!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}

export class JummahCollectionListEnvelopeDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Jummah collections retrieved successfully' })
  message!: string;

  @ApiProperty({ type: [JummahCollectionResponseDto] })
  data!: JummahCollectionResponseDto[];

  @ApiProperty({ type: JummahCollectionListMetaDto })
  meta!: JummahCollectionListMetaDto;
}
