import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  AnnouncementAudienceEnum,
  AnnouncementCategoryEnum,
  AnnouncementStatusEnum,
  normalizeAudience,
  normalizeCategory,
  normalizeStatus,
} from './create-announcement.dto';
import { Transform } from 'class-transformer';

export class AnnouncementQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by search term across title, content, author' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by category (e.g. General, Prayer, Event, etc.)' })
  @IsOptional()
  @Transform(({ value }) => (value && value !== 'all' ? normalizeCategory(value) : undefined))
  category?: AnnouncementCategoryEnum;

  @ApiPropertyOptional({ description: 'Filter by status (e.g. Published, Scheduled, Draft, Archived)' })
  @IsOptional()
  @Transform(({ value }) => (value && value !== 'all' ? normalizeStatus(value) : undefined))
  status?: AnnouncementStatusEnum;

  @ApiPropertyOptional({ description: 'Filter by audience (e.g. Whole community, Members, Volunteers, etc.)' })
  @IsOptional()
  @Transform(({ value }) => (value && value !== 'all' ? normalizeAudience(value) : undefined))
  audience?: AnnouncementAudienceEnum;

  @ApiPropertyOptional({ description: 'Filter pinned only' })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' || value === true ? true : value === 'false' || value === false ? false : undefined))
  @IsBoolean()
  pinned?: boolean;

  @ApiPropertyOptional({ description: 'Filter pinned only (alternative name)' })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' || value === true ? true : value === 'false' || value === false ? false : undefined))
  @IsBoolean()
  isPinned?: boolean;
}
