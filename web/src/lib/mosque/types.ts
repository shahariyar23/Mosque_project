// Domain types for the mosque administration modules — profile, settings, prayer, Jumu'ah,
// members, volunteers, events and registrations.
//
// Written the same way as `lib/finance/types.ts`: every list type is a flat, serialisable row with
// denormalised display fields, so the mock arrays in `data/` can be swapped for Express responses
// without any component changing shape.

import type { IconName } from "@/components/finance/ui/icon";
import type { MetricTone } from "@/lib/finance/types";
import type { Permission, Position, Role, SessionUser } from "@/lib/permissions";

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
export const khutbahStatuses: KhutbahStatus[] = ["Scheduled", "Draft", "Delivered"];

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
  imageUrl?: string;
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
  participantEmail?: string;
  participantPhone?: string;
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
 * Services
 *
 * The catalogue of things the mosque does for the community beyond prayer — funerals, marriages,
 * counselling, welfare. A service is the standing offer; a `Booking` below is one request against it.
 * -------------------------------------------------------------------------- */

export type ServiceCategory =
  | "Funeral"
  | "Marriage"
  | "Counselling"
  | "Welfare"
  | "Education"
  | "Facility"
  | "Certificate";

export type ServiceStatus = "Active" | "Paused" | "Draft";

export const serviceCategories: ServiceCategory[] = [
  "Funeral",
  "Marriage",
  "Counselling",
  "Welfare",
  "Education",
  "Facility",
  "Certificate",
];
export const serviceStatuses: ServiceStatus[] = ["Active", "Paused", "Draft"];

export type Service = {
  id: string;
  name: string;
  category: ServiceCategory;
  status: ServiceStatus;
  /** One line for the card and the table. */
  summary: string;
  /** The fuller explanation, shown in the detail drawer. */
  description: string;
  coordinator: string;
  contactPhone: string;
  location: string;
  /** Plain-language availability — "By appointment", "24 hours", "After Jumu'ah". */
  availability: string;
  /** Suggested contribution in BDT. Zero is a free service, rendered as "Free" rather than "৳0". */
  fee: number;
  requiresBooking: boolean;
  /** How long the mosque takes to turn a request around — "Same day", "3–5 days". */
  turnaround: string;
  /** Denormalised so a service card never has to scan the bookings list. */
  bookingsThisMonth: number;
  totalBookings: number;
  updatedAt: IsoDate;
};

/** What the "Add service" form collects. Ids and counters are assigned on save. */
export type ServiceDraft = {
  name: string;
  category: ServiceCategory;
  status: ServiceStatus;
  summary: string;
  description: string;
  coordinator: string;
  contactPhone: string;
  location: string;
  availability: string;
  fee: string;
  requiresBooking: boolean;
  turnaround: string;
};

/* -------------------------------------------------------------------------- *
 * Bookings
 *
 * A request against a service — a funeral to arrange, a hall to hire, a counselling slot to keep.
 * Denormalises the service name and category so a bookings table never has to join back to the
 * catalogue, exactly as `Registration` carries its event's title.
 * -------------------------------------------------------------------------- */

export type BookingStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled" | "Declined";

export const bookingStatuses: BookingStatus[] = [
  "Pending",
  "Confirmed",
  "Completed",
  "Cancelled",
  "Declined",
];

export type Booking = {
  id: string;
  serviceId: string;
  serviceName: string;
  category: ServiceCategory;
  requesterName: string;
  requesterPhone: string;
  requesterEmail: string;
  /** Set when the requester is on the member register. */
  memberId?: string;
  status: BookingStatus;
  /** The day the service is needed. */
  scheduledDate: IsoDate;
  scheduledTime?: ClockTime;
  /** When the request was submitted. */
  submittedAt: IsoDate;
  location: string;
  /** Guests or attendees for hall and ceremony bookings. Zero where it does not apply. */
  partySize: number;
  /** Agreed contribution in BDT. Read-only here — collection is recorded in the finance module. */
  fee: number;
  /** Coordinator or imam handling the booking. */
  assignedTo?: string;
  notes: string;
};

