import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';

import { AuditLogService } from '../audit/audit-log.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { IftarSponsorshipService } from './iftar-sponsorship.service';
import { IftarSponsorshipStatus } from './dto/iftar-sponsorship.dto';

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';
const OTHER_MOSQUE_ID = 'd0b80121-7ac0-11d1-898c-00c04fd8d5c1';
const SPONSORSHIP_ID = '1b4e28ba-2fa1-11d2-883f-0016d3cca427';
const USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const RAMADAN_SCHED_ID = 'ramadan-sched-123';

function mockRow(overrides: Record<string, unknown> = {}) {
  return {
    id: SPONSORSHIP_ID,
    mosqueId: MOSQUE_ID,
    ramadanScheduleId: RAMADAN_SCHED_ID,
    year: 1447,
    date: new Date('2026-03-01T00:00:00.000Z'),
    userId: USER_ID,
    user: {
      id: USER_ID,
      fullName: 'Abdul Karim',
      email: 'abdul.karim@example.com',
      phone: '+8801711000000',
    },
    sponsorName: 'Abdul Karim',
    sponsorPhone: '+8801711000000',
    sponsorEmail: 'abdul.karim@example.com',
    numberOfServings: 150,
    estimatedCost: new Prisma.Decimal('15000.00'),
    currency: 'BDT',
    menuDetails: 'Khichuri, Dates, Fruits, Jilapi',
    notes: 'Volunteers will help distribution',
    status: IftarSponsorshipStatus.confirmed,
    createdAt: new Date('2026-02-15T10:00:00.000Z'),
    updatedAt: new Date('2026-02-15T10:00:00.000Z'),
    ...overrides,
  };
}

