import type { JumuahOverview, JumuahSession, Khutbah } from "@/lib/mosque/types";

/**
 * Friday prayer. Two jama'ats because one hall cannot hold the community at a single sitting — the
 * second exists for people who cannot leave work before two o'clock, which is why its registrations
 * run lower than the first without that meaning anything is wrong.
 */
export const jumuahSessions: JumuahSession[] = [
  {
    id: "JUM-1",
    label: "First Jumu'ah",
    khutbahTime: "13:00",
    prayerTime: "13:15",
    imam: "Imam Abdul Karim",
    language: "Bangla, with Arabic khutbah",
    hall: "Main hall, ground floor",
    capacity: 500,
    registrations: 428,
    status: "Nearly full",
  },
  {
    id: "JUM-2",
    label: "Second Jumu'ah",
    khutbahTime: "14:15",
    prayerTime: "14:30",
    imam: "Imam Abdullah Hasan",
    language: "Bangla and English",
    hall: "First floor hall",
    capacity: 500,
    registrations: 310,
    status: "Open",
  },
];

export const upcomingKhutbah: Khutbah = {
  id: "KHT-118",
  title: "Patience and Community in Islam",
  speaker: "Imam Abdul Karim",
  date: "2026-08-28",
  status: "Scheduled",
  language: "Bangla",
  topic: "Character and community",
  summary:
    "On sabr as an active virtue rather than a passive one — what it asks of a person when a neighbour is " +
    "difficult, when money is short, and when a decision of the committee does not go their way. Closes on " +
    "the rights of neighbours as the Prophet ﷺ described them.",
};

/** Recent khutbahs, for the archive list on the Jumu'ah page. */
export const recentKhutbahs: Khutbah[] = [
  {
    id: "KHT-117",
    title: "The Trust of Wealth",
    speaker: "Imam Abdul Karim",
    date: "2026-08-21",
    status: "Delivered",
    language: "Bangla",
    topic: "Finance and amanah",
    summary: "On wealth as a trust that is accounted for, and on the mosque's duty to publish its own accounts.",
  },
  {
    id: "KHT-116",
    title: "Raising Children Between Two Worlds",
    speaker: "Imam Abdullah Hasan",
    date: "2026-08-14",
    status: "Delivered",
    language: "Bangla and English",
    topic: "Family",
    summary: "On what parents owe children who grow up between the language of the home and the language of school.",
  },
  {
    id: "KHT-115",
    title: "The Masjid as the Heart of a Neighbourhood",
    speaker: "Dr. Abdullah Rahman",
    date: "2026-08-07",
    status: "Delivered",
    language: "Bangla",
    topic: "Community",
    summary: "On the masjid's role beyond prayer — as a school, a shelter and a place where disputes are settled.",
  },
  {
    id: "KHT-119",
    title: "Gratitude in Difficulty",
    speaker: "Imam Abdullah Hasan",
    date: "2026-09-04",
    status: "Draft",
    language: "English",
    topic: "Character",
    summary: "Outline only — the imam has asked for a week to prepare this one properly.",
  },
];

export const jumuahOverview: JumuahOverview = {
  date: "2026-08-28",
  hijriDate: "15 Rabi' al-Awwal 1448",
  sessions: jumuahSessions,
  expectedAttendance: 850,
  khutbah: upcomingKhutbah,
  attendanceHistory: [
    { date: "2026-07-17", label: "17 Jul", attendance: 782 },
    { date: "2026-07-24", label: "24 Jul", attendance: 803 },
    { date: "2026-07-31", label: "31 Jul", attendance: 764 },
    { date: "2026-08-07", label: "7 Aug", attendance: 826 },
    { date: "2026-08-14", label: "14 Aug", attendance: 811 },
    { date: "2026-08-21", label: "21 Aug", attendance: 845 },
  ],
};
