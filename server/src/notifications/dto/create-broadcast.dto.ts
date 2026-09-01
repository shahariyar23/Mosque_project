import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum BroadcastChannelEnum {
  push = 'push',
  email = 'email',
  sms = 'sms',
  in_app = 'in_app',
}

export enum BroadcastStatusEnum {
  draft = 'draft',
  scheduled = 'scheduled',
  sent = 'sent',
  failed = 'failed',
}

export class CreateBroadcastDto {
  @ApiProperty({ description: 'Title of the broadcast message', example: 'Jumu\'ah Reminder' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  title!: string;

  @ApiProperty({ description: 'Full body content of the broadcast', example: 'Please arrive early for Jumu\'ah prayers today.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  message!: string;

  @ApiPropertyOptional({ enum: BroadcastChannelEnum, default: BroadcastChannelEnum.push })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const lower = value.toLowerCase().replace(/[\s-]/g, '_');
    if (lower === 'in_app' || lower === 'inapp') return BroadcastChannelEnum.in_app;
    if (lower === 'push') return BroadcastChannelEnum.push;
    if (lower === 'email') return BroadcastChannelEnum.email;
    if (lower === 'sms') return BroadcastChannelEnum.sms;
    return value;
  })
  @IsEnum(BroadcastChannelEnum)
  channel?: BroadcastChannelEnum = BroadcastChannelEnum.push;

  @ApiPropertyOptional({ description: 'Target audience segment', example: 'Whole community' })
  @IsOptional()
  @IsString()
  audience?: string = 'Whole community';

  @ApiPropertyOptional({ enum: BroadcastStatusEnum, default: BroadcastStatusEnum.draft })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const lower = value.toLowerCase();
    if (lower === 'sent') return BroadcastStatusEnum.sent;
    if (lower === 'scheduled') return BroadcastStatusEnum.scheduled;
    if (lower === 'draft') return BroadcastStatusEnum.draft;
    if (lower === 'failed') return BroadcastStatusEnum.failed;
    return value;
  })
  @IsEnum(BroadcastStatusEnum)
  status?: BroadcastStatusEnum = BroadcastStatusEnum.draft;

  @ApiPropertyOptional({ description: 'Scheduled date time if status is scheduled' })
  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Author/sender display name', example: 'Mosque Office' })
  @IsOptional()
  @IsString()
  sender?: string = 'Mosque Office';
}
