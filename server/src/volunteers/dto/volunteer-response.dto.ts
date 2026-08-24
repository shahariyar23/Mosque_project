import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VolunteerStatus } from '@prisma/client';

import { UserResponseDto } from '../../users/dto/user-response.dto';
import type { SelectedVolunteer } from '../types/volunteer.types';

/**
 * The volunteer, as the API returns it.
 *
 * A declared class rather than the Prisma row, for the same two reasons as `UserResponseDto`: it
 * documents itself in Swagger, and `from()` builds the object field by field, so a column added to the
 * schema later is invisible here until someone chooses to expose it.
 *
 * The person is nested rather than flattened, and built by `UserResponseDto.from` rather than by hand.
 * That reuse is what makes the guarantee hold: there is one definition of a user over HTTP, it is
 * already free of `passwordHash` and both password-reset columns, and this endpoint cannot expose one of
 * them without that definition changing. `userId` is repeated alongside it because a client that only
 * needs the id should not have to reach into a nested object for it.
 *
 * What is *not* here is a copy of the person's name, email or phone. Those are read through the
 * relation on every request, so correcting a phone number in the directory corrects it on the roster too
 * — there is no second copy to go stale.
 */
export class VolunteerResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid', description: 'The user this roster entry belongs to.' })
  userId!: string;

  @ApiProperty({
    enum: VolunteerStatus,
    description: 'Roster state only. Says nothing about the account’s role or permissions.',
  })
  status!: VolunteerStatus;

  @ApiPropertyOptional({ nullable: true, example: 'Event management' })
  skills!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Friday' })
  availability!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'Available for community events',
    description: 'Internal. Requires `volunteer.view`, like the rest of this response.',
  })
  notes!: string | null;

  @ApiProperty({ format: 'date-time', description: 'When they joined the roster.' })
  joinedAt!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({
    type: UserResponseDto,
    description:
      'The person, read through the relation with the same safe projection the users endpoints use. ' +
      'No password hash, no reset token, no session material.',
  })
  user!: UserResponseDto;

  /** Builds the response from a row read with `VOLUNTEER_SELECT`. The only way one of these is made. */
  static from(volunteer: SelectedVolunteer): VolunteerResponseDto {
    return {
      id: volunteer.id,
      userId: volunteer.userId,
      status: volunteer.status,
      skills: volunteer.skills,
      availability: volunteer.availability,
      notes: volunteer.notes,
      joinedAt: new Date(volunteer.joinedAt).toISOString(),
      createdAt: new Date(volunteer.createdAt).toISOString(),
      updatedAt: new Date(volunteer.updatedAt).toISOString(),
      user: UserResponseDto.from(volunteer.user),
    };
  }
}

/** Paging figures that accompany a list response. */
export class VolunteerListMetaDto {
  @ApiProperty({ example: 1, description: '1-based, echoing what was asked for.' })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 42, description: 'Rows matching the filter, ignoring paging.' })
  total!: number;

  @ApiProperty({ example: 3, description: 'Zero when nothing matches.' })
  totalPages!: number;
}

/** The envelope every volunteers endpoint returns. `success` is always true — failures go to the filter. */
export class VolunteerEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Volunteer retrieved successfully' })
  message!: string;

  @ApiProperty({ type: VolunteerResponseDto })
  data!: VolunteerResponseDto;
}

export class VolunteerListEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Volunteers retrieved successfully' })
  message!: string;

  @ApiProperty({ type: [VolunteerResponseDto] })
  data!: VolunteerResponseDto[];

  @ApiProperty({ type: VolunteerListMetaDto })
  meta!: VolunteerListMetaDto;
}

/**
 * What a delete reports back.
 *
 * `userId` is included on purpose: it is the confirmation that the *person* was not deleted. Removing a
 * roster entry takes someone off the volunteer list and leaves their account, their membership and their
 * history exactly as they were.
 */
export class DeletedVolunteerDto {
  @ApiProperty({ format: 'uuid', description: 'The roster entry that was removed.' })
  id!: string;

  @ApiProperty({ format: 'uuid', description: 'The user, who still exists.' })
  userId!: string;
}

export class DeletedVolunteerEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Volunteer deleted successfully' })
  message!: string;

  @ApiProperty({ type: DeletedVolunteerDto })
  data!: DeletedVolunteerDto;
}
