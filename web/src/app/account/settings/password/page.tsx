"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";

export default function ChangePasswordPage() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    // Simulate API call
    setTimeout(() => {
      setStatus("success");
    }, 1500);
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
            Your account password has been updated. You will use this new password next time you sign in.
          </p>
          <Link
            href="/account/settings"
            className="mt-6 inline-flex justify-center rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-800"
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
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm border border-[#e5e2d8] text-[#0d4d3b] mb-4">
             <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold text-[#17211d]">Change Password</h1>
          <p className="mt-2 text-sm text-[#69726d]">
            Ensure your account is using a long, random password to stay secure.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 flex flex-col gap-6">
          {status === "error" && (
            <div className="flex items-start gap-3 rounded-md bg-red-50 p-4 text-sm text-red-800">
               <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
               <p>The current password you entered is incorrect. Please try again.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#17211d] mb-1.5">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                required
                className="w-full rounded-md border border-[#e5e2d8] px-4 py-2.5 text-sm focus:border-[#0d4d3b] focus:outline-none focus:ring-1 focus:ring-[#0d4d3b]"
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

          <div className="border-t border-[#e5e2d8] pt-6">
            <label className="block text-sm font-medium text-[#17211d] mb-1.5">New Password</label>
            <div className="relative mb-3">
              <input
                type={showNew ? "text" : "password"}
                required
                className="w-full rounded-md border border-[#e5e2d8] px-4 py-2.5 text-sm focus:border-[#0d4d3b] focus:outline-none focus:ring-1 focus:ring-[#0d4d3b]"
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

            {/* Simple password strength indicator for UI purposes */}
            <div className="flex gap-1 mb-2">
              <div className="h-1 flex-1 rounded-full bg-green-500"></div>
              <div className="h-1 flex-1 rounded-full bg-green-500"></div>
              <div className="h-1 flex-1 rounded-full bg-gray-200"></div>
              <div className="h-1 flex-1 rounded-full bg-gray-200"></div>
            </div>
            <p className="text-xs text-[#8d948f]">Password strength: Fair</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#17211d] mb-1.5">Confirm New Password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                required
                className="w-full rounded-md border border-[#e5e2d8] px-4 py-2.5 text-sm focus:border-[#0d4d3b] focus:outline-none focus:ring-1 focus:ring-[#0d4d3b]"
                placeholder="Confirm new password"
              />
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-3">
             <Link
                href="/account/settings"
                className="inline-flex justify-center rounded-md border border-[#e5e2d8] bg-white px-4 py-2.5 text-sm font-medium text-[#17211d] hover:bg-[#faf9f4]"
             >
                Cancel
             </Link>
             <button
                type="submit"
                disabled={status === "submitting"}
                className="inline-flex justify-center rounded-md bg-[#0d4d3b] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#073a2d] disabled:opacity-50 disabled:cursor-not-allowed"
             >
                {status === "submitting" ? "Updating..." : "Update Password"}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
