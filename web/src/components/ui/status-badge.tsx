import { Badge, Chip } from "@/components/finance/ui/badge";
import {
  announcementCategoryTone,
  announcementStatusTone,
  articleCategoryTone,
  articleStatusTone,
  auditActionTone,
  auditAreaTone,
  bookingStatusTone,
  classCategoryTone,
  classStatusTone,
  eventCategoryTone,
  eventStatusTone,
  jumuahStatusTone,
  khutbahStatusTone,
  khutbahThemeTone,
  memberStatusTone,
  membershipTierTone,
  mediaAlbumTone,
  mediaTypeTone,
  mediaVisibilityTone,
  notificationChannelTone,
  notificationStatusTone,
  prayerSlotStatusTone,
  quranResourceTypeTone,
  quranStatusTone,
  registrationStatusTone,
  reportCategoryTone,
  reportFormatTone,
  roleTone,
  serviceCategoryTone,
  serviceStatusTone,
  volunteerAvailabilityTone,
  volunteerStatusTone,
} from "@/lib/mosque/status";
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
  EventCategory,
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
  ServiceCategory,
  ServiceStatus,
  VolunteerAvailability,
  VolunteerStatus,
} from "@/lib/mosque/types";
import { roleLabels, type Role } from "@/lib/permissions";

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

const volunteerStatusLabels: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  on_leave: "On Leave",
  Active: "Active",
  Inactive: "Inactive",
  "On Leave": "On Leave",
};

export function VolunteerStatusBadge({ status }: { status: any }) {
  const tone = volunteerStatusTone[status] ?? "neutral";
  const label = volunteerStatusLabels[status] ?? status;
  return <Badge tone={tone}>{label}</Badge>;
}

export function AvailabilityBadge({ availability }: { availability?: string | null }) {
  if (!availability || availability.trim() === "" || availability.toLowerCase() === "unknown") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e4dc] bg-[#f8f7f2] px-2.5 py-0.5 text-[11px] font-medium text-[#7a817b]">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#b5b4a8]" />
        Flexible
      </span>
    );
  }

  const text = availability.trim();
  const lower = text.toLowerCase();

  const isWeekendOrJumuah =
    lower.includes("weekend") ||
    lower.includes("jumuah") ||
    lower.includes("friday") ||
    lower.includes("sat") ||
    lower.includes("sun");

  const isEvening =
    lower.includes("evening") ||
    lower.includes("night") ||
    lower.includes("asr") ||
    lower.includes("maghrib");

  const badgeClass = isWeekendOrJumuah
    ? "border-[#c3e6cb] bg-[#eef8f2] text-[#0f5132]"
    : isEvening
      ? "border-[#ffeeba] bg-[#fff9e6] text-[#856404]"
      : "border-[#bee5eb] bg-[#eaf7f9] text-[#0c5460]";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold tracking-tight whitespace-nowrap shadow-xs ${badgeClass}`}>
      <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <span>{text}</span>
    </span>
  );
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

export function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  return <Badge tone={serviceStatusTone[status]}>{status}</Badge>;
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={bookingStatusTone[status]}>{status}</Badge>;
}

export function ServiceCategoryChip({ category }: { category: ServiceCategory }) {
  return (
    <Badge tone={serviceCategoryTone[category] ?? "neutral"} dot={false}>
      {category}
    </Badge>
  );
}

export function QuranStatusBadge({ status }: { status: QuranStatus }) {
  return <Badge tone={quranStatusTone[status]}>{status}</Badge>;
}

export function QuranTypeChip({ type }: { type: QuranResourceType }) {
  return (
    <Badge tone={quranResourceTypeTone[type] ?? "neutral"} dot={false}>
      {type}
    </Badge>
  );
}

export function KhutbahThemeChip({ theme }: { theme: KhutbahTheme }) {
  return (
    <Badge tone={khutbahThemeTone[theme] ?? "neutral"} dot={false}>
      {theme}
    </Badge>
  );
}

export function ArticleStatusBadge({ status }: { status: ArticleStatus }) {
  return <Badge tone={articleStatusTone[status]}>{status}</Badge>;
}

export function ArticleCategoryChip({ category }: { category: ArticleCategory }) {
  return (
    <Badge tone={articleCategoryTone[category] ?? "neutral"} dot={false}>
      {category}
    </Badge>
  );
}

export function ClassStatusBadge({ status }: { status: ClassStatus }) {
  return <Badge tone={classStatusTone[status]}>{status}</Badge>;
}

export function ClassCategoryChip({ category }: { category: ClassCategory }) {
  return (
    <Badge tone={classCategoryTone[category] ?? "neutral"} dot={false}>
      {category}
    </Badge>
  );
}

export function AnnouncementStatusBadge({ status }: { status: AnnouncementStatus }) {
  return <Badge tone={announcementStatusTone[status]}>{status}</Badge>;
}

export function AnnouncementCategoryChip({ category }: { category: AnnouncementCategory }) {
  return (
    <Badge tone={announcementCategoryTone[category] ?? "neutral"} dot={false}>
      {category}
    </Badge>
  );
}

export function NotificationStatusBadge({ status }: { status: NotificationStatus }) {
  return <Badge tone={notificationStatusTone[status]}>{status}</Badge>;
}

export function NotificationChannelChip({ channel }: { channel: NotificationChannel }) {
  return (
    <Badge tone={notificationChannelTone[channel] ?? "neutral"} dot={false}>
      {channel}
    </Badge>
  );
}

export function MediaTypeBadge({ type }: { type: MediaType }) {
  return <Badge tone={mediaTypeTone[type]}>{type}</Badge>;
}

export function MediaVisibilityBadge({ visibility }: { visibility: MediaVisibility }) {
  return <Badge tone={mediaVisibilityTone[visibility]}>{visibility}</Badge>;
}

export function MediaAlbumChip({ album }: { album: MediaAlbum }) {
  return (
    <Badge tone={mediaAlbumTone[album] ?? "neutral"} dot={false}>
      {album}
    </Badge>
  );
}

export function ReportCategoryChip({ category }: { category: ReportCategory }) {
  return (
    <Badge tone={reportCategoryTone[category] ?? "neutral"} dot={false}>
      {category}
    </Badge>
  );
}

export function ReportFormatChip({ format }: { format: ReportFormat }) {
  return (
    <Badge tone={reportFormatTone[format] ?? "neutral"} dot={false}>
      {format}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge tone={roleTone[role] ?? "neutral"} dot={false}>
      {roleLabels[role]}
    </Badge>
  );
}

export function AuditAreaChip({ area }: { area: AuditArea }) {
  return (
    <Badge tone={auditAreaTone[area] ?? "neutral"} dot={false}>
      {area}
    </Badge>
  );
}

export function AuditActionBadge({ action }: { action: AuditAction }) {
  return <Badge tone={auditActionTone[action] ?? "neutral"}>{action}</Badge>;
}

export { Chip };
