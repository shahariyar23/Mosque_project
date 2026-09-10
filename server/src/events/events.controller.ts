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
import { Public } from '../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import {
  CreateEventDto,
  EventDto,
  ListEventsQueryDto,
  MyEventRegistrationDto,
  MyRegistrationsQueryDto,
  PaginatedEventsDto,
  PaginatedMyRegistrationsDto,
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
  @Public()
  @ApiOperation({
    summary: 'List events',
    description: 'Returns paginated events for the primary mosque, filtered by category, status, search, or date. Accessible without authentication.',
  })
  @ApiResponse({ status: 200, type: PaginatedEventsDto })
  findAll(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: ListEventsQueryDto,
  ): Promise<PaginatedEventsDto | EventDto[]> {
    // For unauthenticated users, pass undefined and service will use primary mosque
    const mosqueId = user?.mosqueId;
    return this.eventsService.findAll(mosqueId, query);
  }

  @Get('my-registrations')
  @ApiOperation({
    summary: 'My registered events',
    description:
      'Returns the authenticated user\'s own event registrations, including both upcoming and past events. ' +
      'Ownership and mosque tenancy are derived from the access token; no userId parameter is accepted.',
  })
  @ApiResponse({ status: 200, type: PaginatedMyRegistrationsDto })
  findMyRegistrations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MyRegistrationsQueryDto,
  ): Promise<PaginatedMyRegistrationsDto | MyEventRegistrationDto[]> {
    return this.eventsService.findMyRegistrations(user, query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get single event',
    description: 'Returns event details by UUID id or URL slug. Accessible without authentication.',
  })
  @ApiResponse({ status: 200, type: EventDto })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id') idOrSlug: string,
  ): Promise<EventDto> {
    // For unauthenticated users, pass undefined and service will use primary mosque
    const mosqueId = user?.mosqueId;
    return this.eventsService.findOne(mosqueId, idOrSlug);
  }

  @Post(':id/register')
  @ApiOperation({
    summary: 'Register current user for an event',
    description:
      'Creates an event registration for the authenticated user. Rejects duplicates and full events.',
  })
  @ApiResponse({ status: 201, type: MyEventRegistrationDto })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  @ApiResponse({ status: 409, description: 'Already registered or event is full.' })
  registerCurrentUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') eventId: string,
  ): Promise<MyEventRegistrationDto> {
    return this.eventsService.registerCurrentUser(user, eventId);
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

