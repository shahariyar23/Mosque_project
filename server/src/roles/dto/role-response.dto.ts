import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import type { RoleDetail } from '../types/role.types';

/**
 * A role, as the API returns it.
 *
 * The permission list is the resolved set — base permissions folded in — so a client showing "what does
 * a treasurer get?" does not have to re-implement the resolver to answer it.
 */
export class RoleResponseDto {
  @ApiProperty({ enum: Role, example: Role.treasurer })
  id!: Role;

  @ApiProperty({ example: 'Treasurer', description: 'For display.' })
  name!: string;

  @ApiProperty({
    example: 'Owns the finance module — funds, salaries, reports. Prepares payments for approval.',
  })
  description!: string;

  @ApiProperty({
    type: [String],
    example: ['dashboard.view', 'finance.manage'],
    description: 'Everything the role resolves to, base permissions included, sorted.',
  })
  permissions!: string[];

  @ApiProperty({ example: 42 })
  permissionCount!: number;

  @ApiProperty({
    description: 'Reaches beyond one mosque: holds at least one platform permission.',
  })
  isPlatformRole!: boolean;

  static from(detail: RoleDetail): RoleResponseDto {
    return {
      id: detail.id,
      name: detail.name,
      description: detail.description,
      // Copied: the caller receives a response object, not a handle on the compile-time registry.
      permissions: [...detail.permissions],
      permissionCount: detail.permissionCount,
      isPlatformRole: detail.isPlatformRole,
    };
  }
}

export class RoleListMetaDto {
  @ApiProperty({ example: 7, description: 'Roles defined in the schema.' })
  total!: number;
}

export class RoleEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Role retrieved successfully' })
  message!: string;

  @ApiProperty({ type: RoleResponseDto })
  data!: RoleResponseDto;
}

export class RoleListEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Roles retrieved successfully' })
  message!: string;

  @ApiProperty({ type: [RoleResponseDto] })
  data!: RoleResponseDto[];

  @ApiProperty({ type: RoleListMetaDto })
  meta!: RoleListMetaDto;
}
