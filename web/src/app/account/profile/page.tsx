import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UserRound, Mail, Phone, MapPin, ShieldCheck, LockKeyhole } from "lucide-react";

export default async function ProfilePage() {
  const session = getSession();

  if (!session) {
    redirect("/signin");
  }

  const { user } = session;
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "MS";

  return (
    <div className="flex flex-col gap-8">
      {/* Profile Header */}
      <section className="flex flex-col items-center gap-6 rounded-2xl bg-white p-8 text-center shadow-sm border border-[#e5e2d8] sm:flex-row sm:text-left">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[#c79a45] text-3xl font-bold text-[#15251f]">
          {initials}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-[#17211d]">{user.name}</h1>
          <p className="mt-1 font-medium text-[#c79a45]">Member</p>
          <p className="mt-1 text-sm text-[#69726d]">Joined March 2026</p>
        </div>
        <button className="rounded-md bg-[#0d4d3b] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#073a2d] hover:shadow-lg">
          Edit Profile
        </button>
      </section>

      {/* Information Sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Information */}
        <section className="rounded-xl border border-[#e5e2d8] bg-white shadow-sm">
          <div className="border-b border-[#e5e2d8] px-6 py-4 flex items-center gap-2">
            <UserRound className="h-5 w-5 text-[#0d4d3b]" />
            <h2 className="font-semibold text-[#17211d]">Personal Information</h2>
          </div>
          <div className="flex flex-col gap-4 p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#8d948f]">Full Name</p>
              <p className="mt-1 text-sm font-medium text-[#17211d]">{user.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#8d948f]">Date of Birth</p>
              <p className="mt-1 text-sm font-medium text-[#17211d]">15 May 1985</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#8d948f]">Gender</p>
              <p className="mt-1 text-sm font-medium text-[#17211d]">Male</p>
            </div>
          </div>
        </section>

        {/* Contact Information */}
        <section className="rounded-xl border border-[#e5e2d8] bg-white shadow-sm">
          <div className="border-b border-[#e5e2d8] px-6 py-4 flex items-center gap-2">
            <Phone className="h-5 w-5 text-[#0d4d3b]" />
            <h2 className="font-semibold text-[#17211d]">Contact Information</h2>
          </div>
          <div className="flex flex-col gap-4 p-6">
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-[#8d948f]" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#8d948f]">Phone</p>
                <p className="mt-0.5 text-sm font-medium text-[#17211d]">+880 1711-223344</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-[#8d948f]" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#8d948f]">Email</p>
                <p className="mt-0.5 text-sm font-medium text-[#17211d]">mostak.shahariyar@example.com</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-[#8d948f]" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#8d948f]">Address</p>
                <p className="mt-0.5 text-sm font-medium text-[#17211d]">123 Mosque Road, Dhaka, Bangladesh</p>
              </div>
            </div>
          </div>
        </section>

        {/* Account Information */}
        <section className="rounded-xl border border-[#e5e2d8] bg-white shadow-sm">
          <div className="border-b border-[#e5e2d8] px-6 py-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#0d4d3b]" />
            <h2 className="font-semibold text-[#17211d]">Account Information</h2>
          </div>
          <div className="flex flex-col gap-4 p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#8d948f]">Member Status</p>
              <div className="mt-1 inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                Active Member
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#8d948f]">Registration Date</p>
              <p className="mt-1 text-sm font-medium text-[#17211d]">10 March 2026</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#8d948f]">Account Role</p>
              <p className="mt-1 text-sm font-medium text-[#17211d] capitalize">{user.role.replace("_", " ")}</p>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="rounded-xl border border-[#e5e2d8] bg-white shadow-sm">
          <div className="border-b border-[#e5e2d8] px-6 py-4 flex items-center gap-2">
            <LockKeyhole className="h-5 w-5 text-[#0d4d3b]" />
            <h2 className="font-semibold text-[#17211d]">Security</h2>
          </div>
          <div className="flex flex-col gap-6 p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#8d948f]">Password</p>
              <p className="mt-1 text-sm font-medium text-[#17211d]">••••••••••••</p>
              <p className="mt-1 text-xs text-[#69726d]">Last updated 2 months ago</p>
            </div>
            <div>
              <Link
                href="/account/settings/password"
                className="inline-flex rounded-md border border-[#e5e2d8] bg-white px-4 py-2 text-sm font-medium text-[#17211d] shadow-sm transition-colors hover:bg-[#faf9f4] hover:text-[#0d4d3b]"
              >
                Change Password
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
