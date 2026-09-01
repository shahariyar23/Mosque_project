import { Injectable, NotFoundException } from '@nestjs/common';
import { FundStatus, JummahCollectionStatus, Prisma, TransactionStatus, TransactionType } from '@prisma/client';

import { MAX_PAGE_SIZE } from '../common/pagination/page';
import { FALLBACK_CURRENCY } from '../common/utils/currency';
import { fromDateOnly, toDateOnly } from '../common/utils/date-only';
import { fromMoney } from '../common/utils/money';
import { PrismaService } from '../prisma/prisma.service';
import {
  PublicFundProgressDto,
  PublicTransparencySummaryDto,
} from './dto/public-fund.dto';
import {
  PublicJummahCollectionDto,
  PublicJummahCollectionListMetaDto,
  PublicJummahCollectionQueryDto,
} from './dto/public-jummah-collection.dto';

@Injectable()
export class PublicTransparencyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all publicly visible funds for a mosque with verified server-side calculated progress metrics.
   */
  async getPublicFunds(mosqueSlug: string): Promise<PublicFundProgressDto[]> {
    const mosque = await this.getPublicMosque(mosqueSlug);

    const funds = await this.prisma.donationFund.findMany({
      where: {
        mosqueId: mosque.id,
        isPublic: true,
        status: { in: [FundStatus.active, FundStatus.completed] },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        openingBalance: true,
        targetAmount: true,
        startDate: true,
        endDate: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const currency = mosque.settings?.currency || FALLBACK_CURRENCY;
    const results: PublicFundProgressDto[] = [];

    for (const fund of funds) {
      const fundProgress = await this.computeFundProgress(mosque.id, fund, currency);
      results.push(fundProgress);
    }

    return results;
  }

  /**
   * Retrieves a single public fund by its slug with current progress and collection statistics.
   */
  async getPublicFundBySlug(
    mosqueSlug: string,
    fundSlug: string,
  ): Promise<PublicFundProgressDto> {
    const mosque = await this.getPublicMosque(mosqueSlug);

    const fund = await this.prisma.donationFund.findFirst({
      where: {
        mosqueId: mosque.id,
        slug: fundSlug,
        isPublic: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        openingBalance: true,
        targetAmount: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!fund) {
      throw new NotFoundException({
        code: 'PUBLIC_FUND_NOT_FOUND',
        message: 'The requested fund was not found or is not publicly published.',
      });
    }

    const currency = mosque.settings?.currency || FALLBACK_CURRENCY;
    return this.computeFundProgress(mosque.id, fund, currency);
  }

  /**
   * Returns whole-mosque aggregated public transparency metrics across all published funds.
   */
  async getTransparencySummary(mosqueSlug: string): Promise<PublicTransparencySummaryDto> {
    const mosque = await this.getPublicMosque(mosqueSlug);
    const currency = mosque.settings?.currency || FALLBACK_CURRENCY;
    const funds = await this.getPublicFunds(mosqueSlug);

    let totalTarget = new Prisma.Decimal(0);
    let totalCollected = new Prisma.Decimal(0);
    let totalRemaining = new Prisma.Decimal(0);
    let hasTarget = false;

    for (const f of funds) {
      const collected = new Prisma.Decimal(f.collectedAmount);
      totalCollected = totalCollected.add(collected);

      if (f.targetAmount !== null) {
        hasTarget = true;
        const target = new Prisma.Decimal(f.targetAmount);
        totalTarget = totalTarget.add(target);
        if (f.remainingAmount !== null) {
          totalRemaining = totalRemaining.add(new Prisma.Decimal(f.remainingAmount));
        }
      }
    }

    let overallProgress = 0;
    if (hasTarget && !totalTarget.isZero()) {
      overallProgress = Number(
        totalCollected.div(totalTarget).mul(100).toFixed(2),
      );
      if (overallProgress > 100) overallProgress = 100;
    }

    return {
      mosqueName: mosque.name,
      mosqueSlug: mosque.slug,
      currency,
      totalTargetAmount: totalTarget.toFixed(2),
      totalCollectedAmount: totalCollected.toFixed(2),
      totalRemainingAmount: totalRemaining.toFixed(2),
      overallProgressPercentage: overallProgress,
      funds,
    };
  }

  /**
   * Retrieves public Jummah collection history for a mosque.
   * Strips all internal IDs, donor data, user records, and private metadata.
   */
  async getPublicJummahCollections(
    mosqueSlug: string,
    query: PublicJummahCollectionQueryDto,
  ): Promise<{ rows: PublicJummahCollectionDto[]; meta: PublicJummahCollectionListMetaDto }> {
    const mosque = await this.getPublicMosque(mosqueSlug);

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.JummahCollectionWhereInput = {
      mosqueId: mosque.id,
      isPublic: true,
      status: JummahCollectionStatus.completed,
    };

    if (query.from || query.to) {
      where.date = {
        ...(query.from ? { gte: toDateOnly(query.from) } : {}),
        ...(query.to ? { lte: toDateOnly(query.to) } : {}),
      };
    }

    if (query.fundSlug) {
      where.fund = { slug: query.fundSlug, isPublic: true };
    }

    const [total, rows] = await Promise.all([
      this.prisma.jummahCollection.count({ where }),
      this.prisma.jummahCollection.findMany({
        where,
        select: {
          id: true,
          date: true,
          amount: true,
          currency: true,
          notes: true,
          fund: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      rows: rows.map((r) => ({
        id: r.id,
        date: fromDateOnly(r.date),
        amount: fromMoney(r.amount) ?? r.amount.toString(),
        currency: r.currency,
        fundName: r.fund.name,
        fundSlug: r.fund.slug,
        notes: r.notes,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  // --- Internal Helpers ---

  private async getPublicMosque(slug: string) {
    const mosque = await this.prisma.mosque.findUnique({
      where: { slug, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        settings: { select: { currency: true } },
      },
    });

    if (!mosque) {
      throw new NotFoundException({
        code: 'MOSQUE_NOT_FOUND',
        message: 'The requested mosque was not found or is currently inactive.',
      });
    }

    return mosque;
  }

  private async computeFundProgress(
    mosqueId: string,
    fund: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      status: FundStatus;
      openingBalance: Prisma.Decimal | null;
      targetAmount: Prisma.Decimal | null;
      startDate: Date | null;
      endDate: Date | null;
    },
    currency: string,
  ): Promise<PublicFundProgressDto> {
    // Sum all completed income transactions for this fund
    const incomeAgg = await this.prisma.transaction.aggregate({
      where: {
        mosqueId,
        fundId: fund.id,
        type: TransactionType.income,
        status: TransactionStatus.completed,
      },
      _sum: { amount: true },
    });

    const opening = fund.openingBalance ? new Prisma.Decimal(fund.openingBalance) : new Prisma.Decimal(0);
    const income = incomeAgg._sum.amount ? new Prisma.Decimal(incomeAgg._sum.amount) : new Prisma.Decimal(0);
    const collected = opening.add(income);

    let targetAmountStr: string | null = null;
    let remainingAmountStr: string | null = null;
    let progressPercentage: number | null = null;

    if (fund.targetAmount !== null) {
      const target = new Prisma.Decimal(fund.targetAmount);
      targetAmountStr = target.toFixed(2);

      const remaining = target.sub(collected);
      remainingAmountStr = remaining.isNegative() ? '0.00' : remaining.toFixed(2);

      if (!target.isZero()) {
        const rawPercent = Number(collected.div(target).mul(100).toFixed(2));
        progressPercentage = rawPercent > 100 ? 100 : Math.max(0, rawPercent);
      } else {
        progressPercentage = 100;
      }
    }

    return {
      id: fund.id,
      name: fund.name,
      slug: fund.slug,
      description: fund.description,
      status: fund.status,
      targetAmount: targetAmountStr,
      collectedAmount: collected.toFixed(2),
      remainingAmount: remainingAmountStr,
      progressPercentage,
      currency,
      startDate: fund.startDate ? fromDateOnly(fund.startDate) : null,
      endDate: fund.endDate ? fromDateOnly(fund.endDate) : null,
    };
  }
}
