import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class VoidTransactionDto {
  @ApiProperty({
    description: 'The reason why this financial transaction is being voided.',
    example: 'Entered twice by error from cash counter',
    minLength: 3,
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'voidReason must be at least 3 characters long' })
  @MaxLength(1000, { message: 'voidReason must not exceed 1000 characters' })
  voidReason: string;
}
