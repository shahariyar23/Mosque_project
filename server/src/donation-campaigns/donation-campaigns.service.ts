import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CampaignStatus, Prisma } from '@prisma/client';

import { effectivePermissions, hasPermission } from '../common/constants/roles';
import { MAX_PAGE_SIZE } from '../common/pagination/page';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { fromDateOnly, toDateOnly } from '../common/utils/date-only';
import { toMoney } from '../common/utils/money';
import { slugify } from '../common/utils/slug';
import { PrismaService } from '../prisma/prisma.service';
import { CampaignQueryDto } from './dto/campaign-query.dto';
import {
  CampaignListMetaDto,
  CampaignResponseDto,
  DeletedCampaignDto,
} from './dto/campaign-response.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import {
  CAMPAIGN_SELECT,
  DEFAULT_CAMPAIGN_PAGE_SIZE,
  type SelectedCampaign,
} from './types/campaign.types';

/**
 * Everything the donation-campaigns endpoints do.
 *
 * It reads like the funds service on purpose — the mosque comes from the token and never from the body,
 * reads are scoped in the `where` clause rather than checked after the fact, an unowned row answers 404
 * rather than 403, money moves as `Decimal` and never as a float, and Prisma errors are translated instead
 * of passed through. The class comment on `DonationFundsService` gives the reasoning for each.
 *
 * Two things are specific to campaigns.
 *
 * **A `fundId` is checked before it is written.** It is the one identifier a client is allowed to supply
 * that points at another row, so `assertFundOwned` looks the fund up *scoped to the caller's mosque*.
 * A fund id belonging to somebody else fails as an unknown fund, which is the same answer the caller would
 * get for an id that does not exist — they learn nothing about another mosque's records either way.
 *
 * **Publishing needs more than editing.** Routes require `campaign.manage`; putting a money appeal in
 * front of the public additionally requires `campaign.publish`. See `assertMayPublish` for exactly which
 * transitions are gated, and which deliberately are not.
 */
