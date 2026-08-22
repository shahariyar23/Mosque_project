import type { ActivityItem } from "@/lib/mosque/types";

/**
 * Recent mosque activity, newest first.
 *
 * Timestamps are absolute and are rendered as relative ages against the fixed reference instant in
 * `lib/mosque/format.ts`. That is deliberate: a feed built from `Date.now()` produces one string on
 * the server and a different one in the browser a moment later, which is a hydration warning on every
 * page load in exchange for accuracy nobody can see.
 */
export const activities: ActivityItem[] = [
  {
    id: "ACT-01",
    kind: "member",
    title: "New member registered",
    description: "Ahmed Rahman joined the mosque community.",
    at: "2026-08-23T16:24:00",
    actor: "Shahed Alam",
    href: "/dashboard/members",
  },
  {
    id: "ACT-02",
    kind: "registration",
    title: "Event registration",
    description: "Fatima Khan registered for the Youth Islamic Seminar, with two guests.",
    at: "2026-08-23T15:05:00",
    href: "/dashboard/registrations",
  },
  {
    id: "ACT-03",
    kind: "volunteer",
    title: "Volunteer joined",
    description: "Abdullah Hasan joined the Cleaning Team as team lead.",
    at: "2026-08-23T12:40:00",
    actor: "Shahed Alam",
    href: "/dashboard/volunteers",
  },
  {
    id: "ACT-04",
    kind: "prayer",
    title: "Prayer schedule updated",
    description: "The Jumu'ah schedule was updated — second jama'at moved to 2:30 PM.",
    at: "2026-08-23T10:12:00",
    actor: "Imam Abdul Karim",
    href: "/dashboard/jumuah",
  },
  {
    id: "ACT-05",
    kind: "event",
    title: "Event published",
    description: "Hifz Graduation Ceremony on 11 September is now open for registration.",
    at: "2026-08-22T18:30:00",
    actor: "Shahed Alam",
    href: "/dashboard/events",
  },
  {
    id: "ACT-06",
    kind: "registration",
    title: "Registration waitlisted",
    description: "Children's Qur'an Class reached capacity — three registrations moved to the waitlist.",
    at: "2026-08-22T14:02:00",
    href: "/dashboard/registrations",
  },
  {
    id: "ACT-07",
    kind: "member",
    title: "Membership applications pending",
    description: "Four applications are waiting for committee review.",
    at: "2026-08-22T09:48:00",
    href: "/dashboard/members",
  },
  {
    id: "ACT-08",
    kind: "prayer",
    title: "Iqamah time changed",
    description: "Isha iqamah moved from 8:05 PM to 8:10 PM for the rest of the month.",
    at: "2026-08-21T20:15:00",
    actor: "Imam Abdul Karim",
    href: "/dashboard/prayer-times",
  },
  {
    id: "ACT-09",
    kind: "volunteer",
    title: "Service hours logged",
    description: "Food Distribution recorded 42 hours across the Friday parcel run.",
    at: "2026-08-21T16:55:00",
    actor: "Rehana Begum",
    href: "/dashboard/volunteers",
  },
  {
    id: "ACT-10",
    kind: "settings",
    title: "Notification settings changed",
    description: "Volunteer notifications were switched on for all committee members.",
    at: "2026-08-20T11:20:00",
    actor: "Sultan Mahmud",
    href: "/dashboard/settings",
  },
];
