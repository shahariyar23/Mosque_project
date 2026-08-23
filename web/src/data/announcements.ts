import type { Announcement } from "@/lib/mosque/types";

/**
 * The noticeboard — what the mosque is telling the community right now.
 *
 * An announcement is a message with a reach (its audience and channels) and a life-cycle: a draft
 * being written, one scheduled to go out, one published and live, or one archived once it has served
 * its purpose. Pinned announcements ride at the top of the board. `expiresAt` is set where a notice
 * stops being true after a date — a closure, an urgent one-nighter — and left off where it doesn't.
 * Shaped to sit behind a future `GET /announcements`.
 */

export const announcements: Announcement[] = [
  {
    id: "ANC-001",
    title: "New autumn prayer timetable now in effect",
    message:
      "The autumn timetable is now live across the website and the app, with Fajr and Isha shifting as the nights draw in. Please check the app the night before, as jamā'ah times move by a few minutes through the season. Printed copies are on the noticeboard by both entrances.",
    category: "Prayer",
    audience: "Whole community",
    status: "Published",
    channels: ["Website", "App", "Notice board"],
    pinned: true,
    author: "Imam Abdul Karim",
    publishedAt: "2026-08-20",
  },
  {
    id: "ANC-002",
    title: "Jumu'ah continues in two sessions this autumn",
    message:
      "Both Jumu'ah sessions carry on through the autumn term — the first khutbah at 1:00 PM and the second at 2:00 PM — to give everyone room to pray comfortably. Please arrive early for the first session if you can, and leave the front rows for those coming straight from work to the second.",
    category: "Prayer",
    audience: "Whole community",
    status: "Published",
    channels: ["Website", "App"],
    pinned: false,
    author: "Mosque Office",
    publishedAt: "2026-08-18",
  },
  {
    id: "ANC-003",
    title: "Car park resurfacing — please use the side entrance",
    message:
      "The main car park is being resurfaced from Monday and will be closed for the week. Please use street parking and come in through the side entrance on Victoria Road during this time. We are sorry for the disruption and have kept the work to a single week to finish before the weekend classes return.",
    category: "Closure",
    audience: "Whole community",
    status: "Published",
    channels: ["Website", "App", "Email", "Notice board"],
    pinned: true,
    author: "Facilities Team",
    publishedAt: "2026-08-22",
    expiresAt: "2026-08-31",
  },
  {
    id: "ANC-004",
    title: "Autumn term classes now open for enrolment",
    message:
      "Enrolment for the autumn term is open across the whole teaching programme — the weekend Qur'an classes, the Arabic ladder, the adult Islamic studies course and the sisters' halaqah. Places in the children's classes fill quickly, so please enrol early through the office or the app to secure a spot.",
    category: "Event",
    audience: "Whole community",
    status: "Published",
    channels: ["Website", "App", "Email"],
    pinned: false,
    author: "Education Team",
    publishedAt: "2026-08-15",
  },
  {
    id: "ANC-005",
    title: "Roof repair fund — help us reach our target",
    message:
      "Following the survey this summer, the prayer hall roof needs urgent repair before winter. We have opened a dedicated fund and are asking every household to give what they can, whether one-off or monthly. Every contribution is sadaqah jāriyah for as long as the community prays beneath it — jazākum Allāhu khayran.",
    category: "Fundraising",
    audience: "Whole community",
    status: "Published",
    channels: ["Website", "App", "Email", "Notice board"],
    pinned: true,
    author: "Fundraising Committee",
    publishedAt: "2026-08-10",
  },
  {
    id: "ANC-006",
    title: "Sisters' halaqah resumes Thursday mornings",
    message:
      "The weekly sisters' halaqah returns this Thursday at 10:30 AM in the sisters' section, continuing our study of the current surah with its tafsir. All sisters are warmly welcome, and childcare is available in the adjoining room. No enrolment is needed — simply come along.",
    category: "Event",
    audience: "Sisters",
    status: "Published",
    channels: ["Website", "App"],
    pinned: false,
    author: "Sister Ayesha Siddiqua",
    publishedAt: "2026-08-19",
  },
  {
    id: "ANC-007",
    title: "Tonight's Isha jamā'ah moved to the Community Hall",
    message:
      "Because of the electrical work in the main prayer hall, tonight's Isha congregation will be held in the Community Hall instead. Please follow the signs from the main entrance. Everything returns to normal for Fajr tomorrow, inshā'Allah.",
    category: "Urgent",
    audience: "Whole community",
    status: "Published",
    channels: ["App", "Notice board"],
    pinned: false,
    author: "Mosque Office",
    publishedAt: "2026-08-23",
    expiresAt: "2026-08-24",
  },
  {
    id: "ANC-008",
    title: "Youth football tournament — register your team",
    message:
      "The autumn youth football tournament returns next month, open to brothers aged 13–18 in teams of five. Registration is through the youth coordinator or the app, and places are limited to twelve teams. Come for the football, stay for the barbecue afterwards.",
    category: "Event",
    audience: "Youth",
    status: "Scheduled",
    channels: ["App", "Email"],
    pinned: false,
    author: "Imam Abdullah Hasan",
    publishedAt: "2026-08-28",
  },
  {
    id: "ANC-009",
    title: "Annual General Meeting — save the date",
    message:
      "The mosque's Annual General Meeting will be held next month, when the committee will present the year's accounts, the roof fund update and the plans for the year ahead. All members are encouraged to attend and to bring their questions. A formal agenda and the papers will follow by email.",
    category: "General",
    audience: "Members",
    status: "Scheduled",
    channels: ["Email", "Website"],
    pinned: false,
    author: "Mosque Secretary",
    publishedAt: "2026-09-01",
  },
  {
    id: "ANC-010",
    title: "Community blood donation drive at the mosque",
    message:
      "In partnership with the regional blood service, we are hosting a donation drive in the Community Hall next month. Giving blood is a profound sadaqah — a single donation can save several lives. Booking details and the eligibility checklist will be published closer to the date.",
    category: "General",
    audience: "Whole community",
    status: "Scheduled",
    channels: ["Website", "App", "Notice board"],
    pinned: false,
    author: "Welfare Team",
    publishedAt: "2026-08-30",
  },
  {
    id: "ANC-011",
    title: "Gas safety inspection — building closed Monday morning",
    message:
      "A routine gas safety inspection means the building will be closed to the public from 9:00 AM to 12:00 PM on Monday. The car park and side rooms remain accessible, and all prayers from Dhuhr onwards are unaffected. This notice is being finalised with the contractor before it goes out.",
    category: "Closure",
    audience: "Whole community",
    status: "Draft",
    channels: ["Website", "App", "Notice board"],
    pinned: false,
    author: "Facilities Team",
    publishedAt: "2026-08-23",
  },
  {
    id: "ANC-012",
    title: "Volunteer thank-you evening",
    message:
      "We would like to thank the volunteers who keep the mosque running — from the weekend teachers to the car-park stewards — with a shared meal and a short programme. An invitation with the date and the RSVP will go out once the hall booking is confirmed.",
    category: "Event",
    audience: "Volunteers",
    status: "Draft",
    channels: ["Email"],
    pinned: false,
    author: "Mosque Office",
    publishedAt: "2026-08-23",
  },
  {
    id: "ANC-013",
    title: "Eid al-Adha prayer times & arrangements",
    message:
      "Eid al-Adha prayers were held across three sessions in the main hall and the marquee, with an overflow into the Community Hall. Our thanks to everyone who came early, parked considerately and helped the day run smoothly. Kept here for the record.",
    category: "Prayer",
    audience: "Whole community",
    status: "Archived",
    channels: ["Website", "App", "Email", "Notice board"],
    pinned: false,
    author: "Imam Abdul Karim",
    publishedAt: "2026-05-20",
    expiresAt: "2026-06-10",
  },
  {
    id: "ANC-014",
    title: "Ramadan 2026 timetable & taraweeh arrangements",
    message:
      "The Ramadan timetable, the taraweeh schedule and the iftar rota served the community throughout the blessed month. May Allah accept everyone's fasting, prayer and giving. Archived now that the season has passed; the 2027 arrangements will be published nearer the time.",
    category: "Ramadan",
    audience: "Whole community",
    status: "Archived",
    channels: ["Website", "App", "Email", "Notice board"],
    pinned: false,
    author: "Mosque Office",
    publishedAt: "2026-02-15",
    expiresAt: "2026-03-31",
  },
];

export function announcementById(id: string): Announcement | undefined {
  return announcements.find((announcement) => announcement.id === id);
}

export const announcementStats = {
  total: announcements.length,
  published: announcements.filter((announcement) => announcement.status === "Published").length,
  scheduled: announcements.filter((announcement) => announcement.status === "Scheduled").length,
  pinned: announcements.filter((announcement) => announcement.pinned).length,
};
