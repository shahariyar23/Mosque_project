import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const trimmed = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateGalleryItemDto {
  @ApiPropertyOptional({ example: 'Mosque minaret at sunset' })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({ example: 'Mosque minaret rising gracefully into the serene sky' })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @MaxLength(200)
  altText?: string;

  @ApiPropertyOptional({ example: 'Architecture', default: 'general' })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @MaxLength(64)
  category?: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateGalleryItemDto extends PartialType(CreateGalleryItemDto) {}

export class GalleryItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  mosqueId!: string;

  @ApiProperty()
  imageUrl!: string;

  @ApiPropertyOptional()
  cloudinaryPublicId?: string | null;

  @ApiPropertyOptional()
  title?: string | null;

  @ApiPropertyOptional()
  altText?: string | null;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isPublished!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

