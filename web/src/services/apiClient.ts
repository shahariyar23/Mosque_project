"use client";

import { refreshSession } from "@/services/authService";
import { ServiceError, type FieldErrors } from "@/services/query";
import { getAccessToken, notifyUnauthenticated, setAccessToken } from "@/services/tokenStore";

/**
 * The one HTTP client for the NOOR API.
 *
 * Every service module in `web/src/services/` goes through here. There is deliberately no second client:
 * the rules below — the URL prefix, the bearer header, the envelope, the error shape, the 401 retry — are
 * each easy to get subtly wrong, and a module that hand-rolls `fetch` gets them wrong privately.
 *
 * Five things about this API are not guessable and are the reason this file reads the way it does.
 *
 * **1. Everything is under `/api/v1`.** The server sets a global prefix of `api` and URI versioning at
 * `v1`, so `@Controller('users')` answers at `/api/v1/users`. Only the health probes are excluded.
 *
 * **2. There are two response conventions, not one.** Most controllers return an envelope,
 * `{ success, message, data, meta? }`, and the payload is under `data`. Four modules — `mosque`,
 * `prayer-times`, `jummah` and `ramadan` — return their DTO raw, with no envelope at all. Reading
 * `body.data` off one of those yields `undefined`, so they have their own `…Raw` helpers below and the
 * choice is made per call site rather than sniffed at runtime.
 *
 * **3. Unknown query keys are rejected, not ignored.** The global `ValidationPipe` runs with
 * `whitelist: true, forbidNonWhitelisted: true`, so a query parameter or body field the DTO does not
 * declare is a 400 for the whole request. `buildUrl` therefore drops empty values instead of sending
 * `?status=`, and callers build bodies field by field — never by spreading form state.
 *
 * **4. Paging is `page` + `limit`.** The response carries `meta: { page, limit, total, totalPages }`.
 * The repo also contains an unused `pageSize`/`pageCount` pagination type; no list controller accepts it.
 *
 * **5. Errors already carry something worth showing.** The server's exception filter returns
 * `{ statusCode, code, message, errors? }` — a stable machine `code` and a message written for a reader.
 * Both are kept; nothing else from the body is. That is what stops a stack trace reaching the screen.
 */

import { getApiBaseUrl } from "@/config/api";

/** The base origin, from the centralized API config. */
const apiBase = getApiBaseUrl;

const API_PREFIX = "/api/v1";

export type QueryValue = string | number | boolean | undefined | null;
export type QueryParams = Record<string, QueryValue>;

/** Paging metadata as the API sends it. Note `limit`/`totalPages`, not `pageSize`/`pageCount`. */
export type PageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ListResult<Row> = {
  rows: Row[];
  meta: PageMeta;
};

/** The envelope most controllers return. */
type Envelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  meta?: Partial<PageMeta>;
};

/**
 * Builds the request URL, leaving out parameters that carry no filter.
 *
 * A blank `<select>` or a cleared search box gives `""`, and forwarding that as `?status=` fails
 * validation for the whole request rather than matching everything — so empty string, `null` and
 * `undefined` are all treated as "this filter is not applied". `false` and `0` are real values and are
 * kept: `?deleted=false` and `?page=0` mean something the server should see and answer for.
 */
function buildUrl(path: string, query?: QueryParams): string {
  const url = `${apiBase()}${API_PREFIX}${path}`;
  if (!query) return url;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }

  const qs = search.toString();
  return qs ? `${url}?${qs}` : url;
}

/** The error body the server's exception filter produces. Every field optional — a proxy or a crash mid-response can truncate it. */
type ErrorBody = {
  statusCode?: number;
  code?: string;
  message?: string | string[];
  errors?: Record<string, unknown>;
};

/** A last-resort message per status, used only when the body did not arrive or had no `message`. */
const STATUS_MESSAGES: Record<number, string> = {
  400: "Some of the details sent were not valid. Please check the form and try again.",
  401: "Your session has ended. Please sign in again.",
  403: "You do not have permission to do this.",
  404: "That record could not be found. It may have been removed.",
  409: "That conflicts with something that already exists.",
  422: "That request could not be processed.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "Something went wrong on the server. Please try again.",
};

const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

