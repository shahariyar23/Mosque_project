import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';
import {
  PublicFundListEnvelopeDto,
  PublicFundProgressEnvelopeDto,
  PublicTransparencySummaryEnvelopeDto,
} from './dto/public-fund.dto';
import {
  PublicJummahCollectionListEnvelopeDto,
  PublicJummahCollectionQueryDto,
} from './dto/public-jummah-collection.dto';
import { PublicTransparencyService } from './public-transparency.service';

/**
 * Public Transparency API.
 *
 * Exposes safe, unauthenticated, read-only financial transparency figures for public website visitors.
 * Never exposes private donor accounts, emails, phone numbers, or internal user references.
 */
@ApiTags('Public Transparency')
@Public()
@Controller('public/mosques')
export class PublicTransparencyController {
  constructor(private readonly transparencyService: PublicTransparencyService) {}

  @Get(':slug/funds')
  @ApiOperation({
    summary: 'List all public funds and fundraising progress for a mosque',
    description:
      'Returns all published funds with target amount, collected amount, remaining amount, and progress percentage. ' +
      'Unauthenticated and safe for public website consumption.',
  })
  @ApiParam({ name: 'slug', description: 'URL-safe mosque identifier', example: 'baitul-mukarram' })
  @ApiOkResponse({
    description: 'List of public funds with progress metrics.',
    type: PublicFundListEnvelopeDto,
  })
  @ApiNotFoundResponse({ description: 'Mosque not found or inactive.' })
  async getPublicFunds(@Param('slug') slug: string): Promise<PublicFundListEnvelopeDto> {
    const data = await this.transparencyService.getPublicFunds(slug);
    return {
      success: true,
      message: 'Public funds retrieved successfully',
      data,
    };
  }

  @Get(':slug/funds/:fundSlug')
  @ApiOperation({
    summary: 'Get public fundraising progress for a single fund',
    description:
      'Returns progress metrics and targets for a specific published fund by its URL slug.',
  })
  @ApiParam({ name: 'slug', description: 'URL-safe mosque identifier', example: 'baitul-mukarram' })
  @ApiParam({ name: 'fundSlug', description: 'URL-safe fund identifier', example: 'mosque-building-fund' })
  @ApiOkResponse({
    description: 'Public fund progress details.',
    type: PublicFundProgressEnvelopeDto,
  })
  @ApiNotFoundResponse({ description: 'Mosque or fund not found.' })
  async getPublicFundBySlug(
    @Param('slug') slug: string,
    @Param('fundSlug') fundSlug: string,
  ): Promise<PublicFundProgressEnvelopeDto> {
    const data = await this.transparencyService.getPublicFundBySlug(slug, fundSlug);
    return {
      success: true,
      message: 'Public fund progress retrieved successfully',
      data,
    };
  }

  @Get(':slug/summary')
  @ApiOperation({
    summary: 'Mosque-wide public transparency and fundraising summary',
    description:
      'Returns whole-mosque aggregated target, total collected, remaining balance, and list of public funds.',
  })
  @ApiParam({ name: 'slug', description: 'URL-safe mosque identifier', example: 'baitul-mukarram' })
  @ApiOkResponse({
    description: 'Public transparency summary.',
    type: PublicTransparencySummaryEnvelopeDto,
  })
  @ApiNotFoundResponse({ description: 'Mosque not found or inactive.' })
  async getTransparencySummary(
    @Param('slug') slug: string,
  ): Promise<PublicTransparencySummaryEnvelopeDto> {
    const data = await this.transparencyService.getTransparencySummary(slug);
    return {
      success: true,
      message: 'Mosque transparency summary retrieved successfully',
      data,
    };
  }

  @Get(':slug/jummah-collections')
  @ApiOperation({
    summary: 'Public Jummah collection history',
    description:
      'Returns historical Friday collections published by the mosque without any private donor data.',
  })
  @ApiParam({ name: 'slug', description: 'URL-safe mosque identifier', example: 'baitul-mukarram' })
  @ApiOkResponse({
    description: 'Public Jummah collection history list.',
    type: PublicJummahCollectionListEnvelopeDto,
  })
  @ApiNotFoundResponse({ description: 'Mosque not found or inactive.' })
  async getPublicJummahCollections(
    @Param('slug') slug: string,
    @Query() query: PublicJummahCollectionQueryDto,
  ): Promise<PublicJummahCollectionListEnvelopeDto> {
    const { rows, meta } = await this.transparencyService.getPublicJummahCollections(
      slug,
      query,
    );
    return {
      success: true,
      message: 'Public Jummah collections retrieved successfully',
      data: rows,
      meta,
    };
  }
}
