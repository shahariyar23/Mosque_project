"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/finance/ui/button";
import { Icon } from "@/components/finance/ui/icon";
import { Drawer } from "@/components/finance/ui/modal";

export type SelectFilter = {
  id: string;
  label: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
};

export type RangeFilter = {
  label: string;
  fromLabel?: string;
  toLabel?: string;
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
};

type Props = {
  search: { value: string; onChange: (value: string) => void; placeholder: string; label: string };
  filters?: SelectFilter[];
  dateRange?: RangeFilter;
  amountRange?: RangeFilter;
  /** Count of non-default filters, shown on the mobile Filters button. */
  activeCount?: number;
  onReset?: () => void;
  trailing?: ReactNode;
};

const selectClass =
  "min-h-10 w-full appearance-none rounded-md border border-[#cfd4cd] bg-white pl-3 pr-8 text-[13px] text-[#17211d] focus:border-[#0d4d3b] focus:outline-2 focus:outline-offset-1 focus:outline-[#0d4d3b]/40";
const inputClass =
  "min-h-10 w-full rounded-md border border-[#cfd4cd] bg-white px-3 text-[13px] text-[#17211d] focus:border-[#0d4d3b] focus:outline-2 focus:outline-offset-1 focus:outline-[#0d4d3b]/40";

function LabelledSelect({ filter, idPrefix }: { filter: SelectFilter; idPrefix: string }) {
  const id = `${idPrefix}-${filter.id}`;
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] font-semibold uppercase tracking-[.08em] text-[#8b938d]">
        {filter.label}
      </label>
      <div className="relative mt-1">
        <select id={id} name={id} value={filter.value} onChange={(event) => filter.onChange(event.target.value)} className={selectClass}>
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#69726d]">
          <Icon name="chevron-down" size={15} />
        </span>
      </div>
    </div>
  );
}

function RangeInputs({ range, idPrefix, type }: { range: RangeFilter; idPrefix: string; type: "date" | "number" }) {
  const fromId = `${idPrefix}-from`;
  const toId = `${idPrefix}-to`;
  return (
    <fieldset>
      <legend className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#8b938d]">{range.label}</legend>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={fromId} className="sr-only">
            {range.fromLabel ?? `${range.label} from`}
          </label>
          <input
            id={fromId}
            name={fromId}
            type={type}
            inputMode={type === "number" ? "numeric" : undefined}
            placeholder={type === "number" ? "Min" : undefined}
            value={range.from}
            onChange={(event) => range.onFromChange(event.target.value)}
            className={`${inputClass} tabular-nums`}
          />
        </div>
        <div>
          <label htmlFor={toId} className="sr-only">
            {range.toLabel ?? `${range.label} to`}
          </label>
          <input
            id={toId}
            name={toId}
            type={type}
            inputMode={type === "number" ? "numeric" : undefined}
            placeholder={type === "number" ? "Max" : undefined}
            value={range.to}
            onChange={(event) => range.onToChange(event.target.value)}
            className={`${inputClass} tabular-nums`}
          />
        </div>
      </div>
    </fieldset>
  );
}

/**
 * Search plus filters for every finance table. Filters sit inline from lg up and collapse into
 * a bottom drawer on phones and tablets, which keeps the toolbar from wrapping into a wall of
 * dropdowns on small screens.
 */
export function FinanceFilters({ search, filters = [], dateRange, amountRange, activeCount = 0, onReset, trailing }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hasFilters = filters.length > 0 || Boolean(dateRange) || Boolean(amountRange);

  const filterBody = (idPrefix: string) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {filters.map((filter) => (
        <LabelledSelect key={filter.id} filter={filter} idPrefix={idPrefix} />
      ))}
      {dateRange ? <RangeInputs range={dateRange} idPrefix={`${idPrefix}-date`} type="date" /> : null}
      {amountRange ? <RangeInputs range={amountRange} idPrefix={`${idPrefix}-amount`} type="number" /> : null}
    </div>
  );

  return (
    <div className="border-b border-[#e7e6dc] px-4 py-3.5 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <label htmlFor="finance-search" className="sr-only">
            {search.label}
          </label>
          <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b938d]">
            <Icon name="search" size={16} />
          </span>
          <input
            id="finance-search"
            name="finance-search"
            type="search"
            value={search.value}
            onChange={(event) => search.onChange(event.target.value)}
            placeholder={search.placeholder}
            className="min-h-10 w-full rounded-md border border-[#cfd4cd] bg-white pl-9 pr-3 text-[13px] text-[#17211d] placeholder:text-[#9aa19c] focus:border-[#0d4d3b] focus:outline-2 focus:outline-offset-1 focus:outline-[#0d4d3b]/40"
          />
        </div>

        {hasFilters ? (
          <Button
            variant="secondary"
            size="sm"
            icon="filter"
            className="lg:hidden"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            Filters
            {activeCount > 0 ? (
              <span className="ml-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#0d4d3b] px-1 text-[11px] font-bold text-white tabular-nums">
                {activeCount}
              </span>
            ) : null}
          </Button>
        ) : null}

        {activeCount > 0 && onReset ? (
          <Button variant="ghost" size="sm" icon="close" onClick={onReset} className="hidden lg:inline-flex">
            Clear filters
          </Button>
        ) : null}

        {trailing ? <div className="ml-auto flex flex-wrap items-center gap-2">{trailing}</div> : null}
      </div>

      {hasFilters ? <div className="mt-3 hidden lg:block">{filterBody("filter")}</div> : null}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Filters"
        footer={
          <>
            {onReset ? (
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  onReset();
                  setDrawerOpen(false);
                }}
              >
                Clear all
              </Button>
            ) : null}
            <Button className="flex-1" onClick={() => setDrawerOpen(false)}>
              Show results
            </Button>
          </>
        }
      >
        {filterBody("drawer-filter")}
      </Drawer>
    </div>
  );
}

/** Segmented control for date-range and grouping switches. */
export function SegmentedControl<Value extends string>({
  label,
  value,
  options,
  onChange,
  size = "md",
}: {
  label: string;
  value: Value;
  options: ReadonlyArray<{ value: Value; label: string }>;
  onChange: (value: Value) => void;
  size?: "sm" | "md";
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-md border border-[#cfd4cd] bg-white p-0.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`rounded-[5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b] ${
              size === "sm" ? "min-h-8 px-2.5 text-[12px]" : "min-h-9 px-3 text-[13px]"
            } ${active ? "bg-[#0d4d3b] text-white" : "text-[#4d564f] hover:bg-[#f2f1ea]"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
