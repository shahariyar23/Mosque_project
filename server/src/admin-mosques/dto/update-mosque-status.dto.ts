import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdateMosqueStatusDto {
  @ApiProperty({
    description: 'Mosque tenant operational status',
    enum: ['active', 'suspended', 'inactive'],
    example: 'suspended',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'suspended', 'inactive'], {
    message: 'Status must be one of: active, suspended, inactive',
  })
  status: 'active' | 'suspended' | 'inactive';
}

