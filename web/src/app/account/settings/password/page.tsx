"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, CheckCircle2, ShieldCheck, AlertCircle, Loader2, Check, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { changePassword } from "@/services/authService";

export default function ChangePasswordPage() {
  const { token, session } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
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
  const isPasswordValid = minLength && hasUpper && hasLower && hasNumber && hasSpecial;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isSameAsCurrent = currentPassword.length > 0 && currentPassword === newPassword;

  const canSubmit = currentPassword.length > 0 && isPasswordValid && passwordsMatch && !isSameAsCurrent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!token || !session) {
      setStatus("error");
      setErrorMessage("You must be signed in to change your password.");
      return;
    }

    if (isSameAsCurrent) {
      setStatus("error");
      setErrorMessage("The new password must be different from your current password.");
      return;
    }

    if (!canSubmit) {
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    try {
      await changePassword(token, { currentPassword, newPassword });
      setStatus("success");
    } catch (err: unknown) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Incorrect current password or invalid new password. Please try again.",
      );
    }
  };

  if (status === "success") {
    return (
      <div className="mx-auto max-w-xl flex flex-col gap-6">
        <Link
          href="/account/settings"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#69726d] hover:text-[#17211d]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-green-900">Password Changed Successfully</h2>
          <p className="mt-2 text-sm text-green-800">
            Your account password has been updated. Other active sessions have been signed out for your security.
          </p>
          <Link
            href="/account/settings"
            className="mt-6 inline-flex justify-center rounded-md bg-[#073a2d] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0b503f]"
          >
            Return to Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl flex flex-col gap-6">
      <Link
        href="/account/settings"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#69726d] hover:text-[#17211d]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Settings
      </Link>

      <div className="rounded-xl border border-[#e5e2d8] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[#e5e2d8] bg-[#faf9f4] p-6 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm border border-[#e5e2d8] text-[#073a2d] mb-4">
            <ShieldCheck className="h-6 w-6 text-[#073a2d]" />
          </div>
          <h1 className="text-2xl font-semibold text-[#17211d]">Change Password</h1>
          <p className="mt-2 text-sm text-[#69726d]">
            Ensure your account is using a strong password with letters, numbers, and symbols.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 flex flex-col gap-6">
          {status === "error" && (
            <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-800 border border-red-200">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
              <p>{errorMessage}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#17211d] mb-1.5 uppercase tracking-wider">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-md border border-[#e5e2d8] px-4 py-2.5 pr-10 text-sm focus:border-[#073a2d] focus:outline-none focus:ring-1 focus:ring-[#073a2d] bg-white"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8d948f] hover:text-[#17211d]"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="border-t border-[#e5e2d8] pt-6 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-[#17211d] mb-1.5 uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onBlur={() => setTouched(true)}
                  className="w-full rounded-md border border-[#e5e2d8] px-4 py-2.5 pr-10 text-sm focus:border-[#073a2d] focus:outline-none focus:ring-1 focus:ring-[#073a2d] bg-white"
                  placeholder="Enter new password"
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
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setTouched(true)}
                  className="w-full rounded-md border border-[#e5e2d8] px-4 py-2.5 pr-10 text-sm focus:border-[#073a2d] focus:outline-none focus:ring-1 focus:ring-[#073a2d] bg-white"
                  placeholder="Confirm new password"
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
              {isSameAsCurrent && (
                <p className="mt-1.5 text-xs text-amber-600">New password must be different from current password.</p>
              )}
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-3 border-t border-[#e5e2d8] pt-6">
            <Link
              href="/account/settings"
              className="inline-flex justify-center rounded-md border border-[#e5e2d8] bg-white px-4 py-2.5 text-sm font-medium text-[#17211d] hover:bg-[#faf9f4]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!canSubmit || status === "submitting"}
              className="inline-flex items-center gap-2 justify-center rounded-md bg-[#073a2d] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0b503f] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "submitting" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
