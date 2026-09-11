import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const trimmed = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateMilestoneDto {
  @ApiProperty({ example: '1987', description: 'Year or period string, e.g. 1987 or 1987-1990' })
  @IsString()
  @IsNotEmpty()
  @Transform(trimmed)
  @MaxLength(16)
  year!: string;

  @ApiProperty({ example: 'Foundation & Sacred Beginning' })
  @IsString()
  @IsNotEmpty()
  @Transform(trimmed)
  @MaxLength(160)
  title!: string;

  @ApiProperty({ example: 'Founded as a local neighborhood sanctuary by devoted community elders.' })
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

export class UpdateMilestoneDto extends PartialType(CreateMilestoneDto) {}

export class MilestoneResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  mosqueId!: string;

  @ApiProperty()
  year!: string;

  @ApiProperty()
  title!: string;

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

