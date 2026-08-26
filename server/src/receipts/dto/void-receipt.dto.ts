import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class VoidReceiptDto {
  @ApiProperty({
    example: 'Issued against the wrong member account',
    description: 'Reason for voiding the receipt. Required for audit trail.',
  })
  @IsNotEmpty({ message: 'voidReason is required' })
  @IsString({ message: 'voidReason must be a string' })
  @MinLength(3, { message: 'voidReason must be at least 3 characters long' })
  @MaxLength(1000, { message: 'voidReason must not exceed 1000 characters' })
  voidReason!: string;
}
