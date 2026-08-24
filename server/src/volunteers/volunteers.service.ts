import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { MAX_PAGE_SIZE } from '../common/pagination/page';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVolunteerDto } from './dto/create-volunteer.dto';
import { UpdateVolunteerStatusDto } from './dto/update-volunteer-status.dto';
import { UpdateVolunteerDto } from './dto/update-volunteer.dto';
import { VolunteerQueryDto } from './dto/volunteer-query.dto';
import {
  DeletedVolunteerDto,
  VolunteerListMetaDto,
  VolunteerResponseDto,
} from './dto/volunteer-response.dto';
import {
  DEFAULT_VOLUNTEER_PAGE_SIZE,
  VOLUNTEER_SELECT,
  type SelectedVolunteer,
} from './types/volunteer.types';

/**
 * Everything the volunteers endpoints do.
 *
 * Four rules run through the file.
 *
 * A volunteer is a user, not a copy of one. Every method reads the person through the relation with
 * `VOLUNTEER_SELECT`, which nests `USER_SELECT` — so a name or a phone number appears in a response
 * because it was read from the directory just now, and no method here is in a position to leak a
 * credential, because the projection it uses never reads one.
 *
 * Nothing here touches `User`. Not the role, not the permissions, not the account status. Enrolling
 * someone, changing their roster status and removing them all write the `volunteers` table and only that
 * table — which is the point of the module: a volunteer is something a person *does*, so it cannot be a
 * back door into what they may *do in the system*.
 *
 * One person, one roster entry. `Volunteer.userId` is unique in the database, so the pre-check below is
 * a courtesy that produces a clear message and the constraint is what actually guarantees it — two
 * concurrent enrolments would both pass a check and only one can pass the index.
 *
 * Prisma errors are translated, never passed through. Prisma's own messages name tables, columns and
 * constraints, which is internal shape a client should not learn.
 */
