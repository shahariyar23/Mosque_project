import { OmitType, PartialType } from '@nestjs/swagger';

import { CreateUserDto } from './create-user.dto';

/**
 * What a caller may change about an existing user.
 *
 * Derived from `CreateUserDto` so the validation rules cannot drift between the two, minus the three
 * fields this endpoint must not touch:
 *
 *  - `password` — changing a credential is its own operation, and one that has to prove the current
 *    password or come from a reset token. Neither exists yet.
 *  - `status` — has its own endpoint, so activating an account is an audited, single-purpose action
 *    rather than something that can ride along in a profile edit.
 *  - `mosqueId` — moving a person between tenants is not a profile change; it would carry their
 *    donations and audit rows into another mosque's ledger.
 *
 * `role`, `positions` and `permissions` are not here because they are not in `CreateUserDto` either.
 * The global pipe runs with `forbidNonWhitelisted`, so sending any of them is a 400 rather than a
 * silent no-op — a caller attempting a privilege escalation gets told the field does not exist.
 */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['mosqueId', 'password', 'status'] as const),
) {}
