import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { MAX_PAGE_SIZE } from '../common/pagination/page';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { fromDateOnly, toDateOnly } from '../common/utils/date-only';
import { toMoney } from '../common/utils/money';
import { slugify } from '../common/utils/slug';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDonationFundDto } from './dto/create-donation-fund.dto';
import { DonationFundQueryDto } from './dto/donation-fund-query.dto';
import {
  DeletedDonationFundDto,
  DonationFundListMetaDto,
  DonationFundResponseDto,
} from './dto/donation-fund-response.dto';
import { UpdateDonationFundDto } from './dto/update-donation-fund.dto';
import {
  DEFAULT_FUND_PAGE_SIZE,
  DONATION_FUND_SELECT,
  type SelectedDonationFund,
} from './types/donation-fund.types';

/**
 * Everything the donation-funds endpoints do.
 *
 * Five rules run through the file.
 *
 * **The mosque comes from the token.** Every method takes the authenticated user as its first argument
 * and reads `actor.mosqueId` itself; no method accepts a mosque id, so passing the wrong one is not
 * expressible. This differs from the Jumu'ah and Ramadan services, which take `(mosqueId, ...)` — those
 * modules have no other use for the actor, whereas the campaigns service beside this one has to consult
 * the caller's permissions, and the two reading alike is worth more than either matching the older
 * shape. It follows the precedent `UsersService.update` already set.
 *
 * **Reads are scoped, not checked.** `mosqueId` is part of the `where` clause of every query rather than
 * something compared after the row comes back, so a fund belonging to another mosque is not found at all.
 * `getOwned` answers 404 in that case, never 403: a 403 would confirm the record exists, which is the one
 * fact a caller from another mosque should not be able to establish.
 *
 * **Money never becomes a float.** Amounts arrive as validated decimal strings, are stored through
 * `Prisma.Decimal`, and leave as exact strings. Nothing here adds, totals or compares two amounts.
 *
 * **No accounting.** This module defines the categories donations will later be filed under. It does not
 * read a donation, compute a balance or report a total — `_count.campaigns` counts rows in a category
 * table, and exists so a delete can tell whether the fund is still in use.
 *
 * **Prisma errors are translated, never passed through.** Prisma's messages name tables, columns and
 * constraints, which is internal shape a client should not learn.
 */
