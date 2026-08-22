import type { MosqueEvent } from "@/lib/mosque/types";

/**
 * The mosque's programme.
 *
 * Written as full objects rather than tuples — unlike a member row, an event is mostly prose, and a
 * description is not something you can read out of the fourth column of a tuple.
 *
 * Note `timeLabel` on the weekly Qur'an study. The mosque announces it as "After Maghrib" because
 * that is when it actually starts, and Maghrib moves with the sunset; printing "18:45" would be a
 * small lie that becomes a wrong answer in three weeks. `startTime` is still filled in so the event
 * sorts into the right place in the day.
 */
export const events: MosqueEvent[] = [
  {
    id: "EVT-101",
    slug: "weekly-quran-study",
    title: "Weekly Qur'an Study",
    category: "Quran",
    status: "Upcoming",
    date: "2026-08-23",
    startTime: "18:45",
    endTime: "19:45",
    timeLabel: "After Maghrib",
    location: "Main Prayer Hall",
    speaker: "Imam Abdul Karim",
    description:
      "Tafsir of Surah Al-Kahf, continuing from verse 32. Open to everyone; no preparation needed. Copies of the " +
      "mushaf are available at the door.",
    capacity: 120,
    registered: 68,
    registrationRequired: false,
  },
  {
    id: "EVT-102",
    slug: "youth-islamic-seminar",
    title: "Youth Islamic Seminar",
    category: "Education",
    status: "Upcoming",
    date: "2026-08-25",
    startTime: "19:30",
    endTime: "21:00",
    location: "Community Hall",
    speaker: "Dr. Abdullah Rahman",
    description:
      "An evening for 16–25 year olds on holding onto faith at university and at work. Question-and-answer session " +
      "after the talk, then tea. Sisters' seating on the first floor with its own entrance.",
    capacity: 200,
    registered: 128,
    registrationRequired: true,
  },
  {
    id: "EVT-103",
    slug: "community-iftar",
    title: "Community Iftar",
    category: "Community",
    status: "Upcoming",
    date: "2026-08-28",
    startTime: "18:15",
    endTime: "19:30",
    location: "Courtyard and Community Hall",
    description:
      "Iftar for those keeping the Monday and Thursday sunnah fasts, and for anyone who would like to join. Families " +
      "welcome. Please register so the kitchen knows the numbers.",
    capacity: 300,
    registered: 214,
    registrationRequired: true,
  },
  {
    id: "EVT-104",
    slug: "sisters-halaqa-seerah",
    title: "Sisters' Halaqa: Women in the Seerah",
    category: "Education",
    status: "Upcoming",
    date: "2026-08-29",
    startTime: "16:30",
    endTime: "18:00",
    location: "Women's Hall, Road 7 entrance",
    speaker: "Ustadha Sabina Yeasmin",
    description:
      "Third of six sessions, on Khadijah bint Khuwaylid (رضي الله عنها). Childcare provided in the adjoining room " +
      "for children under six.",
    capacity: 80,
    registered: 52,
    registrationRequired: true,
  },
  {
    id: "EVT-105",
    slug: "childrens-quran-class",
    title: "Children's Qur'an Class",
    category: "Quran",
    status: "Upcoming",
    date: "2026-08-30",
    startTime: "16:00",
    endTime: "17:30",
    location: "Education Hall",
    speaker: "Ustadh Nurul Amin",
    description:
      "Weekly class for ages 6–12, split into three groups by level. Parents are asked to collect children from the " +
      "Education Hall door rather than the main entrance.",
    capacity: 60,
    registered: 45,
    registrationRequired: true,
  },
  {
    id: "EVT-106",
    slug: "winter-blanket-drive",
    title: "Charity Drive: Winter Blankets",
    category: "Charity",
    status: "Upcoming",
    date: "2026-09-04",
    startTime: "10:00",
    endTime: "16:00",
    location: "Courtyard",
    description:
      "Collection and packing of blankets and warm clothing for distribution in the northern districts before winter. " +
      "Volunteers needed for packing between noon and four.",
    capacity: 150,
    registered: 96,
    registrationRequired: true,
  },
  {
    id: "EVT-107",
    slug: "hifz-graduation",
    title: "Hifz Graduation Ceremony",
    category: "Education",
    status: "Upcoming",
    date: "2026-09-11",
    startTime: "17:00",
    endTime: "19:00",
    location: "Main Prayer Hall",
    speaker: "Hafiz Mizanur Rahman",
    description:
      "Eleven students complete their memorisation of the Qur'an this year. Recitation by the graduates, followed by " +
      "certificates and a meal. Families and the whole community are invited.",
    capacity: 400,
    registered: 178,
    registrationRequired: true,
  },
  {
    id: "EVT-108",
    slug: "youth-football-tournament",
    title: "Youth Football Tournament",
    category: "Youth",
    status: "Upcoming",
    date: "2026-09-19",
    startTime: "08:00",
    endTime: "13:00",
    location: "Banani Playing Field",
    description:
      "Eight-team knockout for ages 13–19. Teams of six, register as a team or as an individual to be placed. Water " +
      "and lunch provided.",
    capacity: 96,
    registered: 64,
    registrationRequired: true,
  },
  {
    id: "EVT-109",
    slug: "weekend-tajweed-course",
    title: "Weekend Tajweed Course",
    category: "Quran",
    status: "Ongoing",
    date: "2026-08-22",
    startTime: "09:00",
    endTime: "11:00",
    location: "Education Hall",
    speaker: "Ustadh Nurul Amin",
    description:
      "Eight-week course on the rules of recitation, now in week five. Closed to new registrations — the next intake " +
      "opens in October.",
    capacity: 40,
    registered: 34,
    registrationRequired: true,
  },
  {
    id: "EVT-110",
    slug: "seerah-lecture-night-3",
    title: "Seerah Lecture Series — Night 3",
    category: "Seminar",
    status: "Completed",
    date: "2026-08-14",
    startTime: "20:15",
    endTime: "21:30",
    location: "Main Prayer Hall",
    speaker: "Dr. Abdullah Rahman",
    description: "The migration to Madinah and the first constitution. Recording available from the Media Team.",
    capacity: 200,
    registered: 156,
    registrationRequired: true,
  },
  {
    id: "EVT-111",
    slug: "interfaith-neighbours-evening",
    title: "Interfaith Neighbours' Evening",
    category: "Community",
    status: "Cancelled",
    date: "2026-08-07",
    startTime: "18:30",
    endTime: "20:30",
    location: "Community Hall",
    description:
      "Cancelled because two of the three invited speakers withdrew at short notice. The committee has asked for it to " +
      "be rescheduled after Ramadan. Everyone registered has been contacted.",
    capacity: 100,
    registered: 38,
    registrationRequired: true,
  },
  {
    id: "EVT-112",
    slug: "youth-leadership-workshop",
    title: "Youth Leadership Workshop",
    category: "Youth",
    status: "Completed",
    date: "2026-07-25",
    startTime: "15:00",
    endTime: "18:00",
    location: "Community Hall",
    speaker: "Shahed Alam",
    description: "Two-session workshop on running a halaqa and organising a community project.",
    capacity: 80,
    registered: 72,
    registrationRequired: true,
  },
  {
    id: "EVT-113",
    slug: "marriage-preparation-course",
    title: "Marriage Preparation Course",
    category: "Education",
    status: "Completed",
    date: "2026-06-19",
    startTime: "17:30",
    endTime: "20:00",
    location: "Seminar Room",
    speaker: "Imam Abdullah Hasan",
    description: "Rights, responsibilities and the practicalities of the nikah. Couples and individuals both welcome.",
    capacity: 30,
    registered: 28,
    registrationRequired: true,
  },
  {
    id: "EVT-114",
    slug: "community-health-camp",
    title: "Community Health Camp",
    category: "Community",
    status: "Completed",
    date: "2026-05-16",
    startTime: "09:00",
    endTime: "15:00",
    location: "Courtyard and Community Hall",
    description:
      "Free blood pressure, blood sugar and eye checks with volunteer doctors from Banani Clinic. 186 people seen.",
    capacity: 200,
    registered: 186,
    registrationRequired: false,
  },
  {
    id: "EVT-115",
    slug: "quran-recitation-competition",
    title: "Qur'an Recitation Competition",
    category: "Quran",
    status: "Completed",
    date: "2026-04-11",
    startTime: "14:00",
    endTime: "18:00",
    location: "Main Prayer Hall",
    description: "Four age categories, judged by three qaris from outside the mosque. Eighty-eight entrants.",
    capacity: 120,
    registered: 88,
    registrationRequired: true,
  },
  {
    id: "EVT-116",
    slug: "laylatul-qadr-programme",
    title: "Laylatul Qadr Night Programme",
    category: "Ramadan",
    status: "Completed",
    date: "2026-03-27",
    startTime: "21:00",
    endTime: "03:30",
    location: "Main Prayer Hall and first floor",
    speaker: "Imam Abdul Karim",
    description: "Qiyam, dua and a short reminder between each set. The hall was full by half past nine.",
    capacity: 450,
    registered: 392,
    registrationRequired: false,
  },
  {
    id: "EVT-117",
    slug: "ramadan-iftar-programme",
    title: "Ramadan Iftar Programme",
    category: "Ramadan",
    status: "Completed",
    date: "2026-03-20",
    startTime: "18:05",
    endTime: "19:30",
    location: "Courtyard",
    description: "Daily iftar through Ramadan, funded by the seasonal fund. Around 480 people on the busiest evenings.",
    capacity: 500,
    registered: 480,
    registrationRequired: false,
  },
  {
    id: "EVT-118",
    slug: "zakat-distribution-day",
    title: "Zakat Distribution Day",
    category: "Charity",
    status: "Completed",
    date: "2026-03-14",
    startTime: "10:00",
    endTime: "16:00",
    location: "Seminar Room",
    description:
      "Distribution to 240 assessed households from the zakat fund, by appointment. Assessments were carried out by " +
      "the welfare sub-committee in February.",
    capacity: 240,
    registered: 240,
    registrationRequired: true,
  },
];

/**
 * Programme totals for the year. Constants rather than counts over the array above, for the same
 * reason as the member and volunteer totals: the sample is a slice, and deriving the headline from it
 * would move the number every time a row is added.
 */
export const eventTotals = {
  upcoming: 8,
  thisMonth: 12,
  registrations: 428,
  completed: 24,
} as const;

export function eventById(id: string): MosqueEvent | undefined {
  return events.find((event) => event.id === id);
}

/** The soonest events, for the overview page. Cancelled ones are left out — they are not upcoming. */
export function upcomingEvents(limit: number): MosqueEvent[] {
  return events
    .filter((event) => event.status === "Upcoming")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

/** Event filter options for the registrations page. */
export const eventFilterOptions = [
  { value: "all", label: "All events" },
  ...events
    .filter((event) => event.registrationRequired)
    .map((event) => ({ value: event.id, label: event.title })),
];
