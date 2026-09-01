"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { IslamicTexture } from "@/components/islamic-texture";
import { siteConfig } from "@/config/site";
import { useToast } from "@/components/ui/toast";
import { resetPassword } from "@/services/authService";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  X,
} from "lucide-react";

function ResetPasswordForm() {
  const { notify } = useToast();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const minLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isPasswordValid = minLength && hasUpper && hasLower && hasNumber && hasSpecial;
  const canSubmit = isPasswordValid && passwordsMatch && token.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!canSubmit) {
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    try {
      await resetPassword({ token, newPassword });
      setStatus("success");
      notify({
        tone: "success",
        message: "Password reset complete",
        description: "Your password has been updated. You can now sign in.",
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Invalid or expired reset token. Please request a new recovery link.";
      setStatus("error");
      setErrorMessage(msg);
      notify({
        tone: "danger",
        message: "Password reset failed",
        description: msg,
      });
    }
  };

  if (!token) {
    return (
      <div className="text-center py-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-4 border border-amber-200">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-semibold text-[#17211d]">Missing Reset Token</h2>
        <p className="mt-2 text-sm text-[#5b6b66] leading-6">
          The password reset link is invalid or incomplete. Please request a fresh reset link.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-[#073a2d] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0b503f]"
        >
          Request Reset Link
        </Link>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="text-center py-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-[#073a2d] mb-4 border border-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-[#0d4d3b]" />
        </div>
        <h2 className="text-2xl font-semibold text-[#17211d]">Password Reset Complete</h2>
        <p className="mt-3 text-sm leading-6 text-[#5b6b66]">
          Your password has been successfully updated. All previous sessions have been signed out for your security.
        </p>
        <div className="mt-8">
          <Link
            href="/signin"
            className="inline-flex w-full items-center justify-center rounded-md bg-[#073a2d] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0b503f]"
          >
            Sign In with New Password
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[#e5e2d8]">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#f8f6ef] text-[#c79a45] border border-[#e5e2d8]">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#17211d]">Set New Password</h2>
          <p className="text-xs text-[#5b6b66]">Choose a strong password to secure your account.</p>
        </div>
      </div>

      {status === "error" && (
        <div className="mb-5 flex flex-col gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-800 border border-red-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <p>{errorMessage}</p>
          </div>
          <Link
            href="/forgot-password"
            className="text-xs font-semibold text-red-900 underline ml-7 hover:text-red-700"
          >
            Request a new reset link &rarr;
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-xs font-medium text-[#17211d] mb-1.5 uppercase tracking-wider">
            New Password
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8d948f]">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type={showNew ? "text" : "password"}
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Enter new password"
              className="w-full rounded-md border border-[#e5e2d8] py-2.5 pl-10 pr-10 text-sm transition-colors focus:border-[#073a2d] focus:outline-none focus:ring-1 focus:ring-[#073a2d] bg-white"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8d948f] hover:text-[#17211d]"
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Password Strength Checklist */}
        <div className="rounded-lg bg-[#f8f6ef] p-3.5 border border-[#e5e2d8] text-xs">
          <p className="font-medium text-[#17211d] mb-2">Password Requirements:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[#5b6b66]">
            <div className="flex items-center gap-1.5">
              {minLength ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-gray-400" />}
              <span className={minLength ? "text-emerald-700 font-medium" : ""}>8+ characters</span>
            </div>
            <div className="flex items-center gap-1.5">
              {hasUpper ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-gray-400" />}
              <span className={hasUpper ? "text-emerald-700 font-medium" : ""}>Uppercase letter</span>
            </div>
            <div className="flex items-center gap-1.5">
              {hasLower ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-gray-400" />}
              <span className={hasLower ? "text-emerald-700 font-medium" : ""}>Lowercase letter</span>
            </div>
            <div className="flex items-center gap-1.5">
              {hasNumber ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-gray-400" />}
              <span className={hasNumber ? "text-emerald-700 font-medium" : ""}>Number</span>
            </div>
            <div className="flex items-center gap-1.5 sm:col-span-2">
              {hasSpecial ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-gray-400" />}
              <span className={hasSpecial ? "text-emerald-700 font-medium" : ""}>Special character (!@#$%^&*)</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#17211d] mb-1.5 uppercase tracking-wider">
            Confirm New Password
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8d948f]">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type={showConfirm ? "text" : "password"}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Confirm new password"
              className="w-full rounded-md border border-[#e5e2d8] py-2.5 pl-10 pr-10 text-sm transition-colors focus:border-[#073a2d] focus:outline-none focus:ring-1 focus:ring-[#073a2d] bg-white"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8d948f] hover:text-[#17211d]"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {touched && confirmPassword.length > 0 && !passwordsMatch && (
            <p className="mt-1.5 text-xs text-red-600">Passwords do not match.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit || status === "submitting"}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#073a2d] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#0b503f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#073a2d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "submitting" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Resetting Password...
            </>
          ) : (
            "Reset Password"
          )}
        </button>

        <div className="mt-2 text-center">
          <Link
            href="/signin"
            className="inline-flex items-center gap-2 text-xs font-medium text-[#5b6b66] hover:text-[#073a2d] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Sign In
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex flex-col bg-[#f8f6ef]">
      <SiteHeader />

      {/* Header Banner */}
      <section className="relative overflow-hidden bg-[#073a2d] px-5 pb-12 pt-28 text-white sm:pt-32 lg:px-8">
        <IslamicTexture
          variant="hero"
          position="right"
          opacity={0.08}
          className="-right-28 -top-16 h-100 w-100 bg-contain"
        />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-[#e0be79]">
            {siteConfig.fullName.toUpperCase()} · ACCOUNT RECOVERY
          </p>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            Choose a New Password
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/75 sm:text-[15px]">
            Please enter your new credentials below to restore account access.
          </p>
        </div>
      </section>

      {/* Main Content Card */}
      <section className="flex-1 mx-auto w-full max-w-lg px-5 py-12">
        <div className="rounded-xl border border-[#e5e2d8] bg-white p-6 shadow-[0_18px_50px_rgba(7,58,45,.09)] sm:p-8">
          <Suspense fallback={<div className="p-8 text-center text-sm text-[#5b6b66]"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
