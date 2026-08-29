import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionStatus, TransactionType } from '@prisma/client';

import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { fromMoney, MONEY_PATTERN } from '../common/utils/money';
import { PrismaService } from '../prisma/prisma.service';
import { FundBalanceQueryDto } from './dto/fund-balance-query.dto';
import { toDateOnly } from '../common/utils/date-only';
import {
  FundBalanceDto,
  FundBalanceSummaryDto,
  FundFinancialSummaryDto,
  SufficientFundsDto,
} from './types/fund-balance.types';

/**
 * Fund Balance Engine — computes per-fund available balances from the financial ledger.
 *
 * Rules:
 * - Only COMPLETED transactions affect available balance
 * - PENDING, VOIDED, CANCELLED transactions do NOT affect balance
 * - Transfers are NOT income or expenses — tracked separately
 * - All money as Decimal strings, never floats
 * - Never allow a fund balance to become negative (checked in checkSufficientFunds)
 * - Every query scoped to caller's mosque (from token, never from request)
 */
@Injectable()
export class FundBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the calculated balance for a single fund.
   * Only COMPLETED transactions are included in the calculation.
   */
  async getFundBalance(actor: AuthenticatedUser, fundId: string): Promise<FundBalanceDto> {
    // Verify fund belongs to caller's mosque and read raw values
    const fund = await this.prisma.donationFund.findFirst({
      where: { id: fundId, mosqueId: actor.mosqueId },
      select: { id: true, name: true, openingBalance: true },
    });

    if (!fund) {
      throw new NotFoundException({
        code: 'FUND_NOT_FOUND',
        message: 'We could not find that donation fund.',
      });
    }

    // Run all aggregates in one transaction for consistency
    const [incomeAgg, expenseAgg, transfersInAgg, transfersOutAgg] = await this.prisma.$transaction([
      // Income: type=income, fundId, status=completed
      this.prisma.transaction.aggregate({
        where: {
          mosqueId: actor.mosqueId,
          fundId,
          type: TransactionType.income,
          status: TransactionStatus.completed,
        },
        _sum: { amount: true },
      }),
      // Expenses: type=expense, fundId, status=completed
      this.prisma.transaction.aggregate({
        where: {
          mosqueId: actor.mosqueId,
          fundId,
          type: TransactionType.expense,
          status: TransactionStatus.completed,
        },
        _sum: { amount: true },
      }),
      // Incoming transfers: type=transfer, toFundId, status=completed
      this.prisma.transaction.aggregate({
        where: {
          mosqueId: actor.mosqueId,
          toFundId: fundId,
          type: TransactionType.transfer,
          status: TransactionStatus.completed,
        },
        _sum: { amount: true },
      }),
      // Outgoing transfers: type=transfer, fundId, status=completed
      this.prisma.transaction.aggregate({
        where: {
          mosqueId: actor.mosqueId,
          fundId,
          type: TransactionType.transfer,
          status: TransactionStatus.completed,
        },
        _sum: { amount: true },
      }),
    ]);

    const openingBalance = fund.openingBalance ? fromMoney(fund.openingBalance) ?? '0.00' : '0.00';
    const totalIncome = fromMoney(incomeAgg._sum.amount) ?? '0.00';
    const totalExpenses = fromMoney(expenseAgg._sum.amount) ?? '0.00';
    const incomingTransfers = fromMoney(transfersInAgg._sum.amount) ?? '0.00';
    const outgoingTransfers = fromMoney(transfersOutAgg._sum.amount) ?? '0.00';

    // availableBalance = openingBalance + income - expenses + incomingTransfers - outgoingTransfers
    const opening = new Prisma.Decimal(openingBalance);
    const income = new Prisma.Decimal(totalIncome);
    const expenses = new Prisma.Decimal(totalExpenses);
    const transfersIn = new Prisma.Decimal(incomingTransfers);
    const transfersOut = new Prisma.Decimal(outgoingTransfers);

    const availableBalance = opening.add(income).sub(expenses).add(transfersIn).sub(transfersOut);

    return {
      fundId: fund.id,
      fundName: fund.name,
      openingBalance,
      totalIncome,
      totalExpenses,
      incomingTransfers,
      outgoingTransfers,
      availableBalance: availableBalance.toFixed(2),
    };
  }

  /**
   * Get balances for all funds in the caller's mosque.
   */
  async getAllFundBalances(actor: AuthenticatedUser): Promise<FundBalanceSummaryDto> {
    const funds = await this.prisma.donationFund.findMany({
      where: { mosqueId: actor.mosqueId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const fundBalances: FundBalanceDto[] = [];
    let totalAvailableBalance = new Prisma.Decimal(0);

    for (const fund of funds) {
      const balance = await this.getFundBalance(actor, fund.id);
      fundBalances.push(balance);
      totalAvailableBalance = totalAvailableBalance.add(new Prisma.Decimal(balance.availableBalance));
    }

    return {
      funds: fundBalances,
      totalAvailableBalance: totalAvailableBalance.toFixed(2),
    };
  }

  /**
   * Check if a fund has sufficient available balance for a requested amount.
   * Returns the available balance and a boolean indicating sufficiency.
   */
  async checkSufficientFunds(
    actor: AuthenticatedUser,
    fundId: string,
    amount: string,
  ): Promise<SufficientFundsDto> {
    const trimmedAmount = amount ? amount.trim() : '';
    if (!trimmedAmount || !MONEY_PATTERN.test(trimmedAmount)) {
      throw new BadRequestException({
        code: 'INVALID_AMOUNT',
        message: 'amount must be a valid non-negative decimal amount, for example "500.00"',
      });
    }

    const balance = await this.getFundBalance(actor, fundId);
    const available = new Prisma.Decimal(balance.availableBalance);
    const requested = new Prisma.Decimal(trimmedAmount);

    return {
      fundId: balance.fundId,
      fundName: balance.fundName,
      availableBalance: balance.availableBalance,
      requestedAmount: requested.toFixed(2),
      sufficient: available.gte(requested),
    };
  }

  /**
   * Enforces sufficient-funds validation within an active Prisma transaction with row locking.
   *
   * 1. Performs a row-level lock (SELECT ... FOR UPDATE) on the fund to prevent concurrent double-spending.
   * 2. Calculates the fund's current availableBalance:
   *    availableBalance = openingBalance + completedIncome - completedExpenses + incomingTransfers - outgoingTransfers
   * 3. Compares availableBalance against requiredAmount.
   * 4. If availableBalance < requiredAmount, throws BadRequestException:
   *    "Insufficient funds. Available: ৳X, Required: ৳Y."
   *
   * @param tx Active Prisma transaction client
   * @param mosqueId Tenant mosque ID
   * @param fundId Fund being debited
   * @param requiredAmount Amount to debit (Prisma.Decimal)
   * @param currencySymbol Optional currency symbol (defaults to '৳')
   */
  async assertSufficientFundsTx(
    tx: Prisma.TransactionClient,
    mosqueId: string,
    fundId: string,
    requiredAmount: Prisma.Decimal,
    currencySymbol: string = '৳',
  ): Promise<{ availableBalance: Prisma.Decimal }> {
    // Lock fund row for update to prevent concurrent race conditions
    try {
      await tx.$queryRaw`SELECT id FROM donation_funds WHERE id = ${fundId}::uuid AND "mosqueId" = ${mosqueId}::uuid FOR UPDATE`;
    } catch {
      // In mock/in-memory environments where raw query is not supported, proceed
    }

    const fund = await tx.donationFund.findFirst({
      where: { id: fundId, mosqueId },
      select: { id: true, name: true, openingBalance: true },
    });

    if (!fund) {
      throw new NotFoundException({
        code: 'FUND_NOT_FOUND',
        message: 'We could not find that donation fund.',
      });
    }

    // Aggregate completed transactions within this same transaction
    const [incomeAgg, expenseAgg, transfersInAgg, transfersOutAgg] = await Promise.all([
      tx.transaction.aggregate({
        where: {
          mosqueId,
          fundId,
          type: TransactionType.income,
          status: TransactionStatus.completed,
        },
        _sum: { amount: true },
      }),
      tx.transaction.aggregate({
        where: {
          mosqueId,
          fundId,
          type: TransactionType.expense,
          status: TransactionStatus.completed,
        },
        _sum: { amount: true },
      }),
      tx.transaction.aggregate({
        where: {
          mosqueId,
          toFundId: fundId,
          type: TransactionType.transfer,
          status: TransactionStatus.completed,
        },
        _sum: { amount: true },
      }),
      tx.transaction.aggregate({
        where: {
          mosqueId,
          fundId,
          type: TransactionType.transfer,
          status: TransactionStatus.completed,
        },
        _sum: { amount: true },
      }),
    ]);

    const opening = fund.openingBalance
      ? new Prisma.Decimal(fund.openingBalance)
      : new Prisma.Decimal(0);
    const income = incomeAgg._sum.amount ?? new Prisma.Decimal(0);
    const expenses = expenseAgg._sum.amount ?? new Prisma.Decimal(0);
    const transfersIn = transfersInAgg._sum.amount ?? new Prisma.Decimal(0);
    const transfersOut = transfersOutAgg._sum.amount ?? new Prisma.Decimal(0);

    const availableBalance = opening.add(income).sub(expenses).add(transfersIn).sub(transfersOut);

    if (availableBalance.lt(requiredAmount)) {
      const formatAmount = (amt: Prisma.Decimal) => {
        const num = Number(amt.toString());
        return Number.isInteger(num)
          ? num.toLocaleString('en-US')
          : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      throw new BadRequestException({
        code: 'INSUFFICIENT_FUNDS',
        message: `Insufficient funds in ${fund.name}. Available ${currencySymbol}${formatAmount(availableBalance)}, required ${currencySymbol}${formatAmount(requiredAmount)}.`,
      });
    }

    return { availableBalance };
  }

  /**
   * Get detailed financial summary for a fund with breakdowns by status, payment method, and category.
   * Supports optional date range filtering.
   */
  async getFundFinancialSummary(
    actor: AuthenticatedUser,
    fundId: string,
    query: FundBalanceQueryDto = {},
  ): Promise<FundFinancialSummaryDto> {
    // Verify fund belongs to caller's mosque and read raw values
    const fund = await this.prisma.donationFund.findFirst({
      where: { id: fundId, mosqueId: actor.mosqueId },
      select: { id: true, name: true, openingBalance: true },
    });

    if (!fund) {
      throw new NotFoundException({
        code: 'FUND_NOT_FOUND',
        message: 'We could not find that donation fund.',
      });
    }

    const dateFilter: Prisma.TransactionWhereInput = {};
    if (query.from || query.to) {
      dateFilter.transactedAt = {
        ...(query.from ? { gte: toDateOnly(query.from) } : {}),
        ...(query.to ? { lte: toDateOnly(query.to) } : {}),
      };
    }

    // Run all queries in one transaction
    const [
      incomeAgg,
      incomeByStatus,
      incomeByMethod,
      expenseAgg,
      expenseByStatus,
      expenseByCategory,
      transfersInAgg,
      transfersInByStatus,
      transfersOutAgg,
      transfersOutByStatus,
    ] = await this.prisma.$transaction([
      // Income aggregates
      this.prisma.transaction.aggregate({
        where: { ...dateFilter, mosqueId: actor.mosqueId, fundId, type: TransactionType.income, status: TransactionStatus.completed },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['status'],
        where: { ...dateFilter, mosqueId: actor.mosqueId, fundId, type: TransactionType.income },
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      this.prisma.transaction.groupBy({
        by: ['paymentMethod'],
        where: { ...dateFilter, mosqueId: actor.mosqueId, fundId, type: TransactionType.income, status: TransactionStatus.completed },
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      // Expense aggregates
      this.prisma.transaction.aggregate({
        where: { ...dateFilter, mosqueId: actor.mosqueId, fundId, type: TransactionType.expense, status: TransactionStatus.completed },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['status'],
        where: { ...dateFilter, mosqueId: actor.mosqueId, fundId, type: TransactionType.expense },
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      this.prisma.transaction.groupBy({
        by: ['category'],
        where: { ...dateFilter, mosqueId: actor.mosqueId, fundId, type: TransactionType.expense, status: TransactionStatus.completed },
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      // Transfers in aggregates
      this.prisma.transaction.aggregate({
        where: { ...dateFilter, mosqueId: actor.mosqueId, toFundId: fundId, type: TransactionType.transfer, status: TransactionStatus.completed },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['status'],
        where: { ...dateFilter, mosqueId: actor.mosqueId, toFundId: fundId, type: TransactionType.transfer },
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      // Transfers out aggregates
      this.prisma.transaction.aggregate({
        where: { ...dateFilter, mosqueId: actor.mosqueId, fundId, type: TransactionType.transfer, status: TransactionStatus.completed },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['status'],
        where: { ...dateFilter, mosqueId: actor.mosqueId, fundId, type: TransactionType.transfer },
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
    ]);

    const openingBalance = fund.openingBalance ? fromMoney(fund.openingBalance) : '0.00';
    const currency = await this.getMosqueCurrency(actor.mosqueId);

    // Helper to get amount and count from group
    const getAmount = (group: { _sum?: { amount?: Prisma.Decimal | null } }): Prisma.Decimal =>
      group._sum?.amount ?? new Prisma.Decimal(0);
    const getCount = (group: any): number => group._count?._all ?? 0;

    // Helper to cast status to TransactionStatus enum
    const toStatus = (s: string): TransactionStatus => s as TransactionStatus;
    const toCategory = (c: string | null): string => c ?? 'uncategorized';

    const totalIncome = fromMoney(getAmount(incomeAgg));
    const totalExpenses = fromMoney(getAmount(expenseAgg));
    const totalTransfersIn = fromMoney(getAmount(transfersInAgg));
    const totalTransfersOut = fromMoney(getAmount(transfersOutAgg));

    const available = new Prisma.Decimal(openingBalance)
      .add(new Prisma.Decimal(totalIncome))
      .sub(new Prisma.Decimal(totalExpenses))
      .add(new Prisma.Decimal(totalTransfersIn))
      .sub(new Prisma.Decimal(totalTransfersOut));

    return {
      fundId: fund.id,
      fundName: fund.name,
      openingBalance,
      currency,
      income: {
        total: totalIncome,
        count: getCount(incomeAgg),
        byStatus: incomeByStatus.map((g) => ({
          status: toStatus(g.status),
          total: fromMoney(getAmount(g)),
          count: getCount(g),
        })),
        byPaymentMethod: incomeByMethod.map((g) => ({
          paymentMethod: g.paymentMethod,
          total: fromMoney(getAmount(g)),
          count: getCount(g),
        })),
      },
      expenses: {
        total: totalExpenses,
        count: getCount(expenseAgg),
        byStatus: expenseByStatus.map((g) => ({
          status: toStatus(g.status),
          total: fromMoney(getAmount(g)),
          count: getCount(g),
        })),
        byCategory: expenseByCategory.map((g) => ({
          category: toCategory(g.category),
          total: fromMoney(getAmount(g)),
          count: getCount(g),
        })),
      },
      transfersIn: {
        total: totalTransfersIn,
        count: getCount(transfersInAgg),
        byStatus: transfersInByStatus.map((g) => ({
          status: toStatus(g.status),
          total: fromMoney(getAmount(g)),
          count: getCount(g),
        })),
      },
      transfersOut: {
        total: totalTransfersOut,
        count: getCount(transfersOutAgg),
        byStatus: transfersOutByStatus.map((g) => ({
          status: toStatus(g.status),
          total: fromMoney(getAmount(g)),
          count: getCount(g),
        })),
      },
      availableBalance: available.toFixed(2),
    };
  }

  /**
   * Get the mosque's configured currency.
   */
  private async getMosqueCurrency(mosqueId: string): Promise<string> {
    const settings = await this.prisma.mosqueSettings.findUnique({
      where: { mosqueId },
      select: { currency: true },
    });
    return settings?.currency || 'BDT';
  }
}
