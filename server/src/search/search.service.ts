import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  effectivePermissions,
  hasAnyPermission,
  hasPermission,
  scopeFor,
  type DataScope,
} from '../common/constants/roles';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { SearchQueryDto } from './dto/search-query.dto';
import {
  SearchCategoryGroupDto,
  SearchItemDto,
  SearchResultDataDto,
} from './dto/search-response.dto';

const DEFAULT_CATEGORY_LIMIT = 5;
const MAX_CATEGORY_LIMIT = 20;

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Scopes queries to the actor's mosque unless they hold platform.manage.
   */
  private mosqueScope(actor: AuthenticatedUser): { mosqueId?: string } {
    return hasPermission(effectivePermissions(actor), 'platform.manage')
      ? {}
      : { mosqueId: actor.mosqueId };
  }

  /**
   * Executes permission-gated global search across all authorized mosque entities.
   */
  async search(actor: AuthenticatedUser, queryDto: SearchQueryDto): Promise<SearchResultDataDto> {
    const rawQuery = queryDto.q?.trim() ?? '';
    const limit = Math.min(
      Math.max(1, queryDto.limit ?? DEFAULT_CATEGORY_LIMIT),
      MAX_CATEGORY_LIMIT,
    );
    const targetType = queryDto.type?.trim().toLowerCase();

    // Guard: Empty or single-character query returns empty categories safely
    if (rawQuery.length < 2) {
      return {
        query: rawQuery,
        totalResults: 0,
        categories: [],
      };
    }

    const granted = effectivePermissions(actor);

    // Inactive user or no permissions -> Zero results
    if (granted.length === 0) {
      return {
        query: rawQuery,
        totalResults: 0,
        categories: [],
      };
    }

    const tasks: Promise<SearchCategoryGroupDto | null>[] = [];

    // 1. Users / Members
    if (
      (!targetType || targetType === 'users' || targetType === 'members') &&
      hasAnyPermission(granted, ['user.view', 'member.view'])
    ) {
      tasks.push(this.searchUsers(actor, rawQuery, limit, granted));
    }

    // 2. Transactions
    if (
      (!targetType || targetType === 'transactions') &&
      hasPermission(granted, 'transaction.view')
    ) {
      tasks.push(this.searchTransactions(actor, rawQuery, limit));
    }

    // 3. Donations
    if (
      (!targetType || targetType === 'donations') &&
      hasAnyPermission(granted, ['donation.view', 'donation.viewOwn'])
    ) {
      const scope = scopeFor(granted, 'donation.view', 'donation.viewOwn');
      tasks.push(this.searchDonations(actor, rawQuery, limit, scope));
    }

    // 4. Funds
    if ((!targetType || targetType === 'funds') && hasPermission(granted, 'fund.view')) {
      tasks.push(this.searchFunds(actor, rawQuery, limit));
    }

    // 5. Campaigns
    if ((!targetType || targetType === 'campaigns') && hasPermission(granted, 'campaign.view')) {
      tasks.push(this.searchCampaigns(actor, rawQuery, limit));
    }

    // 6. Expenses
    if ((!targetType || targetType === 'expenses') && hasPermission(granted, 'expense.view')) {
      tasks.push(this.searchExpenses(actor, rawQuery, limit));
    }

    // 7. Salaries
    if (
      (!targetType || targetType === 'salaries') &&
      hasAnyPermission(granted, ['salary.view', 'salary.viewOwn'])
    ) {
      const scope = scopeFor(granted, 'salary.view', 'salary.viewOwn');
      tasks.push(this.searchSalaries(actor, rawQuery, limit, scope));
    }

    // 8. Receipts
    if (
      (!targetType || targetType === 'receipts') &&
      hasAnyPermission(granted, ['receipt.view', 'receipt.viewOwn'])
    ) {
      const scope = scopeFor(granted, 'receipt.view', 'receipt.viewOwn');
      tasks.push(this.searchReceipts(actor, rawQuery, limit, scope));
    }

    // 9. Announcements
    if (
      (!targetType || targetType === 'announcements') &&
      hasPermission(granted, 'announcement.view')
    ) {
      tasks.push(this.searchAnnouncements(actor, rawQuery, limit));
    }

    // 10. Events
    if ((!targetType || targetType === 'events') && hasPermission(granted, 'event.view')) {
      tasks.push(this.searchEvents(actor, rawQuery, limit));
    }

    // 11. Volunteers
    if ((!targetType || targetType === 'volunteers') && hasPermission(granted, 'volunteer.view')) {
      tasks.push(this.searchVolunteers(actor, rawQuery, limit));
    }

    const results = await Promise.all(tasks);
    const categories = results.filter((c): c is SearchCategoryGroupDto => c !== null && c.items.length > 0);
    const totalResults = categories.reduce((sum, c) => sum + c.totalMatches, 0);

    return {
      query: rawQuery,
      totalResults,
      categories,
    };
  }

  // ---- Sub-search queries ----------------------------------------------------

  private async searchUsers(
    actor: AuthenticatedUser,
    term: string,
    limit: number,
    granted: string[],
  ): Promise<SearchCategoryGroupDto | null> {
    const canViewDeleted = hasPermission(granted as any, 'user.viewDeleted');
    const where: Prisma.UserWhereInput = {
      ...this.mosqueScope(actor),
      ...(canViewDeleted ? {} : { deletedAt: null }),
      OR: [
        { fullName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ],
    };

    const [totalMatches, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
        },
        take: limit,
        orderBy: [{ fullName: 'asc' }],
      }),
    ]);

    if (rows.length === 0) return null;

    return {
      category: 'users',
      label: 'Members & Users',
      totalMatches,
      items: rows.map((u): SearchItemDto => ({
        id: u.id,
        type: 'user',
        title: u.fullName,
        subtitle: u.email || u.phone || 'Member',
        badge: u.role,
        href: '/dashboard/users',
      })),
    };
  }

  private async searchTransactions(
    actor: AuthenticatedUser,
    term: string,
    limit: number,
  ): Promise<SearchCategoryGroupDto | null> {
    const where: Prisma.TransactionWhereInput = {
      ...this.mosqueScope(actor),
      OR: [
        { description: { contains: term, mode: 'insensitive' } },
        { reference: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
        { receipt: { receiptNumber: { contains: term, mode: 'insensitive' } } },
      ],
    };

    const [totalMatches, rows] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        select: {
          id: true,
          type: true,
          description: true,
          amount: true,
          currency: true,
          reference: true,
          status: true,
          transactedAt: true,
        },
        take: limit,
        orderBy: [{ transactedAt: 'desc' }],
      }),
    ]);

    if (rows.length === 0) return null;

    return {
      category: 'transactions',
      label: 'Transactions',
      totalMatches,
      items: rows.map((t): SearchItemDto => ({
        id: t.id,
        type: 'transaction',
        title: t.description,
        subtitle: `${t.currency} ${Number(t.amount).toLocaleString()} · ${t.type}${t.reference ? ` (${t.reference})` : ''}`,
        badge: t.status,
        href: '/dashboard/finance/transactions',
      })),
    };
  }

  private async searchDonations(
    actor: AuthenticatedUser,
    term: string,
    limit: number,
    scope: DataScope,
  ): Promise<SearchCategoryGroupDto | null> {
    const where: Prisma.DonationWhereInput = {
      ...this.mosqueScope(actor),
      ...(scope === 'own' ? { userId: actor.id } : {}),
      OR: [
        { donorName: { contains: term, mode: 'insensitive' } },
        { donorEmail: { contains: term, mode: 'insensitive' } },
        { reference: { contains: term, mode: 'insensitive' } },
      ],
    };

    const [totalMatches, rows] = await Promise.all([
      this.prisma.donation.count({ where }),
      this.prisma.donation.findMany({
        where,
        select: {
          id: true,
          donorName: true,
          amount: true,
          currency: true,
          reference: true,
          status: true,
          donatedAt: true,
          fund: { select: { name: true } },
        },
        take: limit,
        orderBy: [{ donatedAt: 'desc' }],
      }),
    ]);

    if (rows.length === 0) return null;

    return {
      category: 'donations',
      label: 'Donations',
      totalMatches,
      items: rows.map((d): SearchItemDto => ({
        id: d.id,
        type: 'donation',
        title: d.donorName || (d.reference ? `Donation ${d.reference}` : 'General Donation'),
        subtitle: `${d.currency} ${Number(d.amount).toLocaleString()} · ${d.fund?.name || 'Fund'}`,
        badge: d.status,
        href: '/dashboard/finance/donations',
      })),
    };
  }

  private async searchFunds(
    actor: AuthenticatedUser,
    term: string,
    limit: number,
  ): Promise<SearchCategoryGroupDto | null> {
    const where: Prisma.DonationFundWhereInput = {
      ...this.mosqueScope(actor),
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { slug: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ],
    };

    const [totalMatches, rows] = await Promise.all([
      this.prisma.donationFund.count({ where }),
      this.prisma.donationFund.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          targetAmount: true,
          description: true,
        },
        take: limit,
        orderBy: [{ name: 'asc' }],
      }),
    ]);

    if (rows.length === 0) return null;

    return {
      category: 'funds',
      label: 'Funds',
      totalMatches,
      items: rows.map((f): SearchItemDto => ({
        id: f.id,
        type: 'fund',
        title: f.name,
        subtitle: f.description || `Slug: ${f.slug}`,
        badge: f.status,
        href: '/dashboard/finance/funds',
      })),
    };
  }

  private async searchCampaigns(
    actor: AuthenticatedUser,
    term: string,
    limit: number,
  ): Promise<SearchCategoryGroupDto | null> {
    const where: Prisma.CampaignWhereInput = {
      ...this.mosqueScope(actor),
      OR: [
        { title: { contains: term, mode: 'insensitive' } },
        { slug: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ],
    };

    const [totalMatches, rows] = await Promise.all([
      this.prisma.campaign.count({ where }),
      this.prisma.campaign.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          targetAmount: true,
          description: true,
        },
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
      }),
    ]);

    if (rows.length === 0) return null;

    return {
      category: 'campaigns',
      label: 'Campaigns',
      totalMatches,
      items: rows.map((c): SearchItemDto => ({
        id: c.id,
        type: 'campaign',
        title: c.title,
        subtitle: c.description || `Target: ৳${Number(c.targetAmount).toLocaleString()}`,
        badge: c.status,
        href: '/dashboard/finance/campaigns',
      })),
    };
  }

  private async searchExpenses(
    actor: AuthenticatedUser,
    term: string,
    limit: number,
  ): Promise<SearchCategoryGroupDto | null> {
    const where: Prisma.ExpenseWhereInput = {
      ...this.mosqueScope(actor),
      OR: [
        { description: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
        { reference: { contains: term, mode: 'insensitive' } },
      ],
    };

    const [totalMatches, rows] = await Promise.all([
      this.prisma.expense.count({ where }),
      this.prisma.expense.findMany({
        where,
        select: {
          id: true,
          description: true,
          category: true,
          amount: true,
          currency: true,
          status: true,
          expenseDate: true,
          reference: true,
        },
        take: limit,
        orderBy: [{ expenseDate: 'desc' }],
      }),
    ]);

    if (rows.length === 0) return null;

    return {
      category: 'expenses',
      label: 'Expenses',
      totalMatches,
      items: rows.map((e): SearchItemDto => ({
        id: e.id,
        type: 'expense',
        title: e.description,
        subtitle: `${e.currency} ${Number(e.amount).toLocaleString()} · ${e.category}${e.reference ? ` (${e.reference})` : ''}`,
        badge: e.status,
        href: '/dashboard/finance/expenses',
      })),
    };
  }

  private async searchSalaries(
    actor: AuthenticatedUser,
    term: string,
    limit: number,
    scope: DataScope,
  ): Promise<SearchCategoryGroupDto | null> {
    const where: Prisma.SalaryRecordWhereInput = {
      ...this.mosqueScope(actor),
      ...(scope === 'own' ? { userId: actor.id } : {}),
      OR: [
        { user: { fullName: { contains: term, mode: 'insensitive' } } },
        { payPeriod: { contains: term, mode: 'insensitive' } },
        { notes: { contains: term, mode: 'insensitive' } },
      ],
    };

    const [totalMatches, rows] = await Promise.all([
      this.prisma.salaryRecord.count({ where }),
      this.prisma.salaryRecord.findMany({
        where,
        select: {
          id: true,
          payPeriod: true,
          amount: true,
          currency: true,
          status: true,
          paymentDate: true,
          user: { select: { fullName: true } },
        },
        take: limit,
        orderBy: [{ paymentDate: 'desc' }],
      }),
    ]);

    if (rows.length === 0) return null;

    return {
      category: 'salaries',
      label: 'Salaries',
      totalMatches,
      items: rows.map((s): SearchItemDto => ({
        id: s.id,
        type: 'salary',
        title: s.user?.fullName || 'Staff Salary',
        subtitle: `${s.currency} ${Number(s.amount).toLocaleString()} · Period: ${s.payPeriod}`,
        badge: s.status,
        href: '/dashboard/finance/salaries',
      })),
    };
  }

  private async searchReceipts(
    actor: AuthenticatedUser,
    term: string,
    limit: number,
    scope: DataScope,
  ): Promise<SearchCategoryGroupDto | null> {
    const where: Prisma.ReceiptWhereInput = {
      ...this.mosqueScope(actor),
      ...(scope === 'own' ? { userId: actor.id } : {}),
      OR: [
        { receiptNumber: { contains: term, mode: 'insensitive' } },
        { donor: { fullName: { contains: term, mode: 'insensitive' } } },
        { donation: { donorName: { contains: term, mode: 'insensitive' } } },
      ],
    };

    const [totalMatches, rows] = await Promise.all([
      this.prisma.receipt.count({ where }),
      this.prisma.receipt.findMany({
        where,
        select: {
          id: true,
          receiptNumber: true,
          amount: true,
          currency: true,
          status: true,
          issuedAt: true,
          donor: { select: { fullName: true } },
          donation: { select: { donorName: true } },
        },
        take: limit,
        orderBy: [{ issuedAt: 'desc' }],
      }),
    ]);

    if (rows.length === 0) return null;

    return {
      category: 'receipts',
      label: 'Receipts',
      totalMatches,
      items: rows.map((r): SearchItemDto => ({
        id: r.id,
        type: 'receipt',
        title: r.receiptNumber,
        subtitle: `${r.currency} ${Number(r.amount).toLocaleString()} · ${r.donor?.fullName || r.donation?.donorName || 'Donor'}`,
        badge: r.status,
        href: '/dashboard/finance/receipts',
      })),
    };
  }

  private async searchAnnouncements(
    actor: AuthenticatedUser,
    term: string,
    limit: number,
  ): Promise<SearchCategoryGroupDto | null> {
    const where: Prisma.AnnouncementWhereInput = {
      ...this.mosqueScope(actor),
      OR: [
        { title: { contains: term, mode: 'insensitive' } },
        { summary: { contains: term, mode: 'insensitive' } },
        { content: { contains: term, mode: 'insensitive' } },
      ],
    };

    const [totalMatches, rows] = await Promise.all([
      this.prisma.announcement.count({ where }),
      this.prisma.announcement.findMany({
        where,
        select: {
          id: true,
          title: true,
          summary: true,
          category: true,
          status: true,
          publishedAt: true,
        },
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
      }),
    ]);

    if (rows.length === 0) return null;

    return {
      category: 'announcements',
      label: 'Announcements',
      totalMatches,
      items: rows.map((a): SearchItemDto => ({
        id: a.id,
        type: 'announcement',
        title: a.title,
        subtitle: a.summary || `Category: ${a.category}`,
        badge: a.status,
        href: '/dashboard/announcements',
      })),
    };
  }

  private async searchEvents(
    actor: AuthenticatedUser,
    term: string,
    limit: number,
  ): Promise<SearchCategoryGroupDto | null> {
    const where: Prisma.EventWhereInput = {
      ...this.mosqueScope(actor),
      OR: [
        { title: { contains: term, mode: 'insensitive' } },
        { location: { contains: term, mode: 'insensitive' } },
        { speaker: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ],
    };

    const [totalMatches, rows] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        select: {
          id: true,
          title: true,
          location: true,
          speaker: true,
          date: true,
          status: true,
        },
        take: limit,
        orderBy: [{ date: 'desc' }],
      }),
    ]);

    if (rows.length === 0) return null;

    return {
      category: 'events',
      label: 'Events & Programmes',
      totalMatches,
      items: rows.map((ev): SearchItemDto => ({
        id: ev.id,
        type: 'event',
        title: ev.title,
        subtitle: `${ev.location}${ev.speaker ? ` · ${ev.speaker}` : ''}`,
        badge: ev.status,
        href: '/dashboard/events',
      })),
    };
  }

  private async searchVolunteers(
    actor: AuthenticatedUser,
    term: string,
    limit: number,
  ): Promise<SearchCategoryGroupDto | null> {
    const where: Prisma.VolunteerWhereInput = {
      user: {
        ...this.mosqueScope(actor),
        deletedAt: null,
      },
      OR: [
        { user: { fullName: { contains: term, mode: 'insensitive' } } },
        { skills: { contains: term, mode: 'insensitive' } },
        { availability: { contains: term, mode: 'insensitive' } },
      ],
    };

    const [totalMatches, rows] = await Promise.all([
      this.prisma.volunteer.count({ where }),
      this.prisma.volunteer.findMany({
        where,
        select: {
          id: true,
          status: true,
          skills: true,
          availability: true,
          user: { select: { fullName: true } },
        },
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
      }),
    ]);

    if (rows.length === 0) return null;

    return {
      category: 'volunteers',
      label: 'Volunteers',
      totalMatches,
      items: rows.map((v): SearchItemDto => ({
        id: v.id,
        type: 'volunteer',
        title: v.user?.fullName || 'Volunteer',
        subtitle: v.skills || v.availability || 'Volunteer Roster',
        badge: v.status,
        href: '/dashboard/volunteers',
      })),
    };
  }
}
