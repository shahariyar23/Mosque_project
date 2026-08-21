import {
  findCountry,
  toInternationalNumber,
  toNationalDigits,
} from "./countries";

/**
 * Pure validation layer for the sign up form — no React, no DOM.
 * Mirrors the schema the Express API will eventually enforce, so the same
 * rules can be swapped for a shared Zod schema without touching the UI.
 */

export type Gender = "" | "male" | "female";

export type SignupValues = {
  fullName: string;
  countryCode: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
  gender: Gender;
  city: string;
  terms: boolean;
  newsletter: boolean;
};

export type SignupField = keyof SignupValues;
export type SignupErrors = Partial<Record<SignupField, string>>;

export const initialSignupValues: SignupValues = {
  fullName: "",
  countryCode: "BD",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
  dateOfBirth: "",
  gender: "",
  city: "",
  terms: false,
  newsletter: false,
};

export const passwordRequirements = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (value: string) => value.length >= 8,
  },
  {
    id: "uppercase",
    label: "One uppercase letter",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: "lowercase",
    label: "One lowercase letter",
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    id: "number",
    label: "One number",
    test: (value: string) => /\d/.test(value),
  },
] as const;

export type PasswordStrength = { score: 0 | 1 | 2 | 3 | 4; label: string };

const strengthLabels = ["Too short", "Weak", "Fair", "Good", "Strong"] as const;

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: strengthLabels[0] };
  const met = passwordRequirements.filter((requirement) =>
    requirement.test(password),
  ).length;
  return {
    score: met as PasswordStrength["score"],
    label: strengthLabels[met],
  };
}

/** Shared by the sign up and sign in validators. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

function validatePhone(values: SignupValues): string | undefined {
  const country = findCountry(values.countryCode);
  const digits = toNationalDigits(values.phone, country);
  if (!digits) return "Please enter your phone number.";
  if (country.pattern && !country.pattern.test(digits)) {
    return `Please enter a valid ${country.name} number, for example ${country.example}.`;
  }
  if (digits.length < country.minLength || digits.length > country.maxLength) {
    return `Please enter a valid ${country.name} number, for example ${country.example}.`;
  }
  return undefined;
}

function validateDateOfBirth(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime()))
    return "Please enter a valid date of birth.";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today) return "Your date of birth cannot be in the future.";
  if (date.getFullYear() < 1900) return "Please enter a valid date of birth.";
  return undefined;
}

export function validateSignup(values: SignupValues): SignupErrors {
  const errors: SignupErrors = {};

  if (values.fullName.trim().length < 2)
    errors.fullName = "Please enter your full name.";

  const phoneError = validatePhone(values);
  if (phoneError) errors.phone = phoneError;

  if (!values.email.trim()) errors.email = "Please enter your email address.";
  else if (!EMAIL_PATTERN.test(values.email.trim()))
    errors.email = "Please enter a valid email address, like you@example.com.";

  if (!values.password) errors.password = "Please create a password.";
  else {
    const unmet = passwordRequirements.filter(
      (requirement) => !requirement.test(values.password),
    );
    if (unmet.length > 0)
      errors.password =
        "Your password does not meet all the requirements below.";
  }

  if (!values.confirmPassword)
    errors.confirmPassword = "Please confirm your password.";
  else if (values.confirmPassword !== values.password)
    errors.confirmPassword = "Passwords do not match.";

  const dateError = validateDateOfBirth(values.dateOfBirth);
  if (dateError) errors.dateOfBirth = dateError;

  if (values.city.trim() && values.city.trim().length < 2)
    errors.city = "Please enter a valid city name.";

  if (!values.terms)
    errors.terms =
      "Please accept the Terms of Service and Privacy Policy to continue.";

  return errors;
}

export function isSignupValid(values: SignupValues): boolean {
  return Object.keys(validateSignup(values)).length === 0;
}

/** Order used to move focus to the first field that needs attention. */
export const signupFieldOrder: SignupField[] = [
  "fullName",
  "phone",
  "email",
  "password",
  "confirmPassword",
  "dateOfBirth",
  "city",
  "terms",
];

export type SignupPayload = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  dateOfBirth?: string;
  gender?: Exclude<Gender, "">;
  city?: string;
  newsletter: boolean;
};

/** Shapes the form state into the request body the future REST endpoint expects. */
export function toSignupPayload(values: SignupValues): SignupPayload {
  return {
    fullName: values.fullName.trim(),
    phone: toInternationalNumber(values.phone, values.countryCode),
    email: values.email.trim().toLowerCase(),
    password: values.password,
    ...(values.dateOfBirth ? { dateOfBirth: values.dateOfBirth } : {}),
    ...(values.gender ? { gender: values.gender } : {}),
    ...(values.city.trim() ? { city: values.city.trim() } : {}),
    newsletter: values.newsletter,
  };
}
