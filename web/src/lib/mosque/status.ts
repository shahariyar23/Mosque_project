import type { Tone } from "@/lib/finance/status";
import type { Role } from "@/lib/permissions";
import type {
  AnnouncementCategory,
  AnnouncementStatus,
  ArticleCategory,
  ArticleStatus,
  AuditAction,
  AuditArea,
  BookingStatus,
  ClassCategory,
  ClassStatus,
  EventStatus,
  JumuahStatus,
  KhutbahStatus,
  KhutbahTheme,
  MemberStatus,
  MembershipTier,
  MediaAlbum,
  MediaType,
  MediaVisibility,
  NotificationChannel,
  NotificationStatus,
  PrayerSlotStatus,
  QuranResourceType,
  QuranStatus,
  RegistrationStatus,
  ReportCategory,
  ReportFormat,
  ServiceStatus,
  VolunteerAvailability,
  VolunteerStatus,
} from "@/lib/mosque/types";

/**
 * Status → tone for the community modules.
 *
 * Reuses the six tones defined in `lib/finance/status.ts` rather than introducing a second palette:
 * a badge on the members table and a badge on the donations table should be the same object as far
 * as the eye is concerned. As there, the label always carries the meaning and the tone only
 * reinforces it, so nothing here depends on colour alone.
 */

export const memberStatusTone: Record<MemberStatus, Tone> = {
  Active: "success",
  Inactive: "neutral",
  Pending: "pending",
};

export const membershipTierTone: Record<MembershipTier, Tone> = {
  General: "neutral",
  Student: "info",
  Lifetime: "gold",
  Founding: "gold",
};

export const volunteerStatusTone: Record<string, Tone> = {
  active: "success",
  inactive: "neutral",
  on_leave: "pending",
  Active: "success",
  Inactive: "neutral",
  "On Leave": "pending",
};

export const volunteerAvailabilityTone: Record<VolunteerAvailability, Tone> = {
  Available: "success",
  Busy: "pending",
  Unavailable: "neutral",
};

export const eventStatusTone: Record<EventStatus, Tone> = {
  Upcoming: "info",
  Ongoing: "success",
  Completed: "neutral",
  // A cancelled event still shows a date and a registration count, so it has to be obvious at a
  // glance that neither stands any more.
  Cancelled: "danger",
};

export const registrationStatusTone: Record<RegistrationStatus, Tone> = {
  Pending: "pending",
  Confirmed: "success",
  Cancelled: "danger",
  Waitlisted: "info",
};

export const jumuahStatusTone: Record<JumuahStatus, Tone> = {
  Open: "success",
  "Nearly full": "pending",
  Full: "info",
  Closed: "neutral",
};

export const khutbahStatusTone: Record<KhutbahStatus, Tone> = {
  Scheduled: "info",
  Draft: "pending",
  Delivered: "success",
};

export const quranStatusTone: Record<QuranStatus, Tone> = {
  Published: "success",
  Draft: "pending",
  Scheduled: "info",
};

export const articleStatusTone: Record<ArticleStatus, Tone> = {
  Published: "success",
  Draft: "pending",
  Scheduled: "info",
  // Archived is a deliberate retirement, not a failure — neutral, so it reads as "put away" rather
  // than "gone wrong".
  Archived: "neutral",
};

export const prayerSlotStatusTone: Record<PrayerSlotStatus, Tone> = {
  Active: "success",
  Paused: "neutral",
};

export const serviceStatusTone: Record<ServiceStatus, Tone> = {
  Active: "success",
  Paused: "pending",
  Draft: "neutral",
};

export const bookingStatusTone: Record<BookingStatus, Tone> = {
  Pending: "pending",
  Confirmed: "info",
  Completed: "success",
  Cancelled: "neutral",
  // A declined request is a decision the mosque made and should read differently from one the
  // requester cancelled themselves — danger keeps the two apart at a glance.
  Declined: "danger",
};

/** Category → tone for service chips. Muted, like the event categories, so statuses stay loudest. */
export const serviceCategoryTone: Record<string, Tone> = {
  Funeral: "neutral",
  Marriage: "gold",
  Counselling: "info",
  Welfare: "success",
  Education: "info",
  Facility: "gold",
  Certificate: "neutral",
};

/** Category → tone for event chips. Kept muted: seven loud categories would drown the statuses. */
export const eventCategoryTone: Record<string, Tone> = {
  Quran: "success",
  Education: "info",
  Youth: "gold",
  Community: "neutral",
  Ramadan: "gold",
  Charity: "success",
  Seminar: "info",
};

/** Resource type → tone for the Quran library chips. Muted, so the Published/Draft badge stays loudest. */
export const quranResourceTypeTone: Record<QuranResourceType, Tone> = {
  Recitation: "gold",
  Tafsir: "info",
  Memorisation: "success",
  Tajweed: "neutral",
  Translation: "info",
};

/** Theme → tone for the khutbah chips. Muted throughout — the theme groups, it doesn't rank. */
export const khutbahThemeTone: Record<KhutbahTheme, Tone> = {
  Taqwa: "success",
  Worship: "info",
  Family: "gold",
  Charity: "success",
  Character: "info",
  Seasonal: "gold",
  Community: "neutral",
};

