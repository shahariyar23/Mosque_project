import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateNotificationInput {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ example: 'Friday Collection Recorded' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: '৳10,000 recorded for Friday 2026-08-28 (Imam Salary Fund)' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({ enum: NotificationType, default: NotificationType.general })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiProperty({ example: 'finance', default: 'system' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false, example: 'jummah_collection' })
  @IsString()
  @IsOptional()
  resourceType?: string;

  @ApiProperty({ required: false, example: '6ba7b810-9dad-11d1-80b4-00c04fd430c8' })
  @IsString()
  @IsOptional()
  resourceId?: string;

  @ApiProperty({ required: false, example: '/dashboard/jumuah' })
  @IsString()
  @IsOptional()
  actionUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  metadata?: any;
}
