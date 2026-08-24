import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateMosqueSettingsDto {
  @ApiPropertyOptional({ maxLength: 8 })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  defaultLanguage?: string;
  @ApiPropertyOptional({ maxLength: 8 }) @IsOptional() @IsString() @MaxLength(8) currency?: string;
  @ApiPropertyOptional({ maxLength: 24 })
  @IsOptional()
  @IsString()
  @MaxLength(24)
  dateFormat?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() emailNotifications?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() smsNotifications?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() pushNotifications?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() prayerReminders?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() eventReminders?: boolean;
  @ApiPropertyOptional({ maxLength: 48 })
  @IsOptional()
  @IsString()
  @MaxLength(48)
  calculationMethod?: string;
  @ApiPropertyOptional({ maxLength: 24 })
  @IsOptional()
  @IsString()
  @MaxLength(24)
  asrMethod?: string;
  @ApiPropertyOptional({ minimum: 0, maximum: 120 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  iqamahOffset?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() twoFactorRequired?: boolean;
  @ApiPropertyOptional({ minimum: 1, maximum: 1440 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  sessionTimeoutMins?: number;
  @ApiPropertyOptional({ minimum: 8, maximum: 128 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(8)
  @Max(128)
  passwordMinLength?: number;
  @ApiPropertyOptional({ maxLength: 16 }) @IsOptional() @IsString() @MaxLength(16) theme?: string;
  @ApiPropertyOptional({ maxLength: 16 })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  primaryColor?: string;
}
