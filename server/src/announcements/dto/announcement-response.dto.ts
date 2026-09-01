import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnnouncementResponseDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'New autumn prayer timetable now in effect' })
  title: string;

  @ApiProperty({ example: 'The autumn timetable is now live across the website and app...' })
  content: string;

  @ApiProperty({ example: 'The autumn timetable is now live across the website and app...' })
  message: string;

  @ApiPropertyOptional({ example: 'Autumn timetable updates' })
  summary?: string | null;

  @ApiProperty({ example: 'Prayer' })
  category: string;

  @ApiProperty({ example: 'Whole community' })
  audience: string;

  @ApiProperty({ example: 'Published' })
  status: string;

  @ApiProperty({ example: ['Website', 'App', 'Notice board'], type: [String] })
  channels: string[];

  @ApiProperty({ example: true })
  pinned: boolean;

  @ApiProperty({ example: true })
  isPinned: boolean;

  @ApiProperty({ example: 'Imam Abdul Karim' })
  author: string;

  @ApiPropertyOptional({ example: '2026-08-20' })
  publishedAt?: string | null;

  @ApiPropertyOptional({ example: '2026-09-01T09:00:00Z' })
  scheduledAt?: string | null;

  @ApiPropertyOptional({ example: '2026-08-31' })
  expiresAt?: string | null;

  @ApiPropertyOptional({ example: null })
  archivedAt?: string | null;

  @ApiProperty({ example: '2026-08-20T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-08-20T10:00:00.000Z' })
  updatedAt: string;
}

export class AnnouncementEnvelopeDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiPropertyOptional({ example: 'Announcement retrieved successfully' })
  message?: string;

  @ApiProperty({ type: AnnouncementResponseDto })
  data: AnnouncementResponseDto;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class AnnouncementListEnvelopeDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiPropertyOptional({ example: 'Announcements retrieved successfully' })
  message?: string;

  @ApiProperty({ type: [AnnouncementResponseDto] })
  data: AnnouncementResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