/**
 * Normalises the `errors` object into per-field message arrays.
 *
 * class-validator gives one entry per field, but whether the value is a string or an array of strings
 * depends on how the constraint was written, so both are accepted. Anything else in there is dropped
 * rather than coerced — a form can only render messages.
 */
function readFieldErrors(errors: Record<string, unknown> | undefined): FieldErrors | undefined {
  if (!errors) return undefined;

  const result: FieldErrors = {};
  for (const [field, value] of Object.entries(errors)) {
    if (typeof value === "string") result[field] = [value];
    else if (Array.isArray(value)) {
      const messages = value.filter((entry): entry is string => typeof entry === "string");
      if (messages.length > 0) result[field] = messages;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Turns a failed response into a `ServiceError` that is safe to render.
 *
 * The server's `message` is preferred because it was written to be read — "Email is already
 * registered." is more use than "CONFLICT". A validation failure can send `message` as an array; those
 * are joined so the caller has one sentence, with the per-field detail kept separately for the form.
 */
async function toServiceError(response: Response): Promise<ServiceError> {
  const body = (await response.json().catch(() => null)) as ErrorBody | null;
  const fieldErrors = readFieldErrors(body?.errors);

  let message = Array.isArray(body?.message)
    ? body.message.filter((entry) => typeof entry === "string").join(" ")
    : body?.message;

  if (fieldErrors && Object.keys(fieldErrors).length > 0) {
    const details = Object.values(fieldErrors).flat().filter(Boolean).join(". ");
    if (details) {
      message = details;
    }
  }

  return new ServiceError(
    body?.code ?? `HTTP_${response.status}`,
    message?.trim() || STATUS_MESSAGES[response.status] || FALLBACK_MESSAGE,
    { status: response.status, fieldErrors },
  );
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type RequestInput = {
  method: Method;
  path: string;
  query?: QueryParams;
  body?: unknown;
};

/** Whether a path is part of the auth flow, which must never be retried through the auth flow. */
function isAuthPath(path: string): boolean {
  return path.startsWith("/auth/");
}

/**
 * One round trip, returning the parsed body — or `undefined` when there is no body to parse.
 *
 * A `204`, and any `200` with an empty body, is a success with nothing to read. Treating that as a
 * parse failure would turn a working DELETE into an error, so it returns `undefined` and the typed
 * helpers above decide whether that is acceptable for their call.
 */
async function send(input: RequestInput): Promise<unknown> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};

  // Only set when there is something to describe. A `Content-Type` on a bodyless GET invites a preflight
  // for no reason.
  if (input.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(input.path, input.query), {
      method: input.method,
      headers,
      body: input.body === undefined ? undefined : JSON.stringify(input.body),
      // Required on every call: the login and refresh responses set the refresh cookie, and the refresh
      // request is the one that has to present it.
      credentials: "include",
    });
  } catch {
    // A `fetch` rejection is a network or CORS failure — there is no response and no server message.
    // The underlying error text is not shown; it names internals and reads as noise to a person.
    throw new ServiceError(
      "NETWORK_ERROR",
      "Cannot reach the server. Please check your connection and try again.",
    );
  }

  if (!response.ok) throw await toServiceError(response);

  if (response.status === 204) return undefined;

  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ServiceError("MALFORMED_RESPONSE", "The server sent a response that could not be read.");
  }
}

/**
 * `send`, plus one attempt to recover an expired session.
 *
 * An access token is short-lived, so a 401 mid-session is ordinary rather than exceptional: the refresh
 * cookie is still good and one rotation fixes it. `refreshSession()` is single-flight in `authService`,
 * so a screen that fires six requests at once produces one rotation, not six — which matters because
 * the server revokes a refresh token as it is used and would read the rest as reuse.
 *
 * Retried exactly once. If the second attempt is also a 401 the session is genuinely over, and the
 * registered handler clears it and sends the visitor to sign in. Auth routes are never retried this way:
 * `/auth/refresh` answering 401 *is* the failure, and looping it would recurse.
 */
async function sendWithRecovery(input: RequestInput): Promise<unknown> {
  try {
    return await send(input);
  } catch (cause) {
    const unauthenticated = cause instanceof ServiceError && cause.status === 401;
    if (!unauthenticated || isAuthPath(input.path)) throw cause;

    try {
      const recovered = await refreshSession();
      setAccessToken(recovered.token);
    } catch {
      setAccessToken(null);
      notifyUnauthenticated();
      throw new ServiceError("UNAUTHENTICATED", "Your session has ended. Please sign in again.", {
        status: 401,
      });
    }

    try {
      return await send(input);
    } catch (retryCause) {
      if (retryCause instanceof ServiceError && retryCause.status === 401) {
        setAccessToken(null);
        notifyUnauthenticated();
      }
      throw retryCause;
    }
  }
}

