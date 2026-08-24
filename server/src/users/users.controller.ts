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
import { AnyPermission, Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserPermissionsDto } from './dto/update-user-permissions.dto';
import { UpdateUserPositionsDto } from './dto/update-user-positions.dto';
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
 * This is also the Members directory. There is no `Member` model and no `/members` endpoint, because a
 * member and a user are the same person — someone who belongs to the mosque — and modelling them twice
 * would mean two rows for one human being, drifting apart from the first edit. The frontend's Members
 * page is a business view over these records, filtered by role and position.
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
 * Every route is closed twice over: the global authentication guard refuses a request with no token, and
 * `PermissionsGuard` then refuses one whose holder lacks the permission named. The permissions used are
 * the registry's existing ones and divide along the obvious line — `user.view` to read the directory,
 * `user.manage` to change it, and the three `*.assign` permissions for the columns the permission
 * resolver reads.
 *
 * `PATCH /:id` is the one route that takes two permissions rather than one. It is the endpoint a person
 * edits their own profile through, so gating it on `user.manage` alone would mean nobody could correct
 * their own phone number without being able to edit everyone's. It admits `user.manage` or the base
 * `profile.manageOwn` and the service settles which record the caller reached — ownership is a query
 * concern, not a permission, so `@AnyPermission` opens the door and `scopeFor` decides how far in.
 */
@ApiTags('Users')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'No valid access token was sent.' })
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @Permissions('user.manage')
  @ApiOperation({
    summary: 'Create a user.',
    description:
      'Requires `user.manage`. The account starts as a `member`; role, positions and permissions are ' +
      'assigned by their own endpoints. The password is used once to derive an Argon2id hash and is ' +
      'never returned.',
  })
  @ApiCreatedResponse({ description: 'The user was created.', type: UserEnvelopeDto })
  @ApiBadRequestResponse({
    description: 'A field failed validation, or the mosque does not exist.',
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `user.manage`.' })
  @ApiConflictResponse({ description: 'The email or phone is already in use within this mosque.' })
  async create(@Body() dto: CreateUserDto): Promise<UserEnvelopeDto> {
    return {
      success: true,
      message: 'User created successfully',
      data: await this.users.create(dto),
    };
  }

  @Get()
  @Permissions('user.view')
  @ApiOperation({
    summary: 'List users.',
    description:
      'Requires `user.view`. Paginated, newest first, capped at 100 rows per page. Soft-deleted ' +
      'accounts are never listed. `search` matches name, email and phone; `status` filters on ' +
      '`isActive`; `role` matches the single role an account holds; `position` matches anyone whose ' +
      'committee posts include the one named. This is also the Members list — a member is a user.',
  })
  @ApiOkResponse({ description: 'A page of users.', type: UserListEnvelopeDto })
  @ApiBadRequestResponse({ description: 'A query parameter failed validation.' })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `user.view`.' })
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
  @Permissions('user.view')
  @ApiOperation({
    summary: 'Read one user.',
    description:
      'Requires `user.view`. Returns the same safe projection as the list: no password hash, no reset ' +
      'token, no session material. To read your own account without `user.view`, use `GET /auth/me`.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'The user id.' })
  @ApiOkResponse({ description: 'The user.', type: UserEnvelopeDto })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `user.view`.' })
  @ApiNotFoundResponse({ description: 'No such user, or the account has been deleted.' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserEnvelopeDto> {
    return {
      success: true,
      message: 'User retrieved successfully',
      data: await this.users.findOne(id),
    };
  }

  @Patch(':id')
  @AnyPermission('user.manage', 'profile.manageOwn')
  @ApiOperation({
    summary: 'Update a user’s profile.',
    description:
      'Profile fields only. `role`, `permissions`, `password`, `status` and `mosqueId` are rejected ' +
      'here — each has its own operation, and a rejected field is a 400 rather than a silent no-op. ' +
      'With `user.manage` this edits anyone; with only the base `profile.manageOwn` it edits the ' +
      'caller’s own record and refuses any other. Changing the email clears its verification.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'The user id.' })
  @ApiOkResponse({ description: 'The updated user.', type: UserEnvelopeDto })
  @ApiBadRequestResponse({ description: 'A field failed validation, or is not updatable here.' })
  @ApiForbiddenResponse({
    description: 'Editing someone else’s profile without `user.manage`.',
  })
  @ApiNotFoundResponse({ description: 'No such user, or the account has been deleted.' })
  @ApiConflictResponse({ description: 'The email or phone is already in use within this mosque.' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserEnvelopeDto> {
    return {
      success: true,
      message: 'User updated successfully',
      data: await this.users.update(id, dto, actor),
    };
  }

  @Patch(':id/status')
  @Permissions('user.manage')
  @ApiOperation({
    summary: 'Activate or suspend a user.',
    description:
      'Requires `user.manage`. Sets `isActive`. Suspending an account revokes every permission it ' +
      'holds, base permissions included, so this is an access change rather than a profile edit — and ' +
      'it is the reversible alternative to deletion.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'The user id.' })
  @ApiOkResponse({ description: 'The user, with the new status.', type: UserEnvelopeDto })
  @ApiBadRequestResponse({ description: 'The status is not one of active, inactive.' })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `user.manage`.' })
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

  @Patch(':id/positions')
  @Permissions('position.assign')
  @ApiOperation({
    summary: 'Assign committee positions.',
    description:
      'Requires `position.assign`. Replaces `positions` — a person holds any number of posts, and the ' +
      'same person is often treasurer and cashier. A position is a label and grants nothing: no value ' +
      'sent here affects any permission check, and there is no `president` role for exactly that ' +
      'reason. It has its own endpoint because the public leadership list is generated from this ' +
      'column, so a member editing their own profile must not be able to write it.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'The user id.' })
  @ApiOkResponse({ description: 'The user, with the new positions.', type: UserEnvelopeDto })
  @ApiBadRequestResponse({
    description: 'A value is not one of the committee positions this API defines.',
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `position.assign`.' })
  @ApiNotFoundResponse({ description: 'No such user, or the account has been deleted.' })
  async setPositions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserPositionsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserEnvelopeDto> {
    return {
      success: true,
      message: 'User positions updated successfully',
      data: await this.users.setPositions(id, dto, actor),
    };
  }

  @Patch(':id/permissions')
  @Permissions('permission.assign')
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
  @Permissions('user.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a user.',
    description:
      'Requires `user.manage`. A soft delete, and the destructive-looking option that is not actually ' +
      'destructive: the row stays so that donations they recorded and audit entries naming them keep ' +
      'resolving, the account is deactivated and its sessions revoked. Prefer `PATCH /:id/status` when ' +
      'the person may return. Deleting twice is a 404.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'The user id.' })
  @ApiOkResponse({ description: 'The user was deleted.', type: DeletedUserEnvelopeDto })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `user.manage`.' })
  @ApiNotFoundResponse({ description: 'No such user, or the account was already deleted.' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<DeletedUserEnvelopeDto> {
    return {
      success: true,
      message: 'User deleted successfully',
      data: await this.users.remove(id),
    };
  }
}
