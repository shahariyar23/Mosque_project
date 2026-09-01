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
    @Query('limit') limit?: number,
    @Query('category') category?: string,
  ) {
    const result = await this.announcementsService.findPublic(slug, {
      limit: limit ? Number(limit) : 20,
      category,
    });

    return {
      success: true,
      message: 'Public announcements retrieved successfully',
      data: result.rows,
      total: result.total,
    };
  }
}
