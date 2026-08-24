import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserPermissionsDto } from './dto/update-user-permissions.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import {
  DeletedUserEnvelopeDto,
  UserEnvelopeDto,
  UserListEnvelopeDto,
} from './dto/user-response.dto';
import { UsersService } from './users.service';

/**
 * The user directory: the accounts that can sign in to run the mosque.
 *
 * Every route lives under `/api/v1/users` — the global prefix plus URI versioning, both set in
 * `main.ts`, so neither appears here.
 *
 * The methods below do four things each: take a validated DTO, call the service, wrap the result in the
 * response envelope, and nothing else. No route builds a query, and no route decides what a user is
 * allowed to see — the first belongs to the service and the second to the guards.
 *
 * Where a route needs authority, it says so with `@Permissions()` and the global `PermissionsGuard`
 * answers. There is no `if (user.role === ...)` anywhere in this file, and there should never be: a role
 * check in a controller is a second authorization model that nothing tests and nobody audits.
 *
 * The two assignment routes are closed twice over: the global authentication guard refuses a request with
 * no token, and `PermissionsGuard` then refuses one whose holder lacks the permission named. The Part 1
 * routes carry no permission metadata, so they are closed by authentication alone — which is what the
 * global guard being registered means, and why the directory is no longer reachable anonymously.
 */
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a user.',
    description:
      'The account starts as a `member`; role, positions and permissions are assigned by their own ' +
      'endpoints. The password is used once to derive an Argon2id hash and is never returned.',
  })
  @ApiCreatedResponse({ description: 'The user was created.', type: UserEnvelopeDto })
  @ApiBadRequestResponse({
    description: 'A field failed validation, or the mosque does not exist.',
  })
  @ApiConflictResponse({ description: 'The email or phone is already in use within this mosque.' })
  async create(@Body() dto: CreateUserDto): Promise<UserEnvelopeDto> {
    return {
      success: true,
      message: 'User created successfully',
      data: await this.users.create(dto),
    };
  }

  @Get()
  @ApiOperation({
    summary: 'List users.',
    description:
      'Paginated, newest first. Soft-deleted accounts are never listed. `search` matches name, ' +
      'email and phone; `status` filters on `isActive`.',
  })
  @ApiOkResponse({ description: 'A page of users.', type: UserListEnvelopeDto })
  @ApiBadRequestResponse({ description: 'A query parameter failed validation.' })
  async findAll(@Query() query: UserQueryDto): Promise<UserListEnvelopeDto> {
    const { rows, meta } = await this.users.findMany(query);

    return {
      success: true,
      message: 'Users retrieved successfully',
      data: rows,
      meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read one user.' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'The user id.' })
  @ApiOkResponse({ description: 'The user.', type: UserEnvelopeDto })
  @ApiNotFoundResponse({ description: 'No such user, or the account has been deleted.' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserEnvelopeDto> {
    return {
      success: true,
      message: 'User retrieved successfully',
      data: await this.users.findOne(id),
    };
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a user’s profile.',
    description:
      'Profile fields only. `role`, `permissions`, `password`, `status` and `mosqueId` are rejected ' +
      'here — each has its own operation. Changing the email clears its verification.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'The user id.' })
  @ApiOkResponse({ description: 'The updated user.', type: UserEnvelopeDto })
  @ApiBadRequestResponse({ description: 'A field failed validation, or is not updatable here.' })
  @ApiNotFoundResponse({ description: 'No such user, or the account has been deleted.' })
  @ApiConflictResponse({ description: 'The email or phone is already in use within this mosque.' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserEnvelopeDto> {
    return {
      success: true,
      message: 'User updated successfully',
      data: await this.users.update(id, dto),
    };
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Activate or suspend a user.',
    description:
      'Sets `isActive`. Suspending an account revokes every permission it holds, base permissions ' +
      'included, so this is an access change rather than a profile edit.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'The user id.' })
  @ApiOkResponse({ description: 'The user, with the new status.', type: UserEnvelopeDto })
  @ApiBadRequestResponse({ description: 'The status is not one of active, inactive.' })
  @ApiNotFoundResponse({ description: 'No such user, or the account has been deleted.' })
  async setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ): Promise<UserEnvelopeDto> {
    return {
      success: true,
      message: 'User status updated successfully',
      data: await this.users.setStatus(id, dto),
    };
  }

  @Patch(':id/role')
  @Permissions('role.assign')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Assign a role.',
    description:
      'Replaces the role — a user holds exactly one. Requires `role.assign`. Granting or removing a ' +
      'role that carries platform authority additionally requires `platform.manage`, and nobody may ' +
      'change their own role. The role in the body is validated against the schema enum; the caller’s ' +
      'own role is read from their token, never from the request.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'The user id.' })
  @ApiOkResponse({ description: 'The user, with the new role.', type: UserEnvelopeDto })
  @ApiBadRequestResponse({ description: 'The role is not one of the roles this API defines.' })
  @ApiUnauthorizedResponse({ description: 'No valid access token was sent.' })
  @ApiForbiddenResponse({
    description: 'Without `role.assign`, changing your own role, or reaching above your authority.',
  })
  @ApiNotFoundResponse({ description: 'No such user, or the account has been deleted.' })
  async setRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserEnvelopeDto> {
    return {
      success: true,
      message: 'User role updated successfully',
      data: await this.users.setRole(id, dto, actor),
    };
  }

  @Patch(':id/permissions')
  @Permissions('permission.assign')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Set individual permissions and denials.',
    description:
      'Layers grants and denials on top of the role. Requires `permission.assign`. Each array replaces ' +
      'the column it names; omit one to leave it alone. Every value must be a permission this API ' +
      'declares — see `GET /permissions`. The caller may only grant, or lift a denial of, a permission ' +
      'they hold themselves.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'The user id.' })
  @ApiOkResponse({ description: 'The user, with the new permissions.', type: UserEnvelopeDto })
  @ApiBadRequestResponse({
    description: 'A value is not a known permission, or neither array was sent.',
  })
  @ApiUnauthorizedResponse({ description: 'No valid access token was sent.' })
  @ApiForbiddenResponse({
    description: 'Without `permission.assign`, or reaching beyond the caller’s own permissions.',
  })
  @ApiNotFoundResponse({ description: 'No such user, or the account has been deleted.' })
  async setPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserPermissionsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserEnvelopeDto> {
    return {
      success: true,
      message: 'User permissions updated successfully',
      data: await this.users.setPermissions(id, dto, actor),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a user.',
    description:
      'A soft delete. The row stays so that donations they recorded and audit entries naming them ' +
      'keep resolving; the account is deactivated and its sessions revoked. Deleting twice is a 404.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'The user id.' })
  @ApiOkResponse({ description: 'The user was deleted.', type: DeletedUserEnvelopeDto })
  @ApiNotFoundResponse({ description: 'No such user, or the account was already deleted.' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<DeletedUserEnvelopeDto> {
    return {
      success: true,
      message: 'User deleted successfully',
      data: await this.users.remove(id),
    };
  }
}
