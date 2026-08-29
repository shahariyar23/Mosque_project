import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContributionEnrollmentStatus } from '@prisma/client';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

function normalizedStatus({ value }: TransformFnParams): unknown {
  if (typeof value === 'string') {
    return value.toLowerCase();
  }
  return value;
}

export class UpdateEnrollmentStatusDto {
  @ApiProperty({
    description: 'Updated status for the contribution enrollment: active, paused, or cancelled.',
    enum: ContributionEnrollmentStatus,
    example: ContributionEnrollmentStatus.paused,
  })
  @Transform(normalizedStatus)
  @IsEnum(ContributionEnrollmentStatus, {
    message: 'status must be one of: active, paused, cancelled',
  })
  status!: ContributionEnrollmentStatus;

  @ApiPropertyOptional({
    description: 'Optional reason or note regarding the status change.',
    example: 'Donor requested temporary pause during travel',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