export type BookingDraft = {
  serviceId: string;
  requesterName: string;
  requesterPhone: string;
  requesterEmail: string;
  scheduledDate: string;
  scheduledTime: string;
  partySize: string;
  location: string;
  notes: string;
};

/* -------------------------------------------------------------------------- *
 * Islamic content — shared
 *
 * Quran resources, khutbahs and articles are all things the mosque publishes, so they share a
 * language and a "published / draft / scheduled" rhythm. The shared bits live here; each module adds
 * its own category and detail below.
 * -------------------------------------------------------------------------- */

export type ContentLanguage = "Bangla" | "English" | "Arabic";
export const contentLanguages: ContentLanguage[] = ["Bangla", "English", "Arabic"];

/* -------------------------------------------------------------------------- *
 * Quran
 *
 * The library of Quran study material the mosque publishes — the imam's recitations, a tafsir
 * series, a memorisation plan for the Hifz class. A resource is a published piece of content, not a
 * student record; the people learning are the members and class module's concern.
 * -------------------------------------------------------------------------- */

export type QuranResourceType = "Recitation" | "Tafsir" | "Memorisation" | "Tajweed" | "Translation";
export type QuranFormat = "Audio" | "Video" | "Document";
export type QuranStatus = "Published" | "Draft" | "Scheduled";

export const quranResourceTypes: QuranResourceType[] = [
  "Recitation",
  "Tafsir",
  "Memorisation",
  "Tajweed",
  "Translation",
];
export const quranFormats: QuranFormat[] = ["Audio", "Video", "Document"];
export const quranStatuses: QuranStatus[] = ["Published", "Draft", "Scheduled"];

export type QuranResource = {
  id: string;
  title: string;
  type: QuranResourceType;
  format: QuranFormat;
  /** The surah this resource centres on, or "Various" for a series that spans many. */
  surah: string;
  /** Human reference — "Juz 1 · Ayah 1–141", "Surah 36 (Ya-Sin)". */
  reference: string;
  /** Qari for a recitation, author for a written or spoken series. */
  reciter: string;
  language: ContentLanguage;
  /** "42 min", "18 pages" — the size of the thing, kept as free text since the unit varies. */
  length: string;
  status: QuranStatus;
  /** Publication date, or the scheduled date when the status is Scheduled. */
  publishedAt: IsoDate;
  views: number;
  featured: boolean;
  summary: string;
  description: string;
};

export type QuranResourceDraft = {
  title: string;
  type: QuranResourceType;
  format: QuranFormat;
  surah: string;
  reference: string;
  reciter: string;
  language: ContentLanguage;
  length: string;
  status: QuranStatus;
  featured: boolean;
  summary: string;
  description: string;
};

/* -------------------------------------------------------------------------- *
 * Khutbah
 *
 * The Friday sermon archive and planner. Reuses `KhutbahStatus` (Scheduled / Draft / Delivered)
 * defined with the Jumu'ah types above; `KhutbahEntry` is the fuller record the library needs, kept
 * separate from the lightweight `Khutbah` the Jumu'ah overview embeds so neither pulls the other's shape.
 * -------------------------------------------------------------------------- */

export type KhutbahTheme =
  | "Taqwa"
  | "Worship"
  | "Family"
  | "Charity"
  | "Character"
  | "Seasonal"
  | "Community";

export const khutbahThemes: KhutbahTheme[] = [
  "Taqwa",
  "Worship",
  "Family",
  "Charity",
  "Character",
  "Seasonal",
  "Community",
];

