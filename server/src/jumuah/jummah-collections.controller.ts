import {
  Body,
  Controller,
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
import { CreateJummahCollectionDto } from './dto/create-jummah-collection.dto';
import { JummahCollectionQueryDto } from './dto/jummah-collection-query.dto';
import {
  JummahCollectionEnvelopeDto,
  JummahCollectionListEnvelopeDto,
} from './dto/jummah-collection-response.dto';
import { UpdateJummahCollectionDto } from './dto/update-jummah-collection.dto';
import { JummahCollectionsService } from './jummah-collections.service';

/**
 * Friday / Jummah Congregational Collections.
 *
 * Every route is scoped to the caller's mosque taken from the JWT access token.
 * Completed collections atomically write an income ledger entry to the financial transaction system.
 */
@ApiTags('Jumu’ah Collections')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'No valid access token was sent.' })
@Controller(['jummah/collections', 'jummah-collections'])
export class JummahCollectionsController {
  constructor(private readonly collectionsService: JummahCollectionsService) {}

  @Post()
  @AnyPermission('jumuah_collection.record', 'donation.record', 'jumuah.manage')
  @ApiOperation({
    summary: 'Record a Jummah collection',
    description:
      'Creates a Friday congregational collection record for the caller’s mosque. ' +
      'Atomically records an income transaction in the ledger when status is `completed`. ' +
      'Requires `jumuah_collection.record`, `donation.record`, or `jumuah.manage`.',
  })
  @ApiCreatedResponse({
    description: 'Jummah collection recorded successfully.',
    type: JummahCollectionEnvelopeDto,
  })
  @ApiBadRequestResponse({
    description:
      'Validation failed: date is not a Friday, invalid amount, or fund does not belong to caller’s mosque.',
  })
  @ApiForbiddenResponse({
    description: 'Authenticated, but lacking required permissions.',
  })
  async create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateJummahCollectionDto,
  ): Promise<JummahCollectionEnvelopeDto> {
    const data = await this.collectionsService.create(actor, dto);
    return {
      success: true,
      message: 'Jummah collection recorded successfully',
      data,
    };
  }

  @Get()
  @AnyPermission('jumuah_collection.view', 'prayer.view', 'donation.view', 'finance.view')
  @ApiOperation({
    summary: 'List Jummah collections',
    description:
      'Lists historical Jummah collections for the caller’s mosque with date range, fund, and status filtering. ' +
      'Requires `jumuah_collection.view`, `prayer.view`, `donation.view`, or `finance.view`.',
  })
  @ApiOkResponse({
    description: 'A paginated list of Jummah collections.',
    type: JummahCollectionListEnvelopeDto,
  })
  async findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: JummahCollectionQueryDto,
  ): Promise<JummahCollectionListEnvelopeDto> {
    const { rows, meta } = await this.collectionsService.findAll(actor, query);
    return {
      success: true,
      message: 'Jummah collections retrieved successfully',
      data: rows,
      meta,
    };
  }

  @Get(':id')
  @AnyPermission('jumuah_collection.view', 'prayer.view', 'donation.view', 'finance.view')
  @ApiOperation({ summary: 'Get a single Jummah collection' })
  @ApiOkResponse({
    description: 'Jummah collection details.',
    type: JummahCollectionEnvelopeDto,
  })
  @ApiNotFoundResponse({ description: 'Jummah collection not found for this mosque.' })
  async findOne(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JummahCollectionEnvelopeDto> {
    const data = await this.collectionsService.findOne(actor, id);
    return {
      success: true,
      message: 'Jummah collection retrieved successfully',
      data,
    };
  }

  @Patch(':id')
  @AnyPermission(
    'jumuah_collection.manage',
    'jumuah_collection.void',
    'donation.manage',
    'finance.manage',
  )
  @ApiOperation({
    summary: 'Correct or void a Jummah collection',
    description:
      'Corrects an existing collection entry or marks it as voided. ' +
      'Atomically updates or reverses the corresponding financial ledger transaction.',
  })
  @ApiOkResponse({
    description: 'Jummah collection updated successfully.',
    type: JummahCollectionEnvelopeDto,
  })
  @ApiNotFoundResponse({ description: 'Jummah collection not found for this mosque.' })
  @ApiBadRequestResponse({ description: 'Validation failed.' })
  async update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJummahCollectionDto,
  ): Promise<JummahCollectionEnvelopeDto> {
    const data = await this.collectionsService.update(actor, id, dto);
    return {
      success: true,
      message: 'Jummah collection updated successfully',
      data,
    };
  }
}
