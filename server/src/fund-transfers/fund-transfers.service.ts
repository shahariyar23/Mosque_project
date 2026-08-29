import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod, Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import { randomUUID } from 'crypto';

import { AuditLogService } from '../audit/audit-log.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { CURRENCY_PATTERN, FALLBACK_CURRENCY, normalizeCurrency } from '../common/utils/currency';
import { toInstant } from '../common/utils/instant';
import { toMoney } from '../common/utils/money';
import { FundBalanceService } from '../fund-balance/fund-balance.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFundTransferDto } from './dto/create-fund-transfer.dto';
import { FundTransferResponseDto } from './dto/fund-transfer-response.dto';

@Injectable()
export class FundTransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly fundBalanceService: FundBalanceService,
  ) {}

  /**
   * Transfers funds between two funds of the caller's mosque atomically.
   *
   * 1. Validates that source and destination funds are distinct and belong to the mosque.
   * 2. Locks fund rows to prevent concurrent balance overdrafts.
   * 3. Enforces sufficient funds check on the source fund.
   * 4. Creates a linked completed transfer ledger transaction atomically.
   * 5. Emits an audit log.
   */
  async transfer(
    actor: AuthenticatedUser,
    dto: CreateFundTransferDto,
  ): Promise<FundTransferResponseDto> {
    if (dto.fromFundId === dto.toFundId) {
      throw new BadRequestException({
        code: 'SELF_TRANSFER_NOT_ALLOWED',
        message: 'Cannot transfer funds to the same fund.',
      });
    }

    const currency = await this.resolveCurrency(actor.mosqueId, dto.currency);
    const amountDecimal = toMoney(dto.amount);
    const transactedAt = dto.transactedAt ? toInstant(dto.transactedAt) : new Date();

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Concurrency protection: lock both funds in deterministic order to avoid deadlocks
        const [firstId, secondId] = [dto.fromFundId, dto.toFundId].sort();
        try {
          await tx.$queryRaw`
            SELECT id FROM donation_funds
            WHERE id IN (${firstId}::uuid, ${secondId}::uuid)
              AND "mosqueId" = ${actor.mosqueId}::uuid
            ORDER BY id
            FOR UPDATE
          `;
        } catch {
          // Proceed in mock / SQLite environments
        }

        const [fromFund, toFund] = await Promise.all([
          tx.donationFund.findFirst({
            where: { id: dto.fromFundId, mosqueId: actor.mosqueId },
            select: { id: true, name: true, openingBalance: true },
          }),
          tx.donationFund.findFirst({
            where: { id: dto.toFundId, mosqueId: actor.mosqueId },
            select: { id: true, name: true, openingBalance: true },
          }),
        ]);

        if (!fromFund || !toFund) {
          throw new NotFoundException({
            code: 'FUND_NOT_FOUND',
            message: 'One or both donation funds could not be found for your mosque.',
          });
        }

        // Validate that source fund has sufficient available balance
        const { availableBalance: fromBalanceBefore } =
          await this.fundBalanceService.assertSufficientFundsTx(
            tx,
            actor.mosqueId,
            dto.fromFundId,
            amountDecimal,
          );

        const sharedReference =
          dto.reference?.trim() || `TRF-${randomUUID().slice(0, 8).toUpperCase()}`;
        const description =
          dto.description?.trim() || `Transfer from ${fromFund.name} to ${toFund.name}`;

        // Create the single linked ledger transfer record
        const transferTx = await tx.transaction.create({
          data: {
            mosqueId: actor.mosqueId,
            type: TransactionType.transfer,
            status: TransactionStatus.completed,
            amount: amountDecimal,
            currency,
            description,
            category: 'Fund Transfer',
            reference: sharedReference,
            paymentMethod: PaymentMethod.other,
            fundId: fromFund.id,
            toFundId: toFund.id,
            transactedAt,
            createdById: actor.id,
          },
          select: {
            id: true,
            amount: true,
            currency: true,
            description: true,
            reference: true,
            transactedAt: true,
          },
        });

        // Compute balances after transfer
        const fromFundRemainingBalance = fromBalanceBefore.sub(amountDecimal);

        // Compute destination fund balance after transfer
        const [toIncome, toExpense, toTransfersIn, toTransfersOut] = await Promise.all([
          tx.transaction.aggregate({
            where: {
              mosqueId: actor.mosqueId,
              fundId: toFund.id,
              type: TransactionType.income,
              status: TransactionStatus.completed,
            },
            _sum: { amount: true },
          }),
          tx.transaction.aggregate({
            where: {
              mosqueId: actor.mosqueId,
              fundId: toFund.id,
              type: TransactionType.expense,
              status: TransactionStatus.completed,
            },
            _sum: { amount: true },
          }),
          tx.transaction.aggregate({
            where: {
              mosqueId: actor.mosqueId,
              toFundId: toFund.id,
              type: TransactionType.transfer,
              status: TransactionStatus.completed,
            },
            _sum: { amount: true },
          }),
          tx.transaction.aggregate({
            where: {
              mosqueId: actor.mosqueId,
              fundId: toFund.id,
              type: TransactionType.transfer,
              status: TransactionStatus.completed,
            },
            _sum: { amount: true },
          }),
        ]);

        const toOpening = toFund.openingBalance
          ? new Prisma.Decimal(toFund.openingBalance)
          : new Prisma.Decimal(0);
        const toFundNewBalance = toOpening
          .add(toIncome._sum.amount ?? new Prisma.Decimal(0))
          .sub(toExpense._sum.amount ?? new Prisma.Decimal(0))
          .add(toTransfersIn._sum.amount ?? new Prisma.Decimal(0))
          .sub(toTransfersOut._sum.amount ?? new Prisma.Decimal(0));

        return {
          id: transferTx.id,
          transferReference: transferTx.reference ?? sharedReference,
          fromFundId: fromFund.id,
          fromFundName: fromFund.name,
          toFundId: toFund.id,
          toFundName: toFund.name,
          amount: transferTx.amount.toFixed(2),
          currency: transferTx.currency,
          description: transferTx.description,
          reference: transferTx.reference,
          transactedAt: transferTx.transactedAt.toISOString(),
          fromFundRemainingBalance: fromFundRemainingBalance.toFixed(2),
          toFundNewBalance: toFundNewBalance.toFixed(2),
        };
      });

      // Audit log recording for successful transfer
      await this.audit.record({
        mosqueId: actor.mosqueId,
        actorId: actor.id,
        actorName: actor.email,
        actorRole: actor.role,
        action: 'FUND_TRANSFER_COMPLETED',
        resource: 'fund_transfer',
        resourceId: result.id,
        changes: {
          fromFundId: result.fromFundId,
          fromFundName: result.fromFundName,
          toFundId: result.toFundId,
          toFundName: result.toFundName,
          amount: result.amount,
          currency: result.currency,
          transferReference: result.transferReference,
          fromFundRemainingBalance: result.fromFundRemainingBalance,
          toFundNewBalance: result.toFundNewBalance,
        },
        note: `Transferred ${result.amount} ${result.currency} from ${result.fromFundName} to ${result.toFundName} (Ref: ${result.transferReference})`,
      });

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        const resp = error.getResponse() as Record<string, unknown>;
        if (resp?.code === 'INSUFFICIENT_FUNDS') {
          await this.audit.record({
            mosqueId: actor.mosqueId,
            actorId: actor.id,
            actorName: actor.email,
            actorRole: actor.role,
            action: 'FUND_TRANSFER_REJECTED_INSUFFICIENT_FUNDS',
            resource: 'fund_transfer',
            changes: {
              fromFundId: dto.fromFundId,
              toFundId: dto.toFundId,
              requestedAmount: dto.amount,
              operation: 'fund_transfer',
              reason: error.message,
              reference: dto.reference ?? null,
            },
            note: error.message,
          });
        }
      }
      throw this.translate(error);
    }
  }

  private async resolveCurrency(mosqueId: string, sent: string | undefined): Promise<string> {
    if (sent) return sent;

    const settings = await this.prisma.mosqueSettings.findUnique({
      where: { mosqueId },
      select: { currency: true },
    });

    const configured = normalizeCurrency(settings?.currency);

    return typeof configured === 'string' && CURRENCY_PATTERN.test(configured)
      ? configured
      : FALLBACK_CURRENCY;
  }

  private translate(error: unknown): unknown {
    if (error instanceof HttpException) return error;
    if (error instanceof Error && 'status' in error) return error;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return new BadRequestException({
          code: 'FOREIGN_KEY_VIOLATION',
          message: 'One of the specified funds does not exist.',
        });
      }
    }

    return error;
  }
}
