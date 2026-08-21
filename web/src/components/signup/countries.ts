/**
 * Calling-code list for the sign up phone field.
 * Add new entries here — the PhoneInput and the validator both read from this list,
 * so no component changes are needed to support another country.
 */
export type Country = {
  /** ISO 3166-1 alpha-2 code, used as the stored form value. */
  code: string;
  name: string;
  /** International dialling prefix, including the leading "+". */
  dial: string;
  /** National number example shown as the input placeholder. */
  example: string;
  /** Optional stricter national-number check. */
  pattern?: RegExp;
  minLength: number;
  maxLength: number;
};

export const COUNTRIES: Country[] = [
  {
    code: "BD",
    name: "Bangladesh",
    dial: "+880",
    example: "1712345678",
    pattern: /^1[3-9]\d{8}$/,
    minLength: 10,
    maxLength: 10,
  },
  {
    code: "IN",
    name: "India",
    dial: "+91",
    example: "9876543210",
    minLength: 10,
    maxLength: 10,
  },
  {
    code: "PK",
    name: "Pakistan",
    dial: "+92",
    example: "3001234567",
    minLength: 10,
    maxLength: 10,
  },
  {
    code: "MY",
    name: "Malaysia",
    dial: "+60",
    example: "123456789",
    minLength: 8,
    maxLength: 10,
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    dial: "+966",
    example: "512345678",
    minLength: 9,
    maxLength: 9,
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    dial: "+971",
    example: "501234567",
    minLength: 9,
    maxLength: 9,
  },
  {
    code: "GB",
    name: "United Kingdom",
    dial: "+44",
    example: "7400123456",
    minLength: 9,
    maxLength: 10,
  },
  {
    code: "US",
    name: "United States",
    dial: "+1",
    example: "2015550123",
    minLength: 10,
    maxLength: 10,
  },
];

export const DEFAULT_COUNTRY_CODE = "BD";

export function findCountry(code: string): Country {
  return COUNTRIES.find((country) => country.code === code) ?? COUNTRIES[0];
}

/**
 * Reduces anything the visitor typed to a bare national number:
 * strips spaces/dashes, a pasted dialling prefix and any trunk zero.
 */
export function toNationalDigits(raw: string, country: Country): string {
  let digits = raw.replace(/\D/g, "");
  const dial = country.dial.replace(/\D/g, "");
  if (digits.length > dial.length && digits.startsWith(dial))
    digits = digits.slice(dial.length);
  return digits.replace(/^0+/, "");
}

/** Builds the E.164-style value a REST API would expect, e.g. +8801712345678. */
export function toInternationalNumber(
  raw: string,
  countryCode: string,
): string {
  const country = findCountry(countryCode);
  return `${country.dial}${toNationalDigits(raw, country)}`;
}
