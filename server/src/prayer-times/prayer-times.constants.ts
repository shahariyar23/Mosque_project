import type { AlAdhanTimings } from './aladhan.types';

/**
 * The fixed vocabulary of the prayer module: which timings exist, and how the mosque's own settings
 * translate into AlAdhan's numeric parameters.
 *
 * These are lookup tables rather than logic on purpose. `MosqueSettings` already stores a calculation
 * method by *name* — `MuslimWorldLeague` — because that is what a person choosing one recognises;
 * AlAdhan wants `3`. The mapping has to live somewhere, and a table that can be read and checked
 * against the upstream documentation is easier to trust than a chain of conditionals.
 */

/** The nine timings this API publishes, in the order a day runs. */
export const PRAYER_KEYS = [
  'imsak',
  'fajr',
  'sunrise',
  'dhuhr',
  'asr',
  'sunset',
  'maghrib',
  'isha',
  'midnight',
] as const;

export type PrayerKey = (typeof PRAYER_KEYS)[number];

/**
 * NOOR key → AlAdhan's own key in the `timings` object.
 *
 * A table rather than a capitalise-the-first-letter helper: `Firstthird` shows what AlAdhan's
 * capitalisation is actually like, and a rule inferred from nine samples would be a rule waiting to
 * be wrong on the tenth.
 */
export const ALADHAN_TIMING_KEYS = {
  imsak: 'Imsak',
  fajr: 'Fajr',
  sunrise: 'Sunrise',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  sunset: 'Sunset',
  maghrib: 'Maghrib',
  isha: 'Isha',
  midnight: 'Midnight',
} as const satisfies Record<PrayerKey, keyof AlAdhanTimings>;

/**
 * The order AlAdhan's `tune` parameter expects, which is *not* the order above.
 *
 * Upstream documents it as `imsak,fajr,sunrise,dhuhr,asr,maghrib,sunset,isha,midnight` — maghrib
 * before sunset, the reverse of the chronological order used everywhere else here. This module never
 * sends `tune` (offsets are applied locally, so the external data stays untouched), but a caller may
 * pass a one-off `tune` string and will have copied its ordering from AlAdhan's documentation. This
 * constant is what keeps that promise.
 */
export const TUNE_ORDER: readonly PrayerKey[] = [
  'imsak',
  'fajr',
  'sunrise',
  'dhuhr',
  'asr',
  'maghrib',
  'sunset',
  'isha',
  'midnight',
];

/** The column on `PrayerSettings` holding each timing's stored adjustment. */
export const OFFSET_COLUMNS = {
  imsak: 'imsakOffset',
  fajr: 'fajrOffset',
  sunrise: 'sunriseOffset',
  dhuhr: 'dhuhrOffset',
  asr: 'asrOffset',
  sunset: 'sunsetOffset',
  maghrib: 'maghribOffset',
  isha: 'ishaOffset',
  midnight: 'midnightOffset',
} as const satisfies Record<PrayerKey, string>;

/**
 * AlAdhan calculation methods, id → display name.
 *
 * Method 6 is absent upstream, so it is absent here; an id with no entry is reported by number
 * alone rather than guessed at.
 */
export const CALCULATION_METHODS: Readonly<Record<number, string>> = {
  0: 'Shia Ithna-Ashari, Leva Institute, Qum',
  1: 'University of Islamic Sciences, Karachi',
  2: 'Islamic Society of North America (ISNA)',
  3: 'Muslim World League',
  4: 'Umm Al-Qura University, Makkah',
  5: 'Egyptian General Authority of Survey',
  7: 'Institute of Geophysics, University of Tehran',
  8: 'Gulf Region',
  9: 'Kuwait',
  10: 'Qatar',
  11: 'Majlis Ugama Islam Singapura, Singapore',
  12: 'Union Organization Islamique de France',
  13: 'Diyanet İşleri Başkanlığı, Turkey',
  14: 'Spiritual Administration of Muslims of Russia',
  15: 'Moonsighting Committee Worldwide',
  16: 'Dubai',
  17: 'Jabatan Kemajuan Islam Malaysia (JAKIM)',
  18: 'Tunisia',
  19: 'Algeria',
  20: 'Kementerian Agama Republik Indonesia',
  21: 'Morocco',
  22: 'Comunidade Islâmica de Lisboa',
  23: 'Ministry of Awqaf, Jordan',
};

