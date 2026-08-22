/**
 * Client-side CSV export.
 *
 * The dashboard has no backend, but an export does not need one: the rows are already in memory, so
 * the file is built in the browser and handed to the download machinery. That makes the Export button
 * genuinely work rather than raise a toast apologising for itself.
 *
 * Two things worth knowing:
 *
 *  - Every cell is quoted and inner quotes doubled, which is what RFC 4180 asks for and what stops a
 *    name containing a comma from shifting every column after it.
 *  - A cell whose first character is `=`, `+`, `-`, `@`, tab or carriage return is prefixed with an
 *    apostrophe. Excel and Sheets treat those as the start of a formula, so a field like `=1+1` — or a
 *    phone number written `+880…` — becomes executable content in the recipient's spreadsheet. The
 *    apostrophe makes it text. This is the one piece of hardening a CSV export genuinely needs.
 */

const RISKY_PREFIX = /^[=+\-@\t\r]/;

function escapeCell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const safe = RISKY_PREFIX.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export type CsvColumn<Row> = {
  header: string;
  value: (row: Row) => string | number | undefined;
};

export function toCsv<Row>(rows: Row[], columns: CsvColumn<Row>[]): string {
  const head = columns.map((column) => escapeCell(column.header)).join(",");
  const body = rows.map((row) => columns.map((column) => escapeCell(column.value(row))).join(","));
  // A leading BOM so Excel opens Bangla names and the ৳ sign as UTF-8 rather than mojibake.
  return `﻿${[head, ...body].join("\r\n")}\r\n`;
}

/** Builds the CSV and triggers a download. No-op outside the browser. */
export function downloadCsv<Row>(filename: string, rows: Row[], columns: CsvColumn<Row>[]): void {
  if (typeof document === "undefined") return;

  const blob = new Blob([toCsv(rows, columns)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Released on the next tick — revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