@Injectable()
export class VolunteersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enrols an existing user.
   *
   * No account is created here, and that is deliberate: an unknown `userId` is a 400 rather than a new
   * user, because a roster is a list of people the mosque already knows. A soft-deleted account counts as
   * unknown — every read in the system treats it as gone, so enrolling one would produce a volunteer who
   * cannot be listed.
   */
  async create(dto: CreateVolunteerDto): Promise<VolunteerResponseDto> {
    await this.assertUserExists(dto.userId);
    await this.assertNotEnrolled(dto.userId);

    try {
      const created = await this.prisma.volunteer.create({
        // Written field by field rather than spread from the DTO: a field added to the DTO later cannot
        // reach the database until someone names it here.
        data: {
          userId: dto.userId,
          status: dto.status,
          skills: dto.skills,
          availability: dto.availability,
          notes: dto.notes,
          joinedAt: dto.joinedAt === undefined ? undefined : new Date(dto.joinedAt),
        },
        select: VOLUNTEER_SELECT,
      });

      return VolunteerResponseDto.from(created);
    } catch (error) {
      // The pre-checks give a specific message; this catches the race between them and the insert,
      // where two enrolments for the same person arrive at once.
      throw this.translate(error);
    }
  }

  async findMany(
    query: VolunteerQueryDto,
  ): Promise<{ rows: VolunteerResponseDto[]; meta: VolunteerListMetaDto }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(Math.max(1, query.limit ?? DEFAULT_VOLUNTEER_PAGE_SIZE), MAX_PAGE_SIZE);
    const where = this.buildWhere(query);

    // One transaction so the count and the page describe the same set of rows. Counting separately
    // means a concurrent insert can produce a total that does not match the rows returned.
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.volunteer.count({ where }),
      this.prisma.volunteer.findMany({
        where,
        select: VOLUNTEER_SELECT,
        // `id` breaks ties so a row cannot appear on two pages, or on none, when several volunteers
        // share a creation timestamp — which seeding and bulk import both produce.
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      rows: rows.map((row) => VolunteerResponseDto.from(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<VolunteerResponseDto> {
    return VolunteerResponseDto.from(await this.load(id));
  }

  /**
   * Updates the roster entry: what they can help with, when, the coordinator's notes, and the status.
   *
   * There is no ownership rule here, unlike `UsersService.update`. That method admits two kinds of caller
   * because a person edits their own profile through it; this one is a coordinator's tool, gated on a
   * single permission, and a volunteer editing their own roster entry is not a case the module has.
   *
   * `userId` cannot be changed, and there is no check for it below: `UpdateVolunteerDto` does not declare
   * the field, and the global pipe runs with `forbidNonWhitelisted`, so a request carrying it is a 400
   * before this method is entered. That is a stronger guarantee than a branch, which could be forgotten.
   */
  async update(id: string, dto: UpdateVolunteerDto): Promise<VolunteerResponseDto> {
    await this.load(id);

    try {
      const updated = await this.prisma.volunteer.update({
        where: { id },
        data: {
          status: dto.status,
          skills: dto.skills,
          availability: dto.availability,
          notes: dto.notes,
        },
        select: VOLUNTEER_SELECT,
      });

      return VolunteerResponseDto.from(updated);
    } catch (error) {
      throw this.translate(error);
    }
  }

  /**
   * Sets the roster status.
   *
   * The one thing worth saying about this method is what it does not do. `data` names one column, on one
   * table, and `User` is not it: nobody's role changes because they stepped off the roster, and nobody
   * gains a permission because they stepped back on. The treasurer who volunteers at iftar is
   * `role = treasurer` either way.
   */
  async setStatus(id: string, dto: UpdateVolunteerStatusDto): Promise<VolunteerResponseDto> {
    await this.load(id);

    const updated = await this.prisma.volunteer.update({
      where: { id },
      data: { status: dto.status },
      select: VOLUNTEER_SELECT,
    });

    return VolunteerResponseDto.from(updated);
  }

  /**
   * Removes a roster entry.
   *
   * A real delete, and the one place this module differs from the users module on purpose. A user is
   * soft-deleted because their name is on donations and audit rows that have to keep resolving. A
   * volunteer row is referenced by nothing — it holds four fields about how someone helps out — and the
   * person it describes is not being deleted at all: their account, their membership and their history
   * are untouched, and they can be enrolled again tomorrow.
   *
   * `PATCH /:id/status` is the reversible alternative for someone who may return, which is why
   * `on_leave` exists.
   */
  async remove(id: string): Promise<DeletedVolunteerDto> {
    const volunteer = await this.load(id);

    await this.prisma.volunteer.delete({ where: { id } });

    return { id: volunteer.id, userId: volunteer.userId };
  }

  // ---- internals ------------------------------------------------------------

  private buildWhere(query: VolunteerQueryDto): Prisma.VolunteerWhereInput {
    const search = query.search?.trim();

    return {
      ...(query.status ? { status: query.status } : {}),
      // The relation filter carries both rules about the person: a volunteer whose account has been
      // soft-deleted is not listed, and the search matches the columns a coordinator actually types.
      user: {
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                // Phone is stored in E.164 with no punctuation, so a substring match is what makes
                // "0170" find "+8801700000002".
                { phone: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
    };
  }

  /**
   * Reads a volunteer with its person, and refuses if either is gone.
   *
   * The `user: { deletedAt: null }` clause means a roster entry belonging to a deleted account answers
   * 404 rather than returning a row with a person nobody can see. Every read and every write path goes
   * through here, so that rule is stated once.
   */
  private async load(id: string): Promise<SelectedVolunteer> {
    const volunteer = await this.prisma.volunteer.findFirst({
      where: { id, user: { deletedAt: null } },
      select: VOLUNTEER_SELECT,
    });

    if (!volunteer) throw notFound();

    return volunteer;
  }

  private async assertUserExists(userId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException({
        code: 'USER_NOT_FOUND',
        message: 'The user this volunteer would belong to does not exist.',
      });
    }
  }

  private async assertNotEnrolled(userId: string): Promise<void> {
    const existing = await this.prisma.volunteer.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException({
        code: 'VOLUNTEER_EXISTS',
        message: 'This user is already a volunteer.',
      });
    }
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
      // The unique index on `userId`: this user is on the roster already.
      case 'P2002':
        return new ConflictException({
          code: 'VOLUNTEER_EXISTS',
          message: 'This user is already a volunteer.',
        });
      // The foreign key to `users`: the account was removed between the check and the write.
      case 'P2003':
        return new BadRequestException({
          code: 'USER_NOT_FOUND',
          message: 'The user this volunteer would belong to does not exist.',
        });
      case 'P2025':
        return notFound();
      default:
        return error;
    }
  }
}

function notFound(): NotFoundException {
  return new NotFoundException({
    code: 'VOLUNTEER_NOT_FOUND',
    message: 'We could not find that volunteer.',
  });
}
