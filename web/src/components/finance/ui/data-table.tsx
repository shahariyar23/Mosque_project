"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { compareValues } from "@/lib/finance/format";
import { Icon } from "@/components/finance/ui/icon";

export type Column<Row> = {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
  /** Provide to make the column sortable. */
  sortValue?: (row: Row) => string | number;
  align?: "left" | "right";
  /** Column is dropped below xl so wide ledgers stay readable on laptops. */
  secondary?: boolean;
  className?: string;
  /** Use for an actions column whose header should only exist for screen readers. */
  headerHidden?: boolean;
};

export type SortState = { key: string; direction: "asc" | "desc" };

type Props<Row> = {
  rows: Row[];
  columns: Column<Row>[];
  getRowKey: (row: Row) => string;
  /** Describes the table for screen readers; rendered visually hidden. */
  caption: string;
  emptyState: ReactNode;
  initialSort?: SortState;
  pageSize?: number;
  /** Mobile card headline. Falls back to the first column. */
  mobileTitle?: (row: Row) => ReactNode;
  mobileSubtitle?: (row: Row) => ReactNode;
  /** Right-hand side of the mobile card header, usually the amount. */
  mobileTrailing?: (row: Row) => ReactNode;
  /** Column keys to leave out of the mobile card body (already shown in the header). */
  mobileHiddenKeys?: string[];
  /**
   * Makes each record openable. The first column (and the mobile card title) becomes a real link,
   * which is what gives keyboard and screen-reader users a way in — a click handler on the <tr>
   * would be mouse-only, and the mobile cards would lose the affordance entirely.
   */
  rowHref?: (row: Row) => string;
  footNote?: ReactNode;
  /**
   * Present when `rows` is one page fetched from the API rather than the whole list.
   *
   * It replaces both halves of the footer, because both are wrong for a server page. The record count
   * is computed from `rows.length`, so a table holding page 2 of 7 would read "Showing 1–20 of 20
   * records" when there are 137; and the pager only ever sees the rows it was handed, so it cannot know
   * further pages exist. Passing this hands both figures to the caller, which is the only place that
   * knows them.
   *
   * Do not combine it with sortable columns: no list endpoint accepts a sort parameter, so the sort
   * here would reorder the current page only and quietly imply it had ordered the whole list.
   */
  serverPage?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
};

const alignClass = { left: "text-left", right: "text-right" } as const;

const recordLink =
  "rounded font-medium text-[#17211d] underline-offset-2 transition-colors hover:text-[#0d4d3b] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]";

/**
 * Shared finance table. On md and up it is a real <table> inside a horizontal scroll region;
 * below md each record becomes a card so a phone never has to scroll the page sideways.
 * Sorting, paging and the record count are handled here so every page behaves the same.
 */