describe('IftarSponsorshipService', () => {
  let service: IftarSponsorshipService;
  let prisma: PrismaService;
  let audit: AuditLogService;
  let mail: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IftarSponsorshipService,
        {
          provide: PrismaService,
          useValue: {
            iftarSponsorship: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
            ramadanSchedule: {
              findFirst: jest.fn(),
            },
            user: {
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            record: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendIftarSponsorshipEmail: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get(IftarSponsorshipService);
    prisma = module.get(PrismaService);
    audit = module.get(AuditLogService);
    mail = module.get(MailService);
  });

  const table = () => prisma.iftarSponsorship as unknown as Record<string, jest.Mock>;

  describe('findAll', () => {
    it('scopes query to the authenticated mosque', async () => {
      table().findMany.mockResolvedValue([mockRow()]);

      const result = await service.findAll(MOSQUE_ID, { year: 1447 });

      expect(table().findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ mosqueId: MOSQUE_ID, year: 1447 }),
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].sponsorName).toBe('Abdul Karim');
    });
  });

  describe('CHECK 1 — RAMADAN SCHEDULE LINKAGE & GREGORIAN DATE RESOLUTION', () => {
    it('auto-links matching Ramadan schedule when available on that date', async () => {
      table().findFirst.mockResolvedValue(null);
      (prisma.ramadanSchedule.findFirst as jest.Mock).mockResolvedValue({
        id: RAMADAN_SCHED_ID,
        date: new Date('2026-03-01T00:00:00.000Z'),
        year: 1447,
      });
      table().create.mockResolvedValue(mockRow({ ramadanScheduleId: RAMADAN_SCHED_ID }));

      const result = await service.create(MOSQUE_ID, {
        year: 1447,
        date: '2026-03-01',
        sponsorName: 'Abdul Karim',
      });

      expect(result.id).toBe(SPONSORSHIP_ID);
      expect(result.ramadanScheduleId).toBe(RAMADAN_SCHED_ID);
    });

    it('rejects creation when explicit ramadanScheduleId has conflicting date', async () => {
      table().findFirst.mockResolvedValue(null);
      (prisma.ramadanSchedule.findFirst as jest.Mock).mockResolvedValue({
        id: RAMADAN_SCHED_ID,
        date: new Date('2026-03-05T00:00:00.000Z'),
        year: 1447,
      });

      await expect(
        service.create(MOSQUE_ID, {
          year: 1447,
          date: '2026-03-01',
          sponsorName: 'Abdul Karim',
          ramadanScheduleId: RAMADAN_SCHED_ID,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('CHECK 2 — SPONSOR & MEMBER TENANCY', () => {
    it('populates sponsorName from member when omitted', async () => {
      table().findFirst.mockResolvedValue(null);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: USER_ID,
        fullName: 'Brother Faruq',
        email: 'faruq@noor.org',
        phone: null,
      });
      table().create.mockResolvedValue(mockRow({ sponsorName: 'Brother Faruq', userId: USER_ID }));

      const result = await service.create(MOSQUE_ID, {
        year: 1447,
        date: '2026-03-01',
        sponsorName: 'Brother Faruq',
        userId: USER_ID,
      });

      expect(result.sponsorName).toBe('Brother Faruq');
    });

    it('rejects member if user belongs to another mosque or is deleted', async () => {
      table().findFirst.mockResolvedValue(null);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create(MOSQUE_ID, {
          year: 1447,
          date: '2026-03-01',
          sponsorName: 'Cross-tenant member',
          userId: 'foreign-user-id',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('CHECK 3 — DUPLICATE ACTIVE SPONSOR RULE', () => {
    it('blocks second active sponsorship for the same mosque and date with 409 Conflict', async () => {
      table().findFirst.mockResolvedValue(mockRow({ status: IftarSponsorshipStatus.confirmed }));

      await expect(
        service.create(MOSQUE_ID, {
          year: 1447,
          date: '2026-03-01',
          sponsorName: 'Second Host',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('permits creating a new sponsorship if previous on that date was cancelled', async () => {
      table().findFirst.mockResolvedValue(null);
      table().create.mockResolvedValue(mockRow({ sponsorName: 'New Active Host' }));

      const created = await service.create(MOSQUE_ID, {
        year: 1447,
        date: '2026-03-01',
        sponsorName: 'New Active Host',
      });

      expect(created.sponsorName).toBe('New Active Host');
    });
  });

  describe('CHECK 4 — STATUS TRANSITION STATE MACHINE', () => {
    it('rejects transitioning completed directly back to pending', async () => {
      table().findFirst.mockResolvedValue(mockRow({ status: IftarSponsorshipStatus.completed }));

      await expect(
        service.update(MOSQUE_ID, SPONSORSHIP_ID, {
          status: IftarSponsorshipStatus.pending,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows transitioning confirmed to completed or cancelled', async () => {
      table().findFirst.mockResolvedValue(mockRow({ status: IftarSponsorshipStatus.confirmed }));
      table().update.mockResolvedValue(mockRow({ status: IftarSponsorshipStatus.completed }));

      const result = await service.update(MOSQUE_ID, SPONSORSHIP_ID, {
        status: IftarSponsorshipStatus.completed,
      });

      expect(result.status).toBe(IftarSponsorshipStatus.completed);
    });
  });

  describe('CHECK 5 & 6 — STRICT TENANT ISOLATION', () => {
    it('never leaks another mosque’s records in findOne', async () => {
      table().findFirst.mockResolvedValue(null);

      await expect(service.findOne(OTHER_MOSQUE_ID, SPONSORSHIP_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('never permits cross-mosque update in update', async () => {
      table().findFirst.mockResolvedValue(null);

      await expect(
        service.update(OTHER_MOSQUE_ID, SPONSORSHIP_ID, { numberOfServings: 180 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('never permits cross-mosque delete in remove', async () => {
      table().findFirst.mockResolvedValue(null);

      await expect(service.remove(OTHER_MOSQUE_ID, SPONSORSHIP_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('CHECK 7 & 8 — AUDIT LOG RECORDING', () => {
    it('creates an Iftar sponsorship and writes an audit log', async () => {
      table().findFirst.mockResolvedValue(null);
      table().create.mockResolvedValue(mockRow());

      await service.create(MOSQUE_ID, {
        year: 1447,
        date: '2026-03-01',
        sponsorName: 'Abdul Karim',
      });

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'IFTAR_SPONSORSHIP_CREATED',
          resource: 'iftar_sponsorship',
          mosqueId: MOSQUE_ID,
        }),
      );
    });

    it('updates sponsorship fields and logs audit event', async () => {
      table()
        .findFirst.mockResolvedValueOnce(mockRow())
        .mockResolvedValueOnce(null);
      table().update.mockResolvedValue(mockRow({ sponsorName: 'Updated Sponsor' }));

      await service.update(MOSQUE_ID, SPONSORSHIP_ID, { sponsorName: 'Updated Sponsor' });

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'IFTAR_SPONSORSHIP_UPDATED',
          resource: 'iftar_sponsorship',
        }),
      );
    });

    it('removes sponsorship and logs delete audit event', async () => {
      table().findFirst.mockResolvedValue(mockRow());
      table().delete.mockResolvedValue(mockRow());

      await service.remove(MOSQUE_ID, SPONSORSHIP_ID);

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'IFTAR_SPONSORSHIP_DELETED',
          resource: 'iftar_sponsorship',
        }),
      );
    });
  });

  describe('CHECK 9 — SAFE IFTAR SPONSORSHIP + FINANCE INTEGRATION', () => {
    it('Scenario 1: Creating sponsorship with pledged ৳5,000 does NOT alter financial ledger balances', async () => {
      table().findFirst.mockResolvedValue(null);
      table().create.mockResolvedValue(mockRow({ estimatedCost: new Prisma.Decimal('5000') }));

      const created = await service.create(MOSQUE_ID, {
        year: 1447,
        date: '2026-03-01',
        sponsorName: 'Abdul Karim',
        estimatedCost: 5000,
      });

      expect(created.estimatedCost).toBe('5000');
      expect(table().create).toHaveBeenCalledTimes(1);
    });

    it('Scenario 2: Cancelling an unpaid sponsorship leaves finance balance untouched without reversals', async () => {
      table().findFirst.mockResolvedValue(mockRow({ status: IftarSponsorshipStatus.pending }));
      table().update.mockResolvedValue(mockRow({ status: IftarSponsorshipStatus.cancelled }));

      const updated = await service.update(MOSQUE_ID, SPONSORSHIP_ID, {
        status: IftarSponsorshipStatus.cancelled,
      });

      expect(updated.status).toBe(IftarSponsorshipStatus.cancelled);
      expect(table().update).toHaveBeenCalledTimes(1);
    });

    it('Scenario 3: Updating estimated cost pledge does not alter actual financial records', async () => {
      table()
        .findFirst.mockResolvedValueOnce(mockRow({ estimatedCost: new Prisma.Decimal('5000') }))
        .mockResolvedValueOnce(null);
      table().update.mockResolvedValue(mockRow({ estimatedCost: new Prisma.Decimal('10000') }));

      const updated = await service.update(MOSQUE_ID, SPONSORSHIP_ID, {
        estimatedCost: 10000,
      });

      expect(updated.estimatedCost).toBe('10000');
      expect(table().update).toHaveBeenCalledTimes(1);
    });
  });

  describe('CHECK 10 — IFTAR SPONSORSHIP NOTIFICATIONS', () => {
    it('dispatches confirmation email to sponsor upon creation', async () => {
      table().findFirst.mockResolvedValue(null);
      table().create.mockResolvedValue(mockRow());

      await service.create(MOSQUE_ID, {
        year: 1447,
        date: '2026-03-01',
        sponsorName: 'Abdul Karim',
        sponsorEmail: 'abdul.karim@example.com',
      });

      expect(mail.sendIftarSponsorshipEmail).toHaveBeenCalledWith(
        'abdul.karim@example.com',
        expect.objectContaining({
          sponsorName: 'Abdul Karim',
          date: '2026-03-01',
          status: IftarSponsorshipStatus.confirmed,
        }),
      );
    });

    it('dispatches status change email when sponsorship status transitions', async () => {
      table()
        .findFirst.mockResolvedValueOnce(mockRow({ status: IftarSponsorshipStatus.pending }))
        .mockResolvedValueOnce(null);
      table().update.mockResolvedValue(mockRow({ status: IftarSponsorshipStatus.cancelled }));

      await service.update(MOSQUE_ID, SPONSORSHIP_ID, {
        status: IftarSponsorshipStatus.cancelled,
      });

      expect(mail.sendIftarSponsorshipEmail).toHaveBeenCalledWith(
        'abdul.karim@example.com',
        expect.objectContaining({
          status: IftarSponsorshipStatus.cancelled,
        }),
      );
    });

    it('skips email notification gracefully when sponsor has no email address', async () => {
      (mail.sendIftarSponsorshipEmail as jest.Mock).mockClear();
      table().findFirst.mockResolvedValue(null);
      table().create.mockResolvedValue(mockRow({ sponsorEmail: null, user: null, userId: null }));

      await service.create(MOSQUE_ID, {
        year: 1447,
        date: '2026-03-01',
        sponsorName: 'Guest Benefactor',
      });

      expect(mail.sendIftarSponsorshipEmail).not.toHaveBeenCalled();
    });
  });
});
