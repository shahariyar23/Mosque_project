import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import {
  CreateEventDto,
  EventDto,
  ListEventsQueryDto,
  PaginatedEventsDto,
  UpdateEventDto,
} from './dto/event.dto';
import { EventsService } from './events.service';

/**
 * Mosque programmes and community events.
 */
@ApiTags('Events')
@ApiBearerAuth('access-token')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @Permissions('event.view')
  @ApiOperation({
    summary: 'List events',
    description: 'Returns paginated events for the authenticated mosque, filtered by category, status, search, or date.',
  })
  @ApiResponse({ status: 200, type: PaginatedEventsDto })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListEventsQueryDto,
  ): Promise<PaginatedEventsDto | EventDto[]> {
    return this.eventsService.findAll(user.mosqueId, query);
  }

  @Get(':id')
  @Permissions('event.view')
  @ApiOperation({
    summary: 'Get single event',
    description: 'Returns event details by UUID id or URL slug.',
  })
  @ApiResponse({ status: 200, type: EventDto })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') idOrSlug: string,
  ): Promise<EventDto> {
    return this.eventsService.findOne(user.mosqueId, idOrSlug);
  }

  @Post()
  @Permissions('event.create')
  @ApiOperation({
    summary: 'Create event',
    description: 'Creates a new event or programme for the mosque.',
  })
  @ApiResponse({ status: 201, type: EventDto })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEventDto,
  ): Promise<EventDto> {
    return this.eventsService.create(user, dto);
  }

  @Patch(':id')
  @Permissions('event.update')
  @ApiOperation({
    summary: 'Update event',
    description: 'Updates an existing event.',
  })
  @ApiResponse({ status: 200, type: EventDto })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ): Promise<EventDto> {
    return this.eventsService.update(user, id, dto);
  }

  @Delete(':id')
  @Permissions('event.delete')
  @ApiOperation({
    summary: 'Delete event',
    description: 'Cancels / soft-deletes an event.',
  })
  @ApiResponse({ status: 200, type: EventDto })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<EventDto> {
    return this.eventsService.remove(user, id);
  }
}

