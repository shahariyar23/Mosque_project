"use client";

import Link from "next/link";
import { LockKeyhole, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

export default function SettingsPage() {
  const { session, logout } = useAuth();
  return <div className="flex flex-col gap-6"><header><h1 className="text-2xl font-semibold text-[#17211d]">Settings</h1><p className="mt-1 text-sm text-[#69726d]">Manage your authenticated account preferences and security.</p></header><section className="rounded-xl border border-[#e5e2d8] bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-[#e5e2d8] px-6 py-4"><UserRound className="h-5 w-5 text-[#0d4d3b]" /><h2 className="font-semibold text-[#17211d]">Account</h2></div><div className="p-6"><p className="font-medium text-[#17211d]">{session?.user.name}</p><p className="mt-1 text-sm text-[#69726d]">Your profile is tied to your signed in mosque account.</p><Link href="/account/profile" className="mt-4 inline-flex text-sm font-semibold text-[#0d4d3b] hover:underline">Edit profile</Link></div></section><section className="rounded-xl border border-[#e5e2d8] bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-[#e5e2d8] px-6 py-4"><LockKeyhole className="h-5 w-5 text-[#0d4d3b]" /><h2 className="font-semibold text-[#17211d]">Security</h2></div><div className="flex flex-wrap items-center justify-between gap-4 p-6"><Link href="/account/settings/password" className="text-sm font-semibold text-[#0d4d3b] hover:underline">Change password</Link><button type="button" onClick={logout} className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Sign out</button></div></section></div>;
}
