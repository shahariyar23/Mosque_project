import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';
import { PublicHomeService } from './public-home.service';

/**
 * Public Home Page API.
 *
 * Read-only, unauthenticated, slug-scoped endpoints for the public home page. Where an endpoint
 * already exists publicly (announcements, funds, transparency) the home page uses that one — this
 * controller only adds what the public site needs and no public route existed for: the mosque
 * profile, today's prayer times, Jumu'ah, active services, upcoming events, and community stats.
 * Every response is projected through the public DTOs, so no admin field, donor detail or internal
 * identifier can reach a visitor.
 */
@ApiTags('Public — Home Page')
@Public()
@Controller('public/mosques/:slug')
export class PublicHomeController {
  constructor(private readonly publicHome: PublicHomeService) {}

  @Get('mosque')
  @ApiOperation({ summary: 'Public mosque profile' })
  @ApiOkResponse({ description: 'The mosque’s public profile, or null when nothing is published.' })
  getMosque(@Param('slug') slug: string) {
    return this.publicHome.getMosque(slug);
  }

  @Get('prayer-times/today')
  @ApiOperation({
    summary: 'Today’s prayer times for a mosque',
    description:
      'Calculated through the existing prayer-times service for the mosque’s stored coordinates and timezone. Returns 200 with null when the mosque has no coordinates or the calculation is unavailable, and 404 when the mosque is unknown.',
  })
  @ApiOkResponse({ description: 'Prayer times for today, or null.' })
  getTodayPrayerTimes(@Param('slug') slug: string) {
    return this.publicHome.getTodayPrayerTimes(slug);
  }

  @Get('prayer-times')
  @ApiOperation({
    summary: 'Public prayer times for a mosque',
    description:
      'Calculated through the existing prayer-times service. Defaults to today in mosque timezone, or accepts ?date=YYYY-MM-DD.',
  })
  @ApiOkResponse({ description: 'Prayer times for the requested date, or null.' })
  getPrayerTimes(@Param('slug') slug: string, @Query('date') date?: string) {
    return this.publicHome.getPrayerTimesForDate(slug, date);
  }

  @Get('jumuah')
  @ApiOperation({ summary: 'Public Jumu’ah schedules' })
  @ApiOkResponse({ description: 'The mosque’s active Jumu’ah schedules.' })
  getJumuah(@Param('slug') slug: string) {
    return this.publicHome.getJumuahSchedules(slug);
  }

  @Get('services')
  @ApiOperation({ summary: 'Public active services' })
  @ApiParam({ name: 'limit', required: false, description: 'Max services to return (1–8).' })
  @ApiOkResponse({ description: 'Active services projected for the public site.' })
  getServices(@Param('slug') slug: string, @Query('limit') limit?: string) {
    return this.publicHome.getServices(slug, limit ? Number(limit) : undefined);
  }

  @Get('events')
  @ApiOperation({ summary: 'Public upcoming events' })
  @ApiParam({ name: 'limit', required: false, description: 'Max events to return (1–8).' })
  @ApiOkResponse({ description: 'Published upcoming events projected for the public site.' })
  getEvents(@Param('slug') slug: string, @Query('limit') limit?: string) {
    return this.publicHome.getUpcomingEvents(slug, limit ? Number(limit) : undefined);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Public community statistics' })
  @ApiOkResponse({ description: 'Public counts, or null when no public data source exists yet.' })
  getStats(@Param('slug') slug: string) {
    return this.publicHome.getCommunityStats(slug);
  }

  @Get('facilities')
  @ApiOperation({ summary: 'Public active facilities' })
  @ApiOkResponse({ description: 'Active facilities available at the mosque.' })
  getFacilities(@Param('slug') slug: string) {
    return this.publicHome.getFacilities(slug);
  }

  @Get('leadership')
  @ApiOperation({ summary: 'Public mosque leadership & imams' })
  @ApiOkResponse({ description: 'Public leadership profiles.' })
  getLeadership(@Param('slug') slug: string) {
    return this.publicHome.getLeadership(slug);
  }

  @Get('milestones')
  @ApiOperation({ summary: 'Public historical milestones' })
  @ApiOkResponse({ description: 'Published chronological milestones.' })
  getMilestones(@Param('slug') slug: string) {
    return this.publicHome.getMilestones(slug);
  }

  @Get('values')
  @ApiOperation({ summary: 'Public core beliefs and values' })
  @ApiOkResponse({ description: 'Published core value pillars.' })
  getValues(@Param('slug') slug: string) {
    return this.publicHome.getValues(slug);
  }

  @Get('gallery')
  @ApiOperation({ summary: 'Public gallery photos' })
  @ApiParam({ name: 'category', required: false, description: 'Filter by category (e.g. Architecture)' })
  @ApiOkResponse({ description: 'Published photos for the mosque gallery.' })
  getGallery(@Param('slug') slug: string, @Query('category') category?: string) {
    return this.publicHome.getGallery(slug, category);
  }
}
