import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { CreateJumuahDto, JumuahDto, ListJumuahQueryDto, UpdateJumuahDto } from './dto/jumuah.dto';
import { JumuahService } from './jumuah.service';

/**
 * Jumu'ah schedules for the authenticated user's mosque.
 *
 * Every route takes its mosque from the access token. There is no route that accepts a mosque id, and
 * neither DTO declares one, so cross-mosque access is not something the guards have to prevent — it is
 * not expressible in the API.
 *
 * The path is `jummah` because that is what the specification asked for; the permission, the table and
 * this directory use `jumuah`. Both spellings transliterate the same word. See the note in the report.
 */
@ApiTags('Jumu’ah')
@ApiBearerAuth('access-token')
@Controller('jummah')
export class JumuahController {
  constructor(private readonly jumuah: JumuahService) {}

  @Get()
  @Permissions('prayer.view')
  @ApiOperation({
    summary: 'List Jumu’ah schedules',
    description:
      'The standing weekly schedule first, then dated Fridays in calendar order, and within one Friday by jamaat time.',
  })
  @ApiResponse({ status: 200, type: [JumuahDto] })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListJumuahQueryDto,
  ): Promise<JumuahDto[]> {
    return this.jumuah.findAll(user.mosqueId, query);
  }

  @Get(':id')
  @Permissions('prayer.view')
  @ApiOperation({ summary: 'Get one Jumu’ah schedule' })
  @ApiResponse({ status: 200, type: JumuahDto })
  @ApiResponse({ status: 404, description: 'No such entry in this mosque’s schedule.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    // Rejects a malformed id before it reaches Postgres, which would otherwise answer a non-uuid
    // string with a driver-level error rather than a 400.
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JumuahDto> {
    return this.jumuah.findOne(user.mosqueId, id);
  }

  @Post()
  @Permissions('jumuah.manage')
  @ApiOperation({
    summary: 'Create a Jumu’ah schedule',
    description: 'Omit `date` for the standing weekly schedule. A date must fall on a Friday.',
  })
  @ApiResponse({ status: 201, type: JumuahDto })
  @ApiResponse({
    status: 400,
    description: 'Validation failed, the date is not a Friday, or an unknown field was sent.',
  })
  @ApiResponse({ status: 403, description: 'Missing `jumuah.manage`.' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateJumuahDto): Promise<JumuahDto> {
    return this.jumuah.create(user.mosqueId, dto);
  }

  @Patch(':id')
  @Permissions('jumuah.manage')
  @ApiOperation({ summary: 'Update a Jumu’ah schedule' })
  @ApiResponse({ status: 200, type: JumuahDto })
  @ApiResponse({ status: 404, description: 'No such entry in this mosque’s schedule.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJumuahDto,
  ): Promise<JumuahDto> {
    return this.jumuah.update(user.mosqueId, id, dto);
  }

  @Delete(':id')
  @Permissions('jumuah.manage')
  @ApiOperation({
    summary: 'Delete a Jumu’ah schedule',
    description:
      'Removes the entry and returns it. To keep a record without publishing it, PATCH `isActive` to false instead.',
  })
  @ApiResponse({ status: 200, type: JumuahDto })
  @ApiResponse({ status: 404, description: 'No such entry in this mosque’s schedule.' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JumuahDto> {
    return this.jumuah.remove(user.mosqueId, id);
  }
}
