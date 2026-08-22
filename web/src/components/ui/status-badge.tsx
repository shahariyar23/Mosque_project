import { Badge, Chip } from "@/components/finance/ui/badge";
import {
  eventCategoryTone,
  eventStatusTone,
  jumuahStatusTone,
  khutbahStatusTone,
  memberStatusTone,
  membershipTierTone,
  prayerSlotStatusTone,
  registrationStatusTone,
  volunteerAvailabilityTone,
  volunteerStatusTone,
} from "@/lib/mosque/status";
import type {
  EventCategory,
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
 * Status badges for the community modules, one thin wrapper per status union.
 *
 * The same arrangement the finance module uses: the tone lookup lives in `lib/mosque/status.ts` and
 * the rendering is the shared `Badge`, so a status can never be shown with a tone the map does not
 * give it, and a new status is a compile error until it has one.
 */

export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  return <Badge tone={memberStatusTone[status]}>{status}</Badge>;
}

export function MembershipTierBadge({ tier }: { tier: MembershipTier }) {
  return (
    <Badge tone={membershipTierTone[tier]} dot={false}>
      {tier}
    </Badge>
  );
}

export function VolunteerStatusBadge({ status }: { status: VolunteerStatus }) {
  return <Badge tone={volunteerStatusTone[status]}>{status}</Badge>;
}

export function AvailabilityBadge({ availability }: { availability: VolunteerAvailability }) {
  return <Badge tone={volunteerAvailabilityTone[availability]}>{availability}</Badge>;
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return <Badge tone={eventStatusTone[status]}>{status}</Badge>;
}

export function EventCategoryChip({ category }: { category: EventCategory }) {
  return (
    <Badge tone={eventCategoryTone[category] ?? "neutral"} dot={false}>
      {category}
    </Badge>
  );
}

export function RegistrationStatusBadge({ status }: { status: RegistrationStatus }) {
  return <Badge tone={registrationStatusTone[status]}>{status}</Badge>;
}

export function JumuahStatusBadge({ status }: { status: JumuahStatus }) {
  return <Badge tone={jumuahStatusTone[status]}>{status}</Badge>;
}

export function KhutbahStatusBadge({ status }: { status: KhutbahStatus }) {
  return <Badge tone={khutbahStatusTone[status]}>{status}</Badge>;
}

export function PrayerStatusBadge({ status }: { status: PrayerSlotStatus }) {
  return <Badge tone={prayerSlotStatusTone[status]}>{status}</Badge>;
}

export { Chip };
