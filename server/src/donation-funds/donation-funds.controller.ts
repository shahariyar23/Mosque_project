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
import { DonationFundsService } from './donation-funds.service';
import { CreateDonationFundDto } from './dto/create-donation-fund.dto';
import { DonationFundQueryDto } from './dto/donation-fund-query.dto';
import {
  DeletedDonationFundEnvelopeDto,
  DonationFundEnvelopeDto,
  DonationFundListEnvelopeDto,
} from './dto/donation-fund-response.dto';
import { UpdateDonationFundDto } from './dto/update-donation-fund.dto';

/**
 * Donation funds: the standing purposes a donation can be directed to — Zakat, Sadaqah, a construction
 * fund, the imam's salary. Each mosque writes its own list; nothing in this module knows the names.
 *
 * A fund is a *category*, not a balance. No route here reports what has been given, what remains, or what
 * has been spent. Those figures belong to the donations, expenses and reporting modules, and keeping them
 * out means these endpoints cannot leak a financial total they never read.
 *
 * Every route lives under `/api/v1/donation-funds` — the global prefix and URI versioning are set in
 * `bootstrap.ts`, so neither appears here.
 *
 * Every route is closed twice over: the global authentication guard refuses a request with no token, and
 * `PermissionsGuard` then refuses one whose holder lacks the permission named. The two used are the
 * registry's existing finance permissions rather than new ones — `fund.view` to read and `fund.manage` to
 * change — because they already exist for exactly this purpose and the treasurer role already carries
 * both. There is no `if (user.role === 'treasurer')` anywhere in this module; a role check in a controller
 * is a second authorization model that nothing tests and nobody audits.
 *
 * The mosque is never read from the request. Each method hands the authenticated user to the service,
 * which takes `mosqueId` from the token — so a caller cannot see or touch another mosque's funds, and the
 * DTOs do not declare a `mosqueId` for them to try.
 */
@ApiTags('Donation Funds')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'No valid access token was sent.' })
@Controller('donation-funds')
export class DonationFundsController {
  constructor(private readonly funds: DonationFundsService) {}

  @Post()
  @Permissions('fund.manage')
  @ApiOperation({
    summary: 'Create a donation fund.',
    description:
      'Requires `fund.manage`. The fund belongs to the caller’s mosque, taken from the access token — a ' +
      '`mosqueId` in the body is rejected. `slug` is derived from `name` when omitted and must be unique ' +
      'within the mosque, so a duplicate is a 409. `targetAmount` is a decimal string, never a float, ' +
      'and may be omitted for an open-ended fund such as Zakat.',
  })
  @ApiCreatedResponse({ description: 'The fund was created.', type: DonationFundEnvelopeDto })
  @ApiBadRequestResponse({
    description:
      'A field failed validation: an unknown property, a malformed amount or date, `endDate` before ' +
      '`startDate`, or a name no slug could be derived from.',
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `fund.manage`.' })
  @ApiConflictResponse({ description: 'This mosque already has a fund with that slug.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDonationFundDto,
  ): Promise<DonationFundEnvelopeDto> {
    return {
      success: true,
      message: 'Donation fund created successfully',
      data: await this.funds.create(user, dto),
    };
  }

  @Get()
  @Permissions('fund.view')
  @ApiOperation({
    summary: 'List donation funds.',
    description:
      'Requires `fund.view`. Paginated, newest first, capped at 100 rows per page. Scoped to the ' +
      'caller’s mosque: another mosque’s funds are not in the result set at all. `search` matches the ' +
      'name, slug and description case-insensitively; `status` filters on fund state. Each row carries ' +
      '`campaignCount` — a row count, not a financial figure.',
  })
  @ApiOkResponse({ description: 'A page of funds.', type: DonationFundListEnvelopeDto })
  @ApiBadRequestResponse({
    description: 'A query parameter failed validation, including a `limit` above 100.',
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `fund.view`.' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DonationFundQueryDto,
  ): Promise<DonationFundListEnvelopeDto> {
    const { rows, meta } = await this.funds.findMany(user, query);

    return {
      success: true,
      message: 'Donation funds retrieved successfully',
      data: rows,
      meta,
    };
  }

  @Get(':id')
  @Permissions('fund.view')
  @ApiOperation({
    summary: 'Read one donation fund.',
    description:
      'Requires `fund.view`. A fund belonging to another mosque answers 404 rather than 403 — a 403 ' +
      'would confirm the record exists.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The fund.', type: DonationFundEnvelopeDto })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `fund.view`.' })
  @ApiNotFoundResponse({ description: 'No such fund in this mosque.' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DonationFundEnvelopeDto> {
    return {
      success: true,
      message: 'Donation fund retrieved successfully',
      data: await this.funds.findOne(user, id),
    };
  }

  @Patch(':id')
  @Permissions('fund.manage')
  @ApiOperation({
    summary: 'Update a donation fund.',
    description:
      'Requires `fund.manage`. Every field is optional and keeps its three-way meaning: omit to leave ' +
      'the value, send `null` to clear a nullable one, send a value to set it. An omitted `slug` is left ' +
      'as it is — renaming a fund does not re-derive it, because a public page may already link to the ' +
      'old one. Sending only `endDate` still checks it against the stored `startDate`. Setting `status` ' +
      'to `inactive` or `archived` is how a fund is retired without deleting anything.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The updated fund.', type: DonationFundEnvelopeDto })
  @ApiBadRequestResponse({
    description: 'A field failed validation, or the resulting date window is inverted.',
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `fund.manage`.' })
  @ApiNotFoundResponse({ description: 'No such fund in this mosque.' })
  @ApiConflictResponse({ description: 'Another fund in this mosque already uses that slug.' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDonationFundDto,
  ): Promise<DonationFundEnvelopeDto> {
    return {
      success: true,
      message: 'Donation fund updated successfully',
      data: await this.funds.update(user, id, dto),
    };
  }

  @Delete(':id')
  @Permissions('fund.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete an unused donation fund.',
    description:
      'Requires `fund.manage`. Only a fund nothing points at can be deleted: while it still has ' +
      'campaigns this answers 409 and the foreign key refuses as well. For a fund that has been in use, ' +
      '`PATCH /:id` with `{ "status": "archived" }` is the intended route — it retires the fund without ' +
      'losing anything and can be undone. Deleting twice is a 404.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The fund was deleted.', type: DeletedDonationFundEnvelopeDto })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `fund.manage`.' })
  @ApiNotFoundResponse({ description: 'No such fund in this mosque, or it was already deleted.' })
  @ApiConflictResponse({
    description: 'The fund still has campaigns. Archive it instead of deleting it.',
  })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DeletedDonationFundEnvelopeDto> {
    return {
      success: true,
      message: 'Donation fund deleted successfully',
      data: await this.funds.remove(user, id),
    };
  }
}
