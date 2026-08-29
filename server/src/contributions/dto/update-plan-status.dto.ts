import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdatePlanStatusDto {
  @ApiProperty({
    description: 'Active status for this contribution plan. Inactive plans cannot receive new pledges.',
    example: true,
  })
  @IsBoolean()
  isActive!: boolean;
}
