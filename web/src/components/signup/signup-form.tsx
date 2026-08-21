"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { registerUser } from "@/services/authService";
import { CheckboxRow } from "./checkbox-row";
import { controlClass, FormField, ICON_WRAP } from "./form-field";
import { PasswordInput } from "./password-input";
import { PasswordStrength } from "./password-strength";
import { PhoneInput } from "./phone-input";
import { SignupSuccess } from "./signup-success";
import { SocialSignup } from "./social-signup";
import {
  initialSignupValues,
  isSignupValid,
  signupFieldOrder,
  toSignupPayload,
  validateSignup,
  type Gender,
  type SignupField,
  type SignupValues,
} from "./signup-validation";
import {
  AlertIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  MailIcon,
  MapPinIcon,
  SpinnerIcon,
  UserIcon,
} from "./icons";

type Status = "idle" | "submitting" | "success";

const FIELD_IDS: Record<SignupField, string> = {
  fullName: "signup-full-name",
  countryCode: "signup-phone-country",
  phone: "signup-phone",
  email: "signup-email",
  password: "signup-password",
  confirmPassword: "signup-confirm-password",
  dateOfBirth: "signup-date-of-birth",
  gender: "signup-gender",
  city: "signup-city",
  terms: "signup-terms",
  newsletter: "signup-newsletter",
};

const PASSWORD_STRENGTH_ID = "signup-password-strength";

