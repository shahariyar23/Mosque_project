import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import {
  CreateIftarSponsorshipDto,
  IftarSponsorshipDto,
  ListIftarSponsorshipQueryDto,
  PaginatedIftarSponsorshipDto,
  UpdateIftarSponsorshipDto,
} from './dto/iftar-sponsorship.dto';
import { IftarSponsorshipService } from './iftar-sponsorship.service';

/**
 * Community Iftar Sponsorship for the authenticated user's mosque.
 */
@ApiTags('Iftar Sponsorship')
@ApiBearerAuth('access-token')
@Controller('iftar-sponsorships')
export class IftarSponsorshipController {
  constructor(private readonly iftarService: IftarSponsorshipService) {}

  @Get()
  @Permissions('prayer.view')
  @ApiOperation({
    summary: 'List Iftar sponsorships',
    description: 'Returns paginated sponsorships for the mosque, filtered optionally by year, date, status, or search query.',
  })
  @ApiResponse({ status: 200, type: PaginatedIftarSponsorshipDto })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListIftarSponsorshipQueryDto,
  ): Promise<PaginatedIftarSponsorshipDto | IftarSponsorshipDto[]> {
    return this.iftarService.findAll(user.mosqueId, query);
  }

  @Get(':id')
  @Permissions('prayer.view')
  @ApiOperation({ summary: 'Get one Iftar sponsorship record' })
  @ApiResponse({ status: 200, type: IftarSponsorshipDto })
  @ApiResponse({ status: 404, description: 'Sponsorship record not found.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IftarSponsorshipDto> {
    return this.iftarService.findOne(user.mosqueId, id);
  }

  @Post()
  @Permissions('ramadan.manage')
  @ApiOperation({ summary: 'Create an Iftar sponsorship entry' })
  @ApiResponse({ status: 201, type: IftarSponsorshipDto })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 409, description: 'Sponsorship already exists for this date.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateIftarSponsorshipDto,
  ): Promise<IftarSponsorshipDto> {
    return this.iftarService.create(user, dto);
  }

  @Patch(':id')
  @Permissions('ramadan.manage')
  @ApiOperation({ summary: 'Update an Iftar sponsorship entry' })
  @ApiResponse({ status: 200, type: IftarSponsorshipDto })
  @ApiResponse({ status: 404, description: 'Sponsorship record not found.' })
  @ApiResponse({ status: 409, description: 'Conflict with another sponsorship on that date.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIftarSponsorshipDto,
  ): Promise<IftarSponsorshipDto> {
    return this.iftarService.update(user, id, dto);
  }

  @Delete(':id')
  @Permissions('ramadan.manage')
  @ApiOperation({ summary: 'Delete an Iftar sponsorship entry' })
  @ApiResponse({ status: 200, type: IftarSponsorshipDto })
  @ApiResponse({ status: 404, description: 'Sponsorship record not found.' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IftarSponsorshipDto> {
    return this.iftarService.remove(user, id);
  }
}
