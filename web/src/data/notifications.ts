import type { NotificationMessage } from "@/lib/mosque/types";

/**
 * The send log — every push, email, SMS or in-app message the mosque has pushed to a segment of the
 * community, with the delivery figures it earned. This is the outgoing act; the announcements module
 * is the standing notice on the board. A sent message carries recipients, delivered and opened
 * counts; a scheduled or draft one has none yet, and a failed send delivered nothing. SMS carries no
 * open tracking, so its opened count is zero by nature. Shaped to sit behind a future
 * `GET /notifications`.
 */

export const notifications: NotificationMessage[] = [
  {
    id: "NTF-001",
    title: "Jumu'ah reminder: two sessions today",
    message:
      "Jumu'ah is held in two sessions today — the first khutbah at 1:00 PM and the second at 2:00 PM. Please arrive early and leave space for those coming straight from work.",
    channel: "Push",
    audience: "Whole community",
    status: "Sent",
    sender: "Mosque Office",
    sentAt: "2026-08-22",
    recipients: 1850,
    delivered: 1826,
    opened: 1204,
  },
  {
    id: "NTF-002",
    title: "Autumn prayer timetable now live in the app",
    message:
      "The autumn timetable is now in the app. Jamā'ah times shift by a few minutes through the season as the nights draw in, so please check the night before.",
    channel: "Push",
    audience: "Whole community",
    status: "Sent",
    sender: "Mosque Office",
    sentAt: "2026-08-20",
    recipients: 1850,
    delivered: 1831,
    opened: 1387,
  },
  {
    id: "NTF-003",
    title: "Class enrolment closes Friday",
    message:
      "A reminder that autumn term enrolment closes this Friday. Places in the children's weekend classes are nearly full — please confirm your child's place through the office or the app.",
    channel: "Email",
    audience: "Class parents",
    status: "Sent",
    sender: "Education Team",
    sentAt: "2026-08-19",
    recipients: 140,
    delivered: 139,
    opened: 98,
  },
  {
    id: "NTF-004",
    title: "Roof repair fund: thank you — we're 60% there",
    message:
      "Jazākum Allāhu khayran to everyone who has given to the roof fund. We have reached sixty per cent of the target and hope to complete the work before winter. Every contribution counts.",
    channel: "Email",
    audience: "Donors",
    status: "Sent",
    sender: "Fundraising Committee",
    sentAt: "2026-08-18",
    recipients: 360,
    delivered: 357,
    opened: 241,
  },
  {
    id: "NTF-005",
    title: "Volunteers needed for the car-park rota",
    message:
      "With the resurfacing under way, we need a few more brothers on the car-park rota over the next two weekends. If you can help for an hour, please reply in the app.",
    channel: "In-app",
    audience: "Volunteers",
    status: "Sent",
    sender: "Mosque Office",
    sentAt: "2026-08-17",
    recipients: 95,
    delivered: 95,
    opened: 71,
  },
  {
    id: "NTF-006",
    title: "Youth football: register your team",
    message:
      "The autumn youth football tournament is open for registration — teams of five, brothers aged 13–18. Twelve places only. Sign up through the youth coordinator or the app.",
    channel: "Push",
    audience: "Youth",
    status: "Sent",
    sender: "Imam Abdullah Hasan",
    sentAt: "2026-08-16",
    recipients: 180,
    delivered: 176,
    opened: 119,
  },
  {
    id: "NTF-007",
    title: "Membership renewal reminder",
    message:
      "This is a reminder that annual membership is due for renewal. Renewing keeps your voting rights for the AGM and supports the mosque's running costs. Renew at the office or online.",
    channel: "SMS",
    audience: "Members",
    status: "Sent",
    sender: "Mosque Office",
    sentAt: "2026-08-14",
    recipients: 420,
    delivered: 415,
    opened: 0,
  },
  {
    id: "NTF-008",
    title: "Isha jama'ah moved to the Community Hall tonight",
    message:
      "Because of electrical work in the main hall, tonight's Isha congregation is in the Community Hall. Please follow the signs from the main entrance. Everything returns to normal for Fajr.",
    channel: "Push",
    audience: "Whole community",
    status: "Sent",
    sender: "Mosque Office",
    sentAt: "2026-08-23",
    recipients: 1850,
    delivered: 1840,
    opened: 1522,
  },
  {
    id: "NTF-009",
    title: "Reminder: AGM next month — save the date",
    message:
      "A reminder will go out to all members with the Annual General Meeting date, the agenda and the year's accounts. Please look out for it and plan to attend.",
    channel: "Email",
    audience: "Members",
    status: "Scheduled",
    sender: "Mosque Secretary",
    sentAt: "2026-09-01",
    recipients: 0,
    delivered: 0,
    opened: 0,
  },
  {
    id: "NTF-010",
    title: "Blood donation drive — booking opens soon",
    message:
      "Booking for the community blood donation drive opens next week. We will send the link and the eligibility checklist once the slots are confirmed with the blood service.",
    channel: "Push",
    audience: "Whole community",
    status: "Scheduled",
    sender: "Welfare Team",
    sentAt: "2026-08-30",
    recipients: 0,
    delivered: 0,
    opened: 0,
  },
  {
    id: "NTF-011",
    title: "Gas safety: building closed Monday morning",
    message:
      "A draft alert for the gas safety inspection — the building will be closed to the public from 9:00 AM to 12:00 PM on Monday. Being held until the contractor confirms the time.",
    channel: "Push",
    audience: "Whole community",
    status: "Draft",
    sender: "Facilities Team",
    sentAt: "",
    recipients: 0,
    delivered: 0,
    opened: 0,
  },
  {
    id: "NTF-012",
    title: "Eid gift collection for orphans",
    message:
      "An appeal for the orphan Eid gift collection. This send did not go through — the SMS provider rejected the batch, so no messages were delivered. It needs to be checked and sent again.",
    channel: "SMS",
    audience: "Donors",
    status: "Failed",
    sender: "Mosque Office",
    sentAt: "2026-08-15",
    recipients: 360,
    delivered: 0,
    opened: 0,
  },
];

export function notificationById(id: string): NotificationMessage | undefined {
  return notifications.find((notification) => notification.id === id);
}

const sentMessages = notifications.filter((notification) => notification.status === "Sent");
const totalDelivered = sentMessages.reduce((sum, notification) => sum + notification.delivered, 0);
const totalOpened = sentMessages.reduce((sum, notification) => sum + notification.opened, 0);

export const notificationStats = {
  total: notifications.length,
  sent: sentMessages.length,
  scheduled: notifications.filter((notification) => notification.status === "Scheduled").length,
  delivered: totalDelivered,
  /** Opened over delivered across sent messages, as a whole-number percentage. */
  openRate: totalDelivered === 0 ? 0 : Math.round((totalOpened / totalDelivered) * 100),
};