export type KhutbahEntry = {
  id: string;
  title: string;
  speaker: string;
  date: IsoDate;
  status: KhutbahStatus;
  language: ContentLanguage;
  theme: KhutbahTheme;
  /** A khutbah is often one of a run — "Stories of the Prophets", "Ramadan reminders". */
  series?: string;
  summary: string;
  /** Ayah and hadith the khutbah is built on — "Qur'an 2:183", "Sahih al-Bukhari 8". */
  scriptureRefs: string[];
  durationMinutes: number;
  /** Congregation counted for a delivered khutbah; absent while it is still Scheduled or a Draft. */
  attendance?: number;
  hasAudio: boolean;
  hasVideo: boolean;
  views: number;
};

export type KhutbahDraft = {
  title: string;
  speaker: string;
  date: string;
  language: ContentLanguage;
  theme: KhutbahTheme;
  series: string;
  summary: string;
  /** One reference per line in the form; split into `scriptureRefs` on save. */
  scriptureRefs: string;
  durationMinutes: string;
};

/* -------------------------------------------------------------------------- *
 * Articles
 *
 * The written content the mosque publishes to its site — reminders, explainers, seasonal pieces.
 * The body itself is not modelled here; a list and an excerpt are all the register needs, and the
 * editor is a future concern.
 * -------------------------------------------------------------------------- */

export type ArticleCategory = "Aqeedah" | "Fiqh" | "Seerah" | "Ramadan" | "Family" | "Youth" | "Community";
export type ArticleStatus = "Published" | "Draft" | "Scheduled" | "Archived";

export const articleCategories: ArticleCategory[] = [
  "Aqeedah",
  "Fiqh",
  "Seerah",
  "Ramadan",
  "Family",
  "Youth",
  "Community",
];
export const articleStatuses: ArticleStatus[] = ["Published", "Draft", "Scheduled", "Archived"];

export type Article = {
  id: string;
  title: string;
  slug: string;
  author: string;
  category: ArticleCategory;
  status: ArticleStatus;
  language: ContentLanguage;
  /** Publication date, or the scheduled date when the status is Scheduled. */
  publishedAt: IsoDate;
  updatedAt: IsoDate;
  readingMinutes: number;
  excerpt: string;
  tags: string[];
  views: number;
  featured: boolean;
};

export type ArticleDraft = {
  title: string;
  author: string;
  category: ArticleCategory;
  status: ArticleStatus;
  language: ContentLanguage;
  excerpt: string;
  body: string;
  tags: string;
};

/* -------------------------------------------------------------------------- *
 * Classes
 *
 * The mosque's teaching programme — the weekend madrasah, the Hifz circle, Arabic, the adult and
 * sisters' courses. A class is a standing offer with a term, a teacher and a roll; the enrolment
 * figure is what the capacity meter reads. Distinct from the Quran content library, which is what a
 * class might hand out, not the class itself.
 * -------------------------------------------------------------------------- */

export type ClassCategory =
  | "Quran"
  | "Arabic"
  | "Islamic Studies"
  | "Youth"
  | "Adults"
  | "Sisters"
  | "New Muslims";
export type ClassLevel = "Beginner" | "Intermediate" | "Advanced" | "All levels";
export type ClassAudience = "Children" | "Youth" | "Adults" | "Women" | "All ages";
export type ClassStatus = "Enrolling" | "Ongoing" | "Full" | "Completed" | "Draft";

export const classCategories: ClassCategory[] = [
  "Quran",
  "Arabic",
  "Islamic Studies",
  "Youth",
  "Adults",
  "Sisters",
  "New Muslims",
];
export const classLevels: ClassLevel[] = ["Beginner", "Intermediate", "Advanced", "All levels"];
export const classAudiences: ClassAudience[] = ["Children", "Youth", "Adults", "Women", "All ages"];
export const classStatuses: ClassStatus[] = ["Enrolling", "Ongoing", "Full", "Completed", "Draft"];

