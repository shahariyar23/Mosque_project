import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAdditionalMosqueAdminDto {
  @ApiProperty({ description: 'Full name of the mosque administrator' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName: string;

  @ApiProperty({ description: 'Email address of the administrator' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(160)
  email: string;

  @ApiProperty({ description: 'Password', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  phone?: string;
}

