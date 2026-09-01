import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { BookingStatus, ServiceCategory } from '@prisma/client';
import { fromDateOnly } from '../../common/utils/date-only';

export { BookingStatus, ServiceCategory };

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateBookingDto {
  @ApiProperty({ description: 'Service UUID this booking request is for.', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  serviceId!: string;

  @ApiPropertyOptional({ description: 'Optional User ID if requester is a registered user/member.', example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsOptional()
  @IsUUID()
  userId?: string | null;

  @ApiProperty({ description: 'Full name of requester / family contact.', example: 'Habibur Rahman' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  requesterName!: string;

  @ApiProperty({ description: 'Phone number for SMS/calls.', example: '+880 1719-604182' })
  @IsString()
  @MaxLength(32)
  requesterPhone!: string;

  @ApiPropertyOptional({ description: 'Contact email address.', example: 'habibur@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  requesterEmail?: string | null;

  @ApiPropertyOptional({ description: 'Member code if on the member register.', example: 'MEM-018' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  memberId?: string | null;

  @ApiProperty({ description: 'Scheduled service date (YYYY-MM-DD).', example: '2026-08-29' })
  @Matches(ISO_DATE_PATTERN, { message: 'scheduledDate must be in YYYY-MM-DD format' })
  scheduledDate!: string;

  @ApiPropertyOptional({ description: 'Scheduled time in 24-hour HH:mm format.', example: '13:45' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'scheduledTime must be in HH:mm 24-hour format' })
  scheduledTime?: string | null;

  @ApiProperty({ description: 'Location/hall/room for the booking.', example: 'Main prayer hall' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  location!: string;

  @ApiPropertyOptional({ description: 'Expected attendees or party size.', default: 0, example: 45 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50000)
  partySize?: number = 0;

  @ApiPropertyOptional({ description: 'Agreed fee / suggested contribution in BDT.', default: 0, example: 5000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fee?: number;

  @ApiPropertyOptional({ description: 'Staff member or imam assigned to this booking.', example: 'Imam Abdul Karim' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  assignedTo?: string | null;

  @ApiPropertyOptional({ description: 'UUID of assigned staff/imam.', example: '123e4567-e89b-12d3-a456-426614174002' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string | null;

  @ApiPropertyOptional({ description: 'Additional notes or requirements.', example: 'Late father, Marhum Siddiqur Rahman.' })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({ enum: BookingStatus, default: BookingStatus.pending, example: BookingStatus.pending })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus = BookingStatus.pending;
}

export class UpdateBookingDto {
  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsOptional()
  @IsUUID()
  userId?: string | null;

  @ApiPropertyOptional({ example: 'Habibur Rahman' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  requesterName?: string;

  @ApiPropertyOptional({ example: '+880 1719-604182' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  requesterPhone?: string;

  @ApiPropertyOptional({ example: 'habibur@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  requesterEmail?: string | null;

  @ApiPropertyOptional({ example: 'MEM-018' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  memberId?: string | null;

  @ApiPropertyOptional({ example: '2026-08-29' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'scheduledDate must be in YYYY-MM-DD format' })
  scheduledDate?: string;

  @ApiPropertyOptional({ example: '13:45' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'scheduledTime must be in HH:mm 24-hour format' })
  scheduledTime?: string | null;

  @ApiPropertyOptional({ example: 'Main prayer hall' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50000)
  partySize?: number;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fee?: number;

  @ApiPropertyOptional({ example: 'Imam Abdul Karim' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  assignedTo?: string | null;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174002' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string | null;

  @ApiPropertyOptional({ example: 'Late father, Marhum Siddiqur Rahman.' })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}

export class UpdateBookingStatusDto {
  @ApiProperty({ enum: BookingStatus, example: BookingStatus.confirmed })
  @IsEnum(BookingStatus)
  status!: BookingStatus;

  @ApiPropertyOptional({ description: 'Reason for status update or cancellation note.' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ListBookingsQueryDto {
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

  @ApiPropertyOptional({ description: 'Search term across requester name, phone, email, notes, location, or service name.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by specific service UUID.' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({ enum: BookingStatus, description: 'Filter by booking status.' })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ enum: ServiceCategory, description: 'Filter by service category.' })
  @IsOptional()
  @IsEnum(ServiceCategory)
  category?: ServiceCategory;

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

export class BookingStatsDto {
  @ApiProperty({ description: 'Total booking requests on record.', example: 26 })
  total!: number;

  @ApiProperty({ description: 'Bookings awaiting a decision.', example: 5 })
  pending!: number;

  @ApiProperty({ description: 'Confirmed bookings in the schedule.', example: 10 })
  confirmed!: number;

  @ApiProperty({ description: 'Bookings scheduled in the next 7 days.', example: 10 })
  thisWeek!: number;
}

export class BookingDto {
  @ApiProperty() id!: string;
  @ApiProperty() serviceId!: string;
  @ApiProperty({ example: 'Janazah (Funeral) Service' }) serviceName!: string;
  @ApiProperty({ enum: ServiceCategory }) category!: ServiceCategory;
  @ApiProperty({ example: 'Habibur Rahman' }) requesterName!: string;
  @ApiProperty({ example: '+880 1719-604182' }) requesterPhone!: string;
  @ApiProperty({ example: 'habibur@example.com' }) requesterEmail!: string;
  @ApiPropertyOptional({ nullable: true, example: 'MEM-018' }) memberId!: string | null;
  @ApiProperty({ enum: BookingStatus }) status!: BookingStatus;
  @ApiProperty({ example: '2026-08-29' }) scheduledDate!: string;
  @ApiPropertyOptional({ nullable: true, example: '13:45' }) scheduledTime!: string | null;
  @ApiProperty({ example: '2026-08-19' }) submittedAt!: string;
  @ApiProperty({ example: 'Main prayer hall' }) location!: string;
  @ApiProperty({ example: 0 }) partySize!: number;
  @ApiProperty({ example: 0 }) fee!: number;
  @ApiPropertyOptional({ nullable: true, example: 'Imam Abdul Karim' }) assignedTo!: string | null;
  @ApiPropertyOptional({ nullable: true }) assignedToId!: string | null;
  @ApiProperty({ example: 'Late father, Marhum Siddiqur Rahman.' }) notes!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;

  static from(row: {
    id: string;
    serviceId: string;
    service?: { name: string; category: ServiceCategory } | null;
    requesterName: string;
    requesterPhone: string;
    requesterEmail: string | null;
    memberId: string | null;
    status: BookingStatus;
    scheduledDate: Date;
    scheduledTime: string | null;
    submittedAt: Date;
    location: string;
    partySize: number;
    fee: { toNumber?(): number; toString(): string } | number;
    assignedTo: string | null;
    assignedToId: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): BookingDto {
    const feeNum =
      typeof row.fee === 'number'
        ? row.fee
        : typeof (row.fee as any)?.toNumber === 'function'
          ? (row.fee as any).toNumber()
          : parseFloat(row.fee.toString());

    return {
      id: row.id,
      serviceId: row.serviceId,
      serviceName: row.service?.name ?? '',
      category: row.service?.category ?? ServiceCategory.welfare,
      requesterName: row.requesterName,
      requesterPhone: row.requesterPhone,
      requesterEmail: row.requesterEmail ?? '',
      memberId: row.memberId ?? null,
      status: row.status,
      scheduledDate: fromDateOnly(row.scheduledDate),
      scheduledTime: row.scheduledTime ?? null,
      submittedAt: fromDateOnly(row.submittedAt),
      location: row.location,
      partySize: row.partySize,
      fee: feeNum,
      assignedTo: row.assignedTo ?? null,
      assignedToId: row.assignedToId ?? null,
      notes: row.notes ?? '',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

export class PaginatedBookingsDto {
  @ApiProperty({ type: [BookingDto] })
  rows!: BookingDto[];

  @ApiProperty({ example: 26 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  pageSize!: number;

  @ApiProperty({ example: 3 })
  pageCount!: number;
}

