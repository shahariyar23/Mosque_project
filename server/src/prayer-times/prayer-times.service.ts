import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Mosque, MosqueSettings, PrayerSettings } from '@prisma/client';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { AlAdhanClient, AlAdhanUnavailableError, type AlAdhanRequest } from './aladhan.client';
import type { AlAdhanDay } from './aladhan.types';
import type {
  PrayerSettingsResponseDto,
  PrayerTimeDto,
  PrayerTimesResponseDto,
  PrayerTimingsDto,
} from './dto/prayer-times-response.dto';
import type { UpdatePrayerSettingsDto } from './dto/update-prayer-settings.dto';
import { PrayerTimesCache } from './prayer-times.cache';
import {
  CALCULATION_METHODS,
  OFFSET_COLUMNS,
  PRAYER_KEYS,
  SCHOOLS,
  TUNE_ORDER,
  resolveMethodId,
  resolveSchoolId,
  type PrayerKey,
} from './prayer-times.constants';
import { shiftTime, todayInZone, ISO_DATE_PATTERN } from './prayer-time.utils';

/** A mosque with the two rows that decide how its schedule is calculated. */
type MosqueWithPrayerConfig = Mosque & {
  settings: MosqueSettings | null;
  prayerSettings: PrayerSettings | null;
};

/** Everything resolved down to the values AlAdhan will actually be asked for. */
interface ResolvedConfig {
  latitude: number;
  longitude: number;
  method: number;
  school: number;
  timezone: string;
  offsets: Record<PrayerKey, number>;
}

/** Per-request overrides. Never written; each applies to one lookup only. */
export interface PrayerTimesOverrides {
  date?: string;
  latitude?: number;
  longitude?: number;
  method?: number;
  school?: number;
  timezone?: string;
  tune?: string;
}

/**
 * The columns this service writes.
 *
 * Derived from the create input minus the four the database owns, so a column added to the model shows
 * up here rather than being silently unwritable. Assignable to both halves of the upsert: the update
 * accepts each field on its own, and the create accepts it once `mosqueId` is added.
 */
type PrayerSettingsWriteData = Omit<
  Prisma.PrayerSettingsUncheckedCreateInput,
  'id' | 'mosqueId' | 'createdAt' | 'updatedAt'
>;

@Injectable()
export class PrayerTimesService {
  private readonly logger = new Logger(PrayerTimesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aladhan: AlAdhanClient,
    private readonly cache: PrayerTimesCache,
  ) {}

  /**
   * One day's schedule for a mosque.
   *
   * The order of operations is the design: resolve what this mosque follows, ask AlAdhan for the
   * calculation, then apply the mosque's adjustments to the answer. The third step happens here and
   * never upstream, so the external data is used exactly as received and the mosque's schedule remains
   * a separate, reversible fact stored in Postgres.
   */
  async getPrayerTimes(
    mosqueId: string,
    overrides: PrayerTimesOverrides = {},
  ): Promise<PrayerTimesResponseDto> {
    const mosque = await this.loadMosque(mosqueId);
    const config = resolveConfig(mosque, overrides);

    // The path form of this route (`/prayer-times/:date`) has no DTO to validate it, so the check lives
    // here where both forms pass through. An unchecked date would be reformatted into upstream's
    // `DD-MM-YYYY` regardless of what it said, and the 400 would arrive from a third party as a 503.
    if (overrides.date !== undefined && !ISO_DATE_PATTERN.test(overrides.date)) {
      throw new BadRequestException('date must be a calendar date in YYYY-MM-DD format');
    }

    // No date supplied means today — and today is a question about where the mosque is, not where the
    // server is. A server in UTC answering for Dhaka would roll the schedule over six hours late.
    const date = overrides.date ?? todayInZone(config.timezone);

    const request: AlAdhanRequest = {
      date,
      latitude: config.latitude,
      longitude: config.longitude,
      method: config.method,
      school: config.school,
      timezone: config.timezone,
      // The mosque's saved offsets are deliberately not sent. Only a caller's one-off `tune` is, and
      // only because a caller reaching for that parameter is asking upstream a question directly.
      tune: overrides.tune ?? null,
    };

    const cacheKey = PrayerTimesCache.key(request);
    const cached = this.cache.get(cacheKey);

    let day: AlAdhanDay;
    let source: 'aladhan' | 'cache';

    if (cached) {
      day = cached;
      source = 'cache';
    } else {
      day = await this.fetchDay(request);
      this.cache.set(cacheKey, day);
      source = 'aladhan';
    }

    return buildResponse(day, config, date, source, mosque.prayerSettings, mosque.settings);
  }

