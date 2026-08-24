import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMosqueDto } from './dto/update-mosque.dto';
import { UpdateMosqueSettingsDto } from './dto/update-mosque-settings.dto';
import { CreateFacilityDto, UpdateFacilityDto } from './dto/facility.dto';

@Injectable()
export class MosqueService {
  constructor(private readonly prisma: PrismaService) {}

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
      // Return default settings if none exist yet, or create them.
      // Usually they are created when the mosque is created.
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
    await this.getFacility(mosqueId, facilityId); // Ensure it exists and belongs to the mosque

    return this.prisma.facility.update({
      where: { id: facilityId },
      data: dto,
    });
  }

  async deleteFacility(mosqueId: string, facilityId: string) {
    await this.getFacility(mosqueId, facilityId); // Ensure it exists and belongs to the mosque

    return this.prisma.facility.delete({
      where: { id: facilityId },
    });
  }
}
