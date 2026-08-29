import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { FundBalanceQueryDto } from './dto/fund-balance-query.dto';
import {
  FundBalanceEnvelopeDto,
  FundBalanceSummaryEnvelopeDto,
  FundFinancialSummaryEnvelopeDto,
  SufficientFundsEnvelopeDto,
} from './dto/fund-balance-response.dto';
import { FundBalanceService } from './fund-balance.service';

/**
 * Fund Balance endpoints — per-fund financial position derived from the ledger.
 *
 * Every route is scoped to the caller's mosque (from the access token) and requires
 * `fund.view` permission. No route accepts a `mosqueId` — cross-mosque access is
 * not expressible in the API.
 *
 * Rules:
 * - Only COMPLETED transactions affect available balance
 * - PENDING, VOIDED, CANCELLED transactions do NOT affect balance
 * - Transfers are tracked separately from income/expenses
 * - All money as exact decimal strings, never floats
 */
@ApiTags('Fund Balance')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('fund-balance')
export class FundBalanceController {
  constructor(private readonly service: FundBalanceService) {}

  @Get()
  @Permissions('fund.view')
  @ApiOperation({
    summary: 'List all fund balances',
    description:
      'Returns the calculated available balance for every fund in the caller\'s mosque. ' +
      'Each balance = openingBalance + completed income - completed expenses + incoming transfers - outgoing transfers. ' +
      'Only COMPLETED transactions are counted.',
  })
  @ApiOkResponse({ type: FundBalanceSummaryEnvelopeDto })
  async findAll(
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<FundBalanceSummaryEnvelopeDto> {
    const data = await this.service.getAllFundBalances(actor);
    return {
      success: true,
      message: 'Fund balances retrieved successfully',
      data,
    };
  }

  @Get(':fundId')
  @Permissions('fund.view')
  @ApiOperation({
    summary: 'Get a single fund balance',
    description:
      'Returns the calculated available balance for one fund. ' +
      'Only COMPLETED transactions are counted. PENDING, VOIDED, CANCELLED are excluded.',
  })
  @ApiParam({ name: 'fundId', format: 'uuid' })
  @ApiOkResponse({ type: FundBalanceEnvelopeDto })
  async findOne(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('fundId', ParseUUIDPipe) fundId: string,
  ): Promise<FundBalanceEnvelopeDto> {
    const data = await this.service.getFundBalance(actor, fundId);
    return {
      success: true,
      message: 'Fund balance retrieved successfully',
      data,
    };
  }

  @Get(':fundId/summary')
  @Permissions('fund.view')
  @ApiOperation({
    summary: 'Get detailed financial summary for a fund',
    description:
      'Returns a comprehensive breakdown including income by status/payment method, ' +
      'expenses by status/category, transfers in/out by status, and the computed available balance. ' +
      'Supports optional date range filtering via query parameters.',
  })
  @ApiParam({ name: 'fundId', format: 'uuid' })
  @ApiQuery({ name: 'from', required: false, description: 'Inclusive start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'Inclusive end date (YYYY-MM-DD)' })
  @ApiOkResponse({ type: FundFinancialSummaryEnvelopeDto })
  async getSummary(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('fundId', ParseUUIDPipe) fundId: string,
    @Query() query: FundBalanceQueryDto,
  ): Promise<FundFinancialSummaryEnvelopeDto> {
    const data = await this.service.getFundFinancialSummary(actor, fundId, query);
    return {
      success: true,
      message: 'Fund financial summary retrieved successfully',
      data,
    };
  }

  @Get(':fundId/check/:amount')
  @Permissions('fund.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check if fund has sufficient balance',
    description:
      'Returns whether the fund\'s available balance is sufficient for the requested amount. ' +
      'Uses only COMPLETED transactions. The amount is a decimal string (e.g., "5000.00").',
  })
  @ApiParam({ name: 'fundId', format: 'uuid' })
  @ApiParam({ name: 'amount', example: '5000.00', description: 'Amount to check as decimal string' })
  @ApiOkResponse({ type: SufficientFundsEnvelopeDto })
  async checkSufficient(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('fundId', ParseUUIDPipe) fundId: string,
    @Param('amount') amount: string,
  ): Promise<SufficientFundsEnvelopeDto> {
    const data = await this.service.checkSufficientFunds(actor, fundId, amount);
    return {
      success: true,
      message: 'Fund sufficient funds check completed',
      data,
    };
  }
}