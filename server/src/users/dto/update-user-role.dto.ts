import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum } from 'class-validator';

const ROLE_NAMES = Object.values(Role).join(', ');

/**
 * A role change, on its own endpoint.
 *
 * Separate from `UpdateUserDto` for the same reason status is: this is the single largest access
 * decision the API makes, and it should be one deliberate request rather than a field that can ride
 * along inside a profile edit.
 *
 * `@IsEnum(Role)` is the first of two checks, not the only one. It answers "is this one of the seven
 * roles the schema defines?", which stops `"SUPER_ADMIN"`, `"admin"` and `"president"` at the door — the
 * enum is lowercase and has no president. It does *not* answer "may this caller hand out that role?".
 * That question is the service's, because it depends on who is asking, and no amount of validation on
 * the request body can answer it: the body is the untrusted part.
 */
export class UpdateUserRoleDto {
  @ApiProperty({
    enum: Role,
    example: Role.treasurer,
    description:
      'The role to assign. Replaces the current one — a user holds exactly one. Assigning ' +
      '`super_admin` additionally requires the caller to hold `platform.manage`.',
  })
  @IsEnum(Role, { message: `role must be one of: ${ROLE_NAMES}` })
  role!: Role;
}