/** Category → tone for the article chips. Muted, like the events, so statuses read first. */
export const articleCategoryTone: Record<ArticleCategory, Tone> = {
  Aqeedah: "info",
  Fiqh: "success",
  Seerah: "gold",
  Ramadan: "gold",
  Family: "info",
  Youth: "neutral",
  Community: "neutral",
};

export const classStatusTone: Record<ClassStatus, Tone> = {
  Enrolling: "success",
  Ongoing: "info",
  // A full class is a good outcome, but the badge has to make clear no more places can be taken.
  Full: "pending",
  Completed: "neutral",
  Draft: "neutral",
};

/** Category → tone for the class chips. Muted, so the Enrolling/Full badge stays loudest. */
export const classCategoryTone: Record<ClassCategory, Tone> = {
  Quran: "success",
  Arabic: "info",
  "Islamic Studies": "info",
  Youth: "gold",
  Adults: "neutral",
  Sisters: "gold",
  "New Muslims": "success",
};

export const announcementStatusTone: Record<AnnouncementStatus, Tone> = {
  Published: "success",
  Scheduled: "info",
  Draft: "pending",
  Archived: "neutral",
};

/** Category → tone for announcement chips. Urgent and Closure carry weight; the rest stay muted. */
export const announcementCategoryTone: Record<AnnouncementCategory, Tone> = {
  General: "neutral",
  Prayer: "info",
  Event: "info",
  Ramadan: "gold",
  Fundraising: "success",
  Closure: "pending",
  Urgent: "danger",
};

export const notificationStatusTone: Record<NotificationStatus, Tone> = {
  Sent: "success",
  Scheduled: "info",
  Draft: "pending",
  // A failed send is the one row an admin must act on, so it reads as danger.
  Failed: "danger",
};

/** Channel → tone for the notification chips. Muted, so the Sent/Failed badge stays loudest. */
export const notificationChannelTone: Record<NotificationChannel, Tone> = {
  Push: "info",
  Email: "neutral",
  SMS: "gold",
  "In-app": "success",
};

export const mediaVisibilityTone: Record<MediaVisibility, Tone> = {
  Public: "success",
  Members: "info",
  // Hidden is a deliberate "not shown yet" — neutral, so it reads as put-away rather than gone-wrong.
  Hidden: "neutral",
};

/** Type → tone for the media chips. Muted — it groups image from video, it doesn't rank them. */
export const mediaTypeTone: Record<MediaType, Tone> = {
  Image: "info",
  Video: "gold",
};

/** Album → tone for the gallery chips. Mostly muted; the seasons and the competitions carry a little colour. */
export const mediaAlbumTone: Record<MediaAlbum, Tone> = {
  "Eid al-Fitr": "gold",
  "Eid al-Adha": "gold",
  "Ramadan Nights": "gold",
  "Weekend Madrasah": "info",
  "Community Iftar": "neutral",
  "Youth Programme": "info",
  Fundraising: "success",
  "Qur'an Competition": "success",
  "Building & Grounds": "neutral",
  Volunteers: "neutral",
};

/** Category → tone for the report chips. Muted throughout — the category groups reports, it doesn't rank them. */
export const reportCategoryTone: Record<ReportCategory, Tone> = {
  Community: "info",
  Finance: "success",
  Operations: "neutral",
  Governance: "gold",
};

/** Format → tone for the report chips. Just enough colour to tell a spreadsheet from a document. */
export const reportFormatTone: Record<ReportFormat, Tone> = {
  PDF: "info",
  CSV: "neutral",
  Excel: "success",
};

/**
 * Role → tone, shared by the Users directory and the Roles matrix.
 *
 * The two elevated roles carry gold so a super or mosque admin stands out in a table of accounts;
 * the finance and community roles take the same tones their modules use elsewhere; a plain member
 * stays neutral. Colour only ever reinforces the label — the role name is always shown.
 */
export const roleTone: Record<Role, Tone> = {
  super_admin: "gold",
  mosque_admin: "gold",
  secretary: "info",
  treasurer: "success",
  cashier: "pending",
  imam: "info",
  member: "neutral",
};

/** Area → tone for the audit log. Access carries gold (it is the sensitive one); the rest group quietly. */
export const auditAreaTone: Record<AuditArea, Tone> = {
  Access: "gold",
  Finance: "success",
  Members: "info",
  Events: "info",
  Content: "neutral",
  Communication: "neutral",
  System: "neutral",
};

/** Action → tone for the audit log. The verb tells you at a glance whether something was removed, added or approved. */
export const auditActionTone: Record<AuditAction, Tone> = {
  Created: "info",
  Updated: "neutral",
  // Removals are the ones a reviewer scans for, so they read as danger.
  Deleted: "danger",
  Voided: "danger",
  Published: "success",
  Approved: "success",
  Verified: "success",
  Assigned: "gold",
  Generated: "info",
  "Signed in": "neutral",
};

/**
 * Fullness of a capacity-limited thing (an event, a Jumu'ah hall). Returns the tone that should
 * carry the progress bar — amber past 80%, informational once there is no room left.
 */
export function capacityTone(filled: number, capacity: number): Tone {
  if (capacity <= 0) return "neutral";
  const share = filled / capacity;
  if (share >= 1) return "info";
  if (share >= 0.8) return "pending";
  return "success";
}
