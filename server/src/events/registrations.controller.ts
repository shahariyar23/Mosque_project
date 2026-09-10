import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { EventsService } from './events.service';
import {
  EventRegistrationDto,
  FindRegistrationsQueryDto,
  PaginatedRegistrationsDto,
  UpdateRegistrationDto,
} from './dto/event.dto';

@ApiTags('Registrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller(['registrations', 'events-registrations'])
export class RegistrationsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @Permissions('event.view')
  @ApiOperation({
    summary: 'List all event registrations',
    description:
      "Returns registrations across all mosque events, scoped to the authenticated admin's mosque.",
  })
  @ApiResponse({ status: 200, type: PaginatedRegistrationsDto })
  findAllRegistrations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FindRegistrationsQueryDto,
  ): Promise<PaginatedRegistrationsDto | EventRegistrationDto[]> {
    return this.eventsService.findAllRegistrations(user, query);
  }

  @Get(':id')
  @Permissions('event.view')
  @ApiOperation({
    summary: 'Get single registration details',
  })
  @ApiResponse({ status: 200, type: EventRegistrationDto })
  @ApiResponse({ status: 404, description: 'Registration not found.' })
  getRegistration(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<EventRegistrationDto> {
    return this.eventsService.getRegistration(user, id);
  }

  @Patch(':id')
  @Permissions('event.update')
  @ApiOperation({
    summary: 'Update event registration',
    description: "Update an attendee's registration status, guest count, or requirements.",
  })
  @ApiResponse({ status: 200, type: EventRegistrationDto })
  @ApiResponse({ status: 404, description: 'Registration not found.' })
  updateRegistration(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRegistrationDto,
  ): Promise<EventRegistrationDto> {
    return this.eventsService.updateRegistration(user, id, dto);
  }

  @Delete(':id')
  @Permissions('event.update')
  @ApiOperation({
    summary: 'Cancel / delete registration',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Registration not found.' })
  deleteRegistration(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.eventsService.deleteRegistration(user, id);
  }
}
