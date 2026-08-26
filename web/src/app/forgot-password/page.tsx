"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { IslamicTexture } from "@/components/islamic-texture";
import { siteConfig } from "@/config/site";
import { forgotPassword } from "@/services/authService";
import { ArrowLeft, CheckCircle2, KeyRound, Mail, AlertCircle, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const showError = touched && !emailIsValid && email.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!emailIsValid) {
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    try {
      await forgotPassword({ email: email.trim() });
      setStatus("success");
    } catch (err: unknown) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to request password reset.");
    }
  };

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
            {siteConfig.fullName.toUpperCase()} · ACCOUNT SECURITY
          </p>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            Reset Your Password
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/75 sm:text-[15px]">
            We will help you regain access to your account with a secure recovery link.
          </p>
        </div>
      </section>

      {/* Main Content Card */}
      <section className="flex-1 mx-auto w-full max-w-lg px-5 py-12">
        <div className="rounded-xl border border-[#e5e2d8] bg-white p-6 shadow-[0_18px_50px_rgba(7,58,45,.09)] sm:p-8">
          {status === "success" ? (
            <div className="text-center py-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-[#073a2d] mb-4 border border-emerald-100">
                <CheckCircle2 className="h-8 w-8 text-[#0d4d3b]" />
              </div>
              <h2 className="text-2xl font-semibold text-[#17211d]">Check Your Email</h2>
              <p className="mt-3 text-sm leading-6 text-[#5b6b66]">
                If an account exists for <span className="font-semibold text-[#17211d]">{email}</span>, a secure recovery link has been sent to your inbox.
              </p>
              <div className="mt-4 rounded-lg bg-[#f8f6ef] p-4 text-xs text-[#69726d] leading-5 text-left border border-[#e5e2d8]">
                <p>• The reset link is valid for <strong>30 minutes</strong>.</p>
                <p>• Check your spam or junk folder if you don&apos;t see the message in a few minutes.</p>
              </div>
              <div className="mt-8 flex flex-col gap-3">
                <Link
                  href="/signin"
                  className="inline-flex w-full items-center justify-center rounded-md bg-[#073a2d] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0b503f]"
                >
                  Return to Sign In
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setStatus("idle");
                    setEmail("");
                    setTouched(false);
                  }}
                  className="text-xs font-medium text-[#5b6b66] hover:text-[#073a2d] underline"
                >
                  Request another link
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[#e5e2d8]">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#f8f6ef] text-[#c79a45] border border-[#e5e2d8]">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#17211d]">Forgot Password?</h2>
                  <p className="text-xs text-[#5b6b66]">Enter your email to receive recovery instructions.</p>
                </div>
              </div>

              {status === "error" && (
                <div className="mb-5 flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-800 border border-red-200">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
                  <p>{errorMessage}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <label htmlFor="reset-email" className="block text-xs font-medium text-[#17211d] mb-1.5 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8d948f]">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="reset-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setTouched(true)}
                      placeholder="you@example.com"
                      className={`w-full rounded-md border py-2.5 pl-10 pr-4 text-sm transition-colors focus:outline-none focus:ring-1 ${
                        showError
                          ? "border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50/20"
                          : "border-[#e5e2d8] focus:border-[#073a2d] focus:ring-[#073a2d] bg-white"
                      }`}
                    />
                  </div>
                  {showError && (
                    <p className="mt-1.5 text-xs text-red-600">Please enter a valid email address.</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#073a2d] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#0b503f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#073a2d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === "submitting" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending Link...
                    </>
                  ) : (
                    "Send Reset Link"
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
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