export type MosqueClass = {
  id: string;
  title: string;
  category: ClassCategory;
  teacher: string;
  level: ClassLevel;
  audience: ClassAudience;
  /** The day(s) it runs — "Saturday", "Mon & Wed". Free text, since the pattern varies. */
  day: string;
  /** 24h start time, formatted for display through `formatClockTime`. */
  time: string;
  durationMinutes: number;
  /** The term it belongs to — "Autumn 2026". */
  term: string;
  startDate: IsoDate;
  capacity: number;
  enrolled: number;
  /** Fee for the whole term; 0 is a genuinely free class and reads "Free". */
  feePerTerm: number;
  status: ClassStatus;
  location: string;
  summary: string;
  description: string;
};

export type MosqueClassDraft = {
  title: string;
  category: ClassCategory;
  teacher: string;
  level: ClassLevel;
  audience: ClassAudience;
  day: string;
  time: string;
  durationMinutes: string;
  term: string;
  capacity: string;
  feePerTerm: string;
  status: ClassStatus;
  location: string;
  summary: string;
  description: string;
};

/* -------------------------------------------------------------------------- *
 * Announcements
 *
 * The notices the mosque puts in front of the community — a prayer-time change, a fundraising push,
 * a closure. An announcement is a standing notice on one or more channels; the notifications module
 * is the separate act of pushing a message out. Kept apart so a pinned notice and a one-off push do
 * not share a lifecycle.
 * -------------------------------------------------------------------------- */

export type AnnouncementCategory =
  | "General"
  | "Prayer"
  | "Event"
  | "Ramadan"
  | "Fundraising"
  | "Closure"
  | "Urgent";
export type AnnouncementAudience = "Whole community" | "Members" | "Volunteers" | "Youth" | "Sisters";
export type AnnouncementStatus = "Published" | "Scheduled" | "Draft" | "Archived";
export type AnnouncementChannel = "Website" | "App" | "Email" | "Notice board";

export const announcementCategories: AnnouncementCategory[] = [
  "General",
  "Prayer",
  "Event",
  "Ramadan",
  "Fundraising",
  "Closure",
  "Urgent",
];
export const announcementAudiences: AnnouncementAudience[] = [
  "Whole community",
  "Members",
  "Volunteers",
  "Youth",
  "Sisters",
];
export const announcementStatuses: AnnouncementStatus[] = ["Published", "Scheduled", "Draft", "Archived"];
export const announcementChannels: AnnouncementChannel[] = ["Website", "App", "Email", "Notice board"];

export type Announcement = {
  id: string;
  title: string;
  message: string;
  category: AnnouncementCategory;
  audience: AnnouncementAudience;
  status: AnnouncementStatus;
  channels: AnnouncementChannel[];
  /** Pinned notices sit above the rest on the community site until they are unpinned or expire. */
  pinned: boolean;
  author: string;
  /** Publication date, or the scheduled date when the status is Scheduled. */
  publishedAt: IsoDate;
  /** When the notice should drop off the site; absent means it stays until archived by hand. */
  expiresAt?: IsoDate;
};

export type AnnouncementDraft = {
  title: string;
  message: string;
  category: AnnouncementCategory;
  audience: AnnouncementAudience;
  status: AnnouncementStatus;
  channels: AnnouncementChannel[];
  pinned: boolean;
};

/* -------------------------------------------------------------------------- *
 * Notifications
 *
 * The send log — each row is a message pushed to a segment of the community over a channel, with the
 * delivery figures it earned. This is the outgoing act; the announcements module is the standing
 * notice. A sent notification carries recipients, delivered and opened counts; a draft or scheduled
 * one has none yet.
 * -------------------------------------------------------------------------- */

export type NotificationChannel = "Push" | "Email" | "SMS" | "In-app";
export type NotificationAudience =
  | "Whole community"
  | "Members"
  | "Volunteers"
  | "Youth"
  | "Class parents"
  | "Donors";
export type NotificationStatus = "Sent" | "Scheduled" | "Draft" | "Failed";

export const notificationChannels: NotificationChannel[] = ["Push", "Email", "SMS", "In-app"];
export const notificationAudiences: NotificationAudience[] = [
  "Whole community",
  "Members",
  "Volunteers",
  "Youth",
  "Class parents",
  "Donors",
];
export const notificationStatuses: NotificationStatus[] = ["Sent", "Scheduled", "Draft", "Failed"];

