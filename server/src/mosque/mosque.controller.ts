import 'multer';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { MosqueService } from './mosque.service';
import { UpdateMosqueDto } from './dto/update-mosque.dto';
import { UpdateMosqueSettingsDto } from './dto/update-mosque-settings.dto';
import { CreateFacilityDto, UpdateFacilityDto } from './dto/facility.dto';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/milestone.dto';
import { CreateValueDto, UpdateValueDto } from './dto/value.dto';
import { CreateGalleryItemDto, UpdateGalleryItemDto } from './dto/gallery.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';

@ApiTags('Mosque')
@ApiBearerAuth('access-token')
@Controller('mosque')
export class MosqueController {
  constructor(private readonly mosqueService: MosqueService) {}

  // ---------------------------------------------------------------------------
  // Profile & Settings
  // ---------------------------------------------------------------------------

  @Get()
  @Permissions('mosque.view')
  @ApiOperation({ summary: 'Get current mosque profile' })
  async getMosque(@CurrentUser() user: AuthenticatedUser) {
    return this.mosqueService.getMosque(user.mosqueId);
  }

  @Patch()
  @Permissions('mosque.manage')
  @ApiOperation({ summary: 'Update current mosque profile (including story, mission, vision)' })
  async updateMosque(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateMosqueDto) {
    return this.mosqueService.updateMosque(user.mosqueId, dto);
  }

  @Post('logo')
  @Permissions('mosque.manage')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a mosque logo to Cloudinary and update profile' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  async uploadLogo(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.mosqueService.uploadLogo(user.mosqueId, file);
  }

  @Get('settings')
  @Permissions('settings.view')
  @ApiOperation({ summary: 'Get current mosque settings' })
  async getSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.mosqueService.getSettings(user.mosqueId);
  }

  @Patch('settings')
  @Permissions('settings.manage')
  @ApiOperation({ summary: 'Update current mosque settings' })
  async updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMosqueSettingsDto,
  ) {
    return this.mosqueService.updateSettings(user.mosqueId, dto);
  }

  // ---------------------------------------------------------------------------
  // Facilities
  // ---------------------------------------------------------------------------

  @Get('facilities')
  @Permissions('facility.view')
  @ApiOperation({ summary: 'List all facilities for the mosque' })
  async getFacilities(@CurrentUser() user: AuthenticatedUser) {
    return this.mosqueService.getFacilities(user.mosqueId);
  }

  @Post('facilities')
  @Permissions('facility.create')
  @ApiOperation({ summary: 'Create a new facility' })
  async createFacility(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFacilityDto) {
    return this.mosqueService.createFacility(user.mosqueId, dto);
  }

  @Get('facilities/:id')
  @Permissions('facility.view')
  @ApiOperation({ summary: 'Get a specific facility' })
  async getFacility(@CurrentUser() user: AuthenticatedUser, @Param('id') facilityId: string) {
    return this.mosqueService.getFacility(user.mosqueId, facilityId);
  }

  @Patch('facilities/:id')
  @Permissions('facility.update')
  @ApiOperation({ summary: 'Update a specific facility' })
  async updateFacility(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') facilityId: string,
    @Body() dto: UpdateFacilityDto,
  ) {
    return this.mosqueService.updateFacility(user.mosqueId, facilityId, dto);
  }

  @Delete('facilities/:id')
  @Permissions('facility.delete')
  @ApiOperation({ summary: 'Delete a specific facility' })
  async deleteFacility(@CurrentUser() user: AuthenticatedUser, @Param('id') facilityId: string) {
    return this.mosqueService.deleteFacility(user.mosqueId, facilityId);
  }

  // ---------------------------------------------------------------------------
  // Milestones
  // ---------------------------------------------------------------------------

  @Get('milestones')
  @Permissions('mosque.view')
  @ApiOperation({ summary: 'List all milestones for the mosque' })
  async getMilestones(@CurrentUser() user: AuthenticatedUser) {
    return this.mosqueService.getMilestones(user.mosqueId);
  }

  @Post('milestones')
  @Permissions('mosque.manage')
  @ApiOperation({ summary: 'Create a new milestone' })
  async createMilestone(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMilestoneDto) {
    return this.mosqueService.createMilestone(user.mosqueId, dto);
  }

  @Patch('milestones/:id')
  @Permissions('mosque.manage')
  @ApiOperation({ summary: 'Update a milestone' })
  async updateMilestone(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') milestoneId: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.mosqueService.updateMilestone(user.mosqueId, milestoneId, dto);
  }

  @Delete('milestones/:id')
  @Permissions('mosque.manage')
  @ApiOperation({ summary: 'Delete a milestone' })
  async deleteMilestone(@CurrentUser() user: AuthenticatedUser, @Param('id') milestoneId: string) {
    return this.mosqueService.deleteMilestone(user.mosqueId, milestoneId);
  }

  // ---------------------------------------------------------------------------
  // Belief Values
  // ---------------------------------------------------------------------------

  @Get('values')
  @Permissions('mosque.view')
  @ApiOperation({ summary: 'List all belief values for the mosque' })
  async getValues(@CurrentUser() user: AuthenticatedUser) {
    return this.mosqueService.getValues(user.mosqueId);
  }

  @Post('values')
  @Permissions('mosque.manage')
  @ApiOperation({ summary: 'Create a new belief value' })
  async createValue(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateValueDto) {
    return this.mosqueService.createValue(user.mosqueId, dto);
  }

  @Patch('values/:id')
  @Permissions('mosque.manage')
  @ApiOperation({ summary: 'Update a belief value' })
  async updateValue(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') valueId: string,
    @Body() dto: UpdateValueDto,
  ) {
    return this.mosqueService.updateValue(user.mosqueId, valueId, dto);
  }

  @Delete('values/:id')
  @Permissions('mosque.manage')
  @ApiOperation({ summary: 'Delete a belief value' })
  async deleteValue(@CurrentUser() user: AuthenticatedUser, @Param('id') valueId: string) {
    return this.mosqueService.deleteValue(user.mosqueId, valueId);
  }

  // ---------------------------------------------------------------------------
  // Media Gallery (Cloudinary stream upload)
  // ---------------------------------------------------------------------------

  @Get('gallery')
  @Permissions('gallery.view')
  @ApiOperation({ summary: 'List all gallery photos for the mosque' })
  async getGalleryItems(@CurrentUser() user: AuthenticatedUser) {
    return this.mosqueService.getGalleryItems(user.mosqueId);
  }

  @Post('gallery')
  @Permissions('gallery.manage')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a gallery photo to Cloudinary and create DB record' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        altText: { type: 'string' },
        category: { type: 'string' },
        sortOrder: { type: 'number' },
        isPublished: { type: 'boolean' },
      },
    },
  })
  async createGalleryItem(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateGalleryItemDto,
  ) {
    return this.mosqueService.createGalleryItem(user.mosqueId, dto, file);
  }

  @Patch('gallery/:id')
  @Permissions('gallery.manage')
  @ApiOperation({ summary: 'Update gallery item metadata' })
  async updateGalleryItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') itemId: string,
    @Body() dto: UpdateGalleryItemDto,
  ) {
    return this.mosqueService.updateGalleryItem(user.mosqueId, itemId, dto);
  }

  @Delete('gallery/:id')
  @Permissions('gallery.manage')
  @ApiOperation({ summary: 'Delete photo from Cloudinary and remove DB record' })
  async deleteGalleryItem(@CurrentUser() user: AuthenticatedUser, @Param('id') itemId: string) {
    return this.mosqueService.deleteGalleryItem(user.mosqueId, itemId);
  }
}
