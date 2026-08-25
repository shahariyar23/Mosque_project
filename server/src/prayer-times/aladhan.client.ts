import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { env, type AppConfig } from '../config/app.config';
import type { AlAdhanDay, AlAdhanTimingsResponse, RawTimings } from './aladhan.types';
import { ALADHAN_TIMING_KEYS, PRAYER_KEYS } from './prayer-times.constants';
import { parseAlAdhanTime, toAlAdhanDate } from './prayer-time.utils';

/**
 * Everything this module needs from AlAdhan, and the only place a request leaves the process.
 *
 * Thrown by every failure path, so the service has one thing to catch and the controller layer has one
 * thing to translate. It carries a `reason` for the log and nothing that would be useful to an
 * attacker, because the message that reaches a caller is written by the service, not by this class.
 */
export class AlAdhanUnavailableError extends Error {
  constructor(
    readonly reason: 'timeout' | 'network' | 'http' | 'malformed',
    detail: string,
  ) {
    super(`AlAdhan request failed (${reason}): ${detail}`);
    this.name = 'AlAdhanUnavailableError';
  }
}

/** What a caller has to decide before a schedule can be calculated. */
export interface AlAdhanRequest {
  /** `YYYY-MM-DD`. Converted to AlAdhan's `DD-MM-YYYY` here, not by the caller. */
  date: string;
  latitude: number;
  longitude: number;
  method: number;
  school: number;
  timezone?: string | null;
  /**
   * A one-off `tune` string in AlAdhan's own ordering, passed straight through.
   *
   * The mosque's *stored* adjustments never travel this way — they are applied to the reply, so the
   * external data is never asked to arrive pre-modified. This exists only for the query parameter, and
   * a caller who sends it has copied the ordering from AlAdhan's documentation.
   */
  tune?: string | null;
}

/**
 * The HTTP boundary.
 *
 * Uses the platform `fetch` rather than adding an HTTP client. Node has had a global `fetch` since 18
 * and this module makes exactly one kind of request; `@nestjs/axios` would add two dependencies and an
 * observable to wrap around it, and nothing here needs interceptors, retries or a request pipeline.
 * The timeout — the one thing `fetch` does not give you — is an `AbortController`, which is six lines.
 */
@Injectable()
export class AlAdhanClient {
  // `@Inject` with the token, typed as `AppConfig`: the generic cannot be attached to the token itself,
  // and this is what lets `env.*` infer a real type from the validated schema. Same as `AuthService`.
  constructor(@Inject(ConfigService) private readonly config: AppConfig) {}

  /**
   * Fetches one day's calculated timings.
   *
   * Throws `AlAdhanUnavailableError` for every failure, including a well-formed reply that is missing
   * a timing. That last case is treated as an outage rather than a partial success on purpose: a
   * prayer schedule with a blank Asr is worse than an honest error, because it looks like an answer.
   */
  async getTimings(request: AlAdhanRequest): Promise<AlAdhanDay> {
    const url = this.buildUrl(request);
    const timeoutMs = env.aladhanTimeoutMs(this.config);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: { accept: 'application/json' },
      });
    } catch (error) {
      // An abort and a DNS failure arrive the same way and want different log lines.
      const aborted = controller.signal.aborted;
      throw new AlAdhanUnavailableError(
        aborted ? 'timeout' : 'network',
        aborted ? `no reply within ${timeoutMs}ms` : describe(error),
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new AlAdhanUnavailableError('http', `status ${response.status}`);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch (error) {
      throw new AlAdhanUnavailableError('malformed', `response was not JSON: ${describe(error)}`);
    }

    return parseTimingsResponse(body);
  }

  /**
   * Builds the request URL.
   *
   * The coordinate endpoint (`/timings/:date?latitude=&longitude=`) rather than the city one: a mosque
   * is a building, not a city, and `/timingsByCity` would make the schedule depend on how a place name
   * is spelled and on which of several same-named towns upstream picks.
   */
  private buildUrl(request: AlAdhanRequest): string {
    const base = env.aladhanBaseUrl(this.config);
    const url = new URL(`${base}/timings/${toAlAdhanDate(request.date)}`);

    url.searchParams.set('latitude', String(request.latitude));
    url.searchParams.set('longitude', String(request.longitude));
    url.searchParams.set('method', String(request.method));
    url.searchParams.set('school', String(request.school));

    if (request.timezone) {
      url.searchParams.set('timezonestring', request.timezone);
    }
    if (request.tune) {
      url.searchParams.set('tune', request.tune);
    }

    return url.toString();
  }
}

