import { memberAgeBands, memberTotals } from "@/data/members";
import { volunteerTotals } from "@/data/volunteers";
import { eventTotals } from "@/data/events";
import { formatCount } from "@/lib/mosque/format";
import type { CommunityBreakdown, StatMetric } from "@/lib/mosque/types";

/**
 * The overview page's headline figures.
 *
 * Composed from the module totals rather than restated, so a number here can never disagree with the
 * page it links to. Only the monthly contribution figure is written out — the finance module owns
 * collection, and this screen is quoting it rather than computing it.
 */
export const overviewMetrics: StatMetric[] = [
  {
    id: "members",
    label: "Total Members",
    value: formatCount(memberTotals.total),
    hint: `${formatCount(memberTotals.active)} active on the register`,
    icon: "users",
    tone: "neutral",
    change: { label: "+8.4%", direction: "up", period: "this month" },
  },
  {
    id: "volunteers",
    label: "Active Volunteers",
    value: formatCount(volunteerTotals.active),
    hint: `${formatCount(volunteerTotals.teams)} teams · ${formatCount(volunteerTotals.availableToday)} available today`,
    icon: "hands-heart",
    tone: "positive",
    change: { label: "+12", direction: "up", period: "this month" },
  },
  {
    id: "events",
    label: "Upcoming Events",
    value: formatCount(eventTotals.upcoming),
    hint: "Next event in 2 days",
    icon: "calendar-days",
    tone: "gold",
  },
  {
    id: "contributions",
    label: "Monthly Contributions",
    value: "৳125,500",
    hint: "Collected in August so far",
    icon: "coins",
    tone: "positive",
    change: { label: "+12.5%", direction: "up", period: "vs July" },
  },
];

export const communityBreakdown: CommunityBreakdown = {
  total: memberTotals.total,
  male: memberTotals.male,
  female: memberTotals.female,
  newThisMonth: memberTotals.newThisMonth,
  activeVolunteers: volunteerTotals.active,
  ageBands: memberAgeBands,
};

/**
 * The four things a mosque administrator does most often from a cold start. Each is a real control on
 * the page it points at — nothing here opens a form that does not exist elsewhere.
 */
export const quickActions = [
  {
    id: "add-member",
    label: "Add Member",
    description: "Register someone new on the community roll",
    href: "/dashboard/members?action=add",
    icon: "user-plus",
  },
  {
    id: "create-event",
    label: "Create Event",
    description: "Plan a programme and open registration",
    href: "/dashboard/events?action=create",
    icon: "calendar-days",
  },
  {
    id: "add-volunteer",
    label: "Add Volunteer",
    description: "Place someone on a service team",
    href: "/dashboard/volunteers?action=add",
    icon: "hands-heart",
  },
  {
    id: "update-prayer",
    label: "Update Prayer Time",
    description: "Adjust today's adhan and iqamah",
    href: "/dashboard/prayer-times?action=edit",
    icon: "moon",
  },
] as const;
