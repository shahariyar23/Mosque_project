import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { EventCategory, EventStatus } from '@prisma/client';
import { fromDateOnly } from '../../common/utils/date-only';

export { EventCategory, EventStatus };

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateEventDto {
  @ApiProperty({ description: 'Event title / programme name.', example: "Youth Islamic Seminar" })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({
    description: 'URL-safe slug. Auto-derived from title if omitted.',
    example: 'youth-islamic-seminar',
  })
  @IsOptional()
  @IsString()
  @Matches(SLUG_PATTERN, { message: 'slug must contain only lower-case letters, numbers and hyphens' })
  slug?: string;

  @ApiProperty({ enum: EventCategory, description: 'Event category.', example: EventCategory.education })
  @IsEnum(EventCategory)
  category!: EventCategory;

  @ApiPropertyOptional({ enum: EventStatus, default: EventStatus.upcoming, example: EventStatus.upcoming })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus = EventStatus.upcoming;

  @ApiProperty({ description: 'Calendar date in YYYY-MM-DD format.', example: '2026-08-25' })
  @Matches(ISO_DATE_PATTERN, { message: 'date must be in YYYY-MM-DD format' })
  date!: string;

  @ApiProperty({ description: 'Start time in 24-hour HH:mm format.', example: '19:30' })
  @Matches(TIME_PATTERN, { message: 'startTime must be in HH:mm 24-hour format' })
  startTime!: string;

  @ApiPropertyOptional({ description: 'End time in 24-hour HH:mm format.', example: '21:00' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'endTime must be in HH:mm 24-hour format' })
  endTime?: string | null;

  @ApiPropertyOptional({
    description: 'Human-friendly relative time announcement (e.g. "After Maghrib").',
    example: 'After Maghrib',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timeLabel?: string | null;

  @ApiProperty({ description: 'Physical venue, hall, or room.', example: 'Community Hall' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  location!: string;

  @ApiPropertyOptional({ description: 'Speaker, instructor, or organizer name.', example: 'Dr. Abdullah Rahman' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  speaker?: string | null;

  @ApiProperty({ description: 'Detailed event description.', example: 'An evening for youth on faith and education.' })
  @IsString()
  @MinLength(2)
  description!: string;

  @ApiPropertyOptional({ description: 'Maximum participant capacity.', default: 100, example: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50000)
  capacity?: number = 100;

  @ApiPropertyOptional({ description: 'Whether registration is mandatory to attend.', default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  registrationRequired?: boolean = false;

  @ApiPropertyOptional({ description: 'Required monetary contribution / fee (if any).', example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  contribution?: number | null;

  @ApiPropertyOptional({ description: 'Banner image or cover photo URL.', example: 'https://images.example.com/banner.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string | null;

  @ApiPropertyOptional({ description: 'Whether event is publicly published.', default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublished?: boolean = true;
}

export class UpdateEventDto {
  @ApiPropertyOptional({ example: "Youth Islamic Seminar (Updated)" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'youth-islamic-seminar' })
  @IsOptional()
  @IsString()
  @Matches(SLUG_PATTERN, { message: 'slug must contain only lower-case letters, numbers and hyphens' })
  slug?: string;

  @ApiPropertyOptional({ enum: EventCategory })
  @IsOptional()
  @IsEnum(EventCategory)
  category?: EventCategory;

  @ApiPropertyOptional({ enum: EventStatus })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({ example: '2026-08-25' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'date must be in YYYY-MM-DD format' })
  date?: string;

  @ApiPropertyOptional({ example: '19:30' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'startTime must be in HH:mm 24-hour format' })
  startTime?: string;

  @ApiPropertyOptional({ example: '21:00' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'endTime must be in HH:mm 24-hour format' })
  endTime?: string | null;

  @ApiPropertyOptional({ example: 'After Maghrib' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timeLabel?: string | null;

  @ApiPropertyOptional({ example: 'Community Hall' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: 'Dr. Abdullah Rahman' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  speaker?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  description?: string;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50000)
  capacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  registrationRequired?: boolean;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  contribution?: number | null;

  @ApiPropertyOptional({ example: 'https://images.example.com/banner.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublished?: boolean;
}

export class ListEventsQueryDto {
  @ApiPropertyOptional({ description: '1-based page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Page size (1–100)', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;

  @ApiPropertyOptional({ description: 'Alias for pageSize (1–100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search term across title, speaker, location, or description.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: EventCategory, description: 'Filter by category.' })
  @IsOptional()
  @IsEnum(EventCategory)
  category?: EventCategory;

  @ApiPropertyOptional({ enum: EventStatus, description: 'Filter by status.' })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({
    description: 'Filter preset: upcoming, this_month, completed, past, or all.',
    example: 'upcoming',
  })
  @IsOptional()
  @IsString()
  timeframe?: string;

  @ApiPropertyOptional({ description: 'Start date boundary (YYYY-MM-DD).' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'from must be in YYYY-MM-DD format' })
  from?: string;

  @ApiPropertyOptional({ description: 'End date boundary (YYYY-MM-DD).' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'to must be in YYYY-MM-DD format' })
  to?: string;

  @ApiPropertyOptional({ description: 'If true, returns all matching rows without pagination' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  all?: boolean;
}

export class EventDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'youth-islamic-seminar' }) slug!: string;
  @ApiProperty({ example: 'Youth Islamic Seminar' }) title!: string;
  @ApiProperty({ enum: EventCategory }) category!: EventCategory;
  @ApiProperty({ enum: EventStatus }) status!: EventStatus;
  @ApiProperty({ example: '2026-08-25' }) date!: string;
  @ApiProperty({ example: '19:30' }) startTime!: string;
  @ApiPropertyOptional({ nullable: true, example: '21:00' }) endTime!: string | null;
  @ApiPropertyOptional({ nullable: true, example: 'After Maghrib' }) timeLabel!: string | null;
  @ApiProperty({ example: 'Community Hall' }) location!: string;
  @ApiPropertyOptional({ nullable: true, example: 'Dr. Abdullah Rahman' }) speaker!: string | null;
  @ApiProperty() description!: string;
  @ApiProperty({ example: 200 }) capacity!: number;
  @ApiProperty({ description: 'Number of confirmed registrants + guests.', example: 128 }) registered!: number;
  @ApiProperty({ example: true }) registrationRequired!: boolean;
  @ApiPropertyOptional({ nullable: true, example: 0 }) contribution!: number | null;
  @ApiPropertyOptional({ nullable: true }) imageUrl!: string | null;
  @ApiProperty({ example: true }) isPublished!: boolean;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;

  static from(
    row: {
      id: string;
      slug: string;
      title: string;
      category: EventCategory;
      status: EventStatus;
      date: Date;
      startTime: string;
      endTime: string | null;
      timeLabel: string | null;
      location: string;
      speaker: string | null;
      description: string;
      capacity: number;
      registrationRequired: boolean;
      contribution: { toNumber?(): number; toString(): string } | null;
      imageUrl: string | null;
      isPublished: boolean;
      createdAt: Date;
      updatedAt: Date;
    },
    registeredCount = 0,
  ): EventDto {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category,
      status: row.status,
      date: fromDateOnly(row.date),
      startTime: row.startTime,
      endTime: row.endTime,
      timeLabel: row.timeLabel,
      location: row.location,
      speaker: row.speaker,
      description: row.description,
      capacity: row.capacity,
      registered: registeredCount,
      registrationRequired: row.registrationRequired,
      contribution: row.contribution
        ? typeof row.contribution.toNumber === 'function'
          ? row.contribution.toNumber()
          : parseFloat(row.contribution.toString())
        : null,
      imageUrl: row.imageUrl,
      isPublished: row.isPublished,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

export class PaginatedEventsDto {
  @ApiProperty({ type: [EventDto] })
  rows!: EventDto[];

  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  pageSize!: number;

  @ApiProperty({ example: 2 })
  pageCount!: number;
}

