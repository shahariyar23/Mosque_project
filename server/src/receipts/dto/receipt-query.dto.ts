import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReceiptStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

import { MAX_PAGE_SIZE } from '../../common/pagination/page';
import { DEFAULT_RECEIPT_PAGE_SIZE } from '../types/receipt.types';

export class ReceiptQueryDto {
  @ApiPropertyOptional({ description: '1-based page number.', minimum: 1, default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Rows per page.',
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
    default: DEFAULT_RECEIPT_PAGE_SIZE,
    example: DEFAULT_RECEIPT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE, { message: `limit must not exceed ${MAX_PAGE_SIZE}` })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Case-insensitive search across receipt number, donor name and donation donor name.',
    maxLength: 120,
    example: 'REC-2026',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by receipt status (issued | voided).',
    enum: ReceiptStatus,
    example: ReceiptStatus.issued,
  })
  @IsOptional()
  @IsEnum(ReceiptStatus, {
    message: `status must be one of: ${Object.values(ReceiptStatus).join(', ')}`,
  })
  status?: ReceiptStatus;

  @ApiPropertyOptional({
    description: 'Filter by fund id.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'fundId must be a valid UUID v4' })
  fundId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Filter by donation id.',
  })
  @IsOptional()
  @IsUUID('4', { message: 'donationId must be a valid UUID v4' })
  donationId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Filter by donor account user id.',
  })
  @IsOptional()
  @IsUUID('4', { message: 'userId must be a valid UUID v4' })
  userId?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Receipts issued on or after this timestamp (ISO 8601).',
  })
  @IsOptional()
  @IsISO8601({ strict: false }, { message: 'dateFrom must be an ISO date or timestamp' })
  dateFrom?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Receipts issued on or before this timestamp (ISO 8601).',
  })
  @IsOptional()
  @IsISO8601({ strict: false }, { message: 'dateTo must be an ISO date or timestamp' })
  dateTo?: string;

  @ApiPropertyOptional({
    format: 'date',
    description: 'Alternative alias for dateFrom.',
  })
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({
    format: 'date',
    description: 'Alternative alias for dateTo.',
  })
  @IsOptional()
  to?: string;
}
