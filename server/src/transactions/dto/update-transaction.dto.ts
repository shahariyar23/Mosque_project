import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateTransactionDto {
  @ApiPropertyOptional({
    description: 'Updated description of the transaction.',
    example: 'Updated Friday collection notes',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated category.',
    example: 'Special Donations',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @ApiPropertyOptional({
    description: 'Updated reference code.',
    example: 'REF-2026-081B',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    description: 'Updated payment method.',
    example: PaymentMethod.bank_transfer,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Updated fund ID.',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4')
  fundId?: string;

  @ApiPropertyOptional({
    description: 'Updated transaction date/time (ISO 8601).',
    example: '2026-08-27T12:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  transactedAt?: string;
}
