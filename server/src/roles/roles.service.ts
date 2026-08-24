import { Injectable, NotFoundException } from '@nestjs/common';

import {
  PermissionListMetaDto,
  PermissionResponseDto,
} from '../permissions/dto/permission-response.dto';
import { PERMISSION_GROUP_KEYS, permissionDetail } from '../permissions/types/permission.types';
import { RoleListMetaDto, RoleResponseDto } from './dto/role-response.dto';
import { ROLE_DETAILS, type RoleDetail, roleDetail } from './types/role.types';

/**
 * Reads the roles. No `PrismaService`, for the same reason `PermissionsService` has none: a role is a
 * value in the Prisma enum and its permissions are a compile-time map, so there is nothing to query and
 * nothing to write. Assigning a role to a *user* is a different operation and lives in `UsersService`,
 * where the user row is.
 */
@Injectable()
export class RolesService {
  findMany(): { rows: RoleResponseDto[]; meta: RoleListMetaDto } {
    return {
      rows: ROLE_DETAILS.map((detail) => RoleResponseDto.from(detail)),
      meta: { total: ROLE_DETAILS.length },
    };
  }

  findOne(id: string): RoleResponseDto {
    return RoleResponseDto.from(this.load(id));
  }

  /**
   * The role's permissions, described rather than listed as strings — the same shape
   * `GET /permissions` returns, so a client can render one screen for both.
   */
  findPermissions(id: string): { rows: PermissionResponseDto[]; meta: PermissionListMetaDto } {
    const details = this.load(id)
      .permissions.map((permission) => permissionDetail(permission))
      // Every permission a role grants is a registry member by construction; the filter is here so a
      // future edit that breaks that assumption drops a row rather than emitting `null` into the array.
      .filter((detail): detail is NonNullable<typeof detail> => detail !== undefined);

    return {
      rows: details.map((detail) => PermissionResponseDto.from(detail)),
      meta: {
        total: details.length,
        groups: PERMISSION_GROUP_KEYS.filter((group) =>
          details.some((detail) => detail.group === group),
        ),
      },
    };
  }

  private load(id: string): RoleDetail {
    const detail = roleDetail(id);

    if (!detail) {
      throw new NotFoundException({
        code: 'ROLE_NOT_FOUND',
        // The unrecognised value came from the URL and is not reflected back into the body.
        message: 'That is not a role this API recognises.',
      });
    }

    return detail;
  }
}
