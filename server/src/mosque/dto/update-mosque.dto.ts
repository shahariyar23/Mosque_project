import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsLatitude,
  IsOptional,
  IsString,
  IsUrl,
  IsLongitude,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trimmed = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateMosqueDto {
  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must contain lowercase words separated by hyphens',
  })
  @MaxLength(64)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email address' })
  @Transform(trimmed)
  @MaxLength(160)
  email?: string;

  @ApiPropertyOptional({ maxLength: 32 })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'website must be a valid URL' })
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @MaxLength(255)
  addressLine?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @MaxLength(120)
  district?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @MaxLength(120)
  country?: string;

  @ApiPropertyOptional({ maxLength: 24 })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @MaxLength(24)
  postalCode?: string;

  @ApiPropertyOptional({ maxLength: 64, example: 'Asia/Dhaka' })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ minimum: -90, maximum: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ minimum: -180, maximum: 180 })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 9999 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9999)
  establishedYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'logoUrl must be a valid URL' })
  @MaxLength(500)
  logoUrl?: string;
}
