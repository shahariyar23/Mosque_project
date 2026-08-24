/**
 * The list contract, shared by every paginated endpoint.
 *
 * These shapes are not invented here — they mirror `web/src/services/query.ts`, which states outright
 * that it is "the contract the NestJS API will honour". The frontend is already built against
 * `{ rows, total, page, pageSize, pageCount }`, so that is what a list endpoint returns; `page` is
 * 1-based and `total` counts rows matching the filter before paging.
 */

export type SortDirection = 'asc' | 'desc';

/** Matches `Page<Row>` in the frontend, field for field. */
export interface Page<Row> {
  rows: Row[];
  /** Rows matching the filter, ignoring paging. */
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export const DEFAULT_PAGE_SIZE = 10;

/**
 * Ceiling on `pageSize`, so a caller cannot ask for the whole table in one request and turn a list
 * endpoint into a denial-of-service lever. The frontend never asks for more than a screenful.
 */
export const MAX_PAGE_SIZE = 100;

/**
 * Builds the response envelope from a count and the rows for the requested page.
 *
 * `page` is clamped to the available range for the same reason the frontend helper clamps it: a
 * filter routinely shrinks a result set while the viewer sits on page 4, and an empty table there
 * reads as "no results" when there plainly are some.
 */
export function buildPage<Row>(
  rows: Row[],
  total: number,
  params: { page?: number; pageSize?: number },
): Page<Row> {
  const pageSize = Math.min(Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, params.page ?? 1), pageCount);

  return { rows, total, page, pageSize, pageCount };
}

/**
 * Translates page/pageSize into Prisma's `skip`/`take`.
 *
 * Kept next to `buildPage` so the clamping rules cannot drift between the query and the envelope
 * that reports them.
 */
export function toSkipTake(params: { page?: number; pageSize?: number }): {
  skip: number;
  take: number;
} {
  const take = Math.min(Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const page = Math.max(1, params.page ?? 1);
  return { skip: (page - 1) * take, take };
}
