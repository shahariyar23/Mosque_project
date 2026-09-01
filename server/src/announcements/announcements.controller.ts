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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AnyPermission, Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementQueryDto } from './dto/announcement-query.dto';
import {
  AnnouncementEnvelopeDto,
  AnnouncementListEnvelopeDto,
} from './dto/announcement-response.dto';
import { AnnouncementStatsEnvelopeDto } from './dto/announcement-stats.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@ApiTags('Announcements')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'No valid access token was sent.' })
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @AnyPermission('announcement.manage', 'announcement.publish')
  @ApiOperation({
    summary: 'Create an announcement',
    description: 'Creates a notice in draft, scheduled, or published state for the authenticated user’s mosque.',
  })
  @ApiCreatedResponse({
    description: 'Announcement created successfully.',
    type: AnnouncementEnvelopeDto,
  })
  @ApiBadRequestResponse({ description: 'Validation failed.' })
  @ApiForbiddenResponse({ description: 'Lacks announcement.manage or announcement.publish permission.' })
  async create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateAnnouncementDto,
  ): Promise<AnnouncementEnvelopeDto> {
    const data = await this.announcementsService.create(actor, dto);
    return {
      success: true,
      message: 'Announcement created successfully',
      data,
    };
  }

  @Get('stats')
  @AnyPermission('announcement.view', 'announcement.manage')
  @ApiOperation({ summary: 'Get announcement count statistics for dashboard cards' })
  @ApiOkResponse({ type: AnnouncementStatsEnvelopeDto })
  async getStats(@CurrentUser() actor: AuthenticatedUser): Promise<AnnouncementStatsEnvelopeDto> {
    const data = await this.announcementsService.getStats(actor);
    return {
      success: true,
      data,
    };
  }

  @Get()
  @AnyPermission('announcement.view', 'announcement.manage')
  @ApiOperation({
    summary: 'List announcements',
    description: 'Lists all announcements for the mosque with search, category, status, and audience filtering.',
  })
  @ApiOkResponse({
    description: 'Paginated list of announcements.',
    type: AnnouncementListEnvelopeDto,
  })
  async findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: AnnouncementQueryDto,
  ): Promise<AnnouncementListEnvelopeDto> {
    const { rows, meta } = await this.announcementsService.findAll(actor, query);
    return {
      success: true,
      message: 'Announcements retrieved successfully',
      data: rows,
      meta,
    };
  }

  @Get(':id')
  @AnyPermission('announcement.view', 'announcement.manage')
  @ApiOperation({ summary: 'Get a single announcement by ID' })
  @ApiOkResponse({ type: AnnouncementEnvelopeDto })
  @ApiNotFoundResponse({ description: 'Announcement not found.' })
  async findOne(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AnnouncementEnvelopeDto> {
    const data = await this.announcementsService.findOne(actor, id);
    return {
      success: true,
      message: 'Announcement retrieved successfully',
      data,
    };
  }

  @Patch(':id')
  @AnyPermission('announcement.manage', 'announcement.publish')
  @ApiOperation({ summary: 'Update an announcement' })
  @ApiOkResponse({ type: AnnouncementEnvelopeDto })
  @ApiNotFoundResponse({ description: 'Announcement not found.' })
  async update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAnnouncementDto,
  ): Promise<AnnouncementEnvelopeDto> {
    const data = await this.announcementsService.update(actor, id, dto);
    return {
      success: true,
      message: 'Announcement updated successfully',
      data,
    };
  }

  @Post(':id/publish')
  @AnyPermission('announcement.publish', 'announcement.manage')
  @ApiOperation({ summary: 'Publish an announcement' })
  @ApiOkResponse({ type: AnnouncementEnvelopeDto })
  async publish(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AnnouncementEnvelopeDto> {
    const data = await this.announcementsService.publish(actor, id);
    return {
      success: true,
      message: 'Announcement published successfully',
      data,
    };
  }

  @Post(':id/archive')
  @AnyPermission('announcement.manage')
  @ApiOperation({ summary: 'Archive an announcement' })
  @ApiOkResponse({ type: AnnouncementEnvelopeDto })
  async archive(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AnnouncementEnvelopeDto> {
    const data = await this.announcementsService.archive(actor, id);
    return {
      success: true,
      message: 'Announcement archived successfully',
      data,
    };
  }

  @Post(':id/pin')
  @AnyPermission('announcement.manage')
  @ApiOperation({ summary: 'Toggle or set pinned status of an announcement' })
  @ApiOkResponse({ type: AnnouncementEnvelopeDto })
  async pin(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { pinned?: boolean; isPinned?: boolean },
  ): Promise<AnnouncementEnvelopeDto> {
    const target = body.isPinned !== undefined ? body.isPinned : body.pinned;
    const data = await this.announcementsService.togglePin(actor, id, target);
    return {
      success: true,
      message: 'Announcement pin status updated',
      data,
    };
  }

  @Delete(':id')
  @AnyPermission('announcement.manage')
  @ApiOperation({ summary: 'Delete an announcement' })
  @ApiOkResponse({ description: 'Announcement deleted successfully.' })
  async delete(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.announcementsService.delete(actor, id);
  }
}
