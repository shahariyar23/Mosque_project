import { ApiProperty } from '@nestjs/swagger';

export class AnnouncementStatsDto {
  @ApiProperty({ example: 14 })
  total: number;

  @ApiProperty({ example: 7 })
  published: number;

  @ApiProperty({ example: 3 })
  scheduled: number;

  @ApiProperty({ example: 3 })
  pinned: number;
}

export class AnnouncementStatsEnvelopeDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: AnnouncementStatsDto })
  data: AnnouncementStatsDto;
}
