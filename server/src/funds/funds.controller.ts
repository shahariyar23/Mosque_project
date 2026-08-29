import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import {
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
import { FundBalanceDto } from '../fund-balance/dto/fund-balance-response.dto';
import { FundDetailsResponseDto } from './dto/fund-details-response.dto';
import { FundsSummaryResponseDto } from './dto/funds-summary-response.dto';
import { FundsService } from './funds.service';

@ApiTags('Funds')
@ApiBearerAuth('access-token')
@UseGuards(PermissionsGuard)
@Controller('funds')
export class FundsController {
  constructor(private readonly fundsService: FundsService) {}

  @Get()
  @Permissions('fund.view', 'finance.view')
  @ApiOperation({
    summary: 'List all funds with calculated available balances',
    description:
      'Retrieves all donation funds for the caller’s mosque with server-side computed financial balances: ' +
      'opening balance, total income, total expenses, incoming transfers, outgoing transfers, and available balance.',
  })
  @ApiOkResponse({
    type: [FundDetailsResponseDto],
    description: 'List of funds with balance metrics.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permissions (fund.view or finance.view).' })
  async getAllFunds(@CurrentUser() actor: AuthenticatedUser): Promise<{ success: true; message: string; data: FundDetailsResponseDto[] }> {
    const data = await this.fundsService.getAllFunds(actor);
    return {
      success: true,
      message: 'Funds retrieved successfully',
      data,
    };
  }

  @Get('summary')
  @Permissions('fund.view', 'finance.view')
  @ApiOperation({
    summary: 'Whole-mosque fund summary and aggregate balances',
    description:
      'Aggregates total available balance across all funds, total opening balance, total income, total expenses, ' +
      'total transfers, and per-fund breakdowns from the verified ledger.',
  })
  @ApiOkResponse({
    type: FundsSummaryResponseDto,
    description: 'Financial fund summary across all funds.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permissions (fund.view or finance.view).' })
  async getFundsSummary(
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ success: true; message: string; data: FundsSummaryResponseDto }> {
    const data = await this.fundsService.getFundsSummary(actor);
    return {
      success: true,
      message: 'Funds summary retrieved successfully',
      data,
    };
  }

  @Get(':id')
  @Permissions('fund.view', 'finance.view')
  @ApiOperation({
    summary: 'Get single fund details and balance breakdown',
    description: 'Retrieves a single fund with its full balance and ledger metrics.',
  })
  @ApiOkResponse({
    type: FundDetailsResponseDto,
    description: 'Fund details and balance.',
  })
  @ApiNotFoundResponse({ description: 'Fund not found for caller’s mosque.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permissions (fund.view or finance.view).' })
  async getFundById(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true; message: string; data: FundDetailsResponseDto }> {
    const data = await this.fundsService.getFundById(actor, id);
    return {
      success: true,
      message: 'Fund retrieved successfully',
      data,
    };
  }

  @Get(':id/balance')
  @Permissions('fund.view', 'finance.view')
  @ApiOperation({
    summary: 'Get available balance for a single fund',
    description: 'Returns the verified available balance and transfer breakdown for a single fund.',
  })
  @ApiOkResponse({
    type: FundBalanceDto,
    description: 'Fund balance breakdown.',
  })
  @ApiNotFoundResponse({ description: 'Fund not found for caller’s mosque.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permissions (fund.view or finance.view).' })
  async getFundBalance(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true; message: string; data: FundBalanceDto }> {
    const data = await this.fundsService.getFundBalance(actor, id);
    return {
      success: true,
      message: 'Fund balance retrieved successfully',
      data,
    };
  }
}
