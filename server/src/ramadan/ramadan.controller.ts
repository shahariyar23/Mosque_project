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
import {
  CreateRamadanDto,
  ListRamadanQueryDto,
  RamadanDto,
  UpdateRamadanDto,
} from './dto/ramadan.dto';
import { RamadanService } from './ramadan.service';

/**
 * Ramadan schedules for the authenticated user's mosque.
 *
 * As with Jumu'ah, no route accepts a mosque id and no DTO declares one, so cross-mosque access is not
 * something a guard has to catch — the API has no way to express it.
 */
@ApiTags('Ramadan')
@ApiBearerAuth('access-token')
@Controller('ramadan')
export class RamadanController {
  constructor(private readonly ramadan: RamadanService) {}

  @Get()
  @Permissions('prayer.view')
  @ApiOperation({
    summary: 'List Ramadan schedules',
    description: 'Most recent Hijri year first, each year in calendar order. Filter with `?year=`.',
  })
  @ApiResponse({ status: 200, type: [RamadanDto] })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListRamadanQueryDto,
  ): Promise<RamadanDto[]> {
    return this.ramadan.findAll(user.mosqueId, query);
  }

  @Get(':id')
  @Permissions('prayer.view')
  @ApiOperation({ summary: 'Get one day’s Ramadan schedule' })
  @ApiResponse({ status: 200, type: RamadanDto })
  @ApiResponse({ status: 404, description: 'No such entry in this mosque’s schedule.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RamadanDto> {
    return this.ramadan.findOne(user.mosqueId, id);
  }

  @Post()
  @Permissions('ramadan.manage')
  @ApiOperation({ summary: 'Create a day’s Ramadan schedule' })
  @ApiResponse({ status: 201, type: RamadanDto })
  @ApiResponse({ status: 400, description: 'Validation failed, or an unknown field was sent.' })
  @ApiResponse({ status: 403, description: 'Missing `ramadan.manage`.' })
  @ApiResponse({ status: 409, description: 'This mosque already has a schedule for that day.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRamadanDto,
  ): Promise<RamadanDto> {
    return this.ramadan.create(user.mosqueId, dto);
  }

  @Patch(':id')
  @Permissions('ramadan.manage')
  @ApiOperation({ summary: 'Update a day’s Ramadan schedule' })
  @ApiResponse({ status: 200, type: RamadanDto })
  @ApiResponse({ status: 404, description: 'No such entry in this mosque’s schedule.' })
  @ApiResponse({ status: 409, description: 'Another entry already covers that day.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRamadanDto,
  ): Promise<RamadanDto> {
    return this.ramadan.update(user.mosqueId, id, dto);
  }

  @Delete(':id')
  @Permissions('ramadan.manage')
  @ApiOperation({
    summary: 'Delete a day’s Ramadan schedule',
    description: 'Removes the entry and returns it.',
  })
  @ApiResponse({ status: 200, type: RamadanDto })
  @ApiResponse({ status: 404, description: 'No such entry in this mosque’s schedule.' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RamadanDto> {
    return this.ramadan.remove(user.mosqueId, id);
  }
}
