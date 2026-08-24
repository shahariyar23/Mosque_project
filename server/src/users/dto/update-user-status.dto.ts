import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

import { USER_STATUSES, type UserStatus } from '../types/user.types';

/**
 * A status change, on its own endpoint.
 *
 * Separate from `UpdateUserDto` because this is an access decision, not a profile edit: an inactive
 * account resolves to no permissions at all, base ones included. Keeping it here means suspending
 * someone is a single explicit request rather than a field that can ride along in a wider update.
 */
export class UpdateUserStatusDto {
  @ApiProperty({
    description: 'Maps to `isActive`. `inactive` revokes every permission the account holds.',
    enum: USER_STATUSES,
    example: 'inactive',
  })
  @IsIn(USER_STATUSES, { message: `status must be one of: ${USER_STATUSES.join(', ')}` })
  status!: UserStatus;
}
