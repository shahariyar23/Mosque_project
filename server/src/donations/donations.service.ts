import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DonationStatus, Prisma, TransactionStatus, TransactionType } from '@prisma/client';

import { type DataScope, effectivePermissions, scopeFor } from '../common/constants/roles';
import { forbidden } from '../common/guards/authorization';
import { MAX_PAGE_SIZE } from '../common/pagination/page';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { CURRENCY_PATTERN, FALLBACK_CURRENCY, normalizeCurrency } from '../common/utils/currency';
import { toInstant } from '../common/utils/instant';
import { toMoney } from '../common/utils/money';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { DonationQueryDto } from './dto/donation-query.dto';
import { DonationListMetaDto, DonationResponseDto } from './dto/donation-response.dto';
import { UpdateDonationDto } from './dto/update-donation.dto';
import {
  DEFAULT_DONATION_PAGE_SIZE,
  DONATION_SELECT,
  type SelectedDonation,
} from './types/donation.types';

/**
 * Everything the donations endpoints do.
 *
 * Much of it reads like the funds and campaigns services on purpose — the mosque comes from the token and
 * never from the body, reads are scoped in the `where` clause rather than checked after the fact, an unowned
 * row answers 404 rather than 403, money moves as `Decimal` and never as a float, and Prisma errors are
 * translated instead of passed through. `DonationFundsService` gives the reasoning for each.
 *
 * Four things are specific to donations.
 *
 * **Whose donations you see is a query, not a permission.** A treasurer with `donation.view` reads the
 * mosque's giving; a member with only `donation.viewOwn` reads their own. Both arrive at the same handler,
 * and `scopeOf` turns the difference into a `userId` in the `where` clause — see `buildWhere`. That is the
 * whole of *"a normal user may only access their own donation history"*, and it is enforced in the query
 * rather than by filtering rows after they have been read.
 *
 * **Three client-supplied ids point at other rows,** and each is checked against the caller's own mosque
 * before it is written: `fundId`, `campaignId` and `userId`. A campaign additionally has to collect into the
 * fund the donation names, because a gift recorded against an appeal that feeds a different fund is money
 * the books cannot place.
 *
 * **Nothing here settles anything.** No fund balance is credited, no campaign total advanced, no payment
 * taken. `status: completed` is somebody recording that the money is in. The figures a report will need are
 * derived from these rows later; there is no running total to keep in step, by design.
 *
 * **There is no delete.** A donation entered in error is corrected with `PATCH`, or withdrawn with
 * `status: cancelled`. A financial record that can vanish is one nobody can audit.
 */
