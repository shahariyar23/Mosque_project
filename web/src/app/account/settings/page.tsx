import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UserRound, LockKeyhole, Bell, ShieldCheck, LogOut, Trash2, ChevronRight } from "lucide-react";

export default async function SettingsPage() {
  const session = getSession();

  if (!session) {
    redirect("/signin");
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#17211d]">Settings</h1>
        <p className="mt-1 text-sm text-[#69726d]">
          Manage your account preferences and security.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Account Section */}
        <section className="rounded-xl border border-[#e5e2d8] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#e5e2d8] px-6 py-4 flex items-center gap-2">
            <UserRound className="h-5 w-5 text-[#0d4d3b]" />
            <h2 className="font-semibold text-[#17211d]">Account Details</h2>
          </div>
          <div className="divide-y divide-[#e5e2d8]">
            <Link href="/account/profile" className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-[#faf9f4]">
               <div>
                  <p className="text-sm font-medium text-[#17211d]">Profile Information</p>
                  <p className="text-sm text-[#69726d]">Update your name, birthday, and gender.</p>
               </div>
               <ChevronRight className="h-5 w-5 text-[#8d948f]" />
            </Link>
            <div className="flex items-center justify-between px-6 py-4">
               <div>
                  <p className="text-sm font-medium text-[#17211d]">Email Address</p>
                  <p className="text-sm text-[#69726d]">mostak.shahariyar@example.com</p>
               </div>
               <button className="text-sm font-medium text-[#0d4d3b] hover:underline">Edit</button>
            </div>
            <div className="flex items-center justify-between px-6 py-4">
               <div>
                  <p className="text-sm font-medium text-[#17211d]">Phone Number</p>
                  <p className="text-sm text-[#69726d]">+880 1711-223344</p>
               </div>
               <button className="text-sm font-medium text-[#0d4d3b] hover:underline">Edit</button>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="rounded-xl border border-[#e5e2d8] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#e5e2d8] px-6 py-4 flex items-center gap-2">
            <LockKeyhole className="h-5 w-5 text-[#0d4d3b]" />
            <h2 className="font-semibold text-[#17211d]">Security</h2>
          </div>
          <div className="divide-y divide-[#e5e2d8]">
            <Link href="/account/settings/password" className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-[#faf9f4]">
               <div>
                  <p className="text-sm font-medium text-[#17211d]">Change Password</p>
                  <p className="text-sm text-[#69726d]">Update your password to keep your account secure.</p>
               </div>
               <ChevronRight className="h-5 w-5 text-[#8d948f]" />
            </Link>
            <div className="flex items-center justify-between px-6 py-4">
               <div>
                  <p className="text-sm font-medium text-[#17211d]">Active Sessions</p>
                  <p className="text-sm text-[#69726d]">Manage devices where you are currently logged in.</p>
               </div>
               <button className="text-sm font-medium text-[#0d4d3b] hover:underline">View</button>
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="rounded-xl border border-[#e5e2d8] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#e5e2d8] px-6 py-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#0d4d3b]" />
            <h2 className="font-semibold text-[#17211d]">Notifications</h2>
          </div>
          <div className="p-6 flex flex-col gap-5">
             <div className="flex items-start gap-3">
                <div className="flex h-5 items-center">
                  <input id="email-notif" type="checkbox" defaultChecked className="h-4 w-4 rounded border-[#e5e2d8] text-[#0d4d3b] focus:ring-[#0d4d3b]" />
                </div>
                <div>
                  <label htmlFor="email-notif" className="text-sm font-medium text-[#17211d]">Email Notifications</label>
                  <p className="text-sm text-[#69726d]">Receive emails about your account activity.</p>
                </div>
             </div>
             <div className="flex items-start gap-3">
                <div className="flex h-5 items-center">
                  <input id="event-notif" type="checkbox" defaultChecked className="h-4 w-4 rounded border-[#e5e2d8] text-[#0d4d3b] focus:ring-[#0d4d3b]" />
                </div>
                <div>
                  <label htmlFor="event-notif" className="text-sm font-medium text-[#17211d]">Event Reminders</label>
                  <p className="text-sm text-[#69726d]">Get notified before an event you registered for starts.</p>
                </div>
             </div>
             <div className="flex items-start gap-3">
                <div className="flex h-5 items-center">
                  <input id="donation-notif" type="checkbox" defaultChecked className="h-4 w-4 rounded border-[#e5e2d8] text-[#0d4d3b] focus:ring-[#0d4d3b]" />
                </div>
                <div>
                  <label htmlFor="donation-notif" className="text-sm font-medium text-[#17211d]">Donation Receipts</label>
                  <p className="text-sm text-[#69726d]">Automatically send receipts after a successful donation.</p>
                </div>
             </div>
             <div className="flex items-start gap-3">
                <div className="flex h-5 items-center">
                  <input id="mosque-notif" type="checkbox" defaultChecked className="h-4 w-4 rounded border-[#e5e2d8] text-[#0d4d3b] focus:ring-[#0d4d3b]" />
                </div>
                <div>
                  <label htmlFor="mosque-notif" className="text-sm font-medium text-[#17211d]">Mosque Announcements</label>
                  <p className="text-sm text-[#69726d]">Important updates and news from NOOR Mosque.</p>
                </div>
             </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="rounded-xl border border-[#e5e2d8] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#e5e2d8] px-6 py-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#0d4d3b]" />
            <h2 className="font-semibold text-[#17211d]">Privacy</h2>
          </div>
          <div className="p-6 flex flex-col gap-5">
             <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[#17211d]">Profile Visibility</p>
                  <p className="text-sm text-[#69726d]">Who can see your member profile in the community directory.</p>
                </div>
                <select className="rounded-md border border-[#e5e2d8] py-1.5 pl-3 pr-8 text-sm focus:border-[#0d4d3b] focus:outline-none focus:ring-1 focus:ring-[#0d4d3b]">
                   <option>Only Me</option>
                   <option>Community Members</option>
                </select>
             </div>
          </div>
        </section>

        {/* Account Actions Section */}
        <section className="rounded-xl border border-red-200 bg-red-50/50 shadow-sm overflow-hidden">
          <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
             <div>
                <h2 className="font-semibold text-red-700">Account Actions</h2>
                <p className="text-sm text-red-600/80 mt-1">Manage your active session or permanently delete your account.</p>
             </div>
             <div className="flex flex-col gap-3 shrink-0">
                <button className="flex items-center justify-center gap-2 rounded-md bg-white border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors">
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
                <button className="flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors">
                  <Trash2 className="h-4 w-4" /> Delete Account
                </button>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
}
