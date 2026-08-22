"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { loginUser } from "@/services/authService";
import { CheckboxRow } from "@/components/signup/checkbox-row";
import {
  controlClass,
  FormField,
  ICON_WRAP,
} from "@/components/signup/form-field";
import { PasswordInput } from "@/components/signup/password-input";
import { SocialSignup } from "@/components/signup/social-signup";
import {
  AlertIcon,
  ArrowRightIcon,
  MailIcon,
  PhoneIcon,
  SpinnerIcon,
} from "@/components/signup/icons";
import { SigninSuccess } from "./signin-success";
import {
  detectIdentifierKind,
  initialSigninValues,
  isSigninValid,
  signinFieldOrder,
  toSigninPayload,
  validateSignin,
  type SigninField,
  type SigninValues,
} from "./signin-validation";

type Status = "idle" | "submitting" | "success";

const FIELD_IDS: Record<SigninField, string> = {
  identifier: "signin-identifier",
  password: "signin-password",
  remember: "signin-remember",
};

const RESET_HELP_ID = "signin-reset-help";

export function SigninForm() {
  const [values, setValues] = useState<SigninValues>(initialSigninValues);
  const [touched, setTouched] = useState<Partial<Record<SigninField, boolean>>>(
    {},
  );
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resetHelpOpen, setResetHelpOpen] = useState(false);

  const errors = useMemo(() => validateSignin(values), [values]);
  const formIsValid = useMemo(() => isSigninValid(values), [values]);
  const identifierKind = detectIdentifierKind(values.identifier);

  /** An error is only surfaced once the visitor has left the field or tried to submit. */
  const errorFor = (field: SigninField) =>
    touched[field] || submitAttempted ? errors[field] : undefined;

  const setValue = <K extends SigninField>(field: K, value: SigninValues[K]) =>
    setValues((current) => ({ ...current, [field]: value }));

  const markTouched = (field: SigninField) =>
    setTouched((current) => ({ ...current, [field]: true }));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitAttempted(true);
    setSubmitError(null);

    const currentErrors = validateSignin(values);
    if (Object.keys(currentErrors).length > 0) {
      const firstInvalid = signinFieldOrder.find(
        (field) => currentErrors[field],
      );
      const targetId = firstInvalid ? FIELD_IDS[firstInvalid] : undefined;
      if (targetId) document.getElementById(targetId)?.focus();
      return;
    }

    setStatus("submitting");
    try {
      // Simulated for now — swap the service body for the Express endpoint later.
      await loginUser(toSigninPayload(values));
      setStatus("success");
    } catch {
      setStatus("idle");
      // Deliberately vague: never reveal which half of the credentials was wrong.
      setSubmitError(
        "We could not sign you in. Please check your details and try again.",
      );
    }
  };

  if (status === "success")
    return <SigninSuccess identifier={values.identifier.trim()} />;

  const submitting = status === "submitting";
  const identifierIsPhone = identifierKind === "phone";

  return (
    <div className="auth-fade-up">
      <header>
        <p className="text-[11px] font-bold tracking-[.2em] text-[#c79a45]">
          SIGN IN TO YOUR ACCOUNT
        </p>
        <h2 className="font-heading mt-3 text-[26px] font-semibold leading-tight text-[#17211d] sm:text-3xl">
          Good to See You Again
        </h2>
        <p className="mt-2.5 text-sm leading-6 text-[#69726d]">
          Use the email address or phone number you registered with.
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
          id={FIELD_IDS.identifier}
          name="identifier"
          label="Email or Phone Number"
          error={errorFor("identifier")}
          hint="Either one works — whichever you signed up with."
        >
          {(field) => (
            <div className="relative">
              {identifierIsPhone ? (
                <PhoneIcon className={ICON_WRAP} />
              ) : (
                <MailIcon className={ICON_WRAP} />
              )}
              <input
                {...field}
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={values.identifier}
                onChange={(event) => setValue("identifier", event.target.value)}
                onBlur={() => markTouched("identifier")}
                placeholder="you@example.com or 01712345678"
                className={controlClass(Boolean(errorFor("identifier")))}
              />
            </div>
          )}
        </FormField>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <label
              htmlFor={FIELD_IDS.password}
              className="text-[13px] font-medium text-[#17211d]"
            >
              Password
            </label>
            {/* Password reset needs the API, so this discloses the interim route
                instead of linking to a page that does not exist yet. */}
            <button
              type="button"
              onClick={() => setResetHelpOpen((current) => !current)}
              aria-expanded={resetHelpOpen}
              aria-controls={RESET_HELP_ID}
              className="text-[12px] font-medium text-[#0d4d3b] underline decoration-[#c79a45] underline-offset-2 transition-colors hover:text-[#073a2d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
            >
              Forgot password?
            </button>
          </div>
          <PasswordInput
            field={{
              id: FIELD_IDS.password,
              name: "password",
              "aria-invalid": errorFor("password") ? true : undefined,
              "aria-describedby": errorFor("password")
                ? `${FIELD_IDS.password}-error`
                : undefined,
            }}
            value={values.password}
            onChange={(value) => setValue("password", value)}
            onBlur={() => markTouched("password")}
            placeholder="Enter your password"
            autoComplete="current-password"
            hasError={Boolean(errorFor("password"))}
            toggleLabel="password"
          />
          {errorFor("password") ? (
            <p
              id={`${FIELD_IDS.password}-error`}
              className="mt-1.5 flex items-start gap-1.5 text-[12.5px] font-medium leading-5 text-[#9c3a22]"
            >
              <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{errorFor("password")}</span>
            </p>
          ) : null}

          {resetHelpOpen ? (
            <p
              id={RESET_HELP_ID}
              className="mt-2 rounded-md bg-[#faf9f4] p-3 text-[12px] leading-5 text-[#69726d]"
            >
              Online password reset is coming soon. In the meantime, please{" "}
              <Link
                href="/contact"
                className="font-medium text-[#0d4d3b]! underline decoration-[#c79a45] underline-offset-2 hover:text-[#073a2d]!"
              >
                contact the mosque office
              </Link>{" "}
              and we will help you back into your account.
            </p>
          ) : null}
        </div>

        <div className="mt-1 rounded-md bg-[#faf9f4] p-3.5">
          <CheckboxRow
            id={FIELD_IDS.remember}
            name="remember"
            checked={values.remember}
            onChange={(checked) => setValue("remember", checked)}
          >
            Keep me signed in on this device.
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
                Signing In...
              </>
            ) : (
              <>
                Sign In
                <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </>
            )}
          </button>

          <p
            aria-live="polite"
            className="mt-2 text-center text-[12px] leading-5 text-[#8d948f]"
          >
            {submitting
              ? "Checking your details, one moment."
              : !formIsValid
                ? "Enter your email or phone and password to continue."
                : "You're all set — sign in."}
          </p>
        </div>
      </form>

      <SocialSignup mode="signin" />

      <p className="mt-6 border-t border-[#ece9df] pt-5 text-center text-[13px] text-[#69726d]">
        New to the community?{" "}
        <Link
          href="/signup"
          className="font-semibold text-[#0d4d3b]! underline decoration-[#c79a45] decoration-2 underline-offset-4 transition-colors hover:text-[#073a2d]! focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
