import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MosqueService } from './mosque.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';

describe('MosqueService', () => {
  let service: MosqueService;
  let prisma: PrismaService;

  const mockMosqueId = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';
  const mockFacilityId = 'd0b80121-7ac0-11d1-898c-00c04fd8d5c1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MosqueService,
        {
          provide: PrismaService,
          useValue: {
            mosque: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            mosqueSettings: {
              findUnique: jest.fn(),
              create: jest.fn(),
              upsert: jest.fn(),
            },
            facility: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: CloudinaryService,
          useValue: {
            uploadImage: jest.fn(),
            deleteAsset: jest.fn(),
            isConfigured: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<MosqueService>(MosqueService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMosque', () => {
    it('should return mosque if found', async () => {
      const mockMosque = { id: mockMosqueId, name: 'Test Mosque' };
      (prisma.mosque.findUnique as jest.Mock).mockResolvedValue(mockMosque);

      const result = await service.getMosque(mockMosqueId);
      expect(result).toEqual(mockMosque);
    });

    it('should throw NotFoundException if not found', async () => {
      (prisma.mosque.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getMosque(mockMosqueId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSettings', () => {
    it('should return settings if found', async () => {
      const mockSettings = { mosqueId: mockMosqueId, defaultLanguage: 'en' };
      (prisma.mosqueSettings.findUnique as jest.Mock).mockResolvedValue(mockSettings);

      const result = await service.getSettings(mockMosqueId);
      expect(result).toEqual(mockSettings);
    });

    it('should create and return default settings if not found', async () => {
      (prisma.mosqueSettings.findUnique as jest.Mock).mockResolvedValue(null);
      const mockSettings = { mosqueId: mockMosqueId, defaultLanguage: 'en' };
      (prisma.mosqueSettings.create as jest.Mock).mockResolvedValue(mockSettings);

      const result = await service.getSettings(mockMosqueId);
      expect(result).toEqual(mockSettings);
      expect(prisma.mosqueSettings.create).toHaveBeenCalledWith({
        data: { mosqueId: mockMosqueId },
      });
    });
  });

  describe('facilities', () => {
    it('should create a facility with mosqueId', async () => {
      const dto = { name: 'Hall' };
      const created = { id: mockFacilityId, ...dto, mosqueId: mockMosqueId };
      (prisma.facility.create as jest.Mock).mockResolvedValue(created);

      const result = await service.createFacility(mockMosqueId, dto);
      expect(result).toEqual(created);
      expect(prisma.facility.create).toHaveBeenCalledWith({
        data: { ...dto, mosqueId: mockMosqueId },
      });
    });

    it('should throw NotFoundException on update if facility not found or belongs to another mosque', async () => {
      (prisma.facility.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        service.updateFacility(mockMosqueId, mockFacilityId, { name: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete facility if it exists for the mosque', async () => {
      const facility = { id: mockFacilityId, mosqueId: mockMosqueId };
      (prisma.facility.findFirst as jest.Mock).mockResolvedValue(facility);
      (prisma.facility.delete as jest.Mock).mockResolvedValue(facility);

      const result = await service.deleteFacility(mockMosqueId, mockFacilityId);
      expect(result).toEqual(facility);
      expect(prisma.facility.delete).toHaveBeenCalledWith({ where: { id: mockFacilityId } });
    });
  });

  describe('uploadLogo', () => {
    it('should upload logo to cloudinary and update mosque.logoUrl', async () => {
      const mockFile = {
        buffer: Buffer.from('test'),
        mimetype: 'image/png',
        size: 1024,
      } as Express.Multer.File;

      const cloudinary = (service as any).cloudinary;
      (cloudinary.uploadImage as jest.Mock).mockResolvedValue({
        secureUrl: 'https://cloudinary.com/logo.png',
        publicId: 'branding/logo',
      });
      (prisma.mosque.update as jest.Mock).mockResolvedValue({
        id: mockMosqueId,
        logoUrl: 'https://cloudinary.com/logo.png',
      });

      const result = await service.uploadLogo(mockMosqueId, mockFile);
      expect(cloudinary.uploadImage).toHaveBeenCalledWith(
        mockFile.buffer,
        `mosques/${mockMosqueId}/branding`,
      );
      expect(prisma.mosque.update).toHaveBeenCalledWith({
        where: { id: mockMosqueId },
        data: { logoUrl: 'https://cloudinary.com/logo.png' },
      });
      expect(result.logoUrl).toEqual('https://cloudinary.com/logo.png');
    });
  });
});
