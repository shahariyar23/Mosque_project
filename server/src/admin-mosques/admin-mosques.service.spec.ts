import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { AuditLogService } from '../audit/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminMosquesService } from './admin-mosques.service';

describe('AdminMosquesService', () => {
  let service: AdminMosquesService;
  let prisma: any;
  let audit: any;

  beforeEach(async () => {
    prisma = {
      mosque: {
        count: jest.fn().mockImplementation((args) => {
          if (args?.where?.status === 'active') return Promise.resolve(2);
          if (args?.where?.status === 'suspended') return Promise.resolve(0);
          return Promise.resolve(2);
        }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: '3f1a7c2e-9b4d-4f6a-8c11-2d5e7a9b0c31',
            slug: 'noor-jame-masjid',
            code: 'MOS-001',
            name: 'Noor Jame Masjid',
            status: 'active',
            isActive: true,
            email: 'contact@noormosque.org',
            phone: '+8801700000000',
            city: 'Dhaka',
            country: 'Bangladesh',
            timezone: 'Asia/Dhaka',
            _count: { users: 7, events: 2, bookings: 3, announcements: 4 },
            users: [{ id: 'user-1' }],
            donations: [{ amount: 5000 }],
            jummahCollections: [{ amount: 15000 }],
            auditLogs: [{ createdAt: new Date('2026-03-01T10:00:00Z') }],
            createdAt: new Date('2026-01-01T00:00:00Z'),
            updatedAt: new Date('2026-03-01T10:00:00Z'),
          },
        ]),
        findUnique: jest.fn(),
      },
      user: {
        count: jest.fn().mockResolvedValue(10),
      },
      event: {
        count: jest.fn().mockResolvedValue(5),
      },
      booking: {
        count: jest.fn().mockResolvedValue(4),
      },
      announcement: {
        count: jest.fn().mockResolvedValue(6),
      },
      donation: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 50000 } }),
      },
      jummahCollection: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 35000 } }),
      },
    };

    audit = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminMosquesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: audit },
      ],
    }).compile();

    service = moduleRef.get(AdminMosquesService);
  });

  it('computes platform overview correctly from real aggregations', async () => {
    const result = await service.getPlatformOverview();

    expect(result.metrics.totalMosques).toBe(2);
    expect(result.metrics.activeMosques).toBe(2);
    expect(result.metrics.suspendedMosques).toBe(0);
    expect(result.metrics.totalRevenue).toBe(85000); // 50000 + 35000
    expect(result.comparison).toHaveLength(1);
    expect(result.comparison[0].name).toBe('Noor Jame Masjid');
    expect(result.comparison[0].stats.totalRevenue).toBe(20000); // 5000 + 15000
    expect(result.charts.mosqueStatus).toEqual([
      { label: 'Active', value: 2 },
      { label: 'Suspended', value: 0 },
    ]);
  });

  it('lists mosques with populated stats envelope', async () => {
    const list = await service.listMosques();

    expect(list).toHaveLength(1);
    expect(list[0].userCount).toBe(7);
    expect(list[0].stats.usersCount).toBe(7);
    expect(list[0].stats.eventsCount).toBe(2);
    expect(list[0].stats.bookingsCount).toBe(3);
  });
});
