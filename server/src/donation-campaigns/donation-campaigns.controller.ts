import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { DonationCampaignsService } from './donation-campaigns.service';
import { CampaignQueryDto } from './dto/campaign-query.dto';
import {
  CampaignEnvelopeDto,
  CampaignListEnvelopeDto,
  DeletedCampaignEnvelopeDto,
} from './dto/campaign-response.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

/**
 * Campaigns: a specific fundraising appeal, such as "Build the New Mosque Roof". A campaign may collect
 * into a donation fund, or stand on its own.
 *
 * Like a fund, a campaign here is a *description of an appeal* — a title, a target and a window. No route
 * reports what has been raised against it or how far along it is; donations arrive in Part 20, and an
 * endpoint that never reads them cannot publish a figure nobody has reconciled.
 *
 * Every route lives under `/api/v1/donation-campaigns` — the global prefix and URI versioning are set in
 * `bootstrap.ts`, so neither appears here.
 *
 * Authorization runs in two places, and the split is deliberate. The guards enforce what is written on each
 * route: `campaign.view` to read, `campaign.manage` to change. The service then enforces one rule the
 * route decorators cannot express, because it depends on the body — making a campaign public, by setting
 * `isPublic` true or moving `status` off `draft`, additionally requires `campaign.publish`. Taking one down
 * is not gated. Both checks resolve through the same permission registry the guards use; there is no role
 * comparison anywhere in this module.
 *
 * The mosque is never read from the request. Each method hands the authenticated user to the service, which
 * takes `mosqueId` from the token. `fundId` is the one identifier a client may supply that points at
 * another row, and the service checks it belongs to the caller's own mosque before writing it.
 */
@ApiTags('Donation Campaigns')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'No valid access token was sent.' })
@Controller('donation-campaigns')
export class DonationCampaignsController {
  constructor(private readonly campaigns: DonationCampaignsService) {}

  @Post()
  @Permissions('campaign.manage')
  @ApiOperation({
    summary: 'Create a campaign.',
    description:
      'Requires `campaign.manage`, and `campaign.publish` as well if `isPublic` is true or `status` is ' +
      'anything other than `draft`. The campaign belongs to the caller’s mosque, taken from the access ' +
      'token — a `mosqueId` in the body is rejected. `fundId` is optional but must name a fund of the ' +
      'caller’s own mosque. `slug` is derived from `title` when omitted and must be unique within the ' +
      'mosque. `targetAmount`, `startDate` and `endDate` are all required: an appeal without a goal or a ' +
      'window is not an appeal. Money is a decimal string, never a float; `imageUrl` is a link, never ' +
      'image bytes.',
  })
  @ApiCreatedResponse({ description: 'The campaign was created.', type: CampaignEnvelopeDto })
  @ApiBadRequestResponse({
    description:
      'A field failed validation: an unknown property, a malformed amount, date or URL, `endDate` ' +
      'before `startDate`, a `fundId` that is not a fund of this mosque, or a title no slug could be ' +
      'derived from.',
  })
  @ApiForbiddenResponse({
    description:
      'Authenticated, but without `campaign.manage` — or without `campaign.publish` while ' +
      'trying to publish.',
  })
  @ApiConflictResponse({ description: 'This mosque already has a campaign with that slug.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCampaignDto,
  ): Promise<CampaignEnvelopeDto> {
    return {
      success: true,
      message: 'Campaign created successfully',
      data: await this.campaigns.create(user, dto),
    };
  }

  @Get()
  @Permissions('campaign.view')
  @ApiOperation({
    summary: 'List campaigns.',
    description:
      'Requires `campaign.view`. Paginated, newest first, capped at 100 rows per page. Scoped to the ' +
      'caller’s mosque: another mosque’s campaigns are not in the result set at all. `search` matches ' +
      'title, slug and description case-insensitively; `status` filters on campaign state; `fundId` ' +
      'narrows to one fund, and a fund from another mosque simply matches nothing.',
  })
  @ApiOkResponse({ description: 'A page of campaigns.', type: CampaignListEnvelopeDto })
  @ApiBadRequestResponse({
    description: 'A query parameter failed validation, including a `limit` above 100.',
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `campaign.view`.' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CampaignQueryDto,
  ): Promise<CampaignListEnvelopeDto> {
    const { rows, meta } = await this.campaigns.findMany(user, query);

    return {
      success: true,
      message: 'Campaigns retrieved successfully',
      data: rows,
      meta,
    };
  }

  @Get(':id')
  @Permissions('campaign.view')
  @ApiOperation({
    summary: 'Read one campaign.',
    description:
      'Requires `campaign.view`. A campaign belonging to another mosque answers 404 rather than 403 — a ' +
      '403 would confirm the record exists.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The campaign.', type: CampaignEnvelopeDto })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `campaign.view`.' })
  @ApiNotFoundResponse({ description: 'No such campaign in this mosque.' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CampaignEnvelopeDto> {
    return {
      success: true,
      message: 'Campaign retrieved successfully',
      data: await this.campaigns.findOne(user, id),
    };
  }

  @Patch(':id')
  @Permissions('campaign.manage')
  @ApiOperation({
    summary: 'Update a campaign.',
    description:
      'Requires `campaign.manage`, and `campaign.publish` as well to set `isPublic` true or move ' +
      '`status` off `draft`. Withdrawing needs neither: `isPublic: false` and a return to `draft` are ' +
      'allowed with `campaign.manage` alone, so a campaign that should not be up can come down at once. ' +
      'Every field is optional and keeps its three-way meaning — omit to leave the value, send `null` to ' +
      'clear a nullable one, send a value to set it. `targetAmount`, `startDate` and `endDate` may be ' +
      'changed but not cleared; `null` for one of those is a 400. An omitted `slug` is left as it is. ' +
      'Sending only `endDate` still checks it against the stored `startDate`.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The updated campaign.', type: CampaignEnvelopeDto })
  @ApiBadRequestResponse({
    description:
      'A field failed validation, the resulting date window is inverted, or `fundId` is not a fund of ' +
      'this mosque.',
  })
  @ApiForbiddenResponse({
    description:
      'Authenticated, but without `campaign.manage` — or without `campaign.publish` while ' +
      'trying to publish.',
  })
  @ApiNotFoundResponse({ description: 'No such campaign in this mosque.' })
  @ApiConflictResponse({ description: 'Another campaign in this mosque already uses that slug.' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
  ): Promise<CampaignEnvelopeDto> {
    return {
      success: true,
      message: 'Campaign updated successfully',
      data: await this.campaigns.update(user, id, dto),
    };
  }

  @Delete(':id')
  @Permissions('campaign.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a campaign.',
    description:
      'Requires `campaign.manage`. Only a campaign that has received no donations can be deleted; once ' +
      'one has, this answers 409. For any campaign that has been live, `PATCH /:id` with ' +
      '`{ "status": "archived" }` is the better answer — it stops the appeal without losing the record ' +
      'and can be undone. Deleting twice is a 404.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The campaign was deleted.', type: DeletedCampaignEnvelopeDto })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `campaign.manage`.' })
  @ApiNotFoundResponse({
    description: 'No such campaign in this mosque, or it was already deleted.',
  })
  @ApiConflictResponse({
    description:
      'The campaign has donations recorded against it. Archive it with `PATCH` instead of deleting it.',
  })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DeletedCampaignEnvelopeDto> {
    return {
      success: true,
      message: 'Campaign deleted successfully',
      data: await this.campaigns.remove(user, id),
    };
  }
}
