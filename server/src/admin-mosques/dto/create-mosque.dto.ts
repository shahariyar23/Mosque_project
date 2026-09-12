import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsFQDN,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateMosqueDto {
  @ApiProperty({ description: 'Mosque name', example: 'Dhanmondi Central Masjid' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @ApiPropertyOptional({ description: 'Unique business code', example: 'MOS-003' })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  code?: string;

  @ApiPropertyOptional({ description: 'URL-safe slug', example: 'dhanmondi-central-masjid' })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  slug?: string;

  @ApiPropertyOptional({ description: 'Unique public hostname', example: 'dhanmondi.mostak.tech' })
  @IsFQDN({ require_tld: true })
  @IsOptional()
  @MaxLength(255)
  domain?: string;

  @ApiPropertyOptional({ description: 'Contact email' })
  @IsEmail()
  @IsOptional()
  @MaxLength(160)
  email?: string;

  @ApiPropertyOptional({ description: 'Contact phone' })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ description: 'Official website URL' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({ description: 'Street address' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  addressLine?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional({ description: 'District' })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  district?: string;

  @ApiPropertyOptional({ description: 'Country', default: 'Bangladesh' })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  country?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsString()
  @IsOptional()
  @MaxLength(24)
  postalCode?: string;

  @ApiPropertyOptional({ description: 'IANA Timezone', default: 'Asia/Dhaka' })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ description: 'Year established' })
  @IsNumber()
  @IsOptional()
  establishedYear?: number;

  @ApiPropertyOptional({ description: 'Brief description' })
  @IsString()
  @IsOptional()
  description?: string;

  // Initial Administrator Details
  @ApiProperty({ description: 'Full name of the initial mosque administrator' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  adminFullName: string;

  @ApiProperty({ description: 'Email address of the initial administrator' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(160)
  adminEmail: string;

  @ApiProperty({ description: 'Initial admin password', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  adminPassword: string;

  @ApiPropertyOptional({ description: 'Initial admin phone number' })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  adminPhone?: string;
}

