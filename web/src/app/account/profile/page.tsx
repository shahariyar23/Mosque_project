"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  UserRound,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  LockKeyhole,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Check,
  X,
  Copy,
  LogOut,
  RefreshCw,
  BadgeCheck,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/ui/toast";
import { Avatar } from "@/components/ui/avatar";
import { fetchMyProfile, updateUser, type User, type UpdateUserInput } from "@/services/userService";
import { changePassword } from "@/services/authService";
import { ServiceError } from "@/services/query";
import { roleLabels, positionLabels } from "@/lib/permissions";
import type { UserGender } from "@/services/enums";

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "Not specified";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "Never";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export default function ProfilePage() {
  const { token, session, login, logout } = useAuth();
  const { notify } = useToast();

  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Modals
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  // Load Profile from GET /api/v1/auth/me
  const loadProfile = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchMyProfile();
      setProfile(data);
    } catch (err) {
      const msg =
        err instanceof ServiceError
          ? err.message
          : "Could not retrieve your profile. Please check your connection and try again.";
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(true);
      notify({
        tone: "info",
        message: "ID copied to clipboard",
      });
      setTimeout(() => setCopiedId(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-sm border border-[#e5e2d8] sm:flex-row sm:text-left">
          <div className="h-24 w-24 rounded-full bg-[#f2f0e8]" />
          <div className="flex-1 space-y-3">
            <div className="h-7 w-48 rounded bg-[#f2f0e8]" />
            <div className="h-4 w-24 rounded bg-[#f2f0e8]" />
            <div className="h-4 w-36 rounded bg-[#f2f0e8]" />
          </div>
          <div className="h-10 w-28 rounded-md bg-[#f2f0e8]" />
        </div>

        {/* Cards Skeleton */}
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-[#e5e2d8] bg-white p-6 shadow-sm space-y-4">
              <div className="h-5 w-40 rounded bg-[#f2f0e8]" />
              <div className="h-10 w-full rounded bg-[#f2f0e8]" />
              <div className="h-10 w-full rounded bg-[#f2f0e8]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-semibold text-red-900">Failed to load profile</h2>
        <p className="mt-2 text-sm text-red-700 max-w-md mx-auto">
          {loadError || "An unexpected error occurred while loading your profile data."}
        </p>
        <button
          onClick={loadProfile}
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#073a2d] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0b503f] transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    );
  }

  const roleName = (profile.role && roleLabels[profile.role]) || profile.role.replace(/_/g, " ");
  const memberSince = profile.createdAt ? formatDate(profile.createdAt) : "March 2026";
  const isEmailVerified = Boolean(profile.emailVerifiedAt);

  return (
    <div className="flex flex-col gap-8">
      {/* Profile Header */}
      <section className="relative overflow-hidden rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e5e2d8]">
        {/* Subtle decorative background glow */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#c79a45]/10 blur-2xl" />

        <div className="flex flex-col items-center gap-6 sm:flex-row sm:text-left">
          {/* Avatar / Profile Image */}
          <div className="relative group shrink-0">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.fullName}
                className="h-24 w-24 rounded-full object-cover border-2 border-[#c79a45] shadow-sm"
                onError={(e) => {
                  // Fallback to initial avatar if image URL fails
                  e.currentTarget.style.display = "none";
                  const nextSibling = e.currentTarget.nextElementSibling;
                  if (nextSibling) (nextSibling as HTMLElement).style.display = "flex";
                }}
              />
            ) : null}
            <div
              className={`h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[#073a2d] text-2xl font-bold text-[#c79a45] border-2 border-[#c79a45]/40 shadow-sm ${
                profile.avatarUrl ? "hidden" : "flex"
              }`}
            >
              <Avatar name={profile.fullName || "User"} size="xl" className="!h-24 !w-24 !text-2xl" />
            </div>

            {/* Active status pip */}
            <span
              title={profile.isActive ? "Account Active" : "Account Inactive"}
              className={`absolute bottom-1 right-1 h-5 w-5 rounded-full border-2 border-white ${
                profile.isActive ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
          </div>

          {/* User Headline & Badges */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#17211d] tracking-tight">
                {profile.fullName || "Unnamed Member"}
              </h1>

              {/* Verified badge */}
              {isEmailVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                  Unverified
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center rounded-md bg-[#073a2d]/10 px-2.5 py-1 text-xs font-semibold text-[#073a2d] capitalize">
                {roleName}
              </span>

              {profile.positions && profile.positions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {profile.positions.map((pos) => (
                    <span
                      key={pos}
                      className="inline-flex items-center rounded-md bg-[#c79a45]/15 px-2.5 py-1 text-xs font-medium text-[#7d5f18]"
                    >
                      {positionLabels[pos]?.en || pos.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <p className="mt-2.5 text-xs sm:text-sm text-[#69726d]">
              Member since {memberSince}
            </p>
          </div>

          {/* Header Actions */}
          <div className="flex flex-wrap sm:flex-col gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => setIsEditOpen(true)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg bg-[#073a2d] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#0b503f] hover:shadow-md"
            >
              <Edit3 className="h-4 w-4" />
              Edit Profile
            </button>
            <button
              onClick={() => setIsPasswordOpen(true)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg border border-[#e5e2d8] bg-white px-4 py-2.5 text-sm font-medium text-[#17211d] shadow-sm transition-colors hover:bg-[#faf9f4] hover:text-[#073a2d]"
            >
              <LockKeyhole className="h-4 w-4 text-[#69726d]" />
              Security
            </button>
          </div>
        </div>
      </section>

      {/* Information Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Information */}
        <section className="rounded-xl border border-[#e5e2d8] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#e5e2d8] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <UserRound className="h-5 w-5 text-[#073a2d]" />
              <h2 className="font-semibold text-[#17211d]">Personal Information</h2>
            </div>
            <button
              onClick={() => setIsEditOpen(true)}
              className="text-xs font-semibold text-[#073a2d] hover:underline flex items-center gap-1"
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#8d948f]">Full Name</p>
              <p className="mt-1 text-sm font-medium text-[#17211d]">{profile.fullName || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#8d948f]">Date of Birth</p>
              <p className="mt-1 text-sm font-medium text-[#17211d]">
                {profile.dateOfBirth ? formatDate(profile.dateOfBirth) : "Not set"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#8d948f]">Gender</p>
              <p className="mt-1 text-sm font-medium text-[#17211d] capitalize">
                {profile.gender || "Not specified"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#8d948f]">Newsletter</p>
              <p className="mt-1 text-sm font-medium text-[#17211d] flex items-center gap-1.5">
                {profile.newsletter ? (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Subscribed
                  </span>
                ) : (
                  <span className="text-[#69726d]">Not Subscribed</span>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Contact Information */}
        <section className="rounded-xl border border-[#e5e2d8] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#e5e2d8] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Phone className="h-5 w-5 text-[#073a2d]" />
              <h2 className="font-semibold text-[#17211d]">Contact Information</h2>
            </div>
            <button
              onClick={() => setIsEditOpen(true)}
              className="text-xs font-semibold text-[#073a2d] hover:underline flex items-center gap-1"
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
          <div className="flex flex-col gap-4 p-6">
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-[#8d948f] mt-1" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-[#8d948f]">Email Address</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="text-sm font-medium text-[#17211d] truncate">{profile.email}</p>
                  {isEmailVerified ? (
                    <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Pending verification
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-[#8d948f] mt-1" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#8d948f]">Phone Number</p>
                <p className="mt-0.5 text-sm font-medium text-[#17211d]">
                  {profile.phone || "Not provided"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-[#8d948f] mt-1" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#8d948f]">City / Location</p>
                <p className="mt-0.5 text-sm font-medium text-[#17211d]">
                  {profile.city || "Not provided"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Account Details & Security */}
        <section className="rounded-xl border border-[#e5e2d8] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#e5e2d8] px-6 py-4 flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-[#073a2d]" />
            <h2 className="font-semibold text-[#17211d]">Account & Membership</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#8d948f]">Member Status</p>
              <div className="mt-1">
                {profile.isActive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-600/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                    Active Member
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                    Inactive
                  </span>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#8d948f]">Account ID</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="font-mono text-xs text-[#17211d] truncate max-w-[140px]">
                  {profile.id}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyId(profile.id)}
                  className="rounded p-1 text-[#8d948f] hover:bg-[#faf9f4] hover:text-[#17211d]"
                  title="Copy ID"
                >
                  {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#8d948f]">Registration Date</p>
              <p className="mt-1 text-sm font-medium text-[#17211d]">
                {formatDate(profile.createdAt)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#8d948f]">Last Sign-in</p>
              <p className="mt-1 text-sm font-medium text-[#17211d]">
                {formatDateTime(profile.lastLoginAt)}
              </p>
            </div>
          </div>
        </section>

        {/* Security & Password */}
        <section className="rounded-xl border border-[#e5e2d8] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#e5e2d8] px-6 py-4 flex items-center gap-2.5">
            <LockKeyhole className="h-5 w-5 text-[#073a2d]" />
            <h2 className="font-semibold text-[#17211d]">Security & Password</h2>
          </div>
          <div className="flex flex-col gap-5 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#8d948f]">Password</p>
                <p className="mt-1 text-sm font-medium text-[#17211d]">••••••••••••••••</p>
                <p className="mt-0.5 text-xs text-[#69726d]">
                  Last updated {formatDate(profile.updatedAt)}
                </p>
              </div>
              <button
                onClick={() => setIsPasswordOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#e5e2d8] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#17211d] shadow-sm hover:bg-[#faf9f4] hover:text-[#073a2d]"
              >
                Change Password
              </button>
            </div>

            <div className="border-t border-[#e5e2d8] pt-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#8d948f]">Sign Out</p>
                <p className="text-xs text-[#69726d]">End your current active session.</p>
              </div>
              <button
                onClick={logout}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50/50 px-3.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100/70 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Edit Profile Modal */}
      {isEditOpen && (
        <EditProfileModal
          profile={profile}
          onClose={() => setIsEditOpen(false)}
          onSuccess={(updated) => {
            setProfile(updated);
            setIsEditOpen(false);
            // Re-sync session if token exists
            if (token) {
              login(token);
            }
          }}
        />
      )}

      {/* Change Password Modal */}
      {isPasswordOpen && (
        <ChangePasswordModal
          onClose={() => setIsPasswordOpen(false)}
          onSuccess={() => {
            setIsPasswordOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* ========================================================================== *
 * Edit Profile Modal Component
 * Calls PATCH /api/v1/users/:id
 * ========================================================================== */

interface EditProfileModalProps {
  profile: User;
  onClose: () => void;
  onSuccess: (updated: User) => void;
}

function EditProfileModal({ profile, onClose, onSuccess }: EditProfileModalProps) {
  const { notify } = useToast();

  const [fullName, setFullName] = useState(profile.fullName || "");
  const [email, setEmail] = useState(profile.email || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth || "");
  const [gender, setGender] = useState<string>(profile.gender || "");
  const [city, setCity] = useState(profile.city || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || "");
  const [newsletter, setNewsletter] = useState(profile.newsletter ?? false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    // Client-side quick validations
    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      setFieldErrors({ fullName: ["Full name must be at least 2 characters."] });
      return;
    }

    const trimmedPhone = phone.trim();
    if (trimmedPhone && !/^\+[1-9]\d{7,14}$/.test(trimmedPhone)) {
      setFieldErrors({
        phone: ["Phone must be in international E.164 format, e.g. +8801700000000."],
      });
      return;
    }

    const trimmedAvatar = avatarUrl.trim();
    if (trimmedAvatar && !/^https?:\/\//i.test(trimmedAvatar)) {
      setFieldErrors({
        avatarUrl: ["Avatar URL must be an absolute URL starting with http:// or https://."],
      });
      return;
    }

    // Prepare strictly whitelisted payload
    const payload: UpdateUserInput = {
      fullName: trimmedName,
      email: email.trim().toLowerCase(),
      phone: trimmedPhone ? trimmedPhone : null,
      dateOfBirth: dateOfBirth ? dateOfBirth : null,
      gender: gender ? (gender as UserGender) : null,
      city: city.trim() ? city.trim() : null,
      avatarUrl: trimmedAvatar ? trimmedAvatar : null,
      newsletter,
    };

    setIsSubmitting(true);

    try {
      const updated = await updateUser(profile.id, payload);
      notify({
        tone: "success",
        message: "Profile updated successfully",
        description: "Your personal details have been saved.",
      });
      onSuccess(updated);
    } catch (err: unknown) {
      if (err instanceof ServiceError) {
        setFormError(err.message);
        if (err.fieldErrors) {
          setFieldErrors(err.fieldErrors);
        }
      } else {
        setFormError(
          err instanceof Error ? err.message : "Failed to update profile. Please try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#073a2d]/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-[#e5e2d8] z-10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="border-b border-[#e5e2d8] px-6 py-5 flex items-center justify-between bg-[#faf9f4]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#073a2d] text-white">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#17211d]">Edit Profile</h2>
              <p className="text-xs text-[#69726d]">Update your personal details and preferences.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#8d948f] hover:bg-[#e5e2d8] hover:text-[#17211d] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {formError && (
            <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-800 border border-red-200">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
              <p>{formError}</p>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#17211d] mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-[#e5e2d8] px-3.5 py-2 text-sm text-[#17211d] focus:border-[#073a2d] focus:outline-none focus:ring-1 focus:ring-[#073a2d]"
              placeholder="e.g. Mostak Shahariyar"
            />
            {fieldErrors.fullName && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.fullName.join(" ")}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#17211d] mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[#e5e2d8] px-3.5 py-2 text-sm text-[#17211d] focus:border-[#073a2d] focus:outline-none focus:ring-1 focus:ring-[#073a2d]"
                placeholder="name@example.com"
              />
              <p className="mt-1 text-[11px] text-[#69726d]">
                Changing your email will require re-verification.
              </p>
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.email.join(" ")}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#17211d] mb-1.5">
                Phone Number (E.164)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-[#e5e2d8] px-3.5 py-2 text-sm text-[#17211d] focus:border-[#073a2d] focus:outline-none focus:ring-1 focus:ring-[#073a2d]"
                placeholder="+8801700000000"
              />
              <p className="mt-1 text-[11px] text-[#69726d]">International format, e.g. +8801700000000</p>
              {fieldErrors.phone && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.phone.join(" ")}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date of Birth */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#17211d] mb-1.5">
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full rounded-lg border border-[#e5e2d8] px-3.5 py-2 text-sm text-[#17211d] focus:border-[#073a2d] focus:outline-none focus:ring-1 focus:ring-[#073a2d]"
              />
              {fieldErrors.dateOfBirth && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.dateOfBirth.join(" ")}</p>
              )}
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#17211d] mb-1.5">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-lg border border-[#e5e2d8] px-3.5 py-2 text-sm text-[#17211d] focus:border-[#073a2d] focus:outline-none focus:ring-1 focus:ring-[#073a2d] bg-white"
              >
                <option value="">Not Specified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              {fieldErrors.gender && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.gender.join(" ")}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* City */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#17211d] mb-1.5">
                City of Residence
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-lg border border-[#e5e2d8] px-3.5 py-2 text-sm text-[#17211d] focus:border-[#073a2d] focus:outline-none focus:ring-1 focus:ring-[#073a2d]"
                placeholder="e.g. Dhaka"
              />
              {fieldErrors.city && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.city.join(" ")}</p>
              )}
            </div>

            {/* Avatar URL */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#17211d] mb-1.5">
                Avatar Image URL
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full rounded-lg border border-[#e5e2d8] px-3.5 py-2 text-sm text-[#17211d] focus:border-[#073a2d] focus:outline-none focus:ring-1 focus:ring-[#073a2d]"
                placeholder="https://images.example.com/avatar.jpg"
              />
              {fieldErrors.avatarUrl && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.avatarUrl.join(" ")}</p>
              )}
            </div>
          </div>

          {/* Newsletter Opt-in */}
          <div className="rounded-lg border border-[#e5e2d8] bg-[#faf9f4] p-4 flex items-start gap-3">
            <input
              id="newsletter-checkbox"
              type="checkbox"
              checked={newsletter}
              onChange={(e) => setNewsletter(e.target.checked)}
              className="h-4 w-4 mt-0.5 rounded border-[#e5e2d8] text-[#073a2d] focus:ring-[#073a2d]"
            />
            <label htmlFor="newsletter-checkbox" className="text-sm cursor-pointer">
              <span className="font-semibold text-[#17211d] block">Subscribe to Mosque Newsletter</span>
              <span className="text-xs text-[#69726d] block mt-0.5">
                Receive important community updates, Friday prayer topics, and event announcements.
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="mt-4 flex items-center justify-end gap-3 border-t border-[#e5e2d8] pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#e5e2d8] bg-white px-4 py-2 text-sm font-semibold text-[#17211d] hover:bg-[#faf9f4] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#073a2d] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0b503f] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ========================================================================== *
 * Change Password Modal Component
 * Calls POST /api/v1/auth/change-password
 * ========================================================================== */

interface ChangePasswordModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function ChangePasswordModal({ onClose, onSuccess }: ChangePasswordModalProps) {
  const { token } = useAuth();
  const { notify } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const minLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isSameAsCurrent = currentPassword.length > 0 && currentPassword === newPassword;

  const canSubmit = currentPassword.length > 0 && minLength && passwordsMatch && !isSameAsCurrent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMsg("You must be signed in to change your password.");
      return;
    }

    if (isSameAsCurrent) {
      setErrorMsg("New password must be different from current password.");
      return;
    }

    if (!canSubmit) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await changePassword(token, { currentPassword, newPassword });
      notify({
        tone: "success",
        message: "Password changed successfully",
        description: "Your new password is now active.",
      });
      onSuccess();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Failed to change password. Please check your current password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#073a2d]/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-[#e5e2d8] z-10 flex flex-col">
        {/* Header */}
        <div className="border-b border-[#e5e2d8] px-6 py-5 flex items-center justify-between bg-[#faf9f4]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#073a2d] text-white">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#17211d]">Change Password</h2>
              <p className="text-xs text-[#69726d]">Ensure your account remains protected.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#8d948f] hover:bg-[#e5e2d8] hover:text-[#17211d] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-lg bg-red-50 p-3.5 text-xs text-red-800 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Current Password */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#17211d] mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-[#e5e2d8] px-3.5 py-2 pr-10 text-sm focus:border-[#073a2d] focus:outline-none focus:ring-1 focus:ring-[#073a2d]"
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

          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#17211d] mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-[#e5e2d8] px-3.5 py-2 pr-10 text-sm focus:border-[#073a2d] focus:outline-none focus:ring-1 focus:ring-[#073a2d]"
                placeholder="At least 8 characters"
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

          {/* Checklist */}
          <div className="rounded-lg bg-[#faf9f4] p-3 border border-[#e5e2d8] text-xs flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              {minLength ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-gray-400" />}
              <span className={minLength ? "text-emerald-700 font-medium" : "text-[#69726d]"}>8+ characters</span>
            </div>
            <div className="flex items-center gap-1.5">
              {hasUpper && hasLower ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-gray-400" />}
              <span className={hasUpper && hasLower ? "text-emerald-700 font-medium" : "text-[#69726d]"}>Uppercase & lowercase</span>
            </div>
            <div className="flex items-center gap-1.5">
              {hasNumber ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-gray-400" />}
              <span className={hasNumber ? "text-emerald-700 font-medium" : "text-[#69726d]"}>At least one number</span>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#17211d] mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-[#e5e2d8] px-3.5 py-2 pr-10 text-sm focus:border-[#073a2d] focus:outline-none focus:ring-1 focus:ring-[#073a2d]"
                placeholder="Repeat new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8d948f] hover:text-[#17211d]"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>
            )}
          </div>

          {/* Actions */}
          <div className="mt-3 flex items-center justify-end gap-2.5 border-t border-[#e5e2d8] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#e5e2d8] bg-white px-4 py-2 text-xs font-semibold text-[#17211d] hover:bg-[#faf9f4]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#073a2d] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0b503f] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
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

