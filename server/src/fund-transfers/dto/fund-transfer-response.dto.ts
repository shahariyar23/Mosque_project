import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FundTransferResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'TRF-2026-0801' })
  transferReference!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  fromFundId!: string;

  @ApiProperty({ example: 'General Fund' })
  fromFundName!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002' })
  toFundId!: string;

  @ApiProperty({ example: 'Building Fund' })
  toFundName!: string;

  @ApiProperty({ example: '3000.00' })
  amount!: string;

  @ApiProperty({ example: 'BDT' })
  currency!: string;

  @ApiProperty({ example: 'Reallocate surplus to building renovation fund' })
  description!: string;

  @ApiPropertyOptional({ example: 'REF-001', nullable: true })
  reference!: string | null;

  @ApiProperty({ example: '2026-08-29T10:00:00.000Z' })
  transactedAt!: string;

  @ApiProperty({ example: '7000.00' })
  fromFundRemainingBalance!: string;

  @ApiProperty({ example: '5000.00' })
  toFundNewBalance!: string;
}
