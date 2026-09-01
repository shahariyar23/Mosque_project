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
  BookingDto,
  BookingStatsDto,
  CreateBookingDto,
  ListBookingsQueryDto,
  PaginatedBookingsDto,
  UpdateBookingDto,
  UpdateBookingStatusDto,
} from './dto/booking.dto';
import { BookingsService } from './bookings.service';

/**
 * Community service booking requests.
 */
@ApiTags('Bookings')
@ApiBearerAuth('access-token')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @Permissions('booking.view')
  @ApiOperation({
    summary: 'List bookings',
    description: 'Returns paginated booking requests for the authenticated mosque with search, status, category, and date range filters.',
  })
  @ApiResponse({ status: 200, type: PaginatedBookingsDto })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListBookingsQueryDto,
  ): Promise<PaginatedBookingsDto | BookingDto[]> {
    return this.bookingsService.findAll(user.mosqueId, query);
  }

  @Get('stats')
  @Permissions('booking.view')
  @ApiOperation({
    summary: 'Get booking statistics',
    description: 'Returns live counts for total bookings, pending, confirmed, and scheduled in the next 7 days (this week).',
  })
  @ApiResponse({ status: 200, type: BookingStatsDto })
  getStats(@CurrentUser() user: AuthenticatedUser): Promise<BookingStatsDto> {
    return this.bookingsService.getStats(user.mosqueId);
  }

  @Get('statistics')
  @Permissions('booking.view')
  @ApiOperation({
    summary: 'Get booking statistics (alias)',
    description: 'Alias endpoint returning statistics for service booking requests.',
  })
  @ApiResponse({ status: 200, type: BookingStatsDto })
  getStatistics(@CurrentUser() user: AuthenticatedUser): Promise<BookingStatsDto> {
    return this.bookingsService.getStats(user.mosqueId);
  }

  @Get(':id')
  @Permissions('booking.view')
  @ApiOperation({
    summary: 'Get single booking',
    description: 'Returns details of a booking request by UUID.',
  })
  @ApiResponse({ status: 200, type: BookingDto })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<BookingDto> {
    return this.bookingsService.findOne(user.mosqueId, id);
  }

  @Post()
  @Permissions('booking.manage')
  @ApiOperation({
    summary: 'Create booking',
    description: 'Submits a new service booking request.',
  })
  @ApiResponse({ status: 201, type: BookingDto })
  @ApiResponse({ status: 400, description: 'Validation failed or service inactive.' })
  @ApiResponse({ status: 409, description: 'Conflicting booking exists for the same schedule.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBookingDto,
  ): Promise<BookingDto> {
    return this.bookingsService.create(user, dto);
  }

  @Patch(':id')
  @Permissions('booking.manage')
  @ApiOperation({
    summary: 'Update booking',
    description: 'Updates details of an existing booking request.',
  })
  @ApiResponse({ status: 200, type: BookingDto })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
  ): Promise<BookingDto> {
    return this.bookingsService.update(user, id, dto);
  }

  @Patch(':id/status')
  @Permissions('booking.manage')
  @ApiOperation({
    summary: 'Update booking status',
    description: 'Changes booking status (e.g., Pending -> Confirmed or Cancelled) with transition validation.',
  })
  @ApiResponse({ status: 200, type: BookingDto })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
  ): Promise<BookingDto> {
    return this.bookingsService.updateStatus(user, id, dto);
  }

  @Delete(':id')
  @Permissions('booking.manage')
  @ApiOperation({
    summary: 'Delete / cancel booking',
    description: 'Soft-deletes / cancels a booking request.',
  })
  @ApiResponse({ status: 200, type: BookingDto })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<BookingDto> {
    return this.bookingsService.remove(user, id);
  }
}

