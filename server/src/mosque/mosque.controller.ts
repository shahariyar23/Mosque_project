import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MosqueService } from './mosque.service';
import { UpdateMosqueDto } from './dto/update-mosque.dto';
import { UpdateMosqueSettingsDto } from './dto/update-mosque-settings.dto';
import { CreateFacilityDto, UpdateFacilityDto } from './dto/facility.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';

@ApiTags('Mosque')
@ApiBearerAuth('access-token')
// Own segment only. `bootstrap.ts` adds the `api` prefix and the `v1` version, so spelling them here
// again registers these routes at `/api/v1/api/v1/mosque/...` and nothing reaches them.
@Controller('mosque')
export class MosqueController {
  constructor(private readonly mosqueService: MosqueService) {}

  @Get()
  @Permissions('mosque.view')
  @ApiOperation({ summary: 'Get current mosque profile' })
  async getMosque(@CurrentUser() user: AuthenticatedUser) {
    return this.mosqueService.getMosque(user.mosqueId);
  }

  @Patch()
  @Permissions('mosque.manage')
  @ApiOperation({ summary: 'Update current mosque profile' })
  async updateMosque(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateMosqueDto) {
    return this.mosqueService.updateMosque(user.mosqueId, dto);
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
}
