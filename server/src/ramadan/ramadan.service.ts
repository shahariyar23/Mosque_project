import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { toDateOnly } from '../common/utils/date-only';
import {
  CreateRamadanDto,
  ListRamadanQueryDto,
  RamadanDto,
  UpdateRamadanDto,
} from './dto/ramadan.dto';

@Injectable()
export class RamadanService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The mosque's Ramadan schedule.
   *
   * Most recent year first, and within a year in calendar order — so an unfiltered read opens on the
   * current Ramadan rather than on one from several years ago, and a filtered read is already in the
   * order a calendar is printed.
   */
  async findAll(mosqueId: string, query: ListRamadanQueryDto = {}): Promise<RamadanDto[]> {
    const rows = await this.prisma.ramadanSchedule.findMany({
      where: { mosqueId, ...(query.year !== undefined && { year: query.year }) },
      orderBy: [{ year: 'desc' }, { date: 'asc' }],
    });

    return rows.map((row) => RamadanDto.from(row));
  }

  async findOne(mosqueId: string, id: string): Promise<RamadanDto> {
    return RamadanDto.from(await this.getOwned(mosqueId, id));
  }

  async create(mosqueId: string, dto: CreateRamadanDto): Promise<RamadanDto> {
    const row = await this.write(() =>
      this.prisma.ramadanSchedule.create({
        data: {
          // From the token. The DTO has no `mosqueId` field.
          mosqueId,
          year: dto.year,
          date: toDateOnly(dto.date),
          fastingStart: dto.fastingStart,
          fastingEnd: dto.fastingEnd,
          suhoorTime: dto.suhoorTime ?? null,
          iftarTime: dto.iftarTime ?? null,
          taraweehTime: dto.taraweehTime ?? null,
          notes: dto.notes ?? null,
        },
      }),
    );

    return RamadanDto.from(row);
  }

  async update(mosqueId: string, id: string, dto: UpdateRamadanDto): Promise<RamadanDto> {
    // Ownership first: a uuid carries no tenancy, so updating on the id alone would reach another
    // mosque's row.
    await this.getOwned(mosqueId, id);

    const row = await this.write(() =>
      this.prisma.ramadanSchedule.update({ where: { id }, data: this.toUpdateData(dto) }),
    );

    return RamadanDto.from(row);
  }

  async remove(mosqueId: string, id: string): Promise<RamadanDto> {
    await this.getOwned(mosqueId, id);

    const row = await this.prisma.ramadanSchedule.delete({ where: { id } });

    return RamadanDto.from(row);
  }

  private async getOwned(mosqueId: string, id: string) {
    const row = await this.prisma.ramadanSchedule.findFirst({ where: { id, mosqueId } });

    if (!row) {
      throw new NotFoundException('Ramadan schedule not found');
    }

    return row;
  }

  private toUpdateData(dto: UpdateRamadanDto): Prisma.RamadanScheduleUpdateInput {
    const data: Prisma.RamadanScheduleUpdateInput = {};

    if (dto.year !== undefined) data.year = dto.year;
    if (dto.date !== undefined) data.date = toDateOnly(dto.date);
    if (dto.fastingStart !== undefined) data.fastingStart = dto.fastingStart;
    if (dto.fastingEnd !== undefined) data.fastingEnd = dto.fastingEnd;
    if (dto.suhoorTime !== undefined) data.suhoorTime = dto.suhoorTime;
    if (dto.iftarTime !== undefined) data.iftarTime = dto.iftarTime;
    if (dto.taraweehTime !== undefined) data.taraweehTime = dto.taraweehTime;
    if (dto.notes !== undefined) data.notes = dto.notes;

    return data;
  }

  /**
   * Turns the table's unique constraint into a 409 with a message about days rather than about indexes.
   *
   * `(mosqueId, year, date)` is unique because entering the 14th of Ramadan twice is a mistake, not a
   * second schedule — a mosque has one set of times per day. The global exception filter already maps
   * P2002 to a 409, so this exists only for the message: "a schedule for this day already exists" tells
   * an admin what to do next, and the default names a constraint they have never heard of.
   */
  private async write<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          'This mosque already has a Ramadan schedule for that day. Update the existing entry instead.',
        );
      }

      throw error;
    }
  }
}
