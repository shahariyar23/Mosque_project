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

import { Permissions } from '../common/decorators/permissions.decorator';
import { CreateVolunteerDto } from './dto/create-volunteer.dto';
import { UpdateVolunteerStatusDto } from './dto/update-volunteer-status.dto';
import { UpdateVolunteerDto } from './dto/update-volunteer.dto';
import { VolunteerQueryDto } from './dto/volunteer-query.dto';
import {
  DeletedVolunteerEnvelopeDto,
  VolunteerEnvelopeDto,
  VolunteerListEnvelopeDto,
} from './dto/volunteer-response.dto';
import { VolunteersService } from './volunteers.service';

/**
 * The volunteer roster: the people who have offered to help, and what they can help with.
 *
 * A volunteer is a *user*, not a kind of account. There is no `volunteer` role and no second person
 * record — the row behind these endpoints hangs off a User and adds four facts about volunteering. So
 * the same person appears in the members directory, possibly on the committee, and here; and the
 * treasurer who helps at iftar is `role = treasurer` with an active roster entry. Nothing in this file
 * reads or writes a role, and no permission check anywhere in the system reads `Volunteer.status`.
 *
 * Every route lives under `/api/v1/volunteers` — the global prefix plus URI versioning, both set in
 * `main.ts`, so neither appears here.
 *
 * Each method takes a validated DTO, calls the service, wraps the result in the response envelope, and
 * does nothing else. No route builds a query and no route decides who may see what: the first belongs to
 * the service, the second to the guards. There is no `if (user.role === ...)` in this file — a role check
 * in a controller is a second authorization model that nothing tests and nobody audits.
 *
 * Every route is closed twice over: the global authentication guard refuses a request with no token, and
 * `PermissionsGuard` then refuses one whose holder lacks the permission named. The two used are the
 * registry's existing governance permissions rather than new ones — `volunteer.view` to read the roster,
 * `volunteer.manage` to change it — because they already exist for exactly this purpose and the secretary
 * role already carries both.
 */
@ApiTags('Volunteers')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'No valid access token was sent.' })
@Controller('volunteers')
export class VolunteersController {
  constructor(private readonly volunteers: VolunteersService) {}

  @Post()
  @Permissions('volunteer.manage')
  @ApiOperation({
    summary: 'Enrol an existing user as a volunteer.',
    description:
      'Requires `volunteer.manage`. The body references a user who already exists — no account is ' +
      'created here, and an unknown `userId` is a 400. One person can hold one roster entry, so ' +
      'enrolling someone twice is a 409. The user’s role is not touched.',
  })
  @ApiCreatedResponse({ description: 'The volunteer was enrolled.', type: VolunteerEnvelopeDto })
  @ApiBadRequestResponse({
    description: 'A field failed validation, or no such user exists.',
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `volunteer.manage`.' })
  @ApiConflictResponse({ description: 'This user is already a volunteer.' })
  async create(@Body() dto: CreateVolunteerDto): Promise<VolunteerEnvelopeDto> {
    return {
      success: true,
      message: 'Volunteer created successfully',
      data: await this.volunteers.create(dto),
    };
  }

  @Get()
  @Permissions('volunteer.view')
  @ApiOperation({
    summary: 'List volunteers.',
    description:
      'Requires `volunteer.view`. Paginated, newest first, capped at 100 rows per page. `search` ' +
      'matches the person’s name, email and phone; `status` filters on the roster state. Volunteers ' +
      'whose account has been deleted are never listed. Each row carries the user through the ' +
      'relationship, using the same safe projection the users endpoints use.',
  })
  @ApiOkResponse({ description: 'A page of volunteers.', type: VolunteerListEnvelopeDto })
  @ApiBadRequestResponse({ description: 'A query parameter failed validation.' })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `volunteer.view`.' })
  async findAll(@Query() query: VolunteerQueryDto): Promise<VolunteerListEnvelopeDto> {
    const { rows, meta } = await this.volunteers.findMany(query);

    return {
      success: true,
      message: 'Volunteers retrieved successfully',
      data: rows,
      meta,
    };
  }

  @Get(':id')
  @Permissions('volunteer.view')
  @ApiOperation({
    summary: 'Read one volunteer.',
    description:
      'Requires `volunteer.view`. Returns the roster entry with the person attached: no password hash, ' +
      'no reset token, no session material — the projection cannot read them.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'The volunteer id, not the user id.' })
  @ApiOkResponse({ description: 'The volunteer.', type: VolunteerEnvelopeDto })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `volunteer.view`.' })
  @ApiNotFoundResponse({ description: 'No such volunteer, or their account has been deleted.' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<VolunteerEnvelopeDto> {
    return {
      success: true,
      message: 'Volunteer retrieved successfully',
      data: await this.volunteers.findOne(id),
    };
  }

  @Patch(':id')
  @Permissions('volunteer.manage')
  @ApiOperation({
    summary: 'Update a volunteer’s roster entry.',
    description:
      'Requires `volunteer.manage`. Updates `skills`, `availability`, `notes` and `status`. `userId` is ' +
      'rejected — a roster entry belongs to the person it was created for, and moving it would rewrite ' +
      'whose history this is. Nothing here changes the user’s profile, role or permissions.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'The volunteer id, not the user id.' })
  @ApiOkResponse({ description: 'The updated volunteer.', type: VolunteerEnvelopeDto })
  @ApiBadRequestResponse({ description: 'A field failed validation, or is not updatable here.' })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `volunteer.manage`.' })
  @ApiNotFoundResponse({ description: 'No such volunteer, or their account has been deleted.' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVolunteerDto,
  ): Promise<VolunteerEnvelopeDto> {
    return {
      success: true,
      message: 'Volunteer updated successfully',
      data: await this.volunteers.update(id, dto),
    };
  }

  @Patch(':id/status')
  @Permissions('volunteer.manage')
  @ApiOperation({
    summary: 'Change a volunteer’s roster status.',
    description:
      'Requires `volunteer.manage`. Sets `status` and nothing else. This does **not** change the user’s ' +
      'role or permissions: a treasurer taken off the roster is still the treasurer. `on_leave` is for ' +
      'someone expected back, so a coordinator need not delete the record to say they are away.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'The volunteer id, not the user id.' })
  @ApiOkResponse({ description: 'The volunteer, with the new status.', type: VolunteerEnvelopeDto })
  @ApiBadRequestResponse({ description: 'The status is not one of active, inactive, on_leave.' })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `volunteer.manage`.' })
  @ApiNotFoundResponse({ description: 'No such volunteer, or their account has been deleted.' })
  async setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVolunteerStatusDto,
  ): Promise<VolunteerEnvelopeDto> {
    return {
      success: true,
      message: 'Volunteer status updated successfully',
      data: await this.volunteers.setStatus(id, dto),
    };
  }

  @Delete(':id')
  @Permissions('volunteer.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove a volunteer from the roster.',
    description:
      'Requires `volunteer.manage`. Deletes the roster entry, not the person: their account, membership ' +
      'and history are untouched, and they can be enrolled again. Prefer `PATCH /:id/status` when they ' +
      'may return. Deleting twice is a 404.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'The volunteer id, not the user id.' })
  @ApiOkResponse({
    description: 'The roster entry was removed. The user still exists.',
    type: DeletedVolunteerEnvelopeDto,
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `volunteer.manage`.' })
  @ApiNotFoundResponse({ description: 'No such volunteer, or it was already removed.' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<DeletedVolunteerEnvelopeDto> {
    return {
      success: true,
      message: 'Volunteer deleted successfully',
      data: await this.volunteers.remove(id),
    };
  }
}
