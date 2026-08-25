import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { dayOfWeekUtc, toDateOnly } from '../common/utils/date-only';
import { CreateJumuahDto, JumuahDto, ListJumuahQueryDto, UpdateJumuahDto } from './dto/jumuah.dto';

/** Friday, as `Date.getUTCDay()` counts. */
const FRIDAY = 5;

@Injectable()
export class JumuahService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The mosque's Jumu'ah schedule.
   *
   * Ordered so the list reads the way it is used: the standing weekly schedule first, then dated Fridays
   * in calendar order, and within one Friday by jamaat time. That last key is what makes a mosque with
   * two jamaats read correctly — and it works as a plain string sort because `HH:mm` is zero-padded, so
   * `09:30` precedes `13:45` lexicographically as well as chronologically.
   */
  async findAll(mosqueId: string, query: ListJumuahQueryDto = {}): Promise<JumuahDto[]> {
    const where: Prisma.JumuahScheduleWhereInput = { mosqueId };
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const rows = await this.prisma.jumuahSchedule.findMany({
      where,
      orderBy: [{ date: { sort: 'asc', nulls: 'first' } }, { prayerTime: 'asc' }],
    });

    return rows.map((row) => JumuahDto.from(row));
  }

  /**
   * One entry, scoped to the mosque.
   *
   * `findFirst` with both the id and the mosque rather than `findUnique` on the id alone. The difference
   * is the whole tenancy guarantee: a uuid from another mosque's schedule matches no row here and comes
   * back as a 404, which is also the right answer to give — a 403 would confirm the record exists.
   */
  async findOne(mosqueId: string, id: string): Promise<JumuahDto> {
    return JumuahDto.from(await this.getOwned(mosqueId, id));
  }

  async create(mosqueId: string, dto: CreateJumuahDto): Promise<JumuahDto> {
    const row = await this.prisma.jumuahSchedule.create({
      data: {
        // From the token, not the body. The DTO has no `mosqueId`, so there is nothing a client could
        // send that would reach this line.
        mosqueId,
        // Absent and explicit null mean the same thing on create: the standing weekly schedule.
        date: dto.date ? toDateOnly(this.assertFriday(dto.date)) : null,
        khutbahTime: dto.khutbahTime,
        prayerTime: dto.prayerTime,
        imam: dto.imam ?? null,
        location: dto.location ?? null,
        notes: dto.notes ?? null,
        isActive: dto.isActive ?? true,
      },
    });

    return JumuahDto.from(row);
  }

  async update(mosqueId: string, id: string, dto: UpdateJumuahDto): Promise<JumuahDto> {
    // Establishes ownership before the write. `update` on the id alone would happily edit another
    // mosque's row, since a uuid carries no tenancy of its own.
    await this.getOwned(mosqueId, id);

    const row = await this.prisma.jumuahSchedule.update({
      where: { id },
      data: this.toUpdateData(dto),
    });

    return JumuahDto.from(row);
  }

  async remove(mosqueId: string, id: string): Promise<JumuahDto> {
    await this.getOwned(mosqueId, id);

    const row = await this.prisma.jumuahSchedule.delete({ where: { id } });

    // Returned rather than answered with a 204: a client that has just deleted a row can show what it
    // removed, and an audit trail has something to record.
    return JumuahDto.from(row);
  }

  private async getOwned(mosqueId: string, id: string) {
    const row = await this.prisma.jumuahSchedule.findFirst({ where: { id, mosqueId } });

    if (!row) {
      throw new NotFoundException('Jumu’ah schedule not found');
    }

    return row;
  }

  /**
   * Patch DTO → columns.
   *
   * `!== undefined` on each field is what makes this a patch rather than a replace, and it is also what
   * preserves the three-way meaning of `date`: absent leaves the column alone, `null` turns the entry
   * into the standing weekly schedule, a date pins it to one Friday.
   */
  private toUpdateData(dto: UpdateJumuahDto): Prisma.JumuahScheduleUpdateInput {
    const data: Prisma.JumuahScheduleUpdateInput = {};

    if (dto.date !== undefined) {
      data.date = dto.date === null ? null : toDateOnly(this.assertFriday(dto.date));
    }
    if (dto.khutbahTime !== undefined) data.khutbahTime = dto.khutbahTime;
    if (dto.prayerTime !== undefined) data.prayerTime = dto.prayerTime;
    if (dto.imam !== undefined) data.imam = dto.imam;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return data;
  }

  /**
   * Jumu'ah is the Friday prayer, so a date that is not a Friday is a mistake in the entry rather than
   * an unusual arrangement. Rejecting it catches the common failure — an admin typing next quarter's
   * dates by hand and slipping a day — at the point where it can still be corrected, instead of
   * publishing a khutbah time on a Thursday.
   */
  private assertFriday(isoDate: string): string {
    if (dayOfWeekUtc(isoDate) !== FRIDAY) {
      throw new BadRequestException(
        `${isoDate} is not a Friday. Jumu’ah entries must fall on a Friday; ` +
          'omit the date for the standing weekly schedule.',
      );
    }

    return isoDate;
  }
}
