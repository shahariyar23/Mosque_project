import { Injectable, NotFoundException } from '@nestjs/common';

import { PermissionListMetaDto, PermissionResponseDto } from './dto/permission-response.dto';
import {
  PERMISSION_DETAILS,
  PERMISSION_GROUP_KEYS,
  permissionDetail,
} from './types/permission.types';

/**
 * Reads the permission registry. Read-only, and deliberately so.
 *
 * There is no constructor and no `PrismaService`: permissions are compile-time constants, not rows.
 * Nothing creates, renames or deletes one at runtime, because a permission only means anything if some
 * guard or service names it in code — a row in a table saying `finance.invent` would grant exactly
 * nothing. Adding one is a code change, which is also what makes it reviewable.
 */
@Injectable()
export class PermissionsService {
  findMany(): { rows: PermissionResponseDto[]; meta: PermissionListMetaDto } {
    return {
      rows: PERMISSION_DETAILS.map((detail) => PermissionResponseDto.from(detail)),
      meta: { total: PERMISSION_DETAILS.length, groups: [...PERMISSION_GROUP_KEYS] },
    };
  }

  findOne(id: string): PermissionResponseDto {
    const detail = permissionDetail(id);

    if (!detail) {
      throw new NotFoundException({
        code: 'PERMISSION_NOT_FOUND',
        // The unrecognised value is not echoed back: it arrived in the URL and reflecting it into a
        // response body is how a 404 page becomes an injection surface.
        message: 'That is not a permission this API recognises.',
      });
    }

    return PermissionResponseDto.from(detail);
  }
}
