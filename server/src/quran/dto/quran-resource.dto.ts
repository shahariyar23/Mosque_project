import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { QuranFormat, QuranResourceType, QuranStatus } from '@prisma/client';

export { QuranFormat, QuranResourceType, QuranStatus };

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateQuranResourceDto {
  @ApiProperty({ example: 'Surah Ya-Sin — Thursday evening recitation' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'The imam’s full recitation of Ya-Sin.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @ApiProperty({ example: 'Filmed during the mosque’s regular Thursday gathering.' })
  @IsString()
  @MinLength(2)
  description!: string;

  @ApiProperty({ enum: QuranResourceType, example: QuranResourceType.recitation })
  @IsEnum(QuranResourceType)
  type!: QuranResourceType;

  @ApiProperty({ enum: QuranFormat, example: QuranFormat.audio })
  @IsEnum(QuranFormat)
  format!: QuranFormat;

  @ApiPropertyOptional({
    enum: QuranStatus,
    default: QuranStatus.draft,
    example: QuranStatus.draft,
  })
  @IsOptional()
  @IsEnum(QuranStatus)
  status?: QuranStatus = QuranStatus.draft;

  @ApiProperty({ example: 'Ya-Sin' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  surah!: string;

  @ApiPropertyOptional({ example: 'Surah 36 · Ayah 1–83' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string;

  @ApiPropertyOptional({ description: 'Starting ayah of the covered passage.', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(286)
  ayahStart?: number;

  @ApiPropertyOptional({ description: 'Ending ayah of the covered passage.', example: 83 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(286)
  ayahEnd?: number;

  @ApiPropertyOptional({ example: 'Qari Saifullah Ansari' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  reciter?: string;

  @ApiPropertyOptional({ example: 'Imam Abdul Karim' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  author?: string;

  @ApiPropertyOptional({ example: 'Arabic' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  language?: string;

  @ApiPropertyOptional({ example: 'https://cdn.noormosque.org/quran/yasin.mp3' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  mediaUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.noormosque.org/quran/yasin-thumb.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: 'Playback length or page count as free text.',
    example: '22 min',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  duration?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description: 'Publication date (YYYY-MM-DD). Required to publish immediately.',
    example: '2026-09-02',
  })
  @IsOptional()
  @IsString()
  scheduledAt?: string;
}

export class UpdateQuranResourceDto {
  @ApiPropertyOptional({ example: 'Surah Ya-Sin — Thursday evening recitation (updated)' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated one-line summary.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @ApiPropertyOptional({ example: 'Updated description.' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  description?: string;

  @ApiPropertyOptional({ enum: QuranResourceType })
  @IsOptional()
  @IsEnum(QuranResourceType)
  type?: QuranResourceType;

  @ApiPropertyOptional({ enum: QuranFormat })
  @IsOptional()
  @IsEnum(QuranFormat)
  format?: QuranFormat;

  @ApiPropertyOptional({ enum: QuranStatus })
  @IsOptional()
  @IsEnum(QuranStatus)
  status?: QuranStatus;

  @ApiPropertyOptional({ example: 'Ya-Sin' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  surah?: string;

  @ApiPropertyOptional({ example: 'Surah 36 · Ayah 1–83' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(286)
  ayahStart?: number;

  @ApiPropertyOptional({ example: 83 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(286)
  ayahEnd?: number;

  @ApiPropertyOptional({ example: 'Qari Saifullah Ansari' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  reciter?: string;

  @ApiPropertyOptional({ example: 'Imam Abdul Karim' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  author?: string;

  @ApiPropertyOptional({ example: 'Arabic' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  language?: string;

  @ApiPropertyOptional({ example: 'https://cdn.noormosque.org/quran/yasin.mp3' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  mediaUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.noormosque.org/quran/yasin-thumb.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: '22 min' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  duration?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description: 'Scheduled publish time (YYYY-MM-DD).',
    example: '2026-09-02',
  })
  @IsOptional()
  @IsString()
  scheduledAt?: string;
}

export class ListQuranResourcesQueryDto {
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
  pageSize?: number = 10;

  @ApiPropertyOptional({ description: 'Alias for pageSize.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Search across title, surah, reference, reciter, author, description.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: QuranResourceType, description: 'Filter by resource type.' })
  @IsOptional()
  @IsEnum(QuranResourceType)
  type?: QuranResourceType;

  @ApiPropertyOptional({ enum: QuranFormat, description: 'Filter by format.' })
  @IsOptional()
  @IsEnum(QuranFormat)
  format?: QuranFormat;

  @ApiPropertyOptional({ enum: QuranStatus, description: 'Filter by status.' })
  @IsOptional()
  @IsEnum(QuranStatus)
  status?: QuranStatus;

  @ApiPropertyOptional({ description: 'Filter by surah name.', example: 'Ya-Sin' })
  @IsOptional()
  @IsString()
  surah?: string;

  @ApiPropertyOptional({ description: 'Filter by publication date boundary (YYYY-MM-DD).' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'publishedFrom must be in YYYY-MM-DD format' })
  publishedFrom?: string;

  @ApiPropertyOptional({ description: 'Filter by publication date boundary (YYYY-MM-DD).' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'publishedTo must be in YYYY-MM-DD format' })
  publishedTo?: string;

  @ApiPropertyOptional({
    description: 'Sort field.',
    enum: ['title', 'type', 'status', 'surah', 'createdAt', 'publishedAt', 'updatedAt'],
  })
  @IsOptional()
  @IsString()
  sortBy?: 'title' | 'type' | 'status' | 'surah' | 'createdAt' | 'publishedAt' | 'updatedAt';

  @ApiPropertyOptional({ description: 'Sort direction.', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortDir?: 'asc' | 'desc';
}

export class QuranResourceDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Surah Ya-Sin — Thursday evening recitation' }) title!: string;
  @ApiPropertyOptional({ nullable: true }) summary!: string | null;
  @ApiProperty() description!: string;
  @ApiProperty({ enum: QuranResourceType }) type!: QuranResourceType;
  @ApiProperty({ enum: QuranFormat }) format!: QuranFormat;
  @ApiProperty({ enum: QuranStatus }) status!: QuranStatus;
  @ApiProperty({ example: 'Ya-Sin' }) surah!: string;
  @ApiProperty({ example: 'Surah 36 · Ayah 1–83' }) reference!: string;
  @ApiPropertyOptional({ nullable: true }) ayahStart!: number | null;
  @ApiPropertyOptional({ nullable: true }) ayahEnd!: number | null;
  @ApiPropertyOptional({ nullable: true }) reciter!: string | null;
  @ApiPropertyOptional({ nullable: true }) author!: string | null;
  @ApiProperty({ example: 'Arabic' }) language!: string;
  @ApiPropertyOptional({ nullable: true }) mediaUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) thumbnailUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) duration!: string | null;
  @ApiProperty({ example: false }) isFeatured!: boolean;
  @ApiPropertyOptional({ nullable: true }) publishedAt!: string | null;
  @ApiPropertyOptional({ nullable: true }) scheduledAt!: string | null;
  @ApiPropertyOptional({ nullable: true }) archivedAt!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;

  static from(row: {
    id: string;
    title: string;
    summary: string | null;
    description: string;
    type: QuranResourceType;
    format: QuranFormat;
    status: QuranStatus;
    surah: string;
    reference: string;
    ayahStart: number | null;
    ayahEnd: number | null;
    reciter: string | null;
    author: string | null;
    language: string;
    mediaUrl: string | null;
    thumbnailUrl: string | null;
    duration: string | null;
    isFeatured: boolean;
    publishedAt: Date | null;
    scheduledAt: Date | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): QuranResourceDto {
    return {
      id: row.id,
      title: row.title,
      summary: row.summary,
      description: row.description,
      type: row.type,
      format: row.format,
      status: row.status,
      surah: row.surah,
      reference: row.reference,
      ayahStart: row.ayahStart,
      ayahEnd: row.ayahEnd,
      reciter: row.reciter,
      author: row.author,
      language: row.language,
      mediaUrl: row.mediaUrl,
      thumbnailUrl: row.thumbnailUrl,
      duration: row.duration,
      isFeatured: row.isFeatured,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
      scheduledAt: row.scheduledAt ? row.scheduledAt.toISOString() : null,
      archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