/**
 * Reads the payload out of an envelope.
 * Handles standard `{ success: true, data: T }` envelopes, as well as direct JSON payloads.
 */
function unwrap<T>(body: unknown): T {
  if (body === null || body === undefined) {
    throw new ServiceError("MALFORMED_RESPONSE", "The server sent an unexpected response.");
  }
  const envelope = body as Envelope<T>;
  if (envelope && typeof envelope === "object" && "data" in envelope && envelope.data !== undefined) {
    return envelope.data as T;
  }
  return body as T;
}

/* ------------------------------------------------------------------ *
 * Enveloped endpoints — everything except mosque, prayer-times,
 * jummah and ramadan.
 * ------------------------------------------------------------------ */

export async function apiGet<T>(path: string, query?: QueryParams): Promise<T> {
  return unwrap<T>(await sendWithRecovery({ method: "GET", path, query }));
}

export async function apiPost<T>(path: string, body?: unknown, query?: QueryParams): Promise<T> {
  return unwrap<T>(await sendWithRecovery({ method: "POST", path, body, query }));
}

export async function apiPatch<T>(path: string, body?: unknown, query?: QueryParams): Promise<T> {
  return unwrap<T>(await sendWithRecovery({ method: "PATCH", path, body, query }));
}

/**
 * A delete, where the caller does not care what came back.
 *
 * Deliberately not unwrapped. Some deletes answer with the affected record, some with a message and no
 * `data`, and a soft delete answers 200 — requiring a payload from all of them would fail the ones that
 * succeeded.
 */
export async function apiDelete(path: string, query?: QueryParams): Promise<void> {
  await sendWithRecovery({ method: "DELETE", path, query });
}

/**
 * A paginated list, returning the rows and the paging metadata together.
 *
 * `meta` is filled in from the request when the server omits a field, so a caller can always render a
 * pagination control without null-checking every number. `total` falls back to the row count — for a
 * single unpaged page that is the right answer, and it is never larger than the truth.
 */
export async function apiList<Row>(path: string, query?: QueryParams): Promise<ListResult<Row>> {
  const body = (await sendWithRecovery({ method: "GET", path, query })) as Envelope<Row[]> | null;
  const rows = Array.isArray(body?.data) ? body.data : [];

  const requestedPage = Number(query?.page ?? 1);
  const requestedLimit = Number(query?.limit ?? rows.length);
  const total = body?.meta?.total ?? rows.length;
  const limit = body?.meta?.limit ?? (Number.isFinite(requestedLimit) ? requestedLimit : rows.length);

  return {
    rows,
    meta: {
      page: body?.meta?.page ?? (Number.isFinite(requestedPage) ? requestedPage : 1),
      limit,
      total,
      totalPages: body?.meta?.totalPages ?? Math.max(1, limit > 0 ? Math.ceil(total / limit) : 1),
    },
  };
}

/* ------------------------------------------------------------------ *
 * Raw endpoints — `mosque`, `prayer-times`, `jummah`, `ramadan`.
 *
 * These controllers return their DTO directly. Passing them through
 * `unwrap` would throw on every call, since there is no `data` key to
 * find. Which module is which was read off the controllers; it is not
 * detectable from a response, so it is chosen here at the call site.
 * ------------------------------------------------------------------ */

/** A raw GET. `T` is the DTO itself. */
export async function apiGetRaw<T>(path: string, query?: QueryParams): Promise<T> {
  return (await sendWithRecovery({ method: "GET", path, query })) as T;
}

export async function apiPostRaw<T>(path: string, body?: unknown): Promise<T> {
  return (await sendWithRecovery({ method: "POST", path, body })) as T;
}

export async function apiPatchRaw<T>(path: string, body?: unknown): Promise<T> {
  return (await sendWithRecovery({ method: "PATCH", path, body })) as T;
}

export async function apiDeleteRaw(path: string): Promise<void> {
  await sendWithRecovery({ method: "DELETE", path });
}
