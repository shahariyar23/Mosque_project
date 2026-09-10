import { Test, TestingModule } from '@nestjs/testing';
import { PublicHomeService } from './public-home.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrayerTimesService } from '../prayer-times/prayer-times.service';
import { JumuahService } from '../jumuah/jumuah.service';
import { ServicesService } from '../services/services.service';
import { EventsService } from '../events/events.service';
import { AnnouncementsService } from '../announcements/announcements.service';
import { PublicTransparencyService } from '../public-transparency/public-transparency.service';

describe('PublicHomeService - About Page Endpoints', () => {
  let service: PublicHomeService;
  let prisma: any;

  const MOSQUE_ID = 'b7e28b24-7474-4b53-9d04-4b46c4f03911';
  const SLUG = 'noor-community-mosque';

  beforeEach(async () => {
    prisma = {
      mosque: { findUnique: jest.fn() },
      facility: { findMany: jest.fn() },
      user: { findMany: jest.fn() },
      mosqueMilestone: { findMany: jest.fn() },
      mosqueValue: { findMany: jest.fn() },
      mosqueGalleryItem: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicHomeService,
        { provide: PrismaService, useValue: prisma },
        { provide: PrayerTimesService, useValue: {} },
        { provide: JumuahService, useValue: {} },
        { provide: ServicesService, useValue: {} },
        { provide: EventsService, useValue: {} },
        { provide: AnnouncementsService, useValue: {} },
        { provide: PublicTransparencyService, useValue: {} },
      ],
    }).compile();

    service = module.get<PublicHomeService>(PublicHomeService);
    prisma.mosque.findUnique.mockResolvedValue({ id: MOSQUE_ID, isActive: true });
  });

  describe('getFacilities', () => {
    it('returns public facilities filtered by mosqueId and isAvailable: true', async () => {
      prisma.facility.findMany.mockResolvedValue([
        { id: 'f-1', name: 'Main Prayer Sanctuary', description: 'Carpeted hall', capacity: 500 },
      ]);

      const result = await service.getFacilities(SLUG);

      expect(prisma.facility.findMany).toHaveBeenCalledWith({
        where: { mosqueId: MOSQUE_ID, isAvailable: true },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'f-1',
        name: 'Main Prayer Sanctuary',
        description: 'Carpeted hall',
        capacity: 500,
      });
    });
  });

  describe('getLeadership', () => {
    it('returns only public leadership profiles without sensitive fields', async () => {
      prisma.user.findMany.mockResolvedValue([
        {
          id: 'u-1',
          fullName: 'Imam Abdul Karim',
          avatarUrl: '/avatar.jpg',
          positions: ['imam'],
          role: 'imam',
        },
      ]);

      const result = await service.getLeadership(SLUG);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          mosqueId: MOSQUE_ID,
          isActive: true,
          deletedAt: null,
          positions: { isEmpty: false },
        },
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          positions: true,
          role: true,
        },
        orderBy: { createdAt: 'asc' },
      });
      expect(result[0].fullName).toBe('Imam Abdul Karim');
      expect(result[0]).not.toHaveProperty('passwordHash');
      expect(result[0]).not.toHaveProperty('email');
      expect(result[0]).not.toHaveProperty('phone');
    });
  });

  describe('getMilestones', () => {
    it('returns published milestones sorted by sortOrder and year', async () => {
      prisma.mosqueMilestone.findMany.mockResolvedValue([
        { id: 'm-1', year: '1987', title: 'Foundation', description: 'Started', sortOrder: 0 },
      ]);

      const result = await service.getMilestones(SLUG);

      expect(prisma.mosqueMilestone.findMany).toHaveBeenCalledWith({
        where: { mosqueId: MOSQUE_ID, isPublished: true },
        orderBy: [{ sortOrder: 'asc' }, { year: 'asc' }],
      });
      expect(result[0].year).toBe('1987');
    });
  });

  describe('getValues', () => {
    it('returns published belief values sorted by sortOrder and num', async () => {
      prisma.mosqueValue.findMany.mockResolvedValue([
        {
          id: 'v-1',
          num: '01',
          icon: 'Moon',
          title: 'Faith & Devotion',
          subtitle: 'Tawheed',
          description: 'Sincere worship',
          sortOrder: 0,
        },
      ]);

      const result = await service.getValues(SLUG);

      expect(prisma.mosqueValue.findMany).toHaveBeenCalledWith({
        where: { mosqueId: MOSQUE_ID, isPublished: true },
        orderBy: [{ sortOrder: 'asc' }, { num: 'asc' }],
      });
      expect(result[0].title).toBe('Faith & Devotion');
    });
  });

  describe('getGallery', () => {
    it('returns published gallery photos optionally filtered by category', async () => {
      prisma.mosqueGalleryItem.findMany.mockResolvedValue([
        {
          id: 'g-1',
          imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
          title: 'Minaret',
          altText: 'Minaret at sunset',
          category: 'Architecture',
          sortOrder: 0,
        },
      ]);

      const result = await service.getGallery(SLUG, 'Architecture');

      expect(prisma.mosqueGalleryItem.findMany).toHaveBeenCalledWith({
        where: {
          mosqueId: MOSQUE_ID,
          isPublished: true,
          category: 'Architecture',
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      });
      expect(result[0].category).toBe('Architecture');
    });
  });
});

