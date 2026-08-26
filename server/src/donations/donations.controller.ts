import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { AnyPermission, Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { DonationsService } from './donations.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { DonationQueryDto } from './dto/donation-query.dto';
import { DonationEnvelopeDto, DonationListEnvelopeDto } from './dto/donation-response.dto';
import { UpdateDonationDto } from './dto/update-donation.dto';

/**
 * Donations: money the mosque has received, or has been promised.
 *
 * Every route lives under `/api/v1/donations` — the global prefix and URI versioning are set in
 * `bootstrap.ts`, so neither appears here.
 *
 * **There is no `DELETE`.** A donation entered in error is corrected with `PATCH`, or withdrawn with
 * `{ "status": "cancelled" }`; the row stays either way. A financial record that can vanish is a financial
 * record nobody can audit.
 *
 * **Nothing here takes a payment.** No card processor, no wallet, no gateway. `paymentMethod: online`
 * records that money arrived through one; a donation is a record of a transaction, not the transaction.
 *
 * Authorization runs in two places. The guards enforce what is written on each route: `donation.record` to
 * enter one, `donation.manage` to change one, and either `donation.view` or `donation.viewOwn` to read.
 * The service then decides *how much* a reader sees, because that is a question the decorators cannot
 * express — `donation.view` reads the mosque's giving, `donation.viewOwn` reads only the caller's own, and
 * the difference becomes a `userId` in the `where` clause rather than a filter applied to rows already read.
 * Both resolve through the same permission registry the guards use; there is no role comparison in this
 * module.
 *
 * The mosque is never read from the request. Each method hands the authenticated user to the service, which
 * takes `mosqueId` from the token. `fundId`, `campaignId` and `userId` are the identifiers a client may
 * supply that point at other rows, and the service checks all three against the caller's own mosque first.
 */
@ApiTags('Donations')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'No valid access token was sent.' })
@Controller('donations')
export class DonationsController {
  constructor(private readonly donations: DonationsService) {}

  @Post()
  @Permissions('donation.record')
  @ApiOperation({
    summary: 'Record a donation.',
    description:
      'Requires `donation.record`. The donation belongs to the caller’s mosque, taken from the access ' +
      'token — a `mosqueId` in the body is rejected. `fundId` is required and must name a fund of that ' +
      'mosque; `campaignId` and `userId` are optional and are checked the same way, and a campaign must ' +
      'collect into the fund named beside it. The donor may be a registered user (`userId`), a named ' +
      'person with no account (`donorName`), or nobody at all — a cash collection is anonymous and that ' +
      'is a valid donation. `amount` is a decimal string greater than zero, never a float; `currency` ' +
      'defaults to the mosque’s configured currency and is then stored on the row. `donatedAt` defaults ' +
      'to now and may be back-dated, since Friday’s collection is often entered on Monday. No payment is ' +
      'taken and no balance is touched.',
  })
  @ApiCreatedResponse({ description: 'The donation was recorded.', type: DonationEnvelopeDto })
  @ApiBadRequestResponse({
    description:
      'A field failed validation: an unknown property, an amount that is not a positive decimal string, ' +
      'a malformed currency or timestamp, a `fundId`, `campaignId` or `userId` that is not of this ' +
      'mosque, or a campaign that collects into a different fund.',
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `donation.record`.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDonationDto,
  ): Promise<DonationEnvelopeDto> {
    return {
      success: true,
      message: 'Donation recorded successfully',
      data: await this.donations.create(user, dto),
    };
  }

  @Get()
  @AnyPermission('donation.view', 'donation.viewOwn')
  @ApiOperation({
    summary: 'List donations.',
    description:
      'Requires `donation.view` or `donation.viewOwn`, and the two see different things: `donation.view` ' +
      'lists the mosque’s donations, while `donation.viewOwn` lists only donations attributed to the ' +
      'caller — anonymous ones included in neither sense, since they belong to no account. Nothing in ' +
      'the query string widens that. Paginated, newest first, capped at 100 rows per page. Scoped to the ' +
      'caller’s mosque: another mosque’s donations are not in the result set at all. `search` matches ' +
      'donor name, donor email and reference case-insensitively — not notes. `status`, `paymentMethod`, ' +
      '`fundId` and `campaignId` narrow further; a fund or campaign from another mosque simply matches ' +
      'nothing. No total, balance or progress figure is returned.',
  })
  @ApiOkResponse({ description: 'A page of donations.', type: DonationListEnvelopeDto })
  @ApiBadRequestResponse({
    description: 'A query parameter failed validation, including a `limit` above 100.',
  })
  @ApiForbiddenResponse({
    description: 'Authenticated, but with neither `donation.view` nor `donation.viewOwn`.',
  })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DonationQueryDto,
  ): Promise<DonationListEnvelopeDto> {
    const { rows, meta } = await this.donations.findMany(user, query);

    return {
      success: true,
      message: 'Donations retrieved successfully',
      data: rows,
      meta,
    };
  }

  @Get(':id')
  @AnyPermission('donation.view', 'donation.viewOwn')
  @ApiOperation({
    summary: 'Read one donation.',
    description:
      'Requires `donation.view` or `donation.viewOwn`. A donation belonging to another mosque answers ' +
      '404 rather than 403 — a 403 would confirm the record exists. A caller holding only ' +
      '`donation.viewOwn` gets the same 404 for another member’s donation, for the same reason.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The donation.', type: DonationEnvelopeDto })
  @ApiForbiddenResponse({
    description: 'Authenticated, but with neither `donation.view` nor `donation.viewOwn`.',
  })
  @ApiNotFoundResponse({
    description: 'No such donation in this mosque, or none the caller is entitled to read.',
  })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DonationEnvelopeDto> {
    return {
      success: true,
      message: 'Donation retrieved successfully',
      data: await this.donations.findOne(user, id),
    };
  }

  @Patch(':id')
  @Permissions('donation.manage')
  @ApiOperation({
    summary: 'Correct or withdraw a donation.',
    description:
      'Requires `donation.manage` — which nobody holds for their own donations only, so a member cannot ' +
      'edit their own giving record: the amount on it is the mosque’s statement of what it received. ' +
      '**This endpoint stands in for a delete.** A donation entered in error is corrected here, or ' +
      'withdrawn with `{ "status": "cancelled" }`; the row remains either way. Every field is optional ' +
      'and keeps its three-way meaning — omit to leave the value, send `null` to clear a nullable one, ' +
      'send a value to set it. `fundId`, `amount`, `currency`, `paymentMethod`, `status` and `donatedAt` ' +
      'may be changed but not cleared; `null` for one of those is a 400. Sending only `campaignId` still ' +
      'checks it against the stored `fundId`. Moving `status` to `completed` records that the money is ' +
      'in; it captures no payment and credits no balance.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The updated donation.', type: DonationEnvelopeDto })
  @ApiBadRequestResponse({
    description:
      'A field failed validation, a required column was sent as `null`, an id is not of this mosque, or ' +
      'the resulting fund and campaign do not agree.',
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `donation.manage`.' })
  @ApiNotFoundResponse({ description: 'No such donation in this mosque.' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDonationDto,
  ): Promise<DonationEnvelopeDto> {
    return {
      success: true,
      message: 'Donation updated successfully',
      data: await this.donations.update(user, id, dto),
    };
  }
}
