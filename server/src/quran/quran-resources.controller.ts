import {
  BadRequestException,
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
import { AnyPermission } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import {
  CreateQuranResourceDto,
  ListQuranResourcesQueryDto,
  QuranResourceDto,
  UpdateQuranResourceDto,
} from './dto/quran-resource.dto';
import { QuranResourcesService } from './quran-resources.service';

/**
 * The mosque's Quran study library — recitations, tafsir, memorisation plans, tajweed guides and
 * translations. Every route is scoped to the authenticated user's mosque and gated on the granular
 * `quran.*` permissions; `quran.manage` is accepted as an umbrella grant alongside them so existing
 * role grants keep working unchanged.
 */
@ApiTags('Quran Resources')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'No valid access token was sent.' })
@Controller('quran/resources')
export class QuranResourcesController {
  constructor(private readonly quranResources: QuranResourcesService) {}

  @Get()
  @AnyPermission('quran.view', 'quran.manage')
  @ApiOperation({
    summary: 'List Quran resources',
    description:
      'Returns paginated Quran resources for the authenticated mosque, with search, type, format, ' +
      'status and surah filters and date-bound filtering on publishedAt.',
  })
  @ApiOkResponse({ description: 'Paginated Quran resources.' })
  async findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ListQuranResourcesQueryDto,
  ) {
    const result = await this.quranResources.findAll(actor.mosqueId, query);
    return {
      success: true,
      message: 'Quran resources retrieved successfully',
      data: result.rows,
      meta: {
        page: result.page,
        limit: result.pageSize,
        total: result.total,
        totalPages: result.pageCount,
      },
    };
  }

  @Get('stats')
  @AnyPermission('quran.view', 'quran.manage')
  @ApiOperation({ summary: 'Quran library statistics for dashboard cards' })
  @ApiOkResponse({ description: 'Counts for the library.' })
  async getStats(@CurrentUser() actor: AuthenticatedUser) {
    const data = await this.quranResources.getStats(actor);
    return { success: true, data };
  }

  @Get(':id')
  @AnyPermission('quran.view', 'quran.manage')
  @ApiOperation({ summary: 'Get one Quran resource' })
  @ApiOkResponse({ type: QuranResourceDto })
  @ApiNotFoundResponse({ description: 'Quran resource not found.' })
  async findOne(@CurrentUser() actor: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const data = await this.quranResources.findOne(actor.mosqueId, id);
    return { success: true, message: 'Quran resource retrieved successfully', data };
  }

  @Post()
  @AnyPermission('quran.create', 'quran.manage')
  @ApiOperation({ summary: 'Create a Quran resource' })
  @ApiCreatedResponse({ type: QuranResourceDto })
  @ApiBadRequestResponse({ description: 'Validation failed.' })
  @ApiForbiddenResponse({ description: 'Lacks quran.create or quran.manage permission.' })
  async create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateQuranResourceDto) {
    const data = await this.quranResources.create(actor, dto);
    return { success: true, message: 'Quran resource created successfully', data };
  }

  @Patch(':id')
  @AnyPermission('quran.update', 'quran.manage')
  @ApiOperation({ summary: 'Update a Quran resource' })
  @ApiOkResponse({ type: QuranResourceDto })
  @ApiNotFoundResponse({ description: 'Quran resource not found.' })
  async update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuranResourceDto,
  ) {
    const data = await this.quranResources.update(actor, id, dto);
    return { success: true, message: 'Quran resource updated successfully', data };
  }

  @Post(':id/publish')
  @AnyPermission('quran.publish', 'quran.manage')
  @ApiOperation({ summary: 'Publish a Quran resource now' })
  @ApiOkResponse({ type: QuranResourceDto })
  async publish(@CurrentUser() actor: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const data = await this.quranResources.publish(actor, id);
    return { success: true, message: 'Quran resource published successfully', data };
  }

  @Post(':id/schedule')
  @AnyPermission('quran.schedule', 'quran.manage')
  @ApiOperation({ summary: 'Schedule a Quran resource for publication' })
  @ApiOkResponse({ type: QuranResourceDto })
  @ApiBadRequestResponse({ description: 'A scheduledAt date is required.' })
  async schedule(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { scheduledAt: string },
  ) {
    if (!body?.scheduledAt) {
      throw new BadRequestException('scheduledAt is required to schedule a resource.');
    }
    const data = await this.quranResources.schedule(actor, id, body.scheduledAt);
    return { success: true, message: 'Quran resource scheduled successfully', data };
  }

  @Post(':id/archive')
  @AnyPermission('quran.delete', 'quran.manage')
  @ApiOperation({ summary: 'Archive a Quran resource' })
  @ApiOkResponse({ type: QuranResourceDto })
  async archive(@CurrentUser() actor: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const data = await this.quranResources.archive(actor, id);
    return { success: true, message: 'Quran resource archived successfully', data };
  }

  @Delete(':id')
  @AnyPermission('quran.delete', 'quran.manage')
  @ApiOperation({ summary: 'Delete a Quran resource (soft delete)' })
  @ApiOkResponse({ description: 'Quran resource deleted successfully.' })
  @ApiNotFoundResponse({ description: 'Quran resource not found.' })
  async remove(@CurrentUser() actor: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.quranResources.remove(actor, id);
  }
}
