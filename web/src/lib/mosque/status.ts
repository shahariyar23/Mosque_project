import type { Tone } from "@/lib/finance/status";
import type {
  EventStatus,
  JumuahStatus,
  KhutbahStatus,
  MemberStatus,
  MembershipTier,
  PrayerSlotStatus,
  RegistrationStatus,
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

export const volunteerStatusTone: Record<VolunteerStatus, Tone> = {
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

export const prayerSlotStatusTone: Record<PrayerSlotStatus, Tone> = {
  Active: "success",
  Paused: "neutral",
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
