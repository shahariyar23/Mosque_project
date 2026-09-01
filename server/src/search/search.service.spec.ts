import { Test, TestingModule } from '@nestjs/testing';

import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from './search.service';

describe('SearchService Security & Regression Test Suite', () => {
  let service: SearchService;
  let prisma: {
    user: { count: jest.Mock; findMany: jest.Mock };
    transaction: { count: jest.Mock; findMany: jest.Mock };
    donation: { count: jest.Mock; findMany: jest.Mock };
    donationFund: { count: jest.Mock; findMany: jest.Mock };
    campaign: { count: jest.Mock; findMany: jest.Mock };
    expense: { count: jest.Mock; findMany: jest.Mock };
    salaryRecord: { count: jest.Mock; findMany: jest.Mock };
    receipt: { count: jest.Mock; findMany: jest.Mock };
    announcement: { count: jest.Mock; findMany: jest.Mock };
    event: { count: jest.Mock; findMany: jest.Mock };
    volunteer: { count: jest.Mock; findMany: jest.Mock };
  };

  const mosqueA = '11111111-1111-1111-1111-111111111111';
  const mosqueB = '22222222-2222-2222-2222-222222222222';
  const mosqueC = '33333333-3333-3333-3333-333333333333';

  const baseActor: AuthenticatedUser = {
    id: 'user-aaa-111',
    mosqueId: mosqueA,
    email: 'admin@mosque-a.com',
    role: 'mosque_admin',
    permissions: [],
    deniedPermissions: [],
    isActive: true,
  };

  beforeEach(async () => {
    prisma = {
      user: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      transaction: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      donation: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      donationFund: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      campaign: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      expense: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      salaryRecord: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      receipt: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      announcement: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      event: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      volunteer: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  // TEST 1 & 2: Mosque A user searches -> Mosque A scoped queries only (Never Mosque B or C)
  it('TEST 1 & 2: scopes all queries to Mosque A and does not query or leak Mosque B or C records', async () => {
    prisma.user.count.mockResolvedValue(1);
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'u-1',
        fullName: 'Abdullah Rahman',
        email: 'abdullah@mosque-a.com',
        phone: '+8801700000001',
        role: 'member',
        isActive: true,
      },
    ]);

    const result = await service.search(baseActor, { q: 'Abdullah' });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          mosqueId: mosqueA,
          deletedAt: null,
        }),
      }),
    );
    expect(result.categories.some((c) => c.category === 'users')).toBe(true);
    expect(result.categories.find((c) => c.category === 'users')?.items[0].title).toBe('Abdullah Rahman');
  });

  // TEST 3: User without transaction permission searches "TXN" -> No transaction results
  it('TEST 3: user without transaction.view permission does NOT execute transaction queries', async () => {
    const secretaryActor: AuthenticatedUser = {
      id: 'sec-1',
      mosqueId: mosqueA,
      email: 'secretary@mosque-a.com',
      role: 'secretary', // Secretary has NO transaction.view permission
      permissions: [],
      deniedPermissions: [],
      isActive: true,
    };

    const result = await service.search(secretaryActor, { q: 'TXN-2026' });

    expect(prisma.transaction.findMany).not.toHaveBeenCalled();
    expect(result.categories.some((c) => c.category === 'transactions')).toBe(false);
  });

  // TEST 4: User with transaction permission searches "TXN" -> Authorized transaction results
  it('TEST 4: user with transaction.view permission receives transaction results', async () => {
    const treasurerActor: AuthenticatedUser = {
      id: 'tres-1',
      mosqueId: mosqueA,
      email: 'treasurer@mosque-a.com',
      role: 'treasurer', // Treasurer holds transaction.view
      permissions: [],
      deniedPermissions: [],
      isActive: true,
    };

    prisma.transaction.count.mockResolvedValue(1);
    prisma.transaction.findMany.mockResolvedValue([
      {
        id: 'tx-1',
        type: 'income',
        description: 'Jummah Cash Collection TXN-2026-01',
        amount: '5000',
        currency: 'BDT',
        reference: 'TXN-2026-01',
        status: 'completed',
        transactedAt: new Date(),
      },
    ]);

    const result = await service.search(treasurerActor, { q: 'TXN-2026' });

    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ mosqueId: mosqueA }),
      }),
    );
    expect(result.categories.some((c) => c.category === 'transactions')).toBe(true);
    expect(result.categories.find((c) => c.category === 'transactions')?.items[0].title).toBe(
      'Jummah Cash Collection TXN-2026-01',
    );
  });

  // TEST 5: User without salary permission searches "salary" -> No salary records
  it('TEST 5: user without salary permission receives zero salary records', async () => {
    const cashierActor: AuthenticatedUser = {
      id: 'cashier-1',
      mosqueId: mosqueA,
      email: 'cashier@mosque-a.com',
      role: 'cashier', // Cashier has NO salary.view or salary.viewOwn
      permissions: [],
      deniedPermissions: [],
      isActive: true,
    };

    const result = await service.search(cashierActor, { q: 'salary' });

    expect(prisma.salaryRecord.findMany).not.toHaveBeenCalled();
    expect(result.categories.some((c) => c.category === 'salaries')).toBe(false);
  });

  // TEST 6: Super Admin searches across allowed scope (platform.manage)
  it('TEST 6: Super Admin with platform.manage has global mosque scope', async () => {
    const superAdminActor: AuthenticatedUser = {
      id: 'sa-1',
      mosqueId: mosqueA,
      email: 'superadmin@noor.platform',
      role: 'super_admin',
      permissions: [],
      deniedPermissions: [],
      isActive: true,
    };

    prisma.user.count.mockResolvedValue(1);
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'u-cross',
        fullName: 'Global Member',
        email: 'global@noor.platform',
        phone: null,
        role: 'super_admin',
        isActive: true,
      },
    ]);

    await service.search(superAdminActor, { q: 'Global' });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ mosqueId: mosqueA }),
      }),
    );
  });

  // TEST 7: Deleted user search matches deleted-user visibility rules
  it('TEST 7: only actors holding user.viewDeleted can see deleted accounts', async () => {
    const normalAdmin: AuthenticatedUser = {
      id: 'admin-1',
      mosqueId: mosqueA,
      email: 'admin@mosque-a.com',
      role: 'mosque_admin', // mosque_admin does NOT hold user.viewDeleted (PLATFORM_ONLY)
      permissions: [],
      deniedPermissions: [],
      isActive: true,
    };

    await service.search(normalAdmin, { q: 'Removed' });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });

  // TEST 8: Very large limit is capped server-side
  it('TEST 8: clamps large limit to maximum allowed (20)', async () => {
    await service.search(baseActor, { q: 'Search Term', limit: 100000 });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 20,
      }),
    );
  });

  // TEST 9: Empty or short query returns safe empty response without querying database
  it('TEST 9: returns empty result set for empty or 1-character query', async () => {
    const emptyResult = await service.search(baseActor, { q: '' });
    expect(emptyResult.totalResults).toBe(0);
    expect(emptyResult.categories).toEqual([]);
    expect(prisma.user.findMany).not.toHaveBeenCalled();

    const shortResult = await service.search(baseActor, { q: 'a' });
    expect(shortResult.totalResults).toBe(0);
    expect(shortResult.categories).toEqual([]);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  // TEST 10: SQL-like or special characters are safely handled
  it('TEST 10: handles SQL-like and special characters without error', async () => {
    prisma.user.count.mockResolvedValue(0);
    prisma.user.findMany.mockResolvedValue([]);

    const result = await service.search(baseActor, { q: "'; DROP TABLE users; --" });

    expect(result.totalResults).toBe(0);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { fullName: { contains: "'; DROP TABLE users; --", mode: 'insensitive' } },
            { email: { contains: "'; DROP TABLE users; --", mode: 'insensitive' } },
            { phone: { contains: "'; DROP TABLE users; --", mode: 'insensitive' } },
          ],
        }),
      }),
    );
  });

  // TEST 11: IDOR Protection & Own-Scoping on Donations
  it('TEST 11: member holding only donation.viewOwn receives ONLY their own donations', async () => {
    const memberActor: AuthenticatedUser = {
      id: 'member-user-123',
      mosqueId: mosqueA,
      email: 'member@mosque-a.com',
      role: 'member',
      permissions: [],
      deniedPermissions: [],
      isActive: true,
    };

    prisma.donation.count.mockResolvedValue(1);
    prisma.donation.findMany.mockResolvedValue([
      {
        id: 'don-own',
        donorName: 'Member Self',
        amount: '1000',
        currency: 'BDT',
        reference: 'REC-001',
        status: 'completed',
        donatedAt: new Date(),
        fund: { name: 'General Fund' },
      },
    ]);

    await service.search(memberActor, { q: 'Donation' });

    expect(prisma.donation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          mosqueId: mosqueA,
          userId: 'member-user-123',
        }),
      }),
    );
  });

  // TEST 12: Inactive accounts receive zero results and zero database calls
  it('TEST 12: inactive user account receives zero results across all categories', async () => {
    const suspendedAdmin: AuthenticatedUser = {
      id: 'suspended-1',
      mosqueId: mosqueA,
      email: 'suspended@mosque-a.com',
      role: 'mosque_admin',
      permissions: [],
      deniedPermissions: [],
      isActive: false, // Account is deactivated / suspended
    };

    const result = await service.search(suspendedAdmin, { q: 'Any Search' });

    expect(result.totalResults).toBe(0);
    expect(result.categories).toEqual([]);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(prisma.transaction.findMany).not.toHaveBeenCalled();
  });

  // TEST 13: Category filtering by type restricts execution
  it('TEST 13: passing type=expenses only executes the expenses query', async () => {
    prisma.expense.count.mockResolvedValue(1);
    prisma.expense.findMany.mockResolvedValue([
      {
        id: 'exp-1',
        description: 'Electricity Bill',
        category: 'Utilities',
        amount: '3500',
        currency: 'BDT',
        status: 'paid',
        expenseDate: new Date(),
        reference: 'BILL-01',
      },
    ]);

    const result = await service.search(baseActor, { q: 'Electricity', type: 'expenses' });

    expect(prisma.expense.findMany).toHaveBeenCalled();
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(prisma.transaction.findMany).not.toHaveBeenCalled();
    expect(result.categories.length).toBe(1);
    expect(result.categories[0].category).toBe('expenses');
  });

  // TEST 14: Data leakage prevention check
  it('TEST 14: returned search item objects do not contain passwords, tokens, or audit fields', async () => {
    prisma.user.count.mockResolvedValue(1);
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'u-secure',
        fullName: 'Secure User',
        email: 'secure@example.com',
        phone: '+8801700000099',
        role: 'treasurer',
        isActive: true,
      },
    ]);

    const result = await service.search(baseActor, { q: 'Secure' });
    const userCategory = result.categories.find((c) => c.category === 'users');
    const item = userCategory?.items[0] as any;

    expect(item).toBeDefined();
    expect(item.id).toBe('u-secure');
    expect(item.title).toBe('Secure User');
    expect(item.subtitle).toBe('secure@example.com');
    // Ensure dangerous fields do not exist
    expect(item.passwordHash).toBeUndefined();
    expect(item.passwordResetTokenHash).toBeUndefined();
    expect(item.permissions).toBeUndefined();
    expect(item.deniedPermissions).toBeUndefined();
    expect(item.refreshTokens).toBeUndefined();
  });
});
