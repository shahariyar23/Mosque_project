import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchEnvelopeDto } from './dto/search-response.dto';
import { SearchService } from './search.service';

/**
 * Global search controller.
 *
 * Provides a single, secure, permission-gated, tenant-isolated search endpoint for the
 * administrative dashboard.
 */
@ApiTags('Search')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'No valid access token was sent.' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Global search across accessible mosque entities',
    description:
      'Performs permission-gated and tenant-scoped global search across users, transactions, donations, ' +
      'funds, campaigns, expenses, receipts, salaries, announcements, events, and volunteers. ' +
      'Only returns categories and records the authenticated user is authorized to view. ' +
      'Tenant isolation is strictly enforced from the authenticated session context.',
  })
  @ApiOkResponse({
    description: 'Search results grouped by accessible categories.',
    type: SearchEnvelopeDto,
  })
  async search(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: SearchQueryDto,
  ): Promise<SearchEnvelopeDto> {
    const data = await this.searchService.search(actor, query);
    return {
      success: true,
      message: 'Search results retrieved successfully',
      data,
    };
  }
}