export function DataTable<Row>({
  rows,
  columns,
  getRowKey,
  caption,
  emptyState,
  initialSort,
  pageSize = 10,
  mobileTitle,
  mobileSubtitle,
  mobileTrailing,
  mobileHiddenKeys = [],
  rowHref,
  footNote,
  serverPage,
}: Props<Row>) {
  const [sort, setSort] = useState<SortState | null>(initialSort ?? null);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((item) => item.key === sort.key);
    if (!column?.sortValue) return rows;
    const pick = column.sortValue;
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => compareValues(pick(a), pick(b)) * factor);
  }, [columns, rows, sort]);

  // Every figure below has a server-paged reading and a client-paged one. Kept side by side rather than
  // branched around, so the table body and footer cannot end up describing different pages.
  const totalPages = serverPage ? serverPage.totalPages : Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = serverPage ? serverPage.page : Math.min(page, totalPages);
  const start = serverPage ? (serverPage.page - 1) * serverPage.pageSize : (currentPage - 1) * pageSize;
  const visible = serverPage ? sorted : sorted.slice(start, start + pageSize);
  const shownTo = serverPage ? start + sorted.length : Math.min(start + pageSize, sorted.length);
  const total = serverPage ? serverPage.total : sorted.length;
  const changePage = serverPage ? serverPage.onPageChange : setPage;

  const toggleSort = (key: string) => {
    setPage(1);
    setSort((current) => {
      if (current?.key !== key) return { key, direction: "asc" };
      if (current.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  };

  if (rows.length === 0) return <>{emptyState}</>;

  const mobileColumns = columns.filter((column) => !mobileHiddenKeys.includes(column.key) && !column.headerHidden);
  const actionColumns = columns.filter((column) => column.headerHidden);

  return (
    <div>
      {/* Desktop / tablet ledger */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-[#e7e6dc] bg-[#faf9f4]">
              {columns.map((column) => {
                const sortable = Boolean(column.sortValue);
                const active = sort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={active ? (sort?.direction === "asc" ? "ascending" : "descending") : sortable ? "none" : undefined}
                    className={`px-4 py-3 text-[11px] font-bold uppercase tracking-[.09em] text-[#69726d] ${
                      alignClass[column.align ?? "left"]
                    } ${column.secondary ? "hidden xl:table-cell" : ""} ${column.className ?? ""}`}
                  >
                    {column.headerHidden ? (
                      <span className="sr-only">{column.header}</span>
                    ) : sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className={`inline-flex items-center gap-1 rounded uppercase tracking-[.09em] transition-colors hover:text-[#0d4d3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b] ${
                          column.align === "right" ? "flex-row-reverse" : ""
                        } ${active ? "text-[#0d4d3b]" : ""}`}
                      >
                        {column.header}
                        <Icon
                          name={active ? (sort?.direction === "asc" ? "arrow-up" : "arrow-down") : "chevron-down"}
                          size={12}
                          className={active ? "" : "opacity-40"}
                        />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0efe6]">
            {visible.map((row) => (
              <tr key={getRowKey(row)} className="transition-colors hover:bg-[#fbfaf5]">
                {columns.map((column, index) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3.5 align-middle text-[#3d453f] ${alignClass[column.align ?? "left"]} ${
                      column.secondary ? "hidden xl:table-cell" : ""
                    } ${column.className ?? ""}`}
                  >
                    {rowHref && index === 0 ? (
                      <Link href={rowHref(row)} className={recordLink}>
                        {column.cell(row)}
                      </Link>
                    ) : (
                      column.cell(row)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-[#f0efe6] md:hidden">
        {visible.map((row) => {
          const title = mobileTitle ? mobileTitle(row) : columns[0]?.cell(row);
          return (
            <li key={getRowKey(row)} className="px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#17211d]">
                    {rowHref ? (
                      <Link href={rowHref(row)} className={recordLink}>
                        {title}
                      </Link>
                    ) : (
                      title
                    )}
                  </div>
                  {mobileSubtitle ? <div className="mt-1 text-[12px] text-[#69726d]">{mobileSubtitle(row)}</div> : null}
                </div>
                {mobileTrailing ? <div className="shrink-0 text-right text-sm">{mobileTrailing(row)}</div> : null}
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                {mobileColumns.map((column) => (
                  <div key={column.key} className="min-w-0">
                    <dt className="text-[10px] font-bold uppercase tracking-[.09em] text-[#8b938d]">{column.header}</dt>
                    <dd className="mt-0.5 truncate text-[13px] text-[#3d453f]">{column.cell(row)}</dd>
                  </div>
                ))}
              </dl>

              {actionColumns.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-[#f0efe6] pt-2">
                  {actionColumns.map((column) => (
                    <div key={column.key}>{column.cell(row)}</div>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-3 border-t border-[#e7e6dc] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-[12px] text-[#69726d]" aria-live="polite">
          Showing <span className="font-semibold tabular-nums text-[#3d453f]">{start + 1}</span>–
          <span className="font-semibold tabular-nums text-[#3d453f]">{shownTo}</span> of{" "}
          <span className="font-semibold tabular-nums text-[#3d453f]">{total}</span> records
          {footNote ? <span className="ml-2">{footNote}</span> : null}
        </p>
        <Pagination page={currentPage} totalPages={totalPages} onChange={changePage} />
      </div>
    </div>
  );
}

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;

  const windowStart = Math.max(1, Math.min(page - 1, totalPages - 2));
  const pages = Array.from({ length: Math.min(3, totalPages) }, (_, index) => windowStart + index).filter(
    (value) => value >= 1 && value <= totalPages,
  );

  return (
    <nav aria-label="Pagination" className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className="grid h-10 w-10 place-items-center rounded-md border border-[#cfd4cd] text-[#4d564f] transition-colors hover:border-[#0d4d3b] hover:text-[#0d4d3b] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
      >
        <Icon name="chevron-left" size={16} />
      </button>
      {windowStart > 1 ? <span className="px-1 text-[12px] text-[#8b938d]">…</span> : null}
      {pages.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-label={`Page ${value}`}
          aria-current={value === page ? "page" : undefined}
          className={`h-10 min-w-10 rounded-md border px-2 text-[13px] font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b] ${
            value === page
              ? "border-[#0d4d3b] bg-[#0d4d3b] text-white"
              : "border-[#cfd4cd] bg-white text-[#4d564f] hover:border-[#0d4d3b] hover:text-[#0d4d3b]"
          }`}
        >
          {value}
        </button>
      ))}
      {windowStart + pages.length - 1 < totalPages ? <span className="px-1 text-[12px] text-[#8b938d]">…</span> : null}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
        className="grid h-10 w-10 place-items-center rounded-md border border-[#cfd4cd] text-[#4d564f] transition-colors hover:border-[#0d4d3b] hover:text-[#0d4d3b] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
      >
        <Icon name="chevron-right" size={16} />
      </button>
    </nav>
  );
}
