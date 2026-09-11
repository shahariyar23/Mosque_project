import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { AdminMosquesService } from './admin-mosques.service';
import { CreateAdditionalMosqueAdminDto } from './dto/create-mosque-admin.dto';
import { CreateMosqueDto } from './dto/create-mosque.dto';
import {
  AdminMosqueDetailDto,
  AdminMosqueSummaryDto,
  PlatformOverviewDto,
} from './dto/admin-mosque-response.dto';
import { UpdateMosqueStatusDto } from './dto/update-mosque-status.dto';
import { UpdateMosqueAdminDto } from './dto/update-mosque.dto';

@ApiTags('Platform — Mosques')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Valid access token required.' })
@ApiForbiddenResponse({ description: 'Requires platform.manage authority.' })
@Controller('admin/mosques')
export class AdminMosquesController {
  constructor(private readonly adminMosquesService: AdminMosquesService) {}

  @Get('platform/overview')
  @Permissions('platform.manage')
  @ApiOperation({
    summary: 'Platform-wide aggregated overview and comparative statistics',
    description:
      'Requires platform.manage. Aggregates metrics, charts data, and mosque comparisons across all tenant mosques.',
  })
  @ApiOkResponse({
    description: 'Platform aggregated statistics.',
    type: PlatformOverviewDto,
  })
  async getPlatformOverview(): Promise<{ success: boolean; data: PlatformOverviewDto }> {
    const data = await this.adminMosquesService.getPlatformOverview();
    return {
      success: true,
      data,
    };
  }

  @Get()
  @Permissions('platform.manage')
  @ApiOperation({
    summary: 'List all mosques on the platform',
    description: 'Requires platform.manage. Returns all mosques with user, admin, event, and announcement counts.',
  })
  @ApiOkResponse({
    description: 'List of mosques.',
    type: [AdminMosqueSummaryDto],
  })
  async listMosques(): Promise<{ success: boolean; data: AdminMosqueSummaryDto[] }> {
    const data = await this.adminMosquesService.listMosques();
    return {
      success: true,
      data,
    };
  }

  @Post()
  @AnyPermission('platform.manage', 'mosque.create')
  @ApiOperation({
    summary: 'Create a new mosque tenant and its initial administrator',
    description:
      'Atomically creates the mosque record, default settings, prayer configuration, and the initial mosque administrator user.',
  })
  @ApiOkResponse({
    description: 'Created mosque details.',
    type: AdminMosqueDetailDto,
  })
  async createMosque(
    @Body() dto: CreateMosqueDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string; data: AdminMosqueDetailDto }> {
    const data = await this.adminMosquesService.createMosqueWithAdmin(dto, actor);
    return {
      success: true,
      message: 'Mosque and administrator created successfully',
      data,
    };
  }

  @Get(':id')
  @Permissions('platform.manage')
  @ApiOperation({
    summary: 'Get details of a specific mosque',
    description: 'Returns profile details, settings, and list of administrators for a mosque.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Mosque UUID' })
  @ApiOkResponse({ type: AdminMosqueDetailDto })
  @ApiNotFoundResponse({ description: 'Mosque not found.' })
  async getMosque(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; data: AdminMosqueDetailDto }> {
    const data = await this.adminMosquesService.getMosque(id);
    return {
      success: true,
      data,
    };
  }

  @Patch(':id')
  @Permissions('platform.manage')
  @ApiOperation({
    summary: 'Update mosque profile details',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Mosque UUID' })
  @ApiOkResponse({ type: AdminMosqueDetailDto })
  async updateMosque(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMosqueAdminDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string; data: AdminMosqueDetailDto }> {
    const data = await this.adminMosquesService.updateMosque(id, dto, actor);
    return {
      success: true,
      message: 'Mosque details updated successfully',
      data,
    };
  }

  @Patch(':id/status')
  @Permissions('platform.manage')
  @ApiOperation({
    summary: 'Update mosque status (active, suspended, inactive)',
    description:
      'Suspending a mosque deactivates its users and prevents login while safely preserving all data.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Mosque UUID' })
  @ApiOkResponse({ type: AdminMosqueDetailDto })
  async setMosqueStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMosqueStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string; data: AdminMosqueDetailDto }> {
    const data = await this.adminMosquesService.setMosqueStatus(id, dto, actor);
    return {
      success: true,
      message: `Mosque status updated to ${dto.status}`,
      data,
    };
  }

  @Post(':id/admins')
  @Permissions('platform.manage')
  @ApiOperation({
    summary: 'Add an administrator to an existing mosque',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Mosque UUID' })
  @ApiOkResponse({ type: AdminMosqueDetailDto })
  async addMosqueAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAdditionalMosqueAdminDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string; data: AdminMosqueDetailDto }> {
    const data = await this.adminMosquesService.addMosqueAdmin(id, dto, actor);
    return {
      success: true,
      message: 'Mosque administrator added successfully',
      data,
    };
  }
}

