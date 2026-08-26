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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { ReceiptQueryDto } from './dto/receipt-query.dto';
import {
  ReceiptEnvelopeDto,
  ReceiptListEnvelopeDto,
} from './dto/receipt-response.dto';
import { VoidReceiptDto } from './dto/void-receipt.dto';
import { ReceiptsService } from './receipts.service';

/**
 * Receipts: official written documents acknowledging received funds.
 *
 * Every route lives under `/api/v1/receipts`.
 *
 * - `POST /receipts`: Issues a receipt and generates the next sequential number server-side.
 * - `GET /receipts`: Lists receipts with pagination, status, fund, date, and search filtering.
 * - `GET /receipts/:id`: Reads complete details for a single receipt.
 * - `PATCH /receipts/:id/void`: Voids an issued receipt with a mandatory reason. Never physically deletes.
 */
@ApiTags('Receipts')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'No valid access token was sent.' })
@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receipts: ReceiptsService) {}

  @Post()
  @Permissions('receipt.issue')
  @ApiOperation({
    summary: 'Issue a new receipt.',
    description:
      'Requires `receipt.issue`. Assigns a sequential receipt number (e.g. REC-2026-00001) for the mosque. ' +
      'Validates referenced donation, fund, or user and ensures no duplicate active receipts exist.',
  })
  @ApiCreatedResponse({ description: 'Receipt issued successfully.', type: ReceiptEnvelopeDto })
  @ApiBadRequestResponse({ description: 'Validation failed or referenced entity does not belong to the mosque.' })
  @ApiConflictResponse({ description: 'Receipt numbering collision or active receipt already exists.' })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `receipt.issue`.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReceiptDto,
  ): Promise<ReceiptEnvelopeDto> {
    return {
      success: true,
      message: 'Receipt issued successfully',
      data: await this.receipts.create(user, dto),
    };
  }

  @Get()
  @Permissions('receipt.view', 'receipt.viewOwn')
  @ApiOperation({
    summary: 'List receipts.',
    description:
      'Requires `receipt.view` to read the mosque register, or `receipt.viewOwn` to list the actor’s own receipts. ' +
      'Supports pagination, status filtering, fund/donation/user filtering, date window, and text search.',
  })
  @ApiOkResponse({ description: 'Page of receipts.', type: ReceiptListEnvelopeDto })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `receipt.view` or `receipt.viewOwn`.' })
  async findMany(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReceiptQueryDto,
  ): Promise<ReceiptListEnvelopeDto> {
    const result = await this.receipts.findMany(user, query);
    return {
      success: true,
      message: 'Receipts retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  @Permissions('receipt.view', 'receipt.viewOwn')
  @ApiOperation({
    summary: 'Read one receipt.',
    description:
      'Requires `receipt.view` for any mosque receipt, or `receipt.viewOwn` when the receipt belongs to the caller.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'The receipt identifier.' })
  @ApiOkResponse({ description: 'The receipt record.', type: ReceiptEnvelopeDto })
  @ApiNotFoundResponse({ description: 'No receipt with that ID exists in the mosque register.' })
  @ApiForbiddenResponse({ description: 'Authenticated, but without permission to view this receipt.' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReceiptEnvelopeDto> {
    return {
      success: true,
      message: 'Receipt retrieved successfully',
      data: await this.receipts.findOne(user, id),
    };
  }

  @Patch(':id/void')
  @Permissions('transaction.void')
  @ApiOperation({
    summary: 'Void an issued receipt.',
    description:
      'Requires `transaction.void`. Changes status from `issued` to `voided`, records timestamp and mandatory reason. ' +
      'Never deletes the record.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'The receipt identifier.' })
  @ApiOkResponse({ description: 'Receipt voided successfully.', type: ReceiptEnvelopeDto })
  @ApiBadRequestResponse({ description: 'Receipt is already voided or void reason is invalid.' })
  @ApiNotFoundResponse({ description: 'No receipt found with that ID.' })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `transaction.void`.' })
  async void(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VoidReceiptDto,
  ): Promise<ReceiptEnvelopeDto> {
    return {
      success: true,
      message: 'Receipt voided successfully',
      data: await this.receipts.void(user, id, dto),
    };
  }
}
