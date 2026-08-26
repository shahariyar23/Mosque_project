import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import {
  TransactionEnvelopeDto,
  TransactionListEnvelopeDto,
  TransactionResponseDto,
  TransactionSummaryEnvelopeDto,
} from './dto/transaction-response.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { VoidTransactionDto } from './dto/void-transaction.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('transaction.record')
  @ApiOperation({
    summary: 'Record a transaction',
    description:
      'Records an income, expense, or fund transfer transaction into the mosque financial ledger.',
  })
  @ApiCreatedResponse({ type: TransactionEnvelopeDto })
  async create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateTransactionDto,
  ): Promise<TransactionEnvelopeDto> {
    const data = await this.service.create(actor, dto);
    return { data };
  }

  @Get()
  @Permissions('transaction.view')
  @ApiOperation({
    summary: 'List transactions',
    description:
      'Lists financial transactions for the actor’s mosque with server-side pagination, search, and filters.',
  })
  @ApiOkResponse({ type: TransactionListEnvelopeDto })
  async findMany(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: TransactionQueryDto,
  ): Promise<TransactionListEnvelopeDto> {
    return this.service.findMany(actor, query);
  }

  @Get('summary')
  @Permissions('transaction.view')
  @ApiOperation({
    summary: 'Get transactions summary',
    description: 'Retrieves mosque-wide financial ledger summary figures (income, expense, net balance).',
  })
  @ApiOkResponse({ type: TransactionSummaryEnvelopeDto })
  async summary(@CurrentUser() actor: AuthenticatedUser): Promise<TransactionSummaryEnvelopeDto> {
    const data = await this.service.summary(actor);
    return { data };
  }

  @Get(':id')
  @Permissions('transaction.view')
  @ApiOperation({
    summary: 'Read a transaction',
    description: 'Retrieves full details for a single financial transaction by its ID.',
  })
  @ApiOkResponse({ type: TransactionEnvelopeDto })
  async findOne(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TransactionEnvelopeDto> {
    const data = await this.service.findOne(actor, id);
    return { data };
  }

  @Patch(':id')
  @Permissions('transaction.record')
  @ApiOperation({
    summary: 'Update a transaction',
    description:
      'Updates non-immutable descriptive fields of a transaction without altering financial history.',
  })
  @ApiOkResponse({ type: TransactionEnvelopeDto })
  async update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<TransactionEnvelopeDto> {
    const data = await this.service.update(actor, id, dto);
    return { data };
  }

  @Patch(':id/void')
  @Permissions('transaction.void')
  @ApiOperation({
    summary: 'Void a transaction',
    description:
      'Voids an active financial transaction with a mandatory reason. Preserves the transaction record for audit history.',
  })
  @ApiOkResponse({ type: TransactionEnvelopeDto })
  async void(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VoidTransactionDto,
  ): Promise<TransactionEnvelopeDto> {
    const data = await this.service.void(actor, id, dto);
    return { data };
  }
}