  /**
   * The saved overrides, with what each one resolves to alongside it.
   *
   * Absent row is not an error: it means nothing has been overridden, and the effective values are the
   * mosque's own. Nothing is created by reading — a GET that writes a defaults row would make the
   * "has this mosque configured anything" question unanswerable a moment later.
   */
  async getSettings(mosqueId: string): Promise<PrayerSettingsResponseDto> {
    const mosque = await this.loadMosque(mosqueId);
    const saved = mosque.prayerSettings;
    const config = resolveConfig(mosque, {}, { requireCoordinates: false });

    return {
      method: saved?.method ?? null,
      school: saved?.school ?? null,
      latitude: toNumber(saved?.latitude),
      longitude: toNumber(saved?.longitude),
      timezone: saved?.timezone ?? null,
      effectiveMethod: describeMethod(config.method),
      effectiveSchool: describeSchool(config.school),
      effectiveCoordinates: hasCoordinates(config)
        ? { latitude: config.latitude, longitude: config.longitude }
        : null,
      effectiveTimezone: config.timezone,
      offsets: config.offsets,
      fajrTime: saved?.fajrTime ?? null,
      sunriseTime: saved?.sunriseTime ?? null,
      dhuhrTime: saved?.dhuhrTime ?? null,
      asrTime: saved?.asrTime ?? null,
      maghribTime: saved?.maghribTime ?? null,
      ishaTime: saved?.ishaTime ?? null,
      fajrIqamah: saved?.fajrIqamah ?? null,
      dhuhrIqamah: saved?.dhuhrIqamah ?? null,
      asrIqamah: saved?.asrIqamah ?? null,
      maghribIqamah: saved?.maghribIqamah ?? null,
      ishaIqamah: saved?.ishaIqamah ?? null,
      updatedAt: saved?.updatedAt.toISOString() ?? null,
    };
  }

  /**
   * Writes the overrides.
   *
   * An upsert, because the row's existence is an implementation detail of "has anything been changed" —
   * a caller adjusting Fajr should not have to know whether they are the first to do so. The mosque id
   * comes from the caller's token; the DTO has no field for one.
   */
  async updateSettings(
    mosqueId: string,
    dto: UpdatePrayerSettingsDto,
  ): Promise<PrayerSettingsResponseDto> {
    // Confirms the mosque exists before writing a row that would otherwise fail on the foreign key
    // with a 400 that says nothing useful.
    await this.loadMosque(mosqueId);

    const data = toPrismaData(dto);

    await this.prisma.prayerSettings.upsert({
      where: { mosqueId },
      update: data,
      create: { ...data, mosqueId },
    });

    // A method or coordinate change alters what upstream would return, and the cache is keyed on
    // exactly those values — so a stale entry is impossible and there is nothing to invalidate.
    // Offsets are applied after the cache, so those need no invalidation either. This is why the
    // cache holds the calculation rather than the finished response.
    return this.getSettings(mosqueId);
  }

  /**
   * The mosque and the two rows that configure it.
   *
   * `include` rather than three queries: the two settings rows are one-to-one with the mosque and are
   * needed on every path through this service.
   */
  private async loadMosque(mosqueId: string): Promise<MosqueWithPrayerConfig> {
    const mosque = await this.prisma.mosque.findUnique({
      where: { id: mosqueId },
      include: { settings: true, prayerSettings: true },
    });

    if (!mosque) {
      throw new BadRequestException('Mosque not found');
    }

    return mosque;
  }

