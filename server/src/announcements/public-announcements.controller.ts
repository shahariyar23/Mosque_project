import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementEnvelopeDto, AnnouncementResponseDto } from './dto/announcement-response.dto';

@ApiTags('Public — Announcements')
@Public()
@Controller('public/mosques/:slug/announcements')
export class PublicAnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  @ApiOperation({
    summary: 'Public list of active published announcements',
    description:
      'Returns active, non-expired announcements that have audience=everyone and status=published. ' +
      'No authentication required.',
  })
  @ApiOkResponse({
    description: 'Active public announcements.',
  })
  async findPublic(
    @Param('slug') slug: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.announcementsService.findPublic(slug, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      category,
      search,
    });

    return {
      success: true,
      message: 'Public announcements retrieved successfully',
      data: result.rows,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
      total: result.total,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Public single announcement details',
    description:
      'Returns an active published announcement for the specified mosque by ID. ' +
      'No authentication required.',
  })
  @ApiOkResponse({
    description: 'Public announcement details.',
    type: AnnouncementEnvelopeDto,
  })
  async findOne(
    @Param('slug') slug: string,
    @Param('id') id: string,
  ) {
    const item = await this.announcementsService.findPublicOne(slug, id);
    return {
      success: true,
      message: 'Announcement retrieved successfully',
      data: item,
    };
  }
}