@Injectable()
export class DonationFundsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a fund for the caller's mosque.
   *
   * An omitted `slug` is derived from the name. That derivation can legitimately produce nothing — a name
   * written entirely in Bengali or Arabic has no Latin spelling to guess at — and when it does, this asks
   * for a slug rather than inventing one, because a slug is a permanent public URL and a machine
   * transliteration is a worse guess than the mosque's own.
   */
  async create(actor: AuthenticatedUser, dto: CreateDonationFundDto): Promise<DonationFundResponseDto> {
    const slug = this.resolveSlug(dto.slug, dto.name);
    this.assertRange(dto.startDate ?? null, dto.endDate ?? null);

    try {
      const created = await this.prisma.donationFund.create({
        // Written field by field rather than spread from the DTO, and `mosqueId` comes from the token:
        // a field added to the DTO later cannot reach the database until someone names it here, and no
        // request body can redirect the row to another mosque.
        data: {
          mosqueId: actor.mosqueId,
          name: dto.name.trim(),
          slug,
          description: dto.description ?? null,
          status: dto.status,
          targetAmount: dto.targetAmount ? toMoney(dto.targetAmount) : null,
          startDate: dto.startDate ? toDateOnly(dto.startDate) : null,
          endDate: dto.endDate ? toDateOnly(dto.endDate) : null,
          isPublic: dto.isPublic,
        },
        select: DONATION_FUND_SELECT,
      });

      return DonationFundResponseDto.from(created);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async findMany(
    actor: AuthenticatedUser,
    query: DonationFundQueryDto,
  ): Promise<{ rows: DonationFundResponseDto[]; meta: DonationFundListMetaDto }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(Math.max(1, query.limit ?? DEFAULT_FUND_PAGE_SIZE), MAX_PAGE_SIZE);
    const where = this.buildWhere(actor.mosqueId, query);

    // One transaction so the count and the page describe the same set of rows. Counting separately
    // means a concurrent insert can produce a total that does not match the rows returned.
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.donationFund.count({ where }),
      this.prisma.donationFund.findMany({
        where,
        select: DONATION_FUND_SELECT,
        // `id` breaks ties so a fund cannot appear on two pages, or on none, when several share a
        // creation timestamp — which seeding and bulk import both produce.
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      rows: rows.map((row) => DonationFundResponseDto.from(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(actor: AuthenticatedUser, id: string): Promise<DonationFundResponseDto> {
    return DonationFundResponseDto.from(await this.getOwned(actor.mosqueId, id));
  }

  /**
   * Updates a fund.
   *
   * Each field keeps its three-way meaning — absent leaves the column, `null` clears it, a value sets it
   * — which is why `toUpdateData` tests `!== undefined` per field instead of building the object from
   * whatever the DTO happens to hold.
   *
   * The date window is checked against the *stored* row, not just the request. A patch that sends only
   * `endDate` has to be compared with the `startDate` already in the database, which no per-field
   * validator can see; that is why this rule lives here rather than in the DTO.
   */
  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateDonationFundDto,
  ): Promise<DonationFundResponseDto> {
    const existing = await this.getOwned(actor.mosqueId, id);

    // Resolve each end of the window to what it will be *after* the patch: the incoming value when the
    // field was sent, otherwise what is stored.
    const start =
      dto.startDate !== undefined
        ? dto.startDate
        : existing.startDate
          ? fromDateOnly(existing.startDate)
          : null;
    const end =
      dto.endDate !== undefined
        ? dto.endDate
        : existing.endDate
          ? fromDateOnly(existing.endDate)
          : null;
    this.assertRange(start, end);

    try {
      const updated = await this.prisma.donationFund.update({
        // `id` alone is safe here only because `getOwned` above has already established that this id
        // belongs to the caller's mosque.
        where: { id },
        data: this.toUpdateData(dto),
        select: DONATION_FUND_SELECT,
      });

      return DonationFundResponseDto.from(updated);
    } catch (error) {
      throw this.translate(error);
    }
  }

  /**
   * Deletes a fund, but only while nothing points at it.
   *
   * A fund is what donations get filed under, so removing one that has been used would leave records
   * filed under nothing. Two things prevent that. This method refuses with a 409 while the fund still has
   * campaigns, naming the reversible alternative; and the foreign key is `ON DELETE RESTRICT`, so the
   * database refuses too if a campaign is created between the check and the delete.
   *
   * `PATCH { "status": "archived" }` is that alternative, and it is the normal way to retire a fund that
   * has history: nothing is lost, the fund stops being offered, and the decision can be undone. Part 20
   * will add donations, which reference a fund directly — that check belongs with them, and the
   * `RESTRICT` constraint on their foreign key will be what actually holds the line.
   */
  async remove(actor: AuthenticatedUser, id: string): Promise<DeletedDonationFundDto> {
    const fund = await this.getOwned(actor.mosqueId, id);

    if (fund._count.campaigns > 0) {
      throw new ConflictException({
        code: 'FUND_IN_USE',
        message:
          `This fund has ${fund._count.campaigns} campaign(s) and cannot be deleted. ` +
          'Set its status to `archived` instead — that retires the fund without losing anything.',
      });
    }

    try {
      await this.prisma.donationFund.delete({ where: { id } });
    } catch (error) {
      throw this.translate(error);
    }

    return { id: fund.id, name: fund.name, slug: fund.slug };
  }

  // ---- internals ------------------------------------------------------------

  private buildWhere(mosqueId: string, query: DonationFundQueryDto): Prisma.DonationFundWhereInput {
    const search = query.search?.trim();

    return {
      // First and non-negotiable: the caller's mosque. Everything below narrows within it.
      mosqueId,
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  /**
   * Reads one fund inside the caller's mosque, or refuses.
   *
   * `findFirst` with both columns rather than `findUnique` on the id: the mosque is part of the question,
   * so a fund belonging to somebody else is simply not found. The 404 is deliberate — see the class
   * comment on why this is not a 403.
   */
  private async getOwned(mosqueId: string, id: string): Promise<SelectedDonationFund> {
    const fund = await this.prisma.donationFund.findFirst({
      where: { id, mosqueId },
      select: DONATION_FUND_SELECT,
    });

    if (!fund) throw fundNotFound();

    return fund;
  }

  /** The slug to store: what was sent, or one derived from the name. */
  private resolveSlug(slug: string | undefined, name: string): string {
    if (slug) return slug;

    const derived = slugify(name);

    if (!derived) {
      throw new BadRequestException({
        code: 'SLUG_REQUIRED',
        message:
          'A slug could not be derived from this name. Please supply a `slug` — lower-case letters ' +
          'and digits separated by single hyphens.',
      });
    }

    return derived;
  }

  /**
   * `endDate >= startDate`, when both ends exist.
   *
   * ISO `YYYY-MM-DD` strings compare correctly as strings — same width, most significant field first —
   * so this needs no date parsing and cannot pick up a timezone on the way.
   *
   * A fund with one end and not the other is fine: "opens on the 1st, no closing date" and "closes at
   * Ramadan's end, always been collecting" are both real.
   */
  private assertRange(startDate: string | null, endDate: string | null): void {
    if (!startDate || !endDate) return;
    if (endDate >= startDate) return;

    throw new BadRequestException({
      code: 'INVALID_DATE_RANGE',
      message: 'endDate must not fall before startDate.',
    });
  }

  /**
   * The `data` for a patch.
   *
   * Every field is tested for `undefined` rather than truthiness, which is what preserves the three-way
   * meaning: `description: null` clears the description, and omitting it leaves whatever is there.
   * Leaving a key out of the object entirely is how Prisma is told "do not touch this column".
   */
  private toUpdateData(dto: UpdateDonationFundDto): Prisma.DonationFundUpdateInput {
    const data: Prisma.DonationFundUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.targetAmount !== undefined) {
      data.targetAmount = dto.targetAmount === null ? null : toMoney(dto.targetAmount);
    }
    if (dto.startDate !== undefined) {
      data.startDate = dto.startDate === null ? null : toDateOnly(dto.startDate);
    }
    if (dto.endDate !== undefined) {
      data.endDate = dto.endDate === null ? null : toDateOnly(dto.endDate);
    }
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
      // The `[mosqueId, slug]` unique index. Scoped to the mosque, so this only ever means the caller's
      // own mosque already has a fund on that slug — never that another mosque does.
      case 'P2002':
        return new ConflictException({
          code: 'FUND_SLUG_TAKEN',
          message: 'This mosque already has a fund with that slug.',
        });
      // `ON DELETE RESTRICT` from campaigns, if one was created between the pre-check and the delete.
      case 'P2003':
        return new ConflictException({
          code: 'FUND_IN_USE',
          message:
            'This fund is referenced by other records and cannot be deleted. Set its status to ' +
            '`archived` instead.',
        });
      case 'P2025':
        return fundNotFound();
      default:
        return error;
    }
  }
}

function fundNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'FUND_NOT_FOUND',
    message: 'We could not find that donation fund.',
  });
}
