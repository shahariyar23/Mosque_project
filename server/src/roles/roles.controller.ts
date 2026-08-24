import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionListEnvelopeDto } from '../permissions/dto/permission-response.dto';
import { RoleEnvelopeDto, RoleListEnvelopeDto } from './dto/role-response.dto';
import { RolesService } from './roles.service';

/**
 * The roles, over HTTP.
 *
 * Read-only, like the permission registry. There is no create-a-role endpoint: a role is a value in the
 * Prisma enum and a key in the role map, so one invented at runtime would grant nothing but the base
 * set. Changing who holds a role is `PATCH /users/:id/role`.
 *
 * Gated on `user.view`: the callers who need this are the user-management screens, and they hold it.
 */
@ApiTags('Roles')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'No valid access token was sent.' })
@ApiForbiddenResponse({ description: 'Authenticated, but without `user.view`.' })
@Controller('roles')
@Permissions('user.view')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @ApiOperation({
    summary: 'List the roles.',
    description:
      'All seven, most privileged first, each with its resolved permission set. Not paginated — the ' +
      'set is fixed in the schema.',
  })
  @ApiOkResponse({ description: 'Every role.', type: RoleListEnvelopeDto })
  findAll(): RoleListEnvelopeDto {
    const { rows, meta } = this.roles.findMany();

    return {
      success: true,
      message: 'Roles retrieved successfully',
      data: rows,
      meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read one role.' })
  @ApiParam({ name: 'id', enum: Role, example: Role.treasurer })
  @ApiOkResponse({ description: 'The role.', type: RoleEnvelopeDto })
  @ApiNotFoundResponse({ description: 'No such role.' })
  findOne(@Param('id') id: string): RoleEnvelopeDto {
    return {
      success: true,
      message: 'Role retrieved successfully',
      data: this.roles.findOne(id),
    };
  }

  @Get(':id/permissions')
  @ApiOperation({
    summary: "Describe the role's permissions.",
    description:
      'The same objects `GET /permissions` returns, narrowed to what this role resolves to. Base ' +
      'permissions are included, because the role does in fact grant them.',
  })
  @ApiParam({ name: 'id', enum: Role, example: Role.treasurer })
  @ApiOkResponse({ description: "The role's permissions.", type: PermissionListEnvelopeDto })
  @ApiNotFoundResponse({ description: 'No such role.' })
  findPermissions(@Param('id') id: string): PermissionListEnvelopeDto {
    const { rows, meta } = this.roles.findPermissions(id);

    return {
      success: true,
      message: 'Role permissions retrieved successfully',
      data: rows,
      meta,
    };
  }
}
