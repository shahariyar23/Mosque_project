/**
 * Query primitives shared by every service module.
 *
 * These types are the contract the NestJS API will honour, written down now so the UI is built
 * against it rather than against an array. `page` is 1-based and `total` counts rows matching the
 * filter *before* paging, which is what a REST list endpoint conventionally returns and what the
 * pagination control needs to render a page count.
 *
 * The helpers below apply the same query to an in-memory array so the mock modules do not each
 * reimplement search, sort and paging. When a real endpoint replaces one, the helper call goes away
 * and the query object is forwarded as a query string instead — the signature does not change.
 */

export type SortDirection = "asc" | "desc";

export type PageParams = {
  /** 1-based. */
  page?: number;
  pageSize?: number;
};

export type SortParams<Field extends string = string> = {
  sortBy?: Field;
  sortDir?: SortDirection;
};

export type SearchParams = {
  search?: string;
};

export type DateRangeParams = {
  /** Inclusive "YYYY-MM-DD". */
  from?: string;
  to?: string;
};

export type ListQuery<Field extends string = string> = PageParams &
  SortParams<Field> &
  SearchParams &
  DateRangeParams;

export type Page<Row> = {
  rows: Row[];
  /** Rows matching the filter, ignoring paging. */
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export const DEFAULT_PAGE_SIZE = 10;

/**
 * An error a service is willing to show a person.
 *
 * `code` is for the caller to branch on; `message` is what reaches the screen, which is why it is
 * written in plain language. A service must never surface a raw fetch, database or stack message —
 * that is the rule the error states on every page depend on.
 */
export class ServiceError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
  }
}

/**
 * Stands in for network time.
 *
 * Short on purpose. Long enough that a skeleton genuinely renders on first load — so the loading
 * states on these pages are exercised rather than decorative — and short enough that clicking
 * through the dashboard does not feel sluggish.
 */
const LATENCY_MS = 220;

export function withLatency<T>(value: T, ms: number = LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Case-insensitive substring match across the fields a row exposes for searching. */
export function applySearch<Row>(
  rows: Row[],
  search: string | undefined,
  fields: (row: Row) => Array<string | number | undefined>,
): Row[] {
  const needle = search?.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) =>
    fields(row)
      .filter((value): value is string | number => value !== undefined)
      .some((value) => String(value).toLowerCase().includes(needle)),
  );
}

/** Inclusive date-range filter on whichever date field the caller picks. */
export function applyDateRange<Row>(
  rows: Row[],
  range: DateRangeParams,
  pick: (row: Row) => string,
): Row[] {
  if (!range.from && !range.to) return rows;
  return rows.filter((row) => {
    const value = pick(row).slice(0, 10);
    if (range.from && value < range.from) return false;
    if (range.to && value > range.to) return false;
    return true;
  });
}

/**
 * Sorts by one of a named set of comparators.
 *
 * Taking a map of allowed fields rather than an arbitrary key path is deliberate: it means a sort
 * field that does not exist is a compile error at the call site instead of a silently unsorted table,
 * and it is the same allow-list the API will validate against.
 */
export function applySort<Row, Field extends string>(
  rows: Row[],
  sort: SortParams<Field>,
  sorters: Record<Field, (row: Row) => string | number>,
): Row[] {
  if (!sort.sortBy) return rows;
  const pick = sorters[sort.sortBy];
  if (!pick) return rows;
  const factor = sort.sortDir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => compare(pick(a), pick(b)) * factor);
}

function compare(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "en", { numeric: true, sensitivity: "base" });
}

/** Slices a filtered set into the requested page and reports the totals around it. */
export function paginate<Row>(rows: Row[], params: PageParams): Page<Row> {
  const pageSize = Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  // Clamped rather than returning an empty page: filters routinely shrink a result set while the
  // viewer is on page 4, and an empty table there reads as "no results" when there plainly are some.
  const page = Math.min(Math.max(1, params.page ?? 1), pageCount);
  const start = (page - 1) * pageSize;

  return {
    rows: rows.slice(start, start + pageSize),
    total: rows.length,
    page,
    pageSize,
    pageCount,
  };
}

/** Monotonic ids for records created in the browser. Prefixed so demo rows are identifiable. */
export function nextId(prefix: string, existing: number): string {
  return `${prefix}-${String(existing + 1).padStart(4, "0")}`;
}
