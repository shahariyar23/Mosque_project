"use client";

import { COUNTRIES, findCountry } from "./countries";
import type { FieldA11yProps } from "./form-field";
import { ChevronDownIcon, PhoneIcon } from "./icons";

type Props = {
  field: FieldA11yProps;
  countryCode: string;
  value: string;
  onCountryChange: (code: string) => void;
  onChange: (value: string) => void;
  onBlur: () => void;
  hasError?: boolean;
};

export function PhoneInput({
  field,
  countryCode,
  value,
  onCountryChange,
  onChange,
  onBlur,
  hasError,
}: Props) {
  const country = findCountry(countryCode);

  return (
    <div
      className={[
        "flex items-stretch overflow-hidden rounded-md border bg-white transition-colors duration-200",
        hasError
          ? "border-[#b0472f] focus-within:ring-2 focus-within:ring-[#b0472f]/20"
          : "border-[#d4d4ca] hover:border-[#b9b9ac] focus-within:border-[#0d4d3b] focus-within:ring-2 focus-within:ring-[#0d4d3b]/20",
      ].join(" ")}
    >
      <div className="relative shrink-0 border-r border-[#e5e2d8] bg-[#faf9f4]">
        <select
          id={`${field.id}-country`}
          name="countryCode"
          value={countryCode}
          onChange={(event) => onCountryChange(event.target.value)}
          aria-label="Country calling code"
          className="h-full appearance-none bg-transparent py-3 pl-3 pr-7 text-sm text-[#17211d] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0d4d3b]"
        >
          {COUNTRIES.map((option) => (
            <option key={option.code} value={option.code}>
              {option.code} {option.dial}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8d948f]" />
      </div>

      <div className="relative min-w-0 flex-1">
        <PhoneIcon className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#8d948f]" />
        <input
          {...field}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={country.example}
          className="w-full min-w-0 bg-transparent py-3 pl-10 pr-3 text-sm text-[#17211d] placeholder:text-[#a3aaa5] focus:outline-none"
        />
      </div>
    </div>
  );
}
