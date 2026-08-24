import { ApiProperty } from '@nestjs/swagger';
import { VolunteerStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

/**
 * A roster status change, on its own endpoint.
 *
 * The status a coordinator changes most often, and usually the only thing they are changing: someone
 * comes back from three months away, or steps down for the winter. Its own route keeps that a single
 * explicit request.
 *
 * What this does *not* touch is the point of the whole module. `User.role` is a different column with a
 * different meaning, and nothing here reads or writes it: a treasurer who leaves the roster is still the
 * treasurer, and taking someone off the roster is not a way to remove their authority — `PATCH
 * /users/:id/status` is, and it needs `user.manage`.
 */
export class UpdateVolunteerStatusDto {
  @ApiProperty({
    description:
      'The new roster state. `on_leave` is for someone expected back, so a coordinator does not have ' +
      'to delete the record to say they are away. Never affects the account’s role or permissions.',
    enum: VolunteerStatus,
    example: VolunteerStatus.inactive,
  })
  @IsEnum(VolunteerStatus, {
    message: `status must be one of: ${Object.values(VolunteerStatus).join(', ')}`,
  })
  status!: VolunteerStatus;
}
