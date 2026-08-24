import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsOptional, IsString } from 'class-validator';

import { IsPermission } from '../../common/validators/is-permission.validator';

/**
 * Individual permission grants and denials.
 *
 * Two arrays, because the user row has two and `effectivePermissions` reads both: `permissions` adds to
 * whatever the role already gives, `deniedPermissions` takes away, and a denial wins. Omitting denies
 * here would leave half the model unreachable over HTTP — you could grant a treasurer an extra
 * permission but never take one away without demoting them.
 *
 * Each array is optional and each is a *replacement* for the column, not a delta. That is the honest
 * shape for a PATCH of a list column: an "add this one" API would need a matching "remove this one",
 * and two more endpoints to express what one array already says. Send the array you want stored.
 *
 * Every element is checked against the compile-time registry. A string the registry does not declare is
 * rejected rather than stored, because storing it would leave a grant on the row that no guard can ever
 * match — a permission that looks granted in the UI and does nothing at all.
 */
export class UpdateUserPermissionsDto {
  @ApiPropertyOptional({
    type: [String],
    example: ['report.export'],
    description:
      'Replaces `permissions`. Added on top of the role. The caller may only grant permissions they ' +
      'hold themselves. Send `[]` to clear.',
  })
  @IsOptional()
  @IsArray({ message: 'permissions must be an array' })
  @ArrayUnique({ message: 'permissions must not repeat a value' })
  @IsString({ each: true, message: 'each permission must be a string' })
  @IsPermission({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['donation.void'],
    description:
      'Replaces `deniedPermissions`. Wins over every grant, including the role and the base set. ' +
      'Send `[]` to clear.',
  })
  @IsOptional()
  @IsArray({ message: 'deniedPermissions must be an array' })
  @ArrayUnique({ message: 'deniedPermissions must not repeat a value' })
  @IsString({ each: true, message: 'each denied permission must be a string' })
  @IsPermission({ each: true })
  deniedPermissions?: string[];
}