export type NotificationMessage = {
  id: string;
  title: string;
  message: string;
  channel: NotificationChannel;
  audience: NotificationAudience;
  status: NotificationStatus;
  sender: string;
  /** ISO date the message was sent or is scheduled for; empty string for a pure draft. */
  sentAt: string;
  scheduledAt?: string | null;
  recipients: number;
  delivered: number;
  opened: number;
};

export type NotificationDraft = {
  title: string;
  message: string;
  channel: NotificationChannel;
  audience: NotificationAudience;
  status: NotificationStatus;
  scheduledAt?: string;
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

/* -------------------------------------------------------------------------- *
 * Media gallery
 *
 * The mosque's photo and video library, grouped into albums that follow the year — the two Eids,
 * Ramadan, the weekend madrasah, community meals, youth trips, fundraising nights. Each item has a
 * visibility: public on the community site, members-only, or hidden while it is being sorted. There
 * are no real files here — the tile is a generated placeholder — so `fileName` and `sizeKb` stand in
 * for what a future upload endpoint would fill. Videos additionally carry a duration.
 * -------------------------------------------------------------------------- */

export type MediaType = "Image" | "Video";
export type MediaVisibility = "Public" | "Members" | "Hidden";
export type MediaAlbum =
  | "Eid al-Fitr"
  | "Eid al-Adha"
  | "Ramadan Nights"
  | "Weekend Madrasah"
  | "Community Iftar"
  | "Youth Programme"
  | "Fundraising"
  | "Qur'an Competition"
  | "Building & Grounds"
  | "Volunteers";

export const mediaTypes: MediaType[] = ["Image", "Video"];
export const mediaVisibilities: MediaVisibility[] = ["Public", "Members", "Hidden"];
export const mediaAlbums: MediaAlbum[] = [
  "Eid al-Fitr",
  "Eid al-Adha",
  "Ramadan Nights",
  "Weekend Madrasah",
  "Community Iftar",
  "Youth Programme",
  "Fundraising",
  "Qur'an Competition",
  "Building & Grounds",
  "Volunteers",
];

export type MediaItem = {
  id: string;
  title: string;
  album: MediaAlbum;
  type: MediaType;
  visibility: MediaVisibility;
  caption: string;
  tags: string[];
  uploadedBy: string;
  /** ISO date the item was added to the library. */
  uploadedAt: string;
  /** Stand-in for a real asset — used for the size readout and the CSV, never fetched. */
  fileName: string;
  sizeKb: number;
  /** Videos only — length in seconds, rendered as m:ss. */
  durationSeconds?: number;
};

export type MediaDraft = {
  title: string;
  album: MediaAlbum;
  type: MediaType;
  visibility: MediaVisibility;
  caption: string;
  fileName: string;
};

/* -------------------------------------------------------------------------- *
 * Reports
 *
 * The organisation-wide reporting hub — the catalogue of reports the mosque produces across every
 * area, from the monthly financial summary to the annual trustees' report. This sits above the deep
 * ledger statements in Finance → Financial reports: here is the whole shelf and its headline figures,
 * there is the accountant's detail. Nothing is really exported — "generating" a report only stamps it
 * as run in this preview. Shaped to sit behind a future `GET /reports`.
 * -------------------------------------------------------------------------- */

export type ReportCategory = "Community" | "Finance" | "Operations" | "Governance";
export type ReportFormat = "PDF" | "CSV" | "Excel";
export type ReportFrequency = "On demand" | "Weekly" | "Monthly" | "Quarterly" | "Annual";

export const reportCategories: ReportCategory[] = ["Community", "Finance", "Operations", "Governance"];
export const reportFormats: ReportFormat[] = ["PDF", "CSV", "Excel"];
export const reportFrequencies: ReportFrequency[] = ["On demand", "Weekly", "Monthly", "Quarterly", "Annual"];
/** Periods offered when generating a report — a label only, since nothing is really computed. */
export const reportPeriods = ["This month", "Last month", "This quarter", "Year to date", "Last year"] as const;

export type ReportDefinition = {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  format: ReportFormat;
  frequency: ReportFrequency;
  owner: string;
  /** What a run of this report contains — shown as a checklist in the drawer. */
  includes: string[];
  /** Whether the report runs automatically on its frequency, or only when someone asks for it. */
  scheduled: boolean;
  /** ISO date the report was last produced; empty string if it has never been run. */
  lastGeneratedAt: string;
};

export type ReportRunDraft = {
  reportId: string;
  period: string;
  format: ReportFormat;
};

/* -------------------------------------------------------------------------- *
 * Access — the people who can sign in (Users & Roles modules)
 * -------------------------------------------------------------------------- */

/**
 * A back-office account, as the Users directory lists it.
 *
 * It *is* a `SessionUser` — the same shape the rest of the app resolves permissions from — with only
 * the contact and activity fields a directory shows added on. That is deliberate: the detail drawer
 * can pass a row straight to `effectivePermissions()` without any mapping, so what the table claims a
 * person can do is computed by the exact function the session uses, not a copy of it. Shaped to sit
 * behind a future `GET /users`.
 */
export type AdminUser = SessionUser & {
  email: string;
  phone: string;
  /** ISO date the account was created. */
  joinedAt: IsoDate;
  /** ISO date of the last sign-in; empty string if the account has never signed in. */
  lastActiveAt: IsoDate;
  fullName?: string;
  status?: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  city?: string | null;
  avatarUrl?: string | null;
  newsletter?: boolean;
  emailVerifiedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

/** What the "Invite user" form collects. Role and positions are chosen; the rest defaults. */
export type AdminUserDraft = {
  name: string;
  email: string;
  phone: string;
  role: Role;
  positions: Position[];
};

/** A single grant or denial added on top of a role, for the exceptions editor. */
export type PermissionException = {
  permission: Permission;
  effect: "grant" | "deny";
};

/* -------------------------------------------------------------------------- *
 * Audit log
 * -------------------------------------------------------------------------- */

/** Which module an entry belongs to. Filters and colours the log; groups, doesn't rank. */
export type AuditArea =
  | "Access"
  | "Finance"
  | "Members"
  | "Events"
  | "Content"
  | "Communication"
  | "System";

export const auditAreas: AuditArea[] = [
  "Access",
  "Finance",
  "Members",
  "Events",
  "Content",
  "Communication",
  "System",
];

/** The kind of change. A small closed set so the log can be filtered and coloured by verb. */
export type AuditAction =
  | "Created"
  | "Updated"
  | "Deleted"
  | "Published"
  | "Approved"
  | "Verified"
  | "Voided"
  | "Assigned"
  | "Generated"
  | "Signed in";

export const auditActions: AuditAction[] = [
  "Created",
  "Updated",
  "Deleted",
  "Published",
  "Approved",
  "Verified",
  "Voided",
  "Assigned",
  "Generated",
  "Signed in",
];

/**
 * One line in the audit trail. The record is written by the system, never edited — so unlike every
 * other module type there is no `Draft` counterpart and nothing here is mutable in the UI.
 */
export type AuditEntry = {
  id: string;
  /** ISO datetime, "YYYY-MM-DDTHH:MM" (local, 24-hour). */
  at: string;
  /** Who performed the action. */
  actor: string;
  /** The actor's role at the time, so the log can show it without a lookup. */
  actorRole: Role;
  action: AuditAction;
  area: AuditArea;
  /** One-line human summary — "Verified a ৳5,000 Zakat donation". */
  summary: string;
  /** The record it touched — "DN-1042", "EVT-018", "USR-006". */
  target: string;
  /** Fuller sentence shown in the drawer. */
  detail: string;
  /** Where it came from — a device and place, for the security-minded reader. */
  source: string;
};
