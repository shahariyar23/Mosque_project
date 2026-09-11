import 'multer';
import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import {
  CheckInResponseDto,
  CheckInTicketDto,
  CreateEventDto,
  EventDto,
  EventRegistrationDto,
  ListEventRegistrationsQueryDto,
  ListEventsQueryDto,
  MyEventRegistrationDto,
  MyRegistrationsQueryDto,
  PaginatedEventsDto,
  PaginatedEventRegistrationsDto,
  PaginatedMyRegistrationsDto,
  UpdateEventDto,
  VerifyTicketResponseDto,
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
    description:
      'Returns paginated events for the primary mosque, filtered by category, status, search, or date. Accessible without authentication.',
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
      "Returns the authenticated user's own event registrations, including both upcoming and past events. " +
      'Ownership and mosque tenancy are derived from the access token; no userId parameter is accepted.',
  })
  @ApiResponse({ status: 200, type: PaginatedMyRegistrationsDto })
  findMyRegistrations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MyRegistrationsQueryDto,
  ): Promise<PaginatedMyRegistrationsDto | MyEventRegistrationDto[]> {
    return this.eventsService.findMyRegistrations(user, query);
  }

  @Get('my-registrations/:idOrEventId')
  @ApiOperation({
    summary: 'Get single registration for current user',
    description:
      "Returns the user's own registration and entrance ticket details for a given registration ID or event ID.",
  })
  @ApiResponse({ status: 200, type: MyEventRegistrationDto })
  @ApiResponse({ status: 404, description: 'Registration not found.' })
  findMyRegistration(
    @CurrentUser() user: AuthenticatedUser,
    @Param('idOrEventId') idOrEventId: string,
  ): Promise<MyEventRegistrationDto> {
    return this.eventsService.findMyRegistration(user, idOrEventId);
  }

  @Get('verify-ticket/:id')
  @Public()
  @ApiOperation({
    summary: 'Verify event registration ticket',
    description:
      'Public/Admin verification endpoint to validate ticket authenticity, attendee details, and check-in status from a scanned QR pass.',
  })
  @ApiResponse({ status: 200, type: VerifyTicketResponseDto })
  @ApiResponse({ status: 404, description: 'Ticket not found.' })
  verifyTicket(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id') registrationId: string,
  ): Promise<VerifyTicketResponseDto> {
    return this.eventsService.verifyTicket(user?.mosqueId, registrationId);
  }

  @Post('check-in')
  @Permissions('event.update')
  @ApiOperation({
    summary: 'Check in event attendee',
    description:
      'Authorized mosque desk check-in for an event attendee using their registration id or scanned ticket token.',
  })
  @ApiResponse({ status: 200, type: CheckInResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed or cancelled ticket.' })
  @ApiResponse({ status: 403, description: 'Ticket belongs to a different mosque.' })
  @ApiResponse({ status: 404, description: 'Registration not found.' })
  checkInTicket(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckInTicketDto,
  ): Promise<CheckInResponseDto> {
    return this.eventsService.checkInTicket(user, dto.registrationId);
  }

  @Get(':id/registrations')
  @Permissions('event.view')
  @ApiOperation({
    summary: 'List registrations for an event',
    description:
      "Returns the registration rows for a single event, scoped to the authenticated admin's mosque. " +
      "The event is resolved within the admin's mosque first, so a foreign event id resolves to 404. " +
      'Cancelled registrations are excluded unless status=cancelled is requested.',
  })
  @ApiResponse({ status: 200, type: PaginatedEventRegistrationsDto })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  listRegistrations(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ListEventRegistrationsQueryDto,
  ): Promise<PaginatedEventRegistrationsDto | EventRegistrationDto[]> {
    return this.eventsService.listRegistrations(user, id, query);
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

  @Post('upload-image')
  @Permissions('event.create')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload event image',
    description: 'Uploads an event banner or poster to Cloudinary CDN.',
  })
  @ApiResponse({ status: 201, description: 'Image uploaded successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid file or file too large.' })
  async uploadImage(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp|svg\+xml)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<{ url: string; publicId: string }> {
    return this.eventsService.uploadEventImage(user.mosqueId, file);
  }

  @Post(':id/image')
  @Permissions('event.update')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload event image for existing event',
    description: 'Uploads an event banner image and updates the event.',
  })
  @ApiResponse({ status: 201, type: EventDto })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  async uploadImageForEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp|svg\+xml)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<EventDto> {
    return this.eventsService.uploadEventImageForEvent(user, id, file);
  }

  @Post()
  @Permissions('event.create')
  @ApiOperation({
    summary: 'Create event',
    description: 'Creates a new event or programme for the mosque.',
  })
  @ApiResponse({ status: 201, type: EventDto })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEventDto): Promise<EventDto> {
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
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<EventDto> {
    return this.eventsService.remove(user, id);
  }
}