/**
 * Turns an untrusted body into an `AlAdhanDay`, or throws.
 *
 * Exported so it can be tested directly against recorded payloads — including the malformed ones,
 * which are the cases worth having tests for and the hardest to produce through a mocked `fetch`.
 *
 * Every field is checked. This is a third party's JSON: the alternative to validating it is a
 * `response.json() as AlAdhanTimingsResponse` cast, which tells the compiler a lie and moves the
 * failure from here to whichever line later reads `undefined.slice`.
 */
export function parseTimingsResponse(body: unknown): AlAdhanDay {
  if (typeof body !== 'object' || body === null) {
    throw new AlAdhanUnavailableError('malformed', 'body was not an object');
  }

  const envelope = body as AlAdhanTimingsResponse;

  // Upstream answers 200 with a `code` of its own; 200 there is the only success.
  // `code` is `unknown` because it is a claim from a third party — read as a number so a reply that sends
  // an object there is reported as `NaN` rather than stringified into `[object Object]`.
  const code = Number(envelope.code);
  if (envelope.code !== undefined && code !== 200) {
    const status = typeof envelope.status === 'string' ? envelope.status : `code ${code}`;
    throw new AlAdhanUnavailableError('malformed', `upstream reported ${status}`);
  }

  const timings = envelope.data?.timings;
  if (typeof timings !== 'object' || timings === null) {
    throw new AlAdhanUnavailableError('malformed', 'no timings in response');
  }

  const parsed: Partial<RawTimings> = {};
  for (const key of PRAYER_KEYS) {
    const value = parseAlAdhanTime(timings[ALADHAN_TIMING_KEYS[key]]);
    if (value === null) {
      throw new AlAdhanUnavailableError('malformed', `timing ${key} missing or unreadable`);
    }
    parsed[key] = value;
  }

  return {
    timings: parsed as RawTimings,
    gregorianDate: toIsoDate(envelope.data?.date?.gregorian?.date),
    hijri: readHijri(envelope.data?.date?.hijri),
    timezone:
      typeof envelope.data?.meta?.timezone === 'string' ? envelope.data.meta.timezone : null,
  };
}

/** AlAdhan's gregorian `DD-MM-YYYY` → `YYYY-MM-DD`. Null when it is anything else. */
function toIsoDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

/**
 * The Hijri block, read defensively and reported as-is.
 *
 * Passed through rather than calculated: the Hijri date of a Gregorian day is a question about
 * moon-sighting conventions, and having asked AlAdhan for the timings it would be strange to answer it
 * differently here. Null throughout when absent — a missing Hijri date is cosmetic and must not fail
 * the request the way a missing timing does.
 */
function readHijri(hijri: unknown): AlAdhanDay['hijri'] {
  if (typeof hijri !== 'object' || hijri === null) return null;

  const source = hijri as {
    date?: unknown;
    day?: unknown;
    year?: unknown;
    month?: { number?: unknown; en?: unknown };
  };

  return {
    date: typeof source.date === 'string' ? source.date : null,
    day: toInteger(source.day),
    month: toInteger(source.month?.number),
    monthName: typeof source.month?.en === 'string' ? source.month.en : null,
    year: toInteger(source.year),
  };
}

/** Upstream sends these as strings; a non-numeric one becomes null rather than NaN. */
function toInteger(value: unknown): number | null {
  if (typeof value === 'number') return Number.isInteger(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

/** A message from an unknown throw, with no stack and nothing from the environment. */
function describe(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}
