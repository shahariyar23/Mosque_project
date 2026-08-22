import {
  COUNTRIES,
  DEFAULT_COUNTRY_CODE,
  toInternationalNumber,
} from "@/components/signup/countries";
import { EMAIL_PATTERN } from "@/components/signup/signup-validation";

/**
 * Sign in validation. Pure functions only — no React — so the same rules can be
 * reused by a future Express-backed flow or unit tests.
 *
 * A single identifier field accepts either an email address or a phone number.
 * Sign in deliberately does NOT re-check password strength: the account already
 * exists, and telling a visitor their existing password is "weak" while they are
 * trying to get in is unhelpful.
 */

export type SigninValues = {
  /** Email address or phone number. */
  identifier: string;
  password: string;
  remember: boolean;
};

export type SigninField = keyof SigninValues;
export type SigninErrors = Partial<Record<SigninField, string>>;

export const initialSigninValues: SigninValues = {
  identifier: "",
  password: "",
  remember: true,
};

export type IdentifierKind = "empty" | "email" | "phone" | "unknown";

/** Characters a phone number may legitimately contain. */
const PHONE_CHARS = /^[+()\-.\s\d]+$/;
/** E.164 allows at most 15 digits; nothing real is shorter than 6. */
const MIN_PHONE_DIGITS = 6;
const MAX_PHONE_DIGITS = 15;

const DEFAULT_COUNTRY =
  COUNTRIES.find((country) => country.code === DEFAULT_COUNTRY_CODE) ??
  COUNTRIES[0];
const PHONE_EXAMPLE = `0${DEFAULT_COUNTRY.example}`;

/** Decides how to read the identifier so the field can validate and label itself. */
export function detectIdentifierKind(raw: string): IdentifierKind {
  const value = raw.trim();
  if (!value) return "empty";
  if (value.includes("@")) return "email";
  if (PHONE_CHARS.test(value)) return "phone";
  return "unknown";
}

export function validateSignin(values: SigninValues): SigninErrors {
  const errors: SigninErrors = {};
  const identifier = values.identifier.trim();

  switch (detectIdentifierKind(identifier)) {
    case "empty":
      errors.identifier = "Please enter your email address or phone number.";
      break;
    case "email":
      if (!EMAIL_PATTERN.test(identifier)) {
        errors.identifier =
          "Please enter a valid email address, like you@example.com.";
      }
      break;
    case "phone": {
      const digits = identifier.replace(/\D/g, "");
      if (
        digits.length < MIN_PHONE_DIGITS ||
        digits.length > MAX_PHONE_DIGITS
      ) {
        errors.identifier = `Please enter a valid phone number, for example ${PHONE_EXAMPLE}.`;
      }
      break;
    }
    default:
      errors.identifier =
        "Please enter the email address or phone number you registered with.";
  }

  if (!values.password) errors.password = "Please enter your password.";

  return errors;
}

export function isSigninValid(values: SigninValues): boolean {
  return Object.keys(validateSignin(values)).length === 0;
}

/** Focus order used to jump to the first invalid field after a failed submit. */
export const signinFieldOrder: SigninField[] = ["identifier", "password"];

/**
 * Normalises a typed number to E.164. Without an explicit "+" prefix the
 * mosque's default country is assumed, which also strips a pasted dialling code
 * or trunk zero (01712345678 and 8801712345678 both become +8801712345678).
 */
function toInternationalIdentifier(raw: string): string {
  const value = raw.trim();
  if (value.startsWith("+")) return `+${value.replace(/\D/g, "")}`;
  return toInternationalNumber(value, DEFAULT_COUNTRY_CODE);
}

export type SigninPayload = {
  /** Exactly one of these is set, depending on what the visitor typed. */
  email?: string;
  phone?: string;
  password: string;
  remember: boolean;
};

export function toSigninPayload(values: SigninValues): SigninPayload {
  const identifier = values.identifier.trim();
  const isPhone = detectIdentifierKind(identifier) === "phone";

  return {
    ...(isPhone
      ? { phone: toInternationalIdentifier(identifier) }
      : { email: identifier.toLowerCase() }),
    password: values.password,
    remember: values.remember,
  };
}
