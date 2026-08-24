import { OmitType, PartialType } from '@nestjs/swagger';

import { CreateVolunteerDto } from './create-volunteer.dto';

/**
 * What a caller may change about an existing volunteer: `skills`, `availability`, `notes` and `status`.
 *
 * Derived from the create DTO minus two fields, so the validation rules and the Swagger descriptions
 * are written once.
 *
 * `userId` is omitted because a volunteer record belongs to the person it was created for. Moving one
 * to a different account through an ordinary update would silently rewrite whose roster history this
 * is; enrolling the other person is the operation that was meant. With `forbidNonWhitelisted`, sending
 * it here is a 400 rather than a field quietly ignored.
 *
 * `joinedAt` is omitted because it records something that happened rather than something being decided.
 *
 * `status` is *not* omitted, which is the opposite of `UpdateUserDto`, where it is. The difference is
 * what the two columns mean: an inactive *account* resolves to no permissions at all, so that is an
 * access decision and has to be its own request. A volunteer's roster state grants nothing and is read
 * by nothing that decides anything, so a coordinator correcting a roster entry may set it here. It also
 * has its own endpoint, for the common case of changing only that.
 */
export class UpdateVolunteerDto extends PartialType(
  OmitType(CreateVolunteerDto, ['userId', 'joinedAt'] as const),
) {}
