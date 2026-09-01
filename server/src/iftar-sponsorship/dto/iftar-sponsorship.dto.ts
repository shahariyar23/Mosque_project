import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IftarSponsorshipStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

import { fromDateOnly } from '../../common/utils/date-only';
import { ISO_DATE_PATTERN } from '../../prayer-times/prayer-time.utils';
import { MAX_HIJRI_YEAR, MIN_HIJRI_YEAR } from '../../ramadan/dto/ramadan.dto';

export { IftarSponsorshipStatus };

export class CreateIftarSponsorshipDto {
  @ApiProperty({
    description: 'Hijri year this sponsorship applies to (1400–1500).',
    minimum: MIN_HIJRI_YEAR,
    maximum: MAX_HIJRI_YEAR,
    example: 1447,
  })
  @Type(() => Number)
  @IsInt()
  @Min(MIN_HIJRI_YEAR)
  @Max(MAX_HIJRI_YEAR)
  year!: number;

  @ApiProperty({ description: 'The Gregorian calendar day for the Iftar meal (YYYY-MM-DD).', example: '2026-02-18' })
  @Matches(ISO_DATE_PATTERN, { message: 'date must be a calendar date in YYYY-MM-DD format' })
  date!: string;

  @ApiPropertyOptional({ description: 'Optional ID of the matching Ramadan schedule day.', example: 'b3f5c9e2-8951-40be-a002-3c22b9b2c34a' })
  @IsOptional()
  @IsUUID()
  ramadanScheduleId?: string | null;

  @ApiPropertyOptional({ description: 'Optional User/Member ID if the sponsor is an enrolled mosque member.', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsOptional()
  @IsUUID()
  userId?: string | null;

  @ApiProperty({ description: 'Name of the sponsor (member or external benefactor).', example: 'Abdul Karim' })
  @IsString()
  sponsorName!: string;

  @ApiPropertyOptional({ description: 'Contact phone number of the sponsor.', example: '+8801711000000' })
  @IsOptional()
  @IsString()
  sponsorPhone?: string | null;

  @ApiPropertyOptional({ description: 'Email address of the sponsor.', example: 'abdul.karim@example.com' })
  @IsOptional()
  @IsString()
  sponsorEmail?: string | null;

  @ApiPropertyOptional({ description: 'Target number of people / meal servings (e.g. 150).', example: 150 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  numberOfServings?: number | null;

  @ApiPropertyOptional({ description: 'Estimated or pledged cost contribution.', example: 25000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  estimatedCost?: number | null;

  @ApiPropertyOptional({ description: 'Currency code (default: BDT).', example: 'BDT' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Menu or catering arrangement details.', example: 'Khichuri, Dates, Fruit, Mutton curry, Rooh Afza' })
  @IsOptional()
  @IsString()
  menuDetails?: string | null;

  @ApiPropertyOptional({ description: 'Special instructions or notes.' })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({ enum: IftarSponsorshipStatus, default: IftarSponsorshipStatus.pending })
  @IsOptional()
  @IsEnum(IftarSponsorshipStatus)
  status?: IftarSponsorshipStatus;
}

export class UpdateIftarSponsorshipDto {
  @ApiPropertyOptional({ minimum: MIN_HIJRI_YEAR, maximum: MAX_HIJRI_YEAR, example: 1447 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_HIJRI_YEAR)
  @Max(MAX_HIJRI_YEAR)
  year?: number;

  @ApiPropertyOptional({ example: '2026-02-18' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'date must be a calendar date in YYYY-MM-DD format' })
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ramadanScheduleId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string | null;

  @ApiPropertyOptional({ example: 'Abdul Karim' })
  @IsOptional()
  @IsString()
  sponsorName?: string;

  @ApiPropertyOptional({ example: '+8801711000000' })
  @IsOptional()
  @IsString()
  sponsorPhone?: string | null;

  @ApiPropertyOptional({ example: 'abdul.karim@example.com' })
  @IsOptional()
  @IsString()
  sponsorEmail?: string | null;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  numberOfServings?: number | null;

  @ApiPropertyOptional({ example: 25000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  estimatedCost?: number | null;

  @ApiPropertyOptional({ example: 'BDT' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'Khichuri, Dates, Fruit, Mutton curry, Rooh Afza' })
  @IsOptional()
  @IsString()
  menuDetails?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({ enum: IftarSponsorshipStatus })
  @IsOptional()
  @IsEnum(IftarSponsorshipStatus)
  status?: IftarSponsorshipStatus;
}

export class ListIftarSponsorshipQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by Hijri year (1400–1500).',
    minimum: MIN_HIJRI_YEAR,
    maximum: MAX_HIJRI_YEAR,
    example: 1447,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_HIJRI_YEAR)
  @Max(MAX_HIJRI_YEAR)
  year?: number;

  @ApiPropertyOptional({ enum: IftarSponsorshipStatus })
  @IsOptional()
  @IsEnum(IftarSponsorshipStatus)
  status?: IftarSponsorshipStatus;

  @ApiPropertyOptional({ description: 'Filter by specific Gregorian date (YYYY-MM-DD).' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'date must be in YYYY-MM-DD format' })
  date?: string;
}

export class IftarSponsorshipDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 1447 }) year!: number;
  @ApiProperty({ example: '2026-02-18' }) date!: string;

  @ApiPropertyOptional({ nullable: true }) ramadanScheduleId!: string | null;
  @ApiPropertyOptional({ nullable: true }) userId!: string | null;

  @ApiProperty({ example: 'Abdul Karim' }) sponsorName!: string;
  @ApiPropertyOptional({ nullable: true }) sponsorPhone!: string | null;
  @ApiPropertyOptional({ nullable: true }) sponsorEmail!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 150 }) numberOfServings!: number | null;
  @ApiPropertyOptional({ nullable: true, example: '25000.00' }) estimatedCost!: string | null;
  @ApiProperty({ example: 'BDT' }) currency!: string;

  @ApiPropertyOptional({ nullable: true }) menuDetails!: string | null;
  @ApiPropertyOptional({ nullable: true }) notes!: string | null;

  @ApiProperty({ enum: IftarSponsorshipStatus }) status!: IftarSponsorshipStatus;

  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;

  static from(row: {
    id: string;
    year: number;
    date: Date;
    ramadanScheduleId: string | null;
    userId: string | null;
    sponsorName: string;
    sponsorPhone: string | null;
    sponsorEmail: string | null;
    numberOfServings: number | null;
    estimatedCost: { toString(): string } | null;
    currency: string;
    menuDetails: string | null;
    notes: string | null;
    status: IftarSponsorshipStatus;
    createdAt: Date;
    updatedAt: Date;
  }): IftarSponsorshipDto {
    return {
      id: row.id,
      year: row.year,
      date: fromDateOnly(row.date),
      ramadanScheduleId: row.ramadanScheduleId,
      userId: row.userId,
      sponsorName: row.sponsorName,
      sponsorPhone: row.sponsorPhone,
      sponsorEmail: row.sponsorEmail,
      numberOfServings: row.numberOfServings,
      estimatedCost: row.estimatedCost ? row.estimatedCost.toString() : null,
      currency: row.currency,
      menuDetails: row.menuDetails,
      notes: row.notes,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

