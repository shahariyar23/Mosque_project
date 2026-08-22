// Domain types for the mosque administration modules — profile, settings, prayer, Jumu'ah,
// members, volunteers, events and registrations.
//
// Written the same way as `lib/finance/types.ts`: every list type is a flat, serialisable row with
// denormalised display fields, so the mock arrays in `data/` can be swapped for Express responses
// without any component changing shape.

import type { IconName } from "@/components/finance/ui/icon";
import type { MetricTone } from "@/lib/finance/types";

/** "HH:MM" on a 24-hour clock. Stored this way so sorting is a string compare and the 12/24-hour
 *  preference is purely a formatting decision (see `lib/mosque/format.ts`). */
export type ClockTime = string;

/** "YYYY-MM-DD". */
export type IsoDate = string;

/* -------------------------------------------------------------------------- *
 * Shared
 * -------------------------------------------------------------------------- */

export type Gender = "Male" | "Female";

export const genders: Gender[] = ["Male", "Female"];

/**
 * A headline figure on an overview or summary strip. Deliberately a pre-formatted `value` string
 * rather than a number: these cards mix counts (1,248), money (৳125,500) and durations (124 hrs),
 * and the finance module's `SummaryMetric` can only carry an `Amount`.
 */
export type StatMetric = {
  id: string;
  label: string;
  value: string;
  hint: string;
  icon: IconName;
  tone: MetricTone;
  change?: {
    /** Already formatted — "+8.4%", "+12". */
    label: string;
    direction: "up" | "down" | "flat";
    /** "this month", "vs last month". */
    period: string;
  };
};

/* -------------------------------------------------------------------------- *
 * Mosque profile
 * -------------------------------------------------------------------------- */

export type SocialLinks = {
  facebook: string;
  youtube: string;
  instagram: string;
};

export type MosqueProfile = {
  name: string;
  shortName: string;
  tagline: string;
  established: string;
  phone: string;
  officePhone: string;
  emergencyContact: string;
  email: string;
  website: string;
  country: string;
  division: string;
  district: string;
  city: string;
  postalCode: string;
  addressLine: string;
  about: string;
  social: SocialLinks;
};

/* -------------------------------------------------------------------------- *
 * Settings
 * -------------------------------------------------------------------------- */

export type SettingsSectionId = "general" | "notifications" | "prayer" | "security" | "appearance";

export type GeneralSettings = {
  mosqueName: string;
  timezone: string;
  language: string;
  currency: string;
  dateFormat: string;
  weekStart: string;
};

/** Keys are stable ids so a toggle can be flipped without a switch statement. */
export type NotificationKey =
  | "email"
  | "eventRegistration"
  | "newMember"
  | "volunteer"
  | "prayerSchedule"
  | "system";

export type NotificationSetting = {
  key: NotificationKey;
  label: string;
  description: string;
  enabled: boolean;
};

export type PrayerSettings = {
  calculationMethod: string;
  juristicMethod: string;
  location: string;
  timezone: string;
  /** Drives every rendered prayer time through `formatClockTime`. */
  timeFormat: "12h" | "24h";
  reminderMinutes: number;
  hijriAdjustment: number;
};

export type ActiveSession = {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  current: boolean;
};

export type LoginEvent = {
  id: string;
  at: string;
  device: string;
  location: string;
  result: "Success" | "Failed";
};

export type SecuritySettings = {
  twoFactorEnabled: boolean;
  passwordUpdatedAt: IsoDate;
  sessions: ActiveSession[];
  loginActivity: LoginEvent[];
};

export type ThemePreference = "system" | "light" | "dark";
export type SidebarPreference = "expanded" | "compact";

export type AppearanceSettings = {
  theme: ThemePreference;
  sidebar: SidebarPreference;
  density: "comfortable" | "compact";
};

export type MosqueSettings = {
  general: GeneralSettings;
  notifications: NotificationSetting[];
  prayer: PrayerSettings;
  security: SecuritySettings;
  appearance: AppearanceSettings;
};

