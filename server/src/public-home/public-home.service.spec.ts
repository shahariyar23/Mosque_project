import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';

import { AnnouncementsService } from '../announcements/announcements.service';
import { EventsService } from '../events/events.service';
import { JumuahService } from '../jumuah/jumuah.service';
import { PrayerTimesService } from '../prayer-times/prayer-times.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicTransparencyService } from '../public-transparency/public-transparency.service';
import { ServicesService } from '../services/services.service';
import { PublicHomeService } from './public-home.service';

/**
 * The public home page reads, assembled from the existing domain services.
 *
 * The security weight lives in two places: every read resolves the mosque by slug first and 404s
 * when it is missing or inactive, and the projections drop every field a visitor must not see —
 * internal ids, booking counts, fees, donor or user references. The tests below assert both, plus
 * that the module delegates to the existing services rather than duplicating their logic.
 */

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';
const SLUG = 'noor-community-mosque';
const MISSING_SLUG = 'no-such-mosque';

describe('PublicHomeService', () => {
  let service: PublicHomeService;
  let prisma: PrismaService;
  let prayerTimes: PrayerTimesService;
  let jumuah: JumuahService;
  let services: ServicesService;
  let events: EventsService;
  let announcements: AnnouncementsService;
  let transparency: PublicTransparencyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicHomeService,
        {
          provide: PrismaService,
          useValue: {
            mosque: { findUnique: jest.fn() },
            service: { count: jest.fn() },
            event: { count: jest.fn() },
            announcement: { count: jest.fn() },
            donationFund: { count: jest.fn() },
            jumuahSchedule: { count: jest.fn() },
            user: { count: jest.fn() },
            volunteer: { count: jest.fn() },
          },
        },
        {
          provide: PrayerTimesService,
          useValue: { getPrayerTimes: jest.fn() },
        },
        {
          provide: JumuahService,
          useValue: { findAll: jest.fn() },
        },
        {
          provide: ServicesService,
          useValue: { findAll: jest.fn() },
        },
        {
          provide: EventsService,
          useValue: { findAll: jest.fn() },
        },
        {
          provide: AnnouncementsService,
          useValue: { findPublic: jest.fn() },
        },
        {
          provide: PublicTransparencyService,
          useValue: { getPublicFunds: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(PublicHomeService);
    prisma = module.get(PrismaService);
    prayerTimes = module.get(PrayerTimesService);
    jumuah = module.get(JumuahService);
    services = module.get(ServicesService);
    events = module.get(EventsService);
    announcements = module.get(AnnouncementsService);
    transparency = module.get(PublicTransparencyService);
  });

  describe('tenant scoping', () => {
    it('404s for an unknown slug before any query runs', async () => {
      (prisma.mosque.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getServices(MISSING_SLUG)).rejects.toThrow(NotFoundException);
      expect(services.findAll).not.toHaveBeenCalled();
    });

    it('resolves the mosque by slug and passes its id to the existing services', async () => {
      (prisma.mosque.findUnique as jest.Mock).mockResolvedValue({ id: MOSQUE_ID });
      (jumuah.findAll as jest.Mock).mockResolvedValue([]);

      await service.getJumuahSchedules(SLUG);

      expect(jumuah.findAll).toHaveBeenCalledWith(MOSQUE_ID, { isActive: true });
    });

    it('delegates prayer times to the existing service, scoped to the mosque id', async () => {
      (prisma.mosque.findUnique as jest.Mock).mockResolvedValue({ id: MOSQUE_ID });
      (prayerTimes.getPrayerTimes as jest.Mock).mockResolvedValue({ date: '2026-09-02' });

      const result = await service.getTodayPrayerTimes(SLUG);

      expect(prayerTimes.getPrayerTimes).toHaveBeenCalledWith(MOSQUE_ID, {});
      expect(result).toEqual({ date: '2026-09-02' });
    });

    it('returns null for prayer times when the calculation is unavailable', async () => {
      (prisma.mosque.findUnique as jest.Mock).mockResolvedValue({ id: MOSQUE_ID });
      (prayerTimes.getPrayerTimes as jest.Mock).mockRejectedValue(new Error('upstream down'));

      await expect(service.getTodayPrayerTimes(SLUG)).resolves.toBeNull();
    });

    it('delegates public funds to the existing transparency service', async () => {
      (prisma.mosque.findUnique as jest.Mock).mockResolvedValue({ id: MOSQUE_ID });
      (transparency.getPublicFunds as jest.Mock).mockResolvedValue([
        { name: 'Zakat', slug: 'zakat' },
      ]);

      const result = await service.getPublicFunds(SLUG);

      expect(transparency.getPublicFunds).toHaveBeenCalledWith(SLUG);
      expect(result).toEqual([{ name: 'Zakat', slug: 'zakat' }]);
    });
  });

  describe('projection safety', () => {
    it('drops internal ids, fees, and contact fields from services', async () => {
      (prisma.mosque.findUnique as jest.Mock).mockResolvedValue({ id: MOSQUE_ID });
      (services.findAll as jest.Mock).mockResolvedValue({
        rows: [
          {
            slug: 'janazah-funeral-service',
            name: 'Janazah (Funeral) Service',
            category: 'funeral',
            status: 'active',
            summary: 'Full funeral arrangement.',
            description: 'The mosque arranges the whole janazah.',
            coordinator: 'Imam Abdul Karim',
            availability: '24 hours, every day',
            location: 'Main prayer hall',
            fee: 0,
            contactPhone: '+8801700000000',
            bookingsThisMonth: 6,
            totalBookings: 214,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 4,
        pageCount: 1,
      });

      const [item] = await service.getServices(SLUG);

      expect(item).toEqual({
        slug: 'janazah-funeral-service',
        name: 'Janazah (Funeral) Service',
        category: 'funeral',
        status: 'active',
        summary: 'Full funeral arrangement.',
        description: 'The mosque arranges the whole janazah.',
        coordinator: 'Imam Abdul Karim',
        availability: '24 hours, every day',
        location: 'Main prayer hall',
      });
      expect(item).not.toHaveProperty('id');
      expect(item).not.toHaveProperty('fee');
      expect(item).not.toHaveProperty('contactPhone');
      expect(item).not.toHaveProperty('bookingsThisMonth');
    });

    it('drops registration and admin fields from events', async () => {
      (prisma.mosque.findUnique as jest.Mock).mockResolvedValue({ id: MOSQUE_ID });
      (events.findAll as jest.Mock).mockResolvedValue({
        rows: [
          {
            slug: 'youth-islamic-seminar',
            title: 'Youth Islamic Seminar',
            category: 'education',
            status: 'upcoming',
            date: '2026-08-25',
            startTime: '19:30',
            endTime: '21:00',
            timeLabel: null,
            location: 'Community Hall',
            speaker: 'Dr. Abdullah Rahman',
            description: 'An evening for youth on faith and education.',
            imageUrl: null,
            capacity: 200,
            registered: 128,
            registrationRequired: true,
            contribution: 0,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 3,
        pageCount: 1,
      });

      const [item] = await service.getUpcomingEvents(SLUG);

      expect(item).not.toHaveProperty('id');
      expect(item).not.toHaveProperty('capacity');
      expect(item).not.toHaveProperty('registered');
      expect(item).not.toHaveProperty('registrationRequired');
      expect(item).not.toHaveProperty('contribution');
      expect(item).toHaveProperty('date', '2026-08-25');
    });

    it('projects announcements through the existing public finder', async () => {
      (announcements.findPublic as jest.Mock).mockResolvedValue({
        rows: [
          {
            title: 'Autumn timetable',
            summary: 'New timetable in effect',
            content: 'The autumn timetable is now live.',
            category: 'Prayer',
            author: 'Imam Abdul Karim',
            publishedAt: '2026-08-20',
            expiresAt: null,
            id: 'internal-id',
            audience: 'everyone',
            channels: ['Website'],
          },
        ],
        total: 1,
      });

      const [item] = await service.getAnnouncements(SLUG);

      expect(item).toEqual({
        title: 'Autumn timetable',
        summary: 'New timetable in effect',
        content: 'The autumn timetable is now live.',
        category: 'Prayer',
        author: 'Imam Abdul Karim',
        publishedAt: '2026-08-20',
        expiresAt: null,
      });
      expect(item).not.toHaveProperty('id');
      expect(item).not.toHaveProperty('audience');
      expect(item).not.toHaveProperty('channels');
    });
  });

  describe('community stats', () => {
    it('counts only public, active, published rows', async () => {
      (prisma.mosque.findUnique as jest.Mock).mockResolvedValue({ id: MOSQUE_ID });
      (prisma.service.count as jest.Mock).mockResolvedValue(4);
      (prisma.event.count as jest.Mock).mockResolvedValue(2);
      (prisma.donationFund.count as jest.Mock).mockResolvedValue(1);
      (prisma.user.count as jest.Mock).mockResolvedValue(9);
      (prisma.volunteer.count as jest.Mock).mockResolvedValue(5);

      const stats = await service.getCommunityStats(SLUG);

      expect(stats).toEqual({
        activeServices: 4,
        upcomingEvents: 2,
        publicFunds: 1,
        members: 9,
        activeVolunteers: 5,
      });

      expect(prisma.service.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ mosqueId: MOSQUE_ID }) }),
      );
      expect(prisma.event.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isPublished: true }) }),
      );
      expect(prisma.donationFund.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isPublic: true }) }),
      );
      expect(prisma.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ mosqueId: MOSQUE_ID, role: Role.member }),
        }),
      );
    });
  });
});
