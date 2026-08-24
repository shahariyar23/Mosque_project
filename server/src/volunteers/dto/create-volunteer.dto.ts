import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VolunteerStatus } from '@prisma/client';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/**
 * Trims the free-text fields, which are typed into a form by a coordinator rather than chosen from a
 * list. Declared as a function so it can state that it returns `unknown`: `TransformFnParams.value` is
 * `any`, and a non-string reaching here is a validation error the decorator below is about to raise, so
 * it is passed through untouched rather than coerced.
 */
function trimmed({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : (value as unknown);
}

/**
 * What a caller may send to enrol a volunteer.
 *
 * The one required field is `userId`, and that is the whole shape of this module: a volunteer is an
 * existing person who has joined the roster, so enrolling one references an account rather than
 * creating a second record of a human being. There is deliberately no `fullName`, `email` or `phone`
 * here — those live on `User`, once — and no `role`, because volunteering is not a role and this
 * endpoint must not be a way to change what anyone may do.
 *
 * `skills` and `availability` are free text on purpose. The roster is written in the words the
 * coordinator uses ("First aid, driving", "Friday", "weekends after Asr"), and an enum would have to
 * reject most of them.
 *
 * The global pipe runs with `whitelist` and `forbidNonWhitelisted`, so anything not declared here is
 * rejected rather than ignored.
 */
export class CreateVolunteerDto {
  @ApiProperty({
    description:
      'The existing user who is joining the roster. No account is created here — an unknown id is a ' +
      '400, and a user who is already enrolled is a 409.',
    format: 'uuid',
    example: '9c8b7a65-4321-4f6a-8c11-2d5e7a9b0c31',
  })
  @IsUUID(undefined, { message: 'userId must be a UUID' })
  userId!: string;

  @ApiPropertyOptional({
    description:
      'Roster state. Defaults to `active`. Independent of the account’s role: setting this never ' +
      'changes what the person may do in the system.',
    enum: VolunteerStatus,
    default: VolunteerStatus.active,
  })
  @IsOptional()
  @IsEnum(VolunteerStatus, {
    message: `status must be one of: ${Object.values(VolunteerStatus).join(', ')}`,
  })
  status?: VolunteerStatus;

  @ApiPropertyOptional({
    description: 'What they can help with, in their own words.',
    maxLength: 500,
    example: 'Event management',
  })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @MaxLength(500)
  skills?: string | null;

  @ApiPropertyOptional({
    description: 'When they are free.',
    maxLength: 255,
    example: 'Friday',
  })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @MaxLength(255)
  availability?: string | null;

  @ApiPropertyOptional({
    description:
      'The coordinator’s notes. Internal — never part of a public projection of the roster.',
    maxLength: 2000,
    example: 'Available for community events',
  })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @MaxLength(2000)
  notes?: string | null;

  @ApiPropertyOptional({
    description:
      'When they joined the roster, if that is not now. Accepted on enrolment because a volunteer of ' +
      'ten years may be entered today; it is a record of something that happened, so no update ' +
      'endpoint accepts it. Defaults to the moment the row is written.',
    format: 'date-time',
    example: '2026-03-01T09:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'joinedAt must be an ISO-8601 date-time' })
  joinedAt?: string;
}
