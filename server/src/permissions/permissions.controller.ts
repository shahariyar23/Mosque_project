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

import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionEnvelopeDto, PermissionListEnvelopeDto } from './dto/permission-response.dto';
import { PermissionsService } from './permissions.service';

/**
 * The permission registry, over HTTP.
 *
 * Read-only. There is no POST, PATCH or DELETE here and there will not be: a permission exists because
 * code names it, so inventing one through an API would produce a string that grants nothing.
 *
 * Gated on `user.view` rather than left open. The registry is not a secret, but publishing the complete
 * shape of the authorization model to anonymous callers hands an attacker the vocabulary to aim at, and
 * the only screens that need it are the user-management ones, which hold `user.view` already.
 */
@ApiTags('Permissions')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'No valid access token was sent.' })
@ApiForbiddenResponse({ description: 'Authenticated, but without `user.view`.' })
@Controller('permissions')
@Permissions('user.view')
export class PermissionsController {
  constructor(private readonly permissions: PermissionsService) {}

  @Get()
  @ApiOperation({
    summary: 'List every permission.',
    description:
      'The whole registry, in declaration order, with the group each permission belongs to and the ' +
      'roles that already carry it. Not paginated: the set is fixed at build time and small enough ' +
      'to cache client-side for the life of a session.',
  })
  @ApiOkResponse({ description: 'Every permission.', type: PermissionListEnvelopeDto })
  findAll(): PermissionListEnvelopeDto {
    const { rows, meta } = this.permissions.findMany();

    return {
      success: true,
      message: 'Permissions retrieved successfully',
      data: rows,
      meta,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Read one permission.',
    description: 'Useful for resolving a permission stored on a user into something displayable.',
  })
  @ApiParam({
    name: 'id',
    example: 'donation.record',
    description: 'The permission, in `resource.action` form.',
  })
  @ApiOkResponse({ description: 'The permission.', type: PermissionEnvelopeDto })
  @ApiNotFoundResponse({ description: 'No such permission in the registry.' })
  findOne(@Param('id') id: string): PermissionEnvelopeDto {
    return {
      success: true,
      message: 'Permission retrieved successfully',
      data: this.permissions.findOne(id),
    };
  }
}