@Injectable()
export class DonationCampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a campaign for the caller's mosque.
   *
   * Order matters here: the publish check runs before the fund lookup and the write, so a caller who may
   * not publish is refused without the request having any effect and without learning whether the fund
   * they named exists.
   */
  async create(actor: AuthenticatedUser, dto: CreateCampaignDto): Promise<CampaignResponseDto> {
    this.assertMayPublish(actor, dto.status, dto.isPublic);

    const slug = this.resolveSlug(dto.slug, dto.title);
    this.assertRange(dto.startDate, dto.endDate);

    if (dto.fundId) await this.assertFundOwned(actor.mosqueId, dto.fundId);

    try {
      const created = await this.prisma.campaign.create({
        // Field by field rather than spread from the DTO, and `mosqueId` from the token: a field added to
        // the DTO later cannot reach the database until someone names it here, and no request body can
        // redirect the row to another mosque.
        data: {
          mosqueId: actor.mosqueId,
          fundId: dto.fundId ?? null,
          title: dto.title.trim(),
          slug,
          description: dto.description ?? null,
          status: dto.status,
          targetAmount: toMoney(dto.targetAmount),
          startDate: toDateOnly(dto.startDate),
          endDate: toDateOnly(dto.endDate),
          imageUrl: dto.imageUrl ?? null,
          isPublic: dto.isPublic,
        },
        select: CAMPAIGN_SELECT,
      });

      return CampaignResponseDto.from(created);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async findMany(
    actor: AuthenticatedUser,
    query: CampaignQueryDto,
  ): Promise<{ rows: CampaignResponseDto[]; meta: CampaignListMetaDto }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(Math.max(1, query.limit ?? DEFAULT_CAMPAIGN_PAGE_SIZE), MAX_PAGE_SIZE);
    const where = this.buildWhere(actor.mosqueId, query);

    // One transaction so the count and the page describe the same set of rows.
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.campaign.count({ where }),
      this.prisma.campaign.findMany({
        where,
        select: CAMPAIGN_SELECT,
        // `id` breaks ties so a campaign cannot appear on two pages, or on none, when several share a
        // creation timestamp.
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      rows: rows.map((row) => CampaignResponseDto.from(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(actor: AuthenticatedUser, id: string): Promise<CampaignResponseDto> {
    return CampaignResponseDto.from(await this.getOwned(actor.mosqueId, id));
  }

  /**
   * Updates a campaign.
   *
   * Every field keeps its three-way meaning, so `toUpdateData` tests `!== undefined` per field rather than
   * building the object from whatever the DTO happens to hold.
   *
   * The date window is resolved against the *stored* row before it is checked. A patch that sends only
   * `endDate` has to be compared with the `startDate` already in the database, which no per-field
   * validator can see — which is why this rule lives here and not in the DTO.
   */
  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateCampaignDto,
  ): Promise<CampaignResponseDto> {
    this.assertMayPublish(actor, dto.status, dto.isPublic);

    const existing = await this.getOwned(actor.mosqueId, id);

    // What each end of the window will be *after* the patch: the incoming value when the field was sent,
    // otherwise what is stored. Both columns are required, so neither side can be null.
    const start = dto.startDate ?? fromDateOnly(existing.startDate);
    const end = dto.endDate ?? fromDateOnly(existing.endDate);
    this.assertRange(start, end);

    if (dto.fundId) await this.assertFundOwned(actor.mosqueId, dto.fundId);

    try {
      const updated = await this.prisma.campaign.update({
        // `id` alone is safe only because `getOwned` has already established that it belongs to the
        // caller's mosque.
        where: { id },
        data: this.toUpdateData(dto),
        select: CAMPAIGN_SELECT,
      });

      return CampaignResponseDto.from(updated);
    } catch (error) {
      throw this.translate(error);
    }
  }

  /**
   * Deletes a campaign.
   *
   * Unlike a fund, a campaign has nothing pointing at it yet, so this deletes. That changes in Part 20:
   * once donations reference a campaign, deleting one that has received money would orphan those records,
   * and this method will need the same in-use pre-check `DonationFundsService.remove` already has —
   * backed, as there, by a `RESTRICT` foreign key so the database refuses even under a race.
   *
   * `PATCH { "status": "archived" }` is the reversible alternative and the better answer for a campaign
   * with any history: it stops appearing, nothing is lost, and the decision can be undone.
   */
  async remove(actor: AuthenticatedUser, id: string): Promise<DeletedCampaignDto> {
    const campaign = await this.getOwned(actor.mosqueId, id);

    try {
      await this.prisma.campaign.delete({ where: { id } });
    } catch (error) {
      throw this.translate(error);
    }

    return { id: campaign.id, title: campaign.title, slug: campaign.slug };
  }

  // ---- internals ------------------------------------------------------------

  private buildWhere(mosqueId: string, query: CampaignQueryDto): Prisma.CampaignWhereInput {
    const search = query.search?.trim();

    return {
      // First and non-negotiable: the caller's mosque. Everything below narrows within it, which is also
      // why `fundId` needs no separate ownership check on a read — a fund from another mosque simply
      // matches no row in this mosque.
      mosqueId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.fundId ? { fundId: query.fundId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  /**
   * Reads one campaign inside the caller's mosque, or refuses with 404.
   *
   * `findFirst` on both columns rather than `findUnique` on the id: the mosque is part of the question, so
   * another mosque's campaign is not found at all rather than found and then rejected.
   */
  private async getOwned(mosqueId: string, id: string): Promise<SelectedCampaign> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, mosqueId },
      select: CAMPAIGN_SELECT,
    });

    if (!campaign) throw campaignNotFound();

    return campaign;
  }

  /**
   * The fund exists *and* belongs to the caller's mosque.
   *
   * Scoped by `mosqueId`, so this is the check that stops a campaign in one mosque from being attached to
   * another mosque's fund — the single place a client-supplied id crosses a row boundary in this module.
   * The answer is a 400 naming the field rather than a 403: as far as the caller is concerned there is no
   * such fund, and saying otherwise would confirm that some other mosque holds it.
   */
  private async assertFundOwned(mosqueId: string, fundId: string): Promise<void> {
    const fund = await this.prisma.donationFund.findFirst({
      where: { id: fundId, mosqueId },
      select: { id: true },
    });

    if (!fund) {
      throw new BadRequestException({
        code: 'FUND_NOT_FOUND',
        message: 'fundId does not match a donation fund of this mosque.',
      });
    }
  }

  /**
   * Guards the two transitions that make a campaign public.
   *
   * `campaign.manage` lets someone draft, edit and correct an appeal. Publishing it — `isPublic: true`, or
   * a status other than `draft` — additionally requires `campaign.publish`, because an appeal with a money
   * target on the public website is a statement the mosque is making, not an internal record.
   *
   * The asymmetry is deliberate: withdrawing is not gated. `isPublic: false` and a return to `draft` need
   * only `campaign.manage`, so anyone who can see a campaign that should not be up can take it down
   * immediately instead of waiting for someone with a second permission.
   *
   * `effectivePermissions` is the same resolver the guards use, so a `campaign.publish` in the actor's
   * `deniedPermissions` is honoured here too. This is not a role comparison — no branch in this file reads
   * `actor.role`.
   */
  private assertMayPublish(
    actor: AuthenticatedUser,
    status: CampaignStatus | undefined,
    isPublic: boolean | undefined,
  ): void {
    const publishing = isPublic === true || (status !== undefined && status !== CampaignStatus.draft);

    if (!publishing) return;
    if (hasPermission(effectivePermissions(actor), 'campaign.publish')) return;

    throw new ForbiddenException({
      code: 'CAMPAIGN_PUBLISH_REFUSED',
      message:
        'Publishing a campaign requires the `campaign.publish` permission. You may still save it as a ' +
        'draft, or leave `isPublic` false.',
    });
  }

  /** The slug to store: what was sent, or one derived from the title. */
  private resolveSlug(slug: string | undefined, title: string): string {
    if (slug) return slug;

    const derived = slugify(title);

    if (!derived) {
      throw new BadRequestException({
        code: 'SLUG_REQUIRED',
        message:
          'A slug could not be derived from this title. Please supply a `slug` — lower-case letters ' +
          'and digits separated by single hyphens.',
      });
    }

    return derived;
  }

  /**
   * `endDate >= startDate`.
   *
   * Unconditional for a campaign, because both ends are required columns. ISO `YYYY-MM-DD` strings compare
   * correctly as strings — same width, most significant field first — so this needs no date parsing and
   * cannot pick up a timezone on the way.
   */
  private assertRange(startDate: string, endDate: string): void {
    if (endDate >= startDate) return;

    throw new BadRequestException({
      code: 'INVALID_DATE_RANGE',
      message: 'endDate must not fall before startDate.',
    });
  }

  /**
   * The `data` for a patch.
   *
   * Typed `UncheckedUpdateInput` rather than `UpdateInput` because `fundId` is a relation scalar, and
   * assigning it directly is the honest way to express "point this campaign at that fund, or at none" —
   * the alternative is a nested `connect`/`disconnect` that says the same thing at more length.
   *
   * Every field is tested for `undefined` rather than truthiness, which is what preserves the three-way
   * meaning: `imageUrl: null` removes the image, and omitting it leaves whatever is there. `targetAmount`,
   * `startDate` and `endDate` cannot arrive as null — the DTO rejects that, since they are required
   * columns — so they need no null branch here.
   */
  private toUpdateData(dto: UpdateCampaignDto): Prisma.CampaignUncheckedUpdateInput {
    const data: Prisma.CampaignUncheckedUpdateInput = {};

    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.fundId !== undefined) data.fundId = dto.fundId;
    if (dto.targetAmount !== undefined) data.targetAmount = toMoney(dto.targetAmount);
    if (dto.startDate !== undefined) data.startDate = toDateOnly(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = toDateOnly(dto.endDate);
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.isPublic !== undefined) data.isPublic = dto.isPublic;

    return data;
  }

  /**
   * Turns a Prisma failure into an HTTP one.
   *
   * Anything unrecognised is returned unchanged so the global filter logs it and answers 500 — a database
   * fault is not the caller's to interpret, and inventing a 4xx for one would hide a bug.
   */
  private translate(error: unknown): unknown {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return error;

    switch (error.code) {
      // The `[mosqueId, slug]` unique index. Scoped to the mosque, so this can only ever mean the
      // caller's own mosque already has a campaign on that slug.
      case 'P2002':
        return new ConflictException({
          code: 'CAMPAIGN_SLUG_TAKEN',
          message: 'This mosque already has a campaign with that slug.',
        });
      // The fund foreign key, if the fund was deleted between `assertFundOwned` and the write.
      case 'P2003':
        return new BadRequestException({
          code: 'FUND_NOT_FOUND',
          message: 'fundId does not match a donation fund of this mosque.',
        });
      case 'P2025':
        return campaignNotFound();
      default:
        return error;
    }
  }
}

function campaignNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'CAMPAIGN_NOT_FOUND',
    message: 'We could not find that campaign.',
  });
}
