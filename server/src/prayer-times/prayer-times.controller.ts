import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrayerTimesDateQueryDto, PrayerTimesQueryDto } from './dto/prayer-times-query.dto';
import { PrayerSettingsResponseDto, PrayerTimesResponseDto } from './dto/prayer-times-response.dto';
import { UpdatePrayerSettingsDto } from './dto/update-prayer-settings.dto';
import { PrayerTimesService } from './prayer-times.service';

/**
 * The prayer-time API.
 *
 * This controller is the reason the frontend never talks to AlAdhan. Everything upstream sends is
 * translated by the service into the response shapes declared in `dto/prayer-times-response.dto.ts`, so
 * a change upstream is a change to one module rather than to every client.
 *
 * `@Controller('prayer-times')` carries only this controller's own segment — `api` and `v1` are added
 * globally in `bootstrap.ts`, and repeating them here would produce `/api/v1/api/v1/prayer-times`.
 */
@ApiTags('Prayer Times')
@ApiBearerAuth('access-token')
@Controller('prayer-times')
export class PrayerTimesController {
  constructor(private readonly prayerTimes: PrayerTimesService) {}

  @Get()
  @Permissions('prayer.view')
  @ApiOperation({
    summary: 'Prayer times for a date',
    description:
      'Calculated for the authenticated user’s mosque and adjusted by that mosque’s saved offsets. With no query parameters, returns today in the mosque’s own timezone.',
  })
  @ApiResponse({ status: 200, type: PrayerTimesResponseDto })
  @ApiResponse({
    status: 400,
    description: 'The mosque has no coordinates, or a parameter is invalid.',
  })
  @ApiResponse({ status: 503, description: 'The upstream calculation service is unreachable.' })
  getPrayerTimes(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PrayerTimesQueryDto,
  ): Promise<PrayerTimesResponseDto> {
    return this.prayerTimes.getPrayerTimes(user.mosqueId, query);
  }

  /**
   * Declared before `:date` — and so is `settings`. Express matches in declaration order, so a literal
   * route placed after a parameter route is unreachable: `/prayer-times/today` would arrive as
   * `:date = 'today'` and fail the date pattern.
   */
  @Get('today')
  @Permissions('prayer.view')
  @ApiOperation({
    summary: 'Today’s prayer times',
    description: 'Today in the mosque’s timezone. Identical to the collection route with no date.',
  })
  @ApiResponse({ status: 200, type: PrayerTimesResponseDto })
  getToday(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PrayerTimesDateQueryDto,
  ): Promise<PrayerTimesResponseDto> {
    return this.prayerTimes.getPrayerTimes(user.mosqueId, query);
  }

  @Get('settings')
  @Permissions('prayer.view')
  @ApiOperation({
    summary: 'Prayer calculation settings',
    description:
      'What this mosque has overridden, and what each setting resolves to. Readable by anyone who may read the schedule, since these values explain the times it publishes.',
  })
  @ApiResponse({ status: 200, type: PrayerSettingsResponseDto })
  getSettings(@CurrentUser() user: AuthenticatedUser): Promise<PrayerSettingsResponseDto> {
    return this.prayerTimes.getSettings(user.mosqueId);
  }

  @Patch('settings')
  @Permissions('prayer.manage')
  @ApiOperation({
    summary: 'Update prayer calculation settings',
    description:
      'Stores this mosque’s calculation choices and per-prayer minute adjustments. Nothing upstream is modified: the adjustments are applied to the calculated times as they are served.',
  })
  @ApiResponse({ status: 200, type: PrayerSettingsResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed, or an unknown field was sent.' })
  @ApiResponse({ status: 403, description: 'Missing `prayer.manage`.' })
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePrayerSettingsDto,
  ): Promise<PrayerSettingsResponseDto> {
    return this.prayerTimes.updateSettings(user.mosqueId, dto);
  }

  /**
   * Last, so the literal routes above win. The date is checked in the service rather than by a pipe,
   * because the same check has to hold for `?date=` on the collection route, and one validation in one
   * place cannot drift out of agreement with itself.
   */
  @Get(':date')
  @Permissions('prayer.view')
  @ApiOperation({ summary: 'Prayer times for a specific date' })
  @ApiParam({ name: 'date', description: 'Date in `YYYY-MM-DD` form.', example: '2026-03-01' })
  @ApiResponse({ status: 200, type: PrayerTimesResponseDto })
  @ApiResponse({
    status: 400,
    description: 'The date is not `YYYY-MM-DD`, or the mosque has no coordinates.',
  })
  getByDate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('date') date: string,
    @Query() query: PrayerTimesDateQueryDto,
  ): Promise<PrayerTimesResponseDto> {
    return this.prayerTimes.getPrayerTimes(user.mosqueId, { ...query, date });
  }
}
