import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import type { PermissionDetail } from '../types/permission.types';

/**
 * A permission, as the API returns it.
 *
 * Reference data: the same for every caller, and unchanged between deployments. A client fetches this
 * to render a permission editor — the group and resource are what let it draw sections instead of one
 * flat list of 130 checkboxes, and `roles` is what lets it show that ticking a box adds nothing to a
 * treasurer who already has it.
 */
export class PermissionResponseDto {
  @ApiProperty({ example: 'donation.record', description: 'The permission. `resource.action`.' })
  id!: string;

  @ApiProperty({ example: 'donations', description: 'The registry group it is declared in.' })
  group!: string;

  @ApiProperty({ example: 'donation' })
  resource!: string;

  @ApiProperty({ example: 'record' })
  action!: string;

  @ApiProperty({ description: 'Held by every active account, whatever their role.' })
  isBase!: boolean;

  @ApiProperty({
    description: 'Belongs to whoever runs the platform. Withheld from `mosque_admin`.',
  })
  isPlatformOnly!: boolean;

  @ApiProperty({
    enum: Role,
    isArray: true,
    description: 'The roles that already hold this without an individual grant.',
  })
  roles!: Role[];

  static from(detail: PermissionDetail): PermissionResponseDto {
    return {
      id: detail.id,
      group: detail.group,
      resource: detail.resource,
      action: detail.action,
      isBase: detail.isBase,
      isPlatformOnly: detail.isPlatformOnly,
      roles: detail.roles,
    };
  }
}

/** Counts and section names, so a client does not have to derive them from the list. */
export class PermissionListMetaDto {
  @ApiProperty({ example: 130, description: 'Permissions in the registry.' })
  total!: number;

  @ApiProperty({
    type: [String],
    example: ['base', 'dashboard', 'platform'],
    description: 'Group names in registry order.',
  })
  groups!: string[];
}

export class PermissionEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Permission retrieved successfully' })
  message!: string;

  @ApiProperty({ type: PermissionResponseDto })
  data!: PermissionResponseDto;
}

export class PermissionListEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Permissions retrieved successfully' })
  message!: string;

  @ApiProperty({ type: [PermissionResponseDto] })
  data!: PermissionResponseDto[];

  @ApiProperty({ type: PermissionListMetaDto })
  meta!: PermissionListMetaDto;
}
