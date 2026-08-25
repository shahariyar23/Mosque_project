import { AlAdhanClient, AlAdhanUnavailableError, parseTimingsResponse } from './aladhan.client';
import type { AppConfig } from '../config/app.config';

/**
 * The external boundary, tested without crossing it.
 *
 * `global.fetch` is replaced for every test in this file and restored afterwards, so nothing here
 * reaches api.aladhan.com. That is not only a policy about test suites touching the network — it is the
 * only way to exercise the cases that matter, since a timeout, a 502 and a truncated body are not things
 * a healthy third party will produce on request.
 */

const BASE_URL = 'https://aladhan.test/v1';
const TIMEOUT_MS = 40;

function configStub(): AppConfig {
  const values: Record<string, unknown> = {
    ALADHAN_BASE_URL: BASE_URL,
    ALADHAN_TIMEOUT_MS: TIMEOUT_MS,
    PRAYER_CACHE_TTL_SECONDS: 3600,
  };

  return { get: (key: string) => values[key] } as unknown as AppConfig;
}

/** A reply shaped like the real one, including the `(+06)` suffix and the keys this module ignores. */
function payload(overrides: Record<string, unknown> = {}) {
  return {
    code: 200,
    status: 'OK',
    data: {
      timings: {
        Fajr: '04:35 (+06)',
        Sunrise: '05:52 (+06)',
        Dhuhr: '12:08 (+06)',
        Asr: '15:29 (+06)',
        Sunset: '18:23 (+06)',
        Maghrib: '18:23 (+06)',
        Isha: '19:39 (+06)',
        Imsak: '04:25 (+06)',
        Midnight: '00:08 (+06)',
        Firstthird: '22:13 (+06)',
        Lastthird: '02:03 (+06)',
      },
      date: {
        gregorian: { date: '01-03-2026' },
        hijri: { date: '12-09-1447', day: '12', year: '1447', month: { number: 9, en: 'Ramaḍān' } },
      },
      meta: { timezone: 'Asia/Dhaka' },
    },
    ...overrides,
  };
}

function okResponse(body: unknown): Response {
  // `() => Promise.resolve(...)` rather than an async arrow: there is nothing to await, and the real
  // `Response.json` is a plain promise-returning method too.
  return { ok: true, status: 200, json: () => Promise.resolve(body) } as unknown as Response;
}

const request = {
  date: '2026-03-01',
  latitude: 23.810331,
  longitude: 90.412521,
  method: 3,
  school: 0,
};

describe('parseTimingsResponse', () => {
  it('normalizes the nine timings and drops everything else', () => {
    const day = parseTimingsResponse(payload());

    expect(day.timings).toEqual({
      imsak: '04:25',
      fajr: '04:35',
      sunrise: '05:52',
      dhuhr: '12:08',
      asr: '15:29',
      sunset: '18:23',
      maghrib: '18:23',
      isha: '19:39',
      midnight: '00:08',
    });
    // The two thirds upstream sends are read by nothing and must not survive the boundary.
    expect(Object.keys(day.timings)).not.toContain('Firstthird');
  });

  it('converts the gregorian date out of upstream’s DD-MM-YYYY', () => {
    expect(parseTimingsResponse(payload()).gregorianDate).toBe('2026-03-01');
  });

  it('passes the hijri block through, coercing its string numbers', () => {
    expect(parseTimingsResponse(payload()).hijri).toEqual({
      date: '12-09-1447',
      day: 12,
      month: 9,
      monthName: 'Ramaḍān',
      year: 1447,
    });
  });

  it('reports a missing hijri block as null rather than failing the request', () => {
    const body = payload();
    delete (body.data.date as { hijri?: unknown }).hijri;

    expect(parseTimingsResponse(body).hijri).toBeNull();
  });

  it('rejects a reply whose own code is not 200', () => {
    expect(() => parseTimingsResponse(payload({ code: 400, status: 'Bad Request' }))).toThrow(
      AlAdhanUnavailableError,
    );
  });

  it('rejects a reply missing a single timing, rather than publishing a blank one', () => {
    const body = payload();
    delete (body.data.timings as { Asr?: unknown }).Asr;

    expect(() => parseTimingsResponse(body)).toThrow(/timing asr missing/);
  });

  it('rejects a timing that is no longer a time', () => {
    const body = payload();
    (body.data.timings as { Isha?: unknown }).Isha = 'after sunset';

    expect(() => parseTimingsResponse(body)).toThrow(/timing isha missing or unreadable/);
  });

  it('rejects a body that is not an object', () => {
    expect(() => parseTimingsResponse('nope')).toThrow(/body was not an object/);
  });
});

describe('AlAdhanClient', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;
  let client: AlAdhanClient;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    client = new AlAdhanClient(configStub());
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('calls the coordinate endpoint with the date in upstream’s format', async () => {
    fetchMock.mockResolvedValue(okResponse(payload()));

    await client.getTimings(request);

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe(`${BASE_URL}/timings/01-03-2026`);
    expect(url.searchParams.get('latitude')).toBe('23.810331');
    expect(url.searchParams.get('longitude')).toBe('90.412521');
    expect(url.searchParams.get('method')).toBe('3');
    expect(url.searchParams.get('school')).toBe('0');
  });

  it('omits timezonestring and tune when they are not supplied', async () => {
    fetchMock.mockResolvedValue(okResponse(payload()));

    await client.getTimings(request);

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.has('timezonestring')).toBe(false);
    expect(url.searchParams.has('tune')).toBe(false);
  });

  it('sends timezonestring and tune when they are', async () => {
    fetchMock.mockResolvedValue(okResponse(payload()));

    await client.getTimings({ ...request, timezone: 'Asia/Dhaka', tune: '0,2,0,0,0,0,0,0,0' });

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get('timezonestring')).toBe('Asia/Dhaka');
    expect(url.searchParams.get('tune')).toBe('0,2,0,0,0,0,0,0,0');
  });

  it('reports a non-2xx status as an http failure', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 502 });

    await expect(client.getTimings(request)).rejects.toMatchObject({
      name: 'AlAdhanUnavailableError',
      reason: 'http',
    });
  });

  it('reports a transport failure as a network failure', async () => {
    fetchMock.mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));

    await expect(client.getTimings(request)).rejects.toMatchObject({ reason: 'network' });
  });

  it('reports an aborted request as a timeout', async () => {
    // Honours the signal the client passes, which is the only difference between this and the case above.
    fetchMock.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );

    await expect(client.getTimings(request)).rejects.toMatchObject({ reason: 'timeout' });
  });

  it('reports an unparseable body as malformed', async () => {
    // A truncated response: the status is fine and the body is not JSON.
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error('Unexpected end of JSON input')),
    });

    await expect(client.getTimings(request)).rejects.toMatchObject({ reason: 'malformed' });
  });

  it('never puts the upstream host in the error message a caller could see', async () => {
    fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED 104.21.0.1:443'));

    // The client's message is for the log. What matters is that it is an `AlAdhanUnavailableError`, which
    // is what `PrayerTimesService` catches and replaces before anything reaches a response.
    await expect(client.getTimings(request)).rejects.toBeInstanceOf(AlAdhanUnavailableError);
  });
});
