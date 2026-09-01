import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum AnnouncementCategoryEnum {
  general = 'general',
  prayer = 'prayer',
  event = 'event',
  ramadan = 'ramadan',
  fundraising = 'fundraising',
  closure = 'closure',
  urgent = 'urgent',
}

export enum AnnouncementAudienceEnum {
  everyone = 'everyone',
  members = 'members',
  volunteers = 'volunteers',
  youth = 'youth',
  sisters = 'sisters',
}

export enum AnnouncementStatusEnum {
  draft = 'draft',
  scheduled = 'scheduled',
  published = 'published',
  archived = 'archived',
}

/** Case-insensitive / label normalizer */
export function normalizeCategory(val: any): AnnouncementCategoryEnum {
  if (!val) return AnnouncementCategoryEnum.general;
  const str = String(val).toLowerCase().trim();
  if (str in AnnouncementCategoryEnum) return str as AnnouncementCategoryEnum;
  return AnnouncementCategoryEnum.general;
}

export function normalizeAudience(val: any): AnnouncementAudienceEnum {
  if (!val) return AnnouncementAudienceEnum.everyone;
  const str = String(val).toLowerCase().replace(/\s+/g, '_').trim();
  if (str === 'whole_community' || str === 'everyone') return AnnouncementAudienceEnum.everyone;
  if (str in AnnouncementAudienceEnum) return str as AnnouncementAudienceEnum;
  return AnnouncementAudienceEnum.everyone;
}

export function normalizeStatus(val: any): AnnouncementStatusEnum {
  if (!val) return AnnouncementStatusEnum.draft;
  const str = String(val).toLowerCase().trim();
  if (str in AnnouncementStatusEnum) return str as AnnouncementStatusEnum;
  return AnnouncementStatusEnum.draft;
}

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'New autumn prayer timetable now in effect' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'Notice content / body text' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Alternative field for content used by some frontends' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Short summary / teaser' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @ApiPropertyOptional({ enum: ['General', 'Prayer', 'Event', 'Ramadan', 'Fundraising', 'Closure', 'Urgent'] })
  @IsOptional()
  @Transform(({ value }) => normalizeCategory(value))
  category?: AnnouncementCategoryEnum = AnnouncementCategoryEnum.general;

  @ApiPropertyOptional({ enum: ['Whole community', 'Members', 'Volunteers', 'Youth', 'Sisters'] })
  @IsOptional()
  @Transform(({ value }) => normalizeAudience(value))
  audience?: AnnouncementAudienceEnum = AnnouncementAudienceEnum.everyone;

  @ApiPropertyOptional({ enum: ['Draft', 'Scheduled', 'Published', 'Archived'] })
  @IsOptional()
  @Transform(({ value }) => normalizeStatus(value))
  status?: AnnouncementStatusEnum = AnnouncementStatusEnum.draft;

  @ApiPropertyOptional({ example: ['Website', 'App', 'Email', 'Notice board'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[] = ['Website', 'App'];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ example: '2026-08-20T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @ApiPropertyOptional({ example: '2026-09-01T09:00:00Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ example: '2026-08-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: 'Imam Abdul Karim' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  author?: string;
}