/* -------------------------------------------------------------------------- *
 * Prayer
 * -------------------------------------------------------------------------- */

export type PrayerId = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";

export type PrayerSlotStatus = "Active" | "Paused";

export type PrayerSlot = {
  id: PrayerId;
  name: string;
  arabic: string;
  icon: IconName;
  /** Call to prayer. */
  adhan: ClockTime;
  /** Congregation start. Absent for sunrise, which is a boundary rather than a prayer. */
  iqamah?: ClockTime;
  /** Sunrise is listed for context and has no congregation, so it never becomes "next prayer". */
  isCongregation: boolean;
  status: PrayerSlotStatus;
  note?: string;
};

export type DailyPrayerSchedule = {
  date: IsoDate;
  location: string;
  hijriDate: string;
  slots: PrayerSlot[];
};

/** One row of the weekly table. Every prayer id maps to its adhan time for that day. */
export type WeeklyPrayerRow = {
  day: string;
  date: IsoDate;
  times: Record<PrayerId, ClockTime>;
  isFriday: boolean;
};

/* -------------------------------------------------------------------------- *
 * Jumu'ah
 * -------------------------------------------------------------------------- */

export type JumuahStatus = "Open" | "Nearly full" | "Full" | "Closed";

export type JumuahSession = {
  id: string;
  label: string;
  khutbahTime: ClockTime;
  prayerTime: ClockTime;
  imam: string;
  language: string;
  hall: string;
  capacity: number;
  registrations: number;
  status: JumuahStatus;
};

export type KhutbahStatus = "Scheduled" | "Draft" | "Delivered";

export type Khutbah = {
  id: string;
  title: string;
  speaker: string;
  date: IsoDate;
  status: KhutbahStatus;
  language: string;
  topic: string;
  summary: string;
};

export type JumuahOverview = {
  date: IsoDate;
  hijriDate: string;
  sessions: JumuahSession[];
  expectedAttendance: number;
  khutbah: Khutbah;
  /** Past Fridays, for the attendance trend. */
  attendanceHistory: Array<{ date: IsoDate; label: string; attendance: number }>;
};

/* -------------------------------------------------------------------------- *
 * Members
 * -------------------------------------------------------------------------- */

export type MemberStatus = "Active" | "Inactive" | "Pending";
export type MembershipTier = "General" | "Student" | "Lifetime" | "Founding";
export type AgeGroup = "Under 18" | "18–29" | "30–44" | "45–59" | "60+";

export const memberStatuses: MemberStatus[] = ["Active", "Inactive", "Pending"];
export const membershipTiers: MembershipTier[] = ["General", "Student", "Lifetime", "Founding"];
export const ageGroups: AgeGroup[] = ["Under 18", "18–29", "30–44", "45–59", "60+"];

export type Member = {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: Gender;
  dateOfBirth: IsoDate;
  address: string;
  joinDate: IsoDate;
  status: MemberStatus;
  tier: MembershipTier;
  emergencyContactName: string;
  emergencyContactPhone: string;
  /** Pledged monthly contribution in BDT. Read-only here — the finance module owns collection. */
  monthlyContribution: number;
  contributionsPaidThisYear: number;
  eventsAttended: number;
  lastSeen: IsoDate;
  notes?: string;
};

/** What the "Add member" form collects. Ids and derived counters are assigned on save. */
export type MemberDraft = {
  name: string;
  email: string;
  phone: string;
  gender: Gender;
  dateOfBirth: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  status: MemberStatus;
  tier: MembershipTier;
  monthlyContribution: string;
};

/* -------------------------------------------------------------------------- *
 * Volunteers
 * -------------------------------------------------------------------------- */

export type VolunteerStatus = "Active" | "Inactive" | "On Leave";
export type VolunteerAvailability = "Available" | "Busy" | "Unavailable";
export type VolunteerSchedule = "Weekends" | "Weekdays" | "Evenings" | "Fridays" | "Flexible" | "On call";

