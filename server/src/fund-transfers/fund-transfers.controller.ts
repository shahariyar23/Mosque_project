import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { CreateFundTransferDto } from './dto/create-fund-transfer.dto';
import { FundTransferResponseDto } from './dto/fund-transfer-response.dto';
import { FundTransfersService } from './fund-transfers.service';

@ApiTags('Fund Transfers')
@ApiBearerAuth('access-token')
@UseGuards(PermissionsGuard)
@Controller('fund-transfers')
export class FundTransfersController {
  constructor(private readonly fundTransfersService: FundTransfersService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Permissions('fund.manage', 'finance.manage')
  @ApiOperation({
    summary: 'Transfer money between two funds',
    description:
      'Transfers an amount from a source fund to a destination fund within the caller’s mosque. ' +
      'Validates available balance on the source fund atomically with row locking to prevent overdrafts. ' +
      'Transfers are ledger movements and do not affect total income or total expenses.',
  })
  @ApiOkResponse({
    type: FundTransferResponseDto,
    description: 'Fund transfer executed and ledger records created atomically.',
  })
  @ApiBadRequestResponse({
    description:
      'The transfer was invalid: same source and destination, invalid amount, or insufficient balance.',
  })
  @ApiNotFoundResponse({
    description: 'One or both specified donation funds were not found for the caller’s mosque.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permissions (fund.manage or finance.manage).' })
  async transfer(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateFundTransferDto,
  ): Promise<{ success: true; message: string; data: FundTransferResponseDto }> {
    const data = await this.fundTransfersService.transfer(actor, dto);
    return {
      success: true,
      message: 'Fund transfer completed successfully',
      data,
    };
  }
}