  /**
   * The external call, with its failures turned into one 503.
   *
   * The log line carries the reason and the parameters; the response carries neither. An outage at a
   * third party is an operational fact for whoever reads the logs, and telling a caller which upstream
   * host timed out tells them about infrastructure they have no business knowing about.
   *
   * 503 rather than 502 because the condition is temporary and the correct advice is to retry. Anything
   * that is not an `AlAdhanUnavailableError` is rethrown untouched, so a genuine bug in this module
   * still reaches the global filter as a 500 instead of being reported as someone else's outage.
   */
  private async fetchDay(request: AlAdhanRequest): Promise<AlAdhanDay> {
    try {
      return await this.aladhan.getTimings(request);
    } catch (error) {
      if (error instanceof AlAdhanUnavailableError) {
        this.logger.error(
          `Prayer time lookup failed [${error.reason}] for ${request.date} at ` +
            `${request.latitude},${request.longitude} (method ${request.method}, school ${request.school}): ` +
            error.message,
        );

        throw new ServiceUnavailableException(
          'Prayer times are temporarily unavailable. Please try again shortly.',
        );
      }

      throw error;
    }
  }
}

/**
 * Resolves the mosque's three sources of configuration into one set of values.
 *
 * The precedence — request override, then `PrayerSettings`, then the mosque's own record — is what lets
 * `PrayerSettings` store only departures. A null column there is not missing data; it is the mosque
 * saying "the usual", and this function is the single place that knows what the usual is.
 *
 * `requireCoordinates` is off when reading settings back, since a settings screen has to be able to
 * report that coordinates are missing rather than refuse to load because they are.
 */
function resolveConfig(
  mosque: MosqueWithPrayerConfig,
  overrides: PrayerTimesOverrides,
  options: { requireCoordinates?: boolean } = {},
): ResolvedConfig {
  const saved = mosque.prayerSettings;

  const latitude =
    overrides.latitude ?? toNumber(saved?.latitude) ?? toNumber(mosque.latitude) ?? Number.NaN;
  const longitude =
    overrides.longitude ?? toNumber(saved?.longitude) ?? toNumber(mosque.longitude) ?? Number.NaN;

  if (options.requireCoordinates !== false && (Number.isNaN(latitude) || Number.isNaN(longitude))) {
    // A 400 rather than a 500: nothing is broken, the mosque profile is simply incomplete, and the
    // message says which of the two places to go and fix it.
    throw new BadRequestException(
      'Prayer times need coordinates. Set the mosque’s latitude and longitude in its profile, ' +
        'or pass latitude and longitude with the request.',
    );
  }

  const method =
    overrides.method ?? saved?.method ?? resolveMethodId(mosque.settings?.calculationMethod);
  const school = overrides.school ?? saved?.school ?? resolveSchoolId(mosque.settings?.asrMethod);
  const timezone = overrides.timezone ?? saved?.timezone ?? mosque.timezone;

  const offsets = {} as Record<PrayerKey, number>;
  for (const key of PRAYER_KEYS) {
    offsets[key] = saved?.[OFFSET_COLUMNS[key]] ?? 0;
  }

  // A one-off `tune` adds to the saved offsets rather than replacing them: the mosque's own schedule is
  // the baseline, and a caller asking "what if Fajr moved another two minutes" means two minutes from
  // what the mosque publishes, not from the raw calculation.
  if (overrides.tune) {
    const values = overrides.tune.split(',').map(Number);
    TUNE_ORDER.forEach((key, index) => {
      const value = values[index];
      if (Number.isFinite(value)) offsets[key] += value;
    });
  }

  return { latitude, longitude, method, school, timezone, offsets };
}

function hasCoordinates(config: ResolvedConfig): boolean {
  return !Number.isNaN(config.latitude) && !Number.isNaN(config.longitude);
}