export const volunteerStatuses: VolunteerStatus[] = ["Active", "Inactive", "On Leave"];
export const volunteerAvailabilities: VolunteerAvailability[] = ["Available", "Busy", "Unavailable"];
export const volunteerSchedules: VolunteerSchedule[] = [
  "Weekends",
  "Weekdays",
  "Evenings",
  "Fridays",
  "Flexible",
  "On call",
];

export type VolunteerTeam = {
  id: string;
  name: string;
  description: string;
  icon: IconName;
  lead: string;
  /** Denormalised so a team card does not have to scan the volunteer list. */
  volunteerCount: number;
  activeToday: number;
};

export type Volunteer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  teamId: string;
  teamName: string;
  schedule: VolunteerSchedule;
  availability: VolunteerAvailability;
  joinedDate: IsoDate;
  status: VolunteerStatus;
  skills: string[];
  serviceHours: number;
  eventsParticipated: number;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes?: string;
};

export type VolunteerDraft = {
  name: string;
  email: string;
  phone: string;
  teamId: string;
  skills: string;
  schedule: VolunteerSchedule;
  availability: VolunteerAvailability;
  status: VolunteerStatus;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

/* -------------------------------------------------------------------------- *
 * Events
 * -------------------------------------------------------------------------- */

export type EventCategory = "Quran" | "Education" | "Youth" | "Community" | "Ramadan" | "Charity" | "Seminar";
export type EventStatus = "Upcoming" | "Ongoing" | "Completed" | "Cancelled";

export const eventCategories: EventCategory[] = [
  "Quran",
  "Education",
  "Youth",
  "Community",
  "Ramadan",
  "Charity",
  "Seminar",
];
export const eventStatuses: EventStatus[] = ["Upcoming", "Ongoing", "Completed", "Cancelled"];

export type MosqueEvent = {
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  status: EventStatus;
  date: IsoDate;
  startTime: ClockTime;
  endTime?: ClockTime;
  /**
   * Overrides the formatted clock time when the mosque announces the event relative to a prayer —
   * "After Maghrib" is how the community actually hears it, and rendering "18:45" instead would be
   * a small lie about a time that moves with the sunset.
   */
  timeLabel?: string;
  location: string;
  speaker?: string;
  description: string;
  capacity: number;
  registered: number;
  registrationRequired: boolean;
  /** Free entry unless the committee set a contribution. */
  contribution?: number;
};

export type EventDraft = {
  title: string;
  category: EventCategory;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  speaker: string;
  description: string;
  capacity: string;
  registrationRequired: boolean;
};

/* -------------------------------------------------------------------------- *
 * Registrations
 * -------------------------------------------------------------------------- */

export type RegistrationStatus = "Pending" | "Confirmed" | "Cancelled" | "Waitlisted";

export const registrationStatuses: RegistrationStatus[] = ["Pending", "Confirmed", "Cancelled", "Waitlisted"];

export type Registration = {
  id: string;
  participantName: string;
  participantEmail: string;
  participantPhone: string;
  eventId: string;
  eventTitle: string;
  eventDate: IsoDate;
  registeredAt: IsoDate;
  guests: number;
  status: RegistrationStatus;
  specialRequirements?: string;
  /** Set when the participant is a registered member rather than a visitor. */
  memberId?: string;
};

/* -------------------------------------------------------------------------- *
 * Activity feed
 * -------------------------------------------------------------------------- */

export type ActivityKind = "member" | "registration" | "volunteer" | "prayer" | "event" | "settings" | "finance";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  title: string;
  description: string;
  /** ISO date-time. Rendered as a relative age against the page's reference date. */
  at: string;
  actor?: string;
  href?: string;
};

/* -------------------------------------------------------------------------- *
 * Community overview
 * -------------------------------------------------------------------------- */

export type CommunityBreakdown = {
  total: number;
  male: number;
  female: number;
  newThisMonth: number;
  activeVolunteers: number;
  ageBands: Array<{ label: AgeGroup; count: number }>;
};