/** Lowest and highest ids above, so the query DTO's bounds cannot drift from the table. */
export const METHOD_IDS: number[] = Object.keys(CALCULATION_METHODS).map(Number);
export const MIN_METHOD_ID = Math.min(...METHOD_IDS);
export const MAX_METHOD_ID = Math.max(...METHOD_IDS);

/** What the mosque has stored in `MosqueSettings.calculationMethod` → AlAdhan's id. */
const METHOD_NAME_TO_ID: Readonly<Record<string, number>> = {
  shia: 0,
  shiaithnaashari: 0,
  karachi: 1,
  universityofislamicscienceskarachi: 1,
  isna: 2,
  northamerica: 2,
  islamicsocietyofnorthamerica: 2,
  mwl: 3,
  muslimworldleague: 3,
  ummalqura: 4,
  makkah: 4,
  egyptian: 5,
  egypt: 5,
  tehran: 7,
  gulf: 8,
  gulfregion: 8,
  kuwait: 9,
  qatar: 10,
  singapore: 11,
  france: 12,
  turkey: 13,
  russia: 14,
  moonsightingcommittee: 15,
  moonsighting: 15,
  dubai: 16,
  jakim: 17,
  malaysia: 17,
  tunisia: 18,
  algeria: 19,
  indonesia: 20,
  kemenag: 20,
  morocco: 21,
  lisboa: 22,
  portugal: 22,
  jordan: 23,
};

/** Used when nothing usable is configured. Matches the `MosqueSettings.calculationMethod` default. */
export const DEFAULT_METHOD_ID = 3;

/**
 * Resolves whatever the mosque has stored into an AlAdhan method id.
 *
 * Accepts a name in any casing, with or without separators, and also a bare number as a string —
 * `MosqueSettings.calculationMethod` is a free `VarChar`, so a mosque that has written `"3"` into it
 * meant method 3 and should not be quietly reset to the default. Anything unrecognised falls back
 * rather than throwing: an odd value in a settings row should not stop a prayer schedule loading.
 */
export function resolveMethodId(stored: string | null | undefined): number {
  if (!stored) return DEFAULT_METHOD_ID;

  const trimmed = stored.trim();

  if (/^\d+$/.test(trimmed)) {
    const asNumber = Number(trimmed);
    return asNumber in CALCULATION_METHODS ? asNumber : DEFAULT_METHOD_ID;
  }

  const normalized = trimmed.toLowerCase().replace(/[^a-z]/g, '');
  return METHOD_NAME_TO_ID[normalized] ?? DEFAULT_METHOD_ID;
}

/** Asr school. AlAdhan calls 0 "Shafi" and 1 "Hanafi"; the mosque settings call 0 "Standard". */
export const SCHOOLS: Readonly<Record<number, string>> = {
  0: 'Standard (Shafi, Maliki, Hanbali)',
  1: 'Hanafi',
};

export const DEFAULT_SCHOOL_ID = 0;

/**
 * Resolves `MosqueSettings.asrMethod` into AlAdhan's `school`.
 *
 * Only Hanafi differs, so the test is for that one word and everything else — including an empty or
 * misspelled value — is the standard calculation. Written this way round deliberately: an unreadable
 * setting should land on the majority position, not on the minority one.
 */
export function resolveSchoolId(stored: string | null | undefined): number {
  if (!stored) return DEFAULT_SCHOOL_ID;
  const trimmed = stored.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed) === 1 ? 1 : 0;
  return trimmed.toLowerCase().includes('hanafi') ? 1 : DEFAULT_SCHOOL_ID;
}