/** Assembles the response, prioritizing manual overrides over astronomical calculations. */
function buildResponse(
  day: AlAdhanDay,
  config: ResolvedConfig,
  date: string,
  source: 'aladhan' | 'cache',
  savedSettings?: PrayerSettings | null,
  mosqueSettings?: MosqueSettings | null,
): PrayerTimesResponseDto {
  const timings = {} as PrayerTimingsDto;
  const manualOverrides: Partial<Record<PrayerKey, string>> = {};
  const iqamahTimings: Partial<Record<PrayerKey, string>> = {};
  let adjusted = false;

  const iqamahOffsetMins = mosqueSettings?.iqamahOffset ?? 10;

  for (const key of PRAYER_KEYS) {
    const calculated = day.timings[key];
    const adjustment = config.offsets[key];
    if (adjustment !== 0) adjusted = true;

    // Check if there is an explicit manual fixed override for this prayer:
    const manualField = `${key}Time` as keyof PrayerSettings;
    const manualFixed = savedSettings ? (savedSettings[manualField] as string | null) : null;
    if (manualFixed) {
      manualOverrides[key] = manualFixed;
      adjusted = true;
    }

    // Manual override TAKES PRIORITY over the calculated time:
    const finalTime = manualFixed || shiftTime(calculated, adjustment);

    timings[key] = {
      calculated,
      adjustment: manualFixed ? 0 : adjustment,
      time: finalTime,
    } satisfies PrayerTimeDto;

    // Iqamah resolution for congregation prayers:
    if (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].includes(key)) {
      const iqamahField = `${key}Iqamah` as keyof PrayerSettings;
      const manualIqamah = savedSettings ? (savedSettings[iqamahField] as string | null) : null;
      if (manualIqamah) {
        iqamahTimings[key] = manualIqamah;
      } else {
        const offset = key === 'maghrib' ? 3 : iqamahOffsetMins;
        iqamahTimings[key] = shiftTime(finalTime, offset);
      }
    }
  }

  return {
    date: day.gregorianDate ?? date,
    hijri: day.hijri,
    timezone: day.timezone ?? config.timezone,
    coordinates: { latitude: config.latitude, longitude: config.longitude },
    method: describeMethod(config.method),
    school: describeSchool(config.school),
    timings,
    source,
    adjusted,
    manualOverrides,
    iqamahTimings,
  };
}

function describeMethod(id: number): { id: number; name: string } {
  return { id, name: CALCULATION_METHODS[id] ?? `Method ${id}` };
}

function describeSchool(id: number): { id: number; name: string } {
  return { id, name: SCHOOLS[id] ?? `School ${id}` };
}

/**
 * DTO → the columns to write.
 *
 * `!== undefined` rather than `in`, because the two differ on a field that class-transformer may have
 * materialised as `undefined`, and there "omitted" is the right reading. An explicit `null` survives as
 * a null, which is the whole point of the DTO's three-way shape: absent leaves the column alone,
 * `null` clears it, a value sets it.
 */
function toPrismaData(dto: UpdatePrayerSettingsDto): PrayerSettingsWriteData {
  const data: PrayerSettingsWriteData = {};

  if (dto.method !== undefined) data.method = dto.method;
  if (dto.school !== undefined) data.school = dto.school;
  if (dto.timezone !== undefined) data.timezone = dto.timezone;

  if (dto.latitude !== undefined) data.latitude = dto.latitude;
  if (dto.longitude !== undefined) data.longitude = dto.longitude;

  for (const key of PRAYER_KEYS) {
    const column = OFFSET_COLUMNS[key];
    const value = dto[column];
    if (value !== undefined) data[column] = value;
  }

  // Manual fixed prayer times
  if (dto.fajrTime !== undefined) data.fajrTime = dto.fajrTime;
  if (dto.sunriseTime !== undefined) data.sunriseTime = dto.sunriseTime;
  if (dto.dhuhrTime !== undefined) data.dhuhrTime = dto.dhuhrTime;
  if (dto.asrTime !== undefined) data.asrTime = dto.asrTime;
  if (dto.maghribTime !== undefined) data.maghribTime = dto.maghribTime;
  if (dto.ishaTime !== undefined) data.ishaTime = dto.ishaTime;

  // Manual fixed iqamah times
  if (dto.fajrIqamah !== undefined) data.fajrIqamah = dto.fajrIqamah;
  if (dto.dhuhrIqamah !== undefined) data.dhuhrIqamah = dto.dhuhrIqamah;
  if (dto.asrIqamah !== undefined) data.asrIqamah = dto.asrIqamah;
  if (dto.maghribIqamah !== undefined) data.maghribIqamah = dto.maghribIqamah;
  if (dto.ishaIqamah !== undefined) data.ishaIqamah = dto.ishaIqamah;

  return data;
}

/** Prisma `Decimal` → number. Null and undefined both mean "not set". */
function toNumber(value: Prisma.Decimal | null | undefined): number | null {
  return value === null || value === undefined ? null : value.toNumber();
}
