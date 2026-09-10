import 'multer';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { UpdateMosqueDto } from './dto/update-mosque.dto';
import { UpdateMosqueSettingsDto } from './dto/update-mosque-settings.dto';
import { CreateFacilityDto, UpdateFacilityDto } from './dto/facility.dto';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/milestone.dto';
import { CreateValueDto, UpdateValueDto } from './dto/value.dto';
import { CreateGalleryItemDto, UpdateGalleryItemDto } from './dto/gallery.dto';

@Injectable()
export class MosqueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // ---------------------------------------------------------------------------
  // Mosque Profile & Settings
  // ---------------------------------------------------------------------------

  async getMosque(mosqueId: string) {
    const mosque = await this.prisma.mosque.findUnique({
      where: { id: mosqueId },
    });

    if (!mosque) {
      throw new NotFoundException('Mosque not found');
    }

    return mosque;
  }

  async updateMosque(mosqueId: string, dto: UpdateMosqueDto) {
    return this.prisma.mosque.update({
      where: { id: mosqueId },
      data: dto,
    });
  }

  async getSettings(mosqueId: string) {
    const settings = await this.prisma.mosqueSettings.findUnique({
      where: { mosqueId },
    });

    if (!settings) {
      return this.prisma.mosqueSettings.create({
        data: { mosqueId },
      });
    }

    return settings;
  }

  async updateSettings(mosqueId: string, dto: UpdateMosqueSettingsDto) {
    return this.prisma.mosqueSettings.upsert({
      where: { mosqueId },
      update: dto,
      create: { ...dto, mosqueId },
    });
  }

  // ---------------------------------------------------------------------------
  // Facilities
  // ---------------------------------------------------------------------------

  async getFacilities(mosqueId: string) {
    return this.prisma.facility.findMany({
      where: { mosqueId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFacility(mosqueId: string, facilityId: string) {
    const facility = await this.prisma.facility.findFirst({
      where: { id: facilityId, mosqueId },
    });

    if (!facility) {
      throw new NotFoundException('Facility not found');
    }

    return facility;
  }

  async createFacility(mosqueId: string, dto: CreateFacilityDto) {
    return this.prisma.facility.create({
      data: { ...dto, mosqueId },
    });
  }

  async updateFacility(mosqueId: string, facilityId: string, dto: UpdateFacilityDto) {
    await this.getFacility(mosqueId, facilityId);

    return this.prisma.facility.update({
      where: { id: facilityId },
      data: dto,
    });
  }

  async deleteFacility(mosqueId: string, facilityId: string) {
    await this.getFacility(mosqueId, facilityId);

    return this.prisma.facility.delete({
      where: { id: facilityId },
    });
  }

  // ---------------------------------------------------------------------------
  // Milestones
  // ---------------------------------------------------------------------------

  async getMilestones(mosqueId: string) {
    return this.prisma.mosqueMilestone.findMany({
      where: { mosqueId },
      orderBy: [{ sortOrder: 'asc' }, { year: 'asc' }],
    });
  }

  async getMilestone(mosqueId: string, milestoneId: string) {
    const milestone = await this.prisma.mosqueMilestone.findFirst({
      where: { id: milestoneId, mosqueId },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    return milestone;
  }

  async createMilestone(mosqueId: string, dto: CreateMilestoneDto) {
    return this.prisma.mosqueMilestone.create({
      data: { ...dto, mosqueId },
    });
  }

  async updateMilestone(mosqueId: string, milestoneId: string, dto: UpdateMilestoneDto) {
    await this.getMilestone(mosqueId, milestoneId);

    return this.prisma.mosqueMilestone.update({
      where: { id: milestoneId },
      data: dto,
    });
  }

  async deleteMilestone(mosqueId: string, milestoneId: string) {
    await this.getMilestone(mosqueId, milestoneId);

    return this.prisma.mosqueMilestone.delete({
      where: { id: milestoneId },
    });
  }

  // ---------------------------------------------------------------------------
  // Belief Values / Pillars
  // ---------------------------------------------------------------------------

  async getValues(mosqueId: string) {
    return this.prisma.mosqueValue.findMany({
      where: { mosqueId },
      orderBy: [{ sortOrder: 'asc' }, { num: 'asc' }],
    });
  }

  async getValue(mosqueId: string, valueId: string) {
    const val = await this.prisma.mosqueValue.findFirst({
      where: { id: valueId, mosqueId },
    });

    if (!val) {
      throw new NotFoundException('Value not found');
    }

    return val;
  }

  async createValue(mosqueId: string, dto: CreateValueDto) {
    return this.prisma.mosqueValue.create({
      data: { ...dto, mosqueId },
    });
  }

  async updateValue(mosqueId: string, valueId: string, dto: UpdateValueDto) {
    await this.getValue(mosqueId, valueId);

    return this.prisma.mosqueValue.update({
      where: { id: valueId },
      data: dto,
    });
  }

  async deleteValue(mosqueId: string, valueId: string) {
    await this.getValue(mosqueId, valueId);

    return this.prisma.mosqueValue.delete({
      where: { id: valueId },
    });
  }

  // ---------------------------------------------------------------------------
  // Gallery Items (Cloudinary Integration)
  // ---------------------------------------------------------------------------

  async getGalleryItems(mosqueId: string) {
    return this.prisma.mosqueGalleryItem.findMany({
      where: { mosqueId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getGalleryItem(mosqueId: string, itemId: string) {
    const item = await this.prisma.mosqueGalleryItem.findFirst({
      where: { id: itemId, mosqueId },
    });

    if (!item) {
      throw new NotFoundException('Gallery item not found');
    }

    return item;
  }

  async createGalleryItem(
    mosqueId: string,
    dto: CreateGalleryItemDto,
    file?: Express.Multer.File,
    explicitImageUrl?: string,
  ) {
    let imageUrl = explicitImageUrl;
    let cloudinaryPublicId: string | undefined;

    if (file) {
      // Validate file type
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new BadRequestException(
          `Unsupported file type: ${file.mimetype}. Allowed: JPG, PNG, WebP, GIF.`,
        );
      }

      // Max 5MB
      if (file.size > 5 * 1024 * 1024) {
        throw new BadRequestException('File exceeds 5MB size limit.');
      }

      const folder = `mosques/${mosqueId}/gallery`;
      const uploaded = await this.cloudinary.uploadImage(file.buffer, folder);
      imageUrl = uploaded.secureUrl;
      cloudinaryPublicId = uploaded.publicId;
    }

    if (!imageUrl) {
      throw new BadRequestException('Either an image file or a valid image URL must be provided.');
    }

    return this.prisma.mosqueGalleryItem.create({
      data: {
        mosqueId,
        imageUrl,
        cloudinaryPublicId,
        title: dto.title,
        altText: dto.altText,
        category: dto.category ?? 'general',
        sortOrder: dto.sortOrder ?? 0,
        isPublished: dto.isPublished ?? true,
      },
    });
  }

  async updateGalleryItem(mosqueId: string, itemId: string, dto: UpdateGalleryItemDto) {
    await this.getGalleryItem(mosqueId, itemId);

    return this.prisma.mosqueGalleryItem.update({
      where: { id: itemId },
      data: dto,
    });
  }

  async deleteGalleryItem(mosqueId: string, itemId: string) {
    const item = await this.getGalleryItem(mosqueId, itemId);

    if (item.cloudinaryPublicId) {
      await this.cloudinary.deleteAsset(item.cloudinaryPublicId);
    }

    return this.prisma.mosqueGalleryItem.delete({
      where: { id: itemId },
    });
  }
}
