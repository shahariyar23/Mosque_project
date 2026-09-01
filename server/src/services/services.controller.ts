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
  CreateServiceDto,
  ListServicesQueryDto,
  PaginatedServicesDto,
  ServiceDto,
  ServiceStatsDto,
  UpdateServiceDto,
} from './dto/service.dto';
import { ServicesService } from './services.service';

/**
 * Community service catalogue and standing offers.
 */
@ApiTags('Services')
@ApiBearerAuth('access-token')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @Permissions('service.view')
  @ApiOperation({
    summary: 'List services',
    description: 'Returns paginated service catalogue offerings for the authenticated mosque, filtered by category, status, or search term.',
  })
  @ApiResponse({ status: 200, type: PaginatedServicesDto })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListServicesQueryDto,
  ): Promise<PaginatedServicesDto | ServiceDto[]> {
    return this.servicesService.findAll(user.mosqueId, query);
  }

  @Get('stats')
  @Permissions('service.view')
  @ApiOperation({
    summary: 'Get service statistics',
    description: 'Returns live counts for total services, active services, bookings this month, and free-of-charge services.',
  })
  @ApiResponse({ status: 200, type: ServiceStatsDto })
  getStats(@CurrentUser() user: AuthenticatedUser): Promise<ServiceStatsDto> {
    return this.servicesService.getStats(user.mosqueId);
  }

  @Get('statistics')
  @Permissions('service.view')
  @ApiOperation({
    summary: 'Get service statistics (alias)',
    description: 'Alias endpoint returning statistics for the service catalogue.',
  })
  @ApiResponse({ status: 200, type: ServiceStatsDto })
  getStatistics(@CurrentUser() user: AuthenticatedUser): Promise<ServiceStatsDto> {
    return this.servicesService.getStats(user.mosqueId);
  }

  @Get(':id')
  @Permissions('service.view')
  @ApiOperation({
    summary: 'Get single service',
    description: 'Returns service details by UUID id or URL slug.',
  })
  @ApiResponse({ status: 200, type: ServiceDto })
  @ApiResponse({ status: 404, description: 'Service not found.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') idOrSlug: string,
  ): Promise<ServiceDto> {
    return this.servicesService.findOne(user.mosqueId, idOrSlug);
  }

  @Post()
  @Permissions('service.manage')
  @ApiOperation({
    summary: 'Create service',
    description: 'Creates a new service catalogue entry for the mosque.',
  })
  @ApiResponse({ status: 201, type: ServiceDto })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateServiceDto,
  ): Promise<ServiceDto> {
    return this.servicesService.create(user, dto);
  }

  @Patch(':id')
  @Permissions('service.manage')
  @ApiOperation({
    summary: 'Update service',
    description: 'Updates an existing service in the catalogue.',
  })
  @ApiResponse({ status: 200, type: ServiceDto })
  @ApiResponse({ status: 404, description: 'Service not found.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ): Promise<ServiceDto> {
    return this.servicesService.update(user, id, dto);
  }

  @Delete(':id')
  @Permissions('service.manage')
  @ApiOperation({
    summary: 'Delete service',
    description: 'Soft-deletes / deactivates a service.',
  })
  @ApiResponse({ status: 200, type: ServiceDto })
  @ApiResponse({ status: 404, description: 'Service not found.' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ServiceDto> {
    return this.servicesService.remove(user, id);
  }
}

