import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionStatus, TransactionType } from '@prisma/client';

import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { CURRENCY_PATTERN, FALLBACK_CURRENCY, normalizeCurrency } from '../common/utils/currency';
import { fromDateOnly } from '../common/utils/date-only';
import { fromMoney } from '../common/utils/money';
import { FundBalanceDto } from '../fund-balance/dto/fund-balance-response.dto';
import { FundBalanceService } from '../fund-balance/fund-balance.service';
import { PrismaService } from '../prisma/prisma.service';
import { FundDetailsResponseDto } from './dto/fund-details-response.dto';
import { FundsSummaryResponseDto } from './dto/funds-summary-response.dto';

@Injectable()
export class FundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fundBalanceService: FundBalanceService,
  ) {}

  /**
   * Retrieves all funds for the caller's mosque with complete balance and transfer metrics.
   * Every balance is calculated server-side from the verified ledger.
   */
  async getAllFunds(actor: AuthenticatedUser): Promise<FundDetailsResponseDto[]> {
    const currency = await this.resolveCurrency(actor.mosqueId);

    const funds = await this.prisma.donationFund.findMany({
      where: { mosqueId: actor.mosqueId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        targetAmount: true,
        openingBalance: true,
        startDate: true,
        endDate: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { campaigns: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    const results: FundDetailsResponseDto[] = [];

    for (const fund of funds) {
      const balanceData = await this.fundBalanceService.getFundBalance(actor, fund.id);

      results.push({
        id: fund.id,
        name: fund.name,
        slug: fund.slug,
        description: fund.description,
        status: fund.status,
        currency,
        openingBalance: balanceData.openingBalance,
        totalIncome: balanceData.totalIncome,
        totalExpenses: balanceData.totalExpenses,
        incomingTransfers: balanceData.incomingTransfers,
        outgoingTransfers: balanceData.outgoingTransfers,
        availableBalance: balanceData.availableBalance,
        targetAmount: fromMoney(fund.targetAmount),
        startDate: fund.startDate ? fromDateOnly(fund.startDate) : null,
        endDate: fund.endDate ? fromDateOnly(fund.endDate) : null,
        isPublic: fund.isPublic,
        campaignCount: fund._count.campaigns,
        createdAt: fund.createdAt.toISOString(),
        updatedAt: fund.updatedAt.toISOString(),
      });
    }

    return results;
  }

  /**
   * Retrieves a single fund by ID with its complete balance and ledger calculations.
   */
  async getFundById(actor: AuthenticatedUser, id: string): Promise<FundDetailsResponseDto> {
    const currency = await this.resolveCurrency(actor.mosqueId);

    const fund = await this.prisma.donationFund.findFirst({
      where: { id, mosqueId: actor.mosqueId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        targetAmount: true,
        openingBalance: true,
        startDate: true,
        endDate: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { campaigns: true } },
      },
    });

    if (!fund) {
      throw new NotFoundException({
        code: 'FUND_NOT_FOUND',
        message: 'We could not find that donation fund.',
      });
    }

    const balanceData = await this.fundBalanceService.getFundBalance(actor, fund.id);

    return {
      id: fund.id,
      name: fund.name,
      slug: fund.slug,
      description: fund.description,
      status: fund.status,
      currency,
      openingBalance: balanceData.openingBalance,
      totalIncome: balanceData.totalIncome,
      totalExpenses: balanceData.totalExpenses,
      incomingTransfers: balanceData.incomingTransfers,
      outgoingTransfers: balanceData.outgoingTransfers,
      availableBalance: balanceData.availableBalance,
      targetAmount: fromMoney(fund.targetAmount),
      startDate: fund.startDate ? fromDateOnly(fund.startDate) : null,
      endDate: fund.endDate ? fromDateOnly(fund.endDate) : null,
      isPublic: fund.isPublic,
      campaignCount: fund._count.campaigns,
      createdAt: fund.createdAt.toISOString(),
      updatedAt: fund.updatedAt.toISOString(),
    };
  }

  /**
   * Direct balance endpoint for a fund.
   */
  async getFundBalance(actor: AuthenticatedUser, id: string): Promise<FundBalanceDto> {
    return this.fundBalanceService.getFundBalance(actor, id);
  }

  /**
   * Comprehensive summary across all funds of the mosque.
   * Shows total available, total opening, total income, total expenses, total transfers and per-fund breakdowns.
   */
  async getFundsSummary(actor: AuthenticatedUser): Promise<FundsSummaryResponseDto> {
    const currency = await this.resolveCurrency(actor.mosqueId);
    const funds = await this.getAllFunds(actor);

    let totalAvailable = new Prisma.Decimal(0);
    let totalOpening = new Prisma.Decimal(0);
    let totalIncome = new Prisma.Decimal(0);
    let totalExpenses = new Prisma.Decimal(0);
    let totalTransfers = new Prisma.Decimal(0);

    for (const fund of funds) {
      totalAvailable = totalAvailable.add(new Prisma.Decimal(fund.availableBalance));
      totalOpening = totalOpening.add(new Prisma.Decimal(fund.openingBalance));
      totalIncome = totalIncome.add(new Prisma.Decimal(fund.totalIncome));
      totalExpenses = totalExpenses.add(new Prisma.Decimal(fund.totalExpenses));
      totalTransfers = totalTransfers.add(new Prisma.Decimal(fund.incomingTransfers));
    }

    return {
      currency,
      totalAvailableBalance: totalAvailable.toFixed(2),
      totalOpeningBalance: totalOpening.toFixed(2),
      totalIncome: totalIncome.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      totalTransfers: totalTransfers.toFixed(2),
      fundCount: funds.length,
      funds,
    };
  }

  private async resolveCurrency(mosqueId: string): Promise<string> {
    const settings = await this.prisma.mosqueSettings.findUnique({
      where: { mosqueId },
      select: { currency: true },
    });

    const configured = normalizeCurrency(settings?.currency);

    return typeof configured === 'string' && CURRENCY_PATTERN.test(configured)
      ? configured
      : FALLBACK_CURRENCY;
  }
}