@Injectable()
export class DonationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records a donation for the caller's mosque.
   *
   * The three ownership checks run before the write, so a request naming another mosque's fund, campaign or
   * donor fails without having any effect — and fails as "no such fund", which is the same answer an id
   * that does not exist at all would get.
   */
  async create(actor: AuthenticatedUser, dto: CreateDonationDto): Promise<DonationResponseDto> {
    await this.assertFundOwned(actor.mosqueId, dto.fundId);
    if (dto.campaignId) await this.assertCampaignOwned(actor.mosqueId, dto.campaignId, dto.fundId);
    if (dto.userId) await this.assertDonorOwned(actor.mosqueId, dto.userId);

    const currency = await this.resolveCurrency(actor.mosqueId, dto.currency);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const donation = await tx.donation.create({
          data: {
            mosqueId: actor.mosqueId,
            fundId: dto.fundId,
            campaignId: dto.campaignId ?? null,
            userId: dto.userId ?? null,
            donorName: dto.donorName ?? null,
            donorEmail: dto.donorEmail ?? null,
            amount: toMoney(dto.amount),
            currency,
            paymentMethod: dto.paymentMethod,
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            ...(dto.donatedAt !== undefined ? { donatedAt: toInstant(dto.donatedAt) } : {}),
            reference: dto.reference ?? null,
            notes: dto.notes ?? null,
          },
          select: DONATION_SELECT,
        });

        // If donation is completed on creation, record the income ledger transaction atomically
        if (donation.status === DonationStatus.completed) {
          await tx.transaction.create({
            data: {
              mosqueId: actor.mosqueId,
              type: TransactionType.income,
              status: TransactionStatus.completed,
              amount: donation.amount,
              currency: donation.currency,
              description: donation.notes || `Donation received (${donation.reference || donation.id})`,
              category: 'Donation',
              reference: donation.reference,
              paymentMethod: donation.paymentMethod,
              fundId: donation.fund.id,
              donationId: donation.id,
              transactedAt: donation.donatedAt,
              createdById: actor.id,
            },
          });
        }

        return donation;
      });

      return DonationResponseDto.from(created);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async findMany(
    actor: AuthenticatedUser,
    query: DonationQueryDto,
  ): Promise<{ rows: DonationResponseDto[]; meta: DonationListMetaDto }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(Math.max(1, query.limit ?? DEFAULT_DONATION_PAGE_SIZE), MAX_PAGE_SIZE);
    const where = this.buildWhere(actor, query, this.scopeOf(actor));

    // One transaction so the count and the page describe the same set of rows.
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.donation.count({ where }),
      this.prisma.donation.findMany({
        where,
        select: DONATION_SELECT,
        // `id` breaks ties so a donation cannot appear on two pages, or on none, when several share a
        // creation timestamp — a receipt book entered in one sitting produces exactly that.
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      rows: rows.map((row) => DonationResponseDto.from(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Reads one donation.
   *
   * A caller limited to their own history gets a 404 for somebody else's donation, not a 403 — the same
   * answer another mosque's donation gives. Ownership is part of the question the query asks, so a record
   * they may not see is a record that was not found.
   */
  async findOne(actor: AuthenticatedUser, id: string): Promise<DonationResponseDto> {
    const scope = this.scopeOf(actor);

    return DonationResponseDto.from(
      await this.getOwned(actor.mosqueId, id, scope === 'own' ? actor.id : undefined),
    );
  }

  /**
   * Corrects a donation.
   *
   * Every field keeps its three-way meaning, so `toUpdateData` tests `!== undefined` per field rather than
   * building the object from whatever the DTO happens to hold.
   *
   * The fund and campaign are resolved against the *stored* row before they are checked. A patch that sends
   * only `campaignId` still has to agree with the `fundId` already in the database, which no per-field
   * validator can see — which is why that rule lives here and not in the DTO.
   *
   * No scope check: the route requires `donation.manage`, which nobody holds "for their own donations only".
   * A member cannot edit their own giving record, and should not be able to — the amount on it is the
   * mosque's statement of what it received, not the donor's.
   */
  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateDonationDto,
  ): Promise<DonationResponseDto> {
    const existing = await this.getOwned(actor.mosqueId, id);

    // What the donation will point at *after* the patch: the incoming value when the field was sent,
    // otherwise what is stored. `fundId` is a required column so it cannot end up null; `campaignId` can,
    // and a patch that clears it needs no agreement check at all.
    const movingFund = dto.fundId !== undefined;
    const movingCampaign = dto.campaignId !== undefined;
    const fundId = dto.fundId ?? existing.fund.id;
    const campaignId = movingCampaign ? dto.campaignId : (existing.campaign?.id ?? null);

    if (movingFund) await this.assertFundOwned(actor.mosqueId, fundId);
    // Only when one end of the pair moved. A patch that touches neither leaves an agreement that was
    // already checked when it was written, and re-reading the campaign to confirm it would be a query per
    // patch for an answer that cannot have changed.
    if (campaignId && (movingFund || movingCampaign)) {
      await this.assertCampaignOwned(actor.mosqueId, campaignId, fundId);
    }
    if (dto.userId) await this.assertDonorOwned(actor.mosqueId, dto.userId);

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const donation = await tx.donation.update({
          where: { id },
          data: this.toUpdateData(dto),
          select: DONATION_SELECT,
        });

        // Synchronize corresponding ledger transaction
        if (donation.status === DonationStatus.completed) {
          const existingTx = await tx.transaction.findFirst({
            where: { mosqueId: actor.mosqueId, donationId: donation.id },
            select: { id: true },
          });

          if (existingTx) {
            await tx.transaction.update({
              where: { id: existingTx.id },
              data: {
                status: TransactionStatus.completed,
                amount: donation.amount,
                currency: donation.currency,
                fundId: donation.fund.id,
                paymentMethod: donation.paymentMethod,
                transactedAt: donation.donatedAt,
                reference: donation.reference,
                description: donation.notes || `Donation received (${donation.reference || donation.id})`,
              },
            });
          } else {
            await tx.transaction.create({
              data: {
                mosqueId: actor.mosqueId,
                type: TransactionType.income,
                status: TransactionStatus.completed,
                amount: donation.amount,
                currency: donation.currency,
                description: donation.notes || `Donation received (${donation.reference || donation.id})`,
                category: 'Donation',
                reference: donation.reference,
                paymentMethod: donation.paymentMethod,
                fundId: donation.fund.id,
                donationId: donation.id,
                transactedAt: donation.donatedAt,
                createdById: actor.id,
              },
            });
          }
        } else if (donation.status === DonationStatus.cancelled || donation.status === DonationStatus.failed) {
          const existingTx = await tx.transaction.findFirst({
            where: { mosqueId: actor.mosqueId, donationId: donation.id },
            select: { id: true },
          });

          if (existingTx) {
            await tx.transaction.update({
              where: { id: existingTx.id },
              data: { status: TransactionStatus.cancelled },
            });
          }
        }

        return donation;
      });

      return DonationResponseDto.from(updated);
    } catch (error) {
      throw this.translate(error);
    }
  }

  // ---- internals ------------------------------------------------------------

  /**
   * How much of the mosque's giving this caller may read.
   *
   * The same view/viewOwn resolver the users module uses, over the same registry the guards read — so a
   * `donation.view` sitting in the actor's `deniedPermissions` is honoured here too, and no branch in this
   * file compares a role name.
   *
   * The route decorator already requires one of the two permissions, so `none` should be unreachable. It is
   * still refused rather than quietly treated as `own`: if the decorator and this method ever disagree, the
   * request should fail rather than return whatever the narrower reading happens to allow.
   */
  private scopeOf(actor: AuthenticatedUser): DataScope {
    const scope = scopeFor(effectivePermissions(actor), 'donation.view', 'donation.viewOwn');

    if (scope === 'none') throw forbidden();

    return scope;
  }

  private buildWhere(
    actor: AuthenticatedUser,
    query: DonationQueryDto,
    scope: DataScope,
  ): Prisma.DonationWhereInput {
    const search = query.search?.trim();

    return {
      // First and non-negotiable: the caller's mosque. Everything below narrows within it, which is also
      // why `fundId` and `campaignId` need no ownership check on a read — another mosque's fund simply
      // matches no row in this one.
      mosqueId: actor.mosqueId,
      // The whole of the own-history restriction. Anonymous donations carry no `userId`, so they fall
      // outside it too: nobody's personal history includes the collection box.
      ...(scope === 'own' ? { userId: actor.id } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
      ...(query.fundId ? { fundId: query.fundId } : {}),
      ...(query.campaignId ? { campaignId: query.campaignId } : {}),
      ...(search
        ? {
            OR: [
              { donorName: { contains: search, mode: 'insensitive' } },
              { donorEmail: { contains: search, mode: 'insensitive' } },
              { reference: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  /**
   * Reads one donation inside the caller's mosque, or refuses with 404.
   *
   * `findFirst` on the whole condition rather than `findUnique` on the id: the mosque — and, for a caller
   * reading their own history, the donor — are part of the question, so a record they may not see is not
   * found at all rather than found and then rejected.
   */
  private async getOwned(mosqueId: string, id: string, userId?: string): Promise<SelectedDonation> {
    const donation = await this.prisma.donation.findFirst({
      where: { id, mosqueId, ...(userId !== undefined ? { userId } : {}) },
      select: DONATION_SELECT,
    });

    if (!donation) throw donationNotFound();

    return donation;
  }

  /**
   * The fund exists *and* belongs to the caller's mosque.
   *
   * A 400 naming the field rather than a 403: as far as the caller is concerned there is no such fund, and
   * saying otherwise would confirm that some other mosque holds it.
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
   * The campaign belongs to the caller's mosque *and* collects into the fund this donation names.
   *
   * The second half is the rule that keeps the books placeable: a gift recorded against the roof appeal but
   * credited to the zakat fund is money that appears in one place and is spent from another. A campaign
   * attached to no fund at all fails the same way — it cannot vouch for the fund named beside it.
   */
  private async assertCampaignOwned(
    mosqueId: string,
    campaignId: string,
    fundId: string,
  ): Promise<void> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, mosqueId },
      select: { id: true, fundId: true },
    });

    if (!campaign) {
      throw new BadRequestException({
        code: 'CAMPAIGN_NOT_FOUND',
        message: 'campaignId does not match a campaign of this mosque.',
      });
    }

    if (campaign.fundId !== fundId) {
      throw new BadRequestException({
        code: 'CAMPAIGN_FUND_MISMATCH',
        message:
          'That campaign does not collect into the fund named by `fundId`. Send the campaign’s own fund, ' +
          'or record the donation against the fund alone.',
      });
    }
  }

  /**
   * The donor exists, belongs to the caller's mosque, and has not been removed.
   *
   * `deletedAt: null` because a soft-deleted account is gone as far as every read in this codebase is
   * concerned; attributing new money to one would resurrect it in the giving list.
   */
  private async assertDonorOwned(mosqueId: string, userId: string): Promise<void> {
    const donor = await this.prisma.user.findFirst({
      where: { id: userId, mosqueId, deletedAt: null },
      select: { id: true },
    });

    if (!donor) {
      throw new BadRequestException({
        code: 'DONOR_NOT_FOUND',
        message: 'userId does not match a user of this mosque.',
      });
    }
  }

  /**
   * The currency to store on the row.
   *
   * What the caller sent, otherwise the mosque's configured currency, otherwise `BDT`. It is read once here
   * and then written down, because the row has to keep meaning what it meant: a mosque that switches its
   * default from BDT to USD must not silently restate what a donor gave three years ago.
   *
   * The settings value is re-checked against the pattern rather than trusted. The column is a `VarChar(8)`
   * with no format constraint, so a mosque could be holding `"Taka"` in it — and a donation is not the place
   * to discover that.
   */
  private async resolveCurrency(mosqueId: string, sent: string | undefined): Promise<string> {
    if (sent) return sent;

    const settings = await this.prisma.mosqueSettings.findUnique({
      where: { mosqueId },
      select: { currency: true },
    });

    const configured = normalizeCurrency(settings?.currency);

    return typeof configured === 'string' && CURRENCY_PATTERN.test(configured)
      ? configured
      : FALLBACK_CURRENCY;
  }

  /**
   * The `data` for a patch.
   *
   * Typed `UncheckedUpdateInput` rather than `UpdateInput` because `fundId`, `campaignId` and `userId` are
   * relation scalars, and assigning them directly is the honest way to express "point this donation at that
   * fund, at that appeal, at nobody" — the alternative is a nested `connect`/`disconnect` that says the same
   * thing at more length.
   *
   * Every field is tested for `undefined` rather than truthiness, which is what preserves the three-way
   * meaning: `userId: null` makes the donation anonymous, and omitting it leaves the donor alone. `fundId`,
   * `amount`, `currency`, `paymentMethod`, `status` and `donatedAt` cannot arrive as null — the DTO rejects
   * that, since they are required columns — so they need no null branch here.
   */
  private toUpdateData(dto: UpdateDonationDto): Prisma.DonationUncheckedUpdateInput {
    const data: Prisma.DonationUncheckedUpdateInput = {};

    if (dto.fundId !== undefined) data.fundId = dto.fundId;
    if (dto.campaignId !== undefined) data.campaignId = dto.campaignId;
    if (dto.userId !== undefined) data.userId = dto.userId;
    if (dto.donorName !== undefined) data.donorName = dto.donorName;
    if (dto.donorEmail !== undefined) data.donorEmail = dto.donorEmail;
    if (dto.amount !== undefined) data.amount = toMoney(dto.amount);
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.paymentMethod !== undefined) data.paymentMethod = dto.paymentMethod;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.donatedAt !== undefined) data.donatedAt = toInstant(dto.donatedAt);
    if (dto.reference !== undefined) data.reference = dto.reference;
    if (dto.notes !== undefined) data.notes = dto.notes;

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
      // A fund, campaign or donor that was deleted between the ownership check and the write. The message
      // does not say which: all three were just verified, so this is a race rather than a bad request, and
      // guessing at the cause would be worse than naming the class of problem.
      case 'P2003':
        return new BadRequestException({
          code: 'DONATION_REFERENCE_INVALID',
          message:
            'One of `fundId`, `campaignId` or `userId` no longer refers to a record of this mosque. ' +
            'Please re-check them and try again.',
        });
      case 'P2025':
        return donationNotFound();
      default:
        return error;
    }
  }
}

function donationNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'DONATION_NOT_FOUND',
    message: 'We could not find that donation.',
  });
}