export function SignupForm() {
  const [values, setValues] = useState<SignupValues>(initialSignupValues);
  const [touched, setTouched] = useState<Partial<Record<SignupField, boolean>>>(
    {},
  );
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const dateOfBirthRef = useRef<HTMLInputElement | null>(null);

  // Cap the native date picker at today. Applied to the DOM after mount so the
  // server-rendered markup has nothing time-dependent to hydrate against.
  useEffect(() => {
    dateOfBirthRef.current?.setAttribute(
      "max",
      new Date().toISOString().slice(0, 10),
    );
  }, []);

  const errors = useMemo(() => validateSignup(values), [values]);
  const formIsValid = useMemo(() => isSignupValid(values), [values]);

  /** An error is only surfaced once the visitor has left the field or tried to submit. */
  const errorFor = (field: SignupField) =>
    touched[field] || submitAttempted ? errors[field] : undefined;

  const setValue = <K extends SignupField>(field: K, value: SignupValues[K]) =>
    setValues((current) => ({ ...current, [field]: value }));

  const markTouched = (field: SignupField) =>
    setTouched((current) => ({ ...current, [field]: true }));

  const passwordsMatch =
    values.password.length > 0 &&
    values.confirmPassword.length > 0 &&
    values.password === values.confirmPassword;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitAttempted(true);
    setSubmitError(null);

    const currentErrors = validateSignup(values);
    if (Object.keys(currentErrors).length > 0) {
      const firstInvalid = signupFieldOrder.find(
        (field) => currentErrors[field],
      );
      const targetId = firstInvalid ? FIELD_IDS[firstInvalid] : undefined;
      if (targetId) document.getElementById(targetId)?.focus();
      return;
    }

    setStatus("submitting");
    try {
      // Simulated for now — swap the service body for the Express endpoint later.
      await registerUser(toSignupPayload(values));
      setStatus("success");
    } catch {
      setStatus("idle");
      setSubmitError(
        "Something went wrong while creating your account. Please try again.",
      );
    }
  };

  if (status === "success") return <SignupSuccess fullName={values.fullName} />;

  const submitting = status === "submitting";

  return (
    <div className="auth-fade-up">
      <header>
        <p className="text-[11px] font-bold tracking-[.2em] text-[#c79a45]">
          CREATE YOUR ACCOUNT
        </p>
        <h2 className="font-heading mt-3 text-[26px] font-semibold leading-tight text-[#17211d] sm:text-3xl">
          Join Our Community
        </h2>
        <p className="mt-2.5 text-sm leading-6 text-[#69726d]">
          Create your account to stay connected with your mosque and community.
        </p>
      </header>

      {submitError ? (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2.5 rounded-md border border-[#e3c4bb] bg-[#fdf4f1] p-3 text-[13px] leading-6 text-[#9c3a22]"
        >
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="mt-6 grid gap-4">
        <FormField
          id={FIELD_IDS.fullName}
          name="fullName"
          label="Full Name"
          error={errorFor("fullName")}
        >
          {(field) => (
            <div className="relative">
              <UserIcon className={ICON_WRAP} />
              <input
                {...field}
                type="text"
                autoComplete="name"
                value={values.fullName}
                onChange={(event) => setValue("fullName", event.target.value)}
                onBlur={() => markTouched("fullName")}
                placeholder="Enter your full name"
                className={controlClass(Boolean(errorFor("fullName")))}
              />
            </div>
          )}
        </FormField>

        <FormField
          id={FIELD_IDS.phone}
          name="phone"
          label="Phone Number"
          error={errorFor("phone")}
          hint="Used only for mosque updates and account recovery."
        >
          {(field) => (
            <PhoneInput
              field={field}
              countryCode={values.countryCode}
              value={values.phone}
              onCountryChange={(code) => setValue("countryCode", code)}
              onChange={(value) => setValue("phone", value)}
              onBlur={() => markTouched("phone")}
              hasError={Boolean(errorFor("phone"))}
            />
          )}
        </FormField>

        <FormField
          id={FIELD_IDS.email}
          name="email"
          label="Email Address"
          error={errorFor("email")}
        >
          {(field) => (
            <div className="relative">
              <MailIcon className={ICON_WRAP} />
              <input
                {...field}
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={(event) => setValue("email", event.target.value)}
                onBlur={() => markTouched("email")}
                placeholder="you@example.com"
                className={controlClass(Boolean(errorFor("email")))}
              />
            </div>
          )}
        </FormField>

        <div>
          <FormField
            id={FIELD_IDS.password}
            name="password"
            label="Password"
            error={errorFor("password")}
            extraDescribedBy={PASSWORD_STRENGTH_ID}
          >
            {(field) => (
              <PasswordInput
                field={field}
                value={values.password}
                onChange={(value) => setValue("password", value)}
                onBlur={() => markTouched("password")}
                placeholder="Create a strong password"
                autoComplete="new-password"
                hasError={Boolean(errorFor("password"))}
                toggleLabel="password"
              />
            )}
          </FormField>
          <PasswordStrength
            id={PASSWORD_STRENGTH_ID}
            password={values.password}
          />
        </div>

        <div>
          <FormField
            id={FIELD_IDS.confirmPassword}
            name="confirmPassword"
            label="Confirm Password"
            error={errorFor("confirmPassword")}
          >
            {(field) => (
              <PasswordInput
                field={field}
                value={values.confirmPassword}
                onChange={(value) => setValue("confirmPassword", value)}
                onBlur={() => markTouched("confirmPassword")}
                placeholder="Confirm your password"
                autoComplete="new-password"
                hasError={Boolean(errorFor("confirmPassword"))}
                toggleLabel="confirm password"
              />
            )}
          </FormField>
          {passwordsMatch ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-medium text-[#0d4d3b]">
              <CheckIcon className="h-3.5 w-3.5 shrink-0" />
              Passwords match
            </p>
          ) : null}
        </div>

        <div className="mt-1 border-t border-[#ece9df] pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#9aa19c]">
            A little about you{" "}
            <span className="font-normal normal-case tracking-normal">
              — optional
            </span>
          </p>

          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <FormField
              id={FIELD_IDS.dateOfBirth}
              name="dateOfBirth"
              label="Date of Birth"
              error={errorFor("dateOfBirth")}
              optional
              secondary
            >
              {(field) => (
                <div className="relative">
                  <CalendarIcon className={ICON_WRAP} />
                  <input
                    {...field}
                    ref={dateOfBirthRef}
                    type="date"
                    autoComplete="bday"
                    min="1900-01-01"
                    value={values.dateOfBirth}
                    onChange={(event) =>
                      setValue("dateOfBirth", event.target.value)
                    }
                    onBlur={() => markTouched("dateOfBirth")}
                    className={controlClass(Boolean(errorFor("dateOfBirth")))}
                  />
                </div>
              )}
            </FormField>

            <FormField
              id={FIELD_IDS.gender}
              name="gender"
              label="Gender"
              optional
              secondary
            >
              {(field) => (
                <div className="relative">
                  <select
                    {...field}
                    value={values.gender}
                    onChange={(event) =>
                      setValue("gender", event.target.value as Gender)
                    }
                    className={`${controlClass(false, false)} cursor-pointer appearance-none pr-9`}
                  >
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d948f]" />
                </div>
              )}
            </FormField>
          </div>

          <div className="mt-4">
            <FormField
              id={FIELD_IDS.city}
              name="city"
              label="City / Location"
              error={errorFor("city")}
              optional
              secondary
              hint="Helps us share programmes and services near you."
            >
              {(field) => (
                <div className="relative">
                  <MapPinIcon className={ICON_WRAP} />
                  <input
                    {...field}
                    type="text"
                    autoComplete="address-level2"
                    value={values.city}
                    onChange={(event) => setValue("city", event.target.value)}
                    onBlur={() => markTouched("city")}
                    placeholder="Enter your city"
                    className={controlClass(Boolean(errorFor("city")))}
                  />
                </div>
              )}
            </FormField>
          </div>
        </div>

        <div className="mt-1 grid gap-3 rounded-md bg-[#faf9f4] p-3.5">
          <CheckboxRow
            id={FIELD_IDS.terms}
            name="terms"
            checked={values.terms}
            onChange={(checked) => {
              setValue("terms", checked);
              markTouched("terms");
            }}
            error={errorFor("terms")}
          >
            I agree to the{" "}
            <Link
              href="/terms"
              className="font-medium text-[#0d4d3b]! underline decoration-[#c79a45] underline-offset-2 hover:text-[#073a2d]!"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="font-medium text-[#0d4d3b]! underline decoration-[#c79a45] underline-offset-2 hover:text-[#073a2d]!"
            >
              Privacy Policy
            </Link>
            .
          </CheckboxRow>

          <CheckboxRow
            id={FIELD_IDS.newsletter}
            name="newsletter"
            checked={values.newsletter}
            onChange={(checked) => setValue("newsletter", checked)}
          >
            Send me mosque announcements, events and community updates.
          </CheckboxRow>
        </div>

        <div className="mt-1">
          <button
            type="submit"
            disabled={!formIsValid || submitting}
            className="group flex w-full items-center justify-center gap-2 rounded-md bg-[#0d4d3b] px-5 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#073a2d] hover:shadow-[0_10px_24px_rgba(13,77,59,.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b] disabled:cursor-not-allowed disabled:bg-[#9fb1a8] disabled:shadow-none disabled:hover:translate-y-0"
          >
            {submitting ? (
              <>
                <SpinnerIcon className="h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                Create Account
                <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </>
            )}
          </button>

          <p
            aria-live="polite"
            className="mt-2 text-center text-[12px] leading-5 text-[#8d948f]"
          >
            {submitting
              ? "Setting up your account, one moment."
              : !formIsValid
                ? "Complete the required fields above to continue."
                : "You're all set — create your account."}
          </p>
        </div>
      </form>

      <SocialSignup />

      <p className="mt-6 border-t border-[#ece9df] pt-5 text-center text-[13px] text-[#69726d]">
        Already have an account?{" "}
        <Link
          href="/signin"
          className="font-semibold text-[#0d4d3b]! underline decoration-[#c79a45] decoration-2 underline-offset-4 transition-colors hover:text-[#073a2d]! focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
        >
          Sign In
        </Link>
      </p>
    </div>
  );
}
