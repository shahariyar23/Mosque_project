import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
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
import { ServiceCategory, ServiceStatus } from '@prisma/client';

export { ServiceCategory, ServiceStatus };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateServiceDto {
  @ApiProperty({ description: 'Service name / title.', example: 'Janazah (Funeral) Service' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({
    description: 'URL-safe slug. Auto-derived from name if omitted.',
    example: 'janazah-funeral-service',
  })
  @IsOptional()
  @IsString()
  @Matches(SLUG_PATTERN, { message: 'slug must contain only lower-case letters, numbers and hyphens' })
  slug?: string;

  @ApiProperty({ enum: ServiceCategory, description: 'Service category.', example: ServiceCategory.funeral })
  @IsEnum(ServiceCategory)
  category!: ServiceCategory;

  @ApiPropertyOptional({ enum: ServiceStatus, default: ServiceStatus.active, example: ServiceStatus.active })
  @IsOptional()
  @IsEnum(ServiceStatus)
  status?: ServiceStatus = ServiceStatus.active;

  @ApiProperty({ description: 'One-line summary for cards and tables.', example: 'Full funeral arrangement — ghusl, kafan, janazah prayer and burial coordination.' })
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  summary!: string;

  @ApiProperty({ description: 'Detailed service description.', example: 'The mosque arranges the whole janazah from the moment a family calls.' })
  @IsString()
  @MinLength(2)
  description!: string;

  @ApiProperty({ description: 'Coordinator or department name.', example: 'Imam Abdul Karim' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  coordinator!: string;

  @ApiPropertyOptional({ description: 'Optional User ID of the coordinator.', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID()
  coordinatorId?: string | null;

  @ApiProperty({ description: 'Contact phone number for enquiries.', example: '+880 1713-668190' })
  @IsString()
  @MaxLength(32)
  contactPhone!: string;

  @ApiProperty({ description: 'Service location or venue within the mosque.', example: 'Main prayer hall & mortuary room' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  location!: string;

  @ApiProperty({ description: 'Service availability schedule.', example: '24 hours, every day' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  availability!: string;

  @ApiPropertyOptional({ description: 'Suggested contribution / fee in BDT. 0 indicates free of charge.', default: 0, example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fee?: number = 0;

  @ApiPropertyOptional({ description: 'Whether booking is required for this service.', default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  requiresBooking?: boolean = true;

  @ApiProperty({ description: 'Estimated turnaround time for request handling.', example: 'Same day' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  turnaround!: string;
}

export class UpdateServiceDto {
  @ApiPropertyOptional({ example: 'Janazah (Funeral) Service' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({ example: 'janazah-funeral-service' })
  @IsOptional()
  @IsString()
  @Matches(SLUG_PATTERN, { message: 'slug must contain only lower-case letters, numbers and hyphens' })
  slug?: string;

  @ApiPropertyOptional({ enum: ServiceCategory })
  @IsOptional()
  @IsEnum(ServiceCategory)
  category?: ServiceCategory;

  @ApiPropertyOptional({ enum: ServiceStatus })
  @IsOptional()
  @IsEnum(ServiceStatus)
  status?: ServiceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  description?: string;

  @ApiPropertyOptional({ example: 'Imam Abdul Karim' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  coordinator?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID()
  coordinatorId?: string | null;

  @ApiPropertyOptional({ example: '+880 1713-668190' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'Main prayer hall & mortuary room' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: '24 hours, every day' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  availability?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  requiresBooking?: boolean;

  @ApiPropertyOptional({ example: 'Same day' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  turnaround?: string;
}

export class ListServicesQueryDto {
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

  @ApiPropertyOptional({ description: 'Search term across name, coordinator, location, summary, or description.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ServiceCategory, description: 'Filter by category.' })
  @IsOptional()
  @IsEnum(ServiceCategory)
  category?: ServiceCategory;

  @ApiPropertyOptional({ enum: ServiceStatus, description: 'Filter by status.' })
  @IsOptional()
  @IsEnum(ServiceStatus)
  status?: ServiceStatus;

  @ApiPropertyOptional({ description: 'If true, returns all matching rows without pagination' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  all?: boolean;
}

export class ServiceStatsDto {
  @ApiProperty({ description: 'Total number of services in the catalogue.', example: 12 })
  total!: number;

  @ApiProperty({ description: 'Number of active services open to the community.', example: 10 })
  active!: number;

  @ApiProperty({ description: 'Total bookings across all services for the current month.', example: 43 })
  bookingsThisMonth!: number;

  @ApiProperty({ description: 'Number of active services offered free of charge.', example: 7 })
  free!: number;
}

export class ServiceDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Janazah (Funeral) Service' }) name!: string;
  @ApiProperty({ example: 'janazah-funeral-service' }) slug!: string;
  @ApiProperty({ enum: ServiceCategory }) category!: ServiceCategory;
  @ApiProperty({ enum: ServiceStatus }) status!: ServiceStatus;
  @ApiProperty() summary!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ example: 'Imam Abdul Karim' }) coordinator!: string;
  @ApiPropertyOptional({ nullable: true }) coordinatorId!: string | null;
  @ApiProperty({ example: '+880 1713-668190' }) contactPhone!: string;
  @ApiProperty({ example: 'Main prayer hall & mortuary room' }) location!: string;
  @ApiProperty({ example: '24 hours, every day' }) availability!: string;
  @ApiProperty({ example: 0 }) fee!: number;
  @ApiProperty({ example: true }) requiresBooking!: boolean;
  @ApiProperty({ example: 'Same day' }) turnaround!: string;
  @ApiProperty({ description: 'Number of bookings this month.', example: 6 }) bookingsThisMonth!: number;
  @ApiProperty({ description: 'Total lifetime bookings.', example: 214 }) totalBookings!: number;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;

  static from(
    row: {
      id: string;
      name: string;
      slug: string;
      category: ServiceCategory;
      status: ServiceStatus;
      summary: string;
      description: string;
      coordinator: string;
      coordinatorId: string | null;
      contactPhone: string;
      location: string;
      availability: string;
      fee: { toNumber?(): number; toString(): string } | number;
      requiresBooking: boolean;
      turnaround: string;
      createdAt: Date;
      updatedAt: Date;
    },
    bookingsThisMonth = 0,
    totalBookings = 0,
  ): ServiceDto {
    const feeNum =
      typeof row.fee === 'number'
        ? row.fee
        : typeof (row.fee as any)?.toNumber === 'function'
          ? (row.fee as any).toNumber()
          : parseFloat(row.fee.toString());

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      category: row.category,
      status: row.status,
      summary: row.summary,
      description: row.description,
      coordinator: row.coordinator,
      coordinatorId: row.coordinatorId,
      contactPhone: row.contactPhone,
      location: row.location,
      availability: row.availability,
      fee: feeNum,
      requiresBooking: row.requiresBooking,
      turnaround: row.turnaround,
      bookingsThisMonth,
      totalBookings,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

export class PaginatedServicesDto {
  @ApiProperty({ type: [ServiceDto] })
  rows!: ServiceDto[];

  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  pageSize!: number;

  @ApiProperty({ example: 2 })
  pageCount!: number;
}

