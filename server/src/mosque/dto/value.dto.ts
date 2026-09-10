import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const trimmed = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateValueDto {
  @ApiProperty({ example: '01', description: 'Display number/sequence label' })
  @IsString()
  @IsNotEmpty()
  @Transform(trimmed)
  @MaxLength(8)
  num!: string;

  @ApiPropertyOptional({ example: 'Moon', description: 'Icon identifier or Lucide icon name' })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @MaxLength(64)
  icon?: string;

  @ApiProperty({ example: 'Faith & Devotion' })
  @IsString()
  @IsNotEmpty()
  @Transform(trimmed)
  @MaxLength(160)
  title!: string;

  @ApiPropertyOptional({ example: 'Tawheed, prayer & spiritual purification' })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @MaxLength(200)
  subtitle?: string;

  @ApiProperty({ example: 'We anchor everything in sincere worship of the One Creator.' })
  @IsString()
  @IsNotEmpty()
  @Transform(trimmed)
  description!: string;

  @ApiPropertyOptional({ example: 1, default: 0 })
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

export class UpdateValueDto extends PartialType(CreateValueDto) {}

export class ValueResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  mosqueId!: string;

  @ApiProperty()
  num!: string;

  @ApiPropertyOptional()
  icon?: string | null;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  subtitle?: string | null;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isPublished!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

