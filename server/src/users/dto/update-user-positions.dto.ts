import { ApiProperty } from '@nestjs/swagger';
import { Position } from '@prisma/client';
import { ArrayUnique, IsArray, IsEnum } from 'class-validator';

/**
 * The committee posts a person holds.
 *
 * A position is a label, not a permission. `Position` is a separate enum from `Role` precisely because
 * the two answer different questions: the role says what someone may do and is read by every guard,
 * the position says what the mosque calls them and is read by nothing that makes a decision. The
 * schema states it at the enum — "these grant nothing, a position never affects a permission check" —
 * and that is why this endpoint exists as its own operation rather than as fields on the profile PATCH:
 * a member editing their own profile must not be able to award themselves the presidency, even though
 * the presidency confers no authority, because the public leadership list is generated from this column.
 *
 * The array replaces the column, matching `UpdateUserPermissionsDto`. A user holds any number of posts —
 * the same person is often treasurer and cashier — so a singular field would be the wrong shape, and an
 * add/remove pair would need two endpoints to say what one array says.
 *
 * Values are checked against the Prisma enum, so an unknown post is rejected rather than stored. There
 * is deliberately no `president` in `Role`: the person who approves is whoever holds `workflow.approve`.
 */
export class UpdateUserPositionsDto {
  @ApiProperty({
    isArray: true,
    enum: Position,
    example: [Position.president],
    description:
      'Replaces `positions`. Display only — no value here affects any permission check. Send `[]` to ' +
      'clear every post.',
  })
  @IsArray({ message: 'positions must be an array' })
  @ArrayUnique({ message: 'positions must not repeat a value' })
  @IsEnum(Position, {
    each: true,
    message: `each position must be one of: ${Object.values(Position).join(', ')}`,
  })
  positions!: Position[];
}
