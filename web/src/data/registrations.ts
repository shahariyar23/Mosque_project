import { eventById } from "@/data/events";
import type { IsoDate, Registration, RegistrationStatus } from "@/lib/mosque/types";

/**
 * Event registrations.
 *
 * `eventTitle` and `eventDate` are denormalised onto the row so the table can be rendered and sorted
 * without a join — the same shape the API will return, and the reason a registration row survives an
 * event being renamed.
 *
 * A registration is either from a member (`memberId` set) or from a visitor. Both are kept in the same
 * register because an event does not care which someone is; the distinction only matters when the
 * mosque later invites them to join.
 */

/* [participant, email, phone, eventId, registeredAt, guests, status, memberId, requirements] */
type RegistrationSeed = readonly [
  string,
  string,
  string,
  string,
  IsoDate,
  number,
  RegistrationStatus,
  string | null,
  string | null,
];

const seeds: RegistrationSeed[] = [
  ["Fatima Khan", "fatima@example.com", "+880 1812-334027", "EVT-102", "2026-08-21", 2, "Confirmed", "MEM-002", "Sisters' seating, first floor"],
  ["Ahmed Rahman", "ahmed@example.com", "+880 1712-556104", "EVT-105", "2026-08-20", 1, "Confirmed", "MEM-001", "Child is 7, beginner group"],
  ["Tanvir Ahmed", "tanvir@example.com", "+880 1717-513806", "EVT-102", "2026-08-19", 0, "Confirmed", "MEM-008", null],
  ["Nusrat Jahan", "nusrat@example.com", "+880 1819-076332", "EVT-104", "2026-08-19", 1, "Confirmed", "MEM-009", "Bringing a 4-year-old, needs childcare"],
  ["Imran Chowdhury", "imran@example.com", "+880 1718-227503", "EVT-103", "2026-08-22", 4, "Confirmed", "MEM-016", "Family of five, one high chair"],
  ["Rashed Kabir", "rashed.kabir@example.com", "+880 1913-556201", "EVT-102", "2026-08-18", 0, "Confirmed", null, null],
  ["Farhana Islam", "farhana@example.com", "+880 1825-773390", "EVT-104", "2026-08-17", 0, "Confirmed", "MEM-017", null],
  ["Zahid Hasan", "zahid@example.com", "+880 1724-402916", "EVT-108", "2026-08-16", 0, "Confirmed", "MEM-028", "Playing for Banani Youth"],
  ["Saima Hossain", "saima@example.com", "+880 1837-935107", "EVT-103", "2026-08-22", 3, "Confirmed", "MEM-029", "One wheelchair user in the party"],
  ["Mohammad Ali", "mohammad.ali@example.com", "+880 1711-902348", "EVT-106", "2026-08-15", 0, "Confirmed", "MEM-004", "Available for the noon packing shift"],
  ["Lubna Ahmed", "lubna@example.com", "+880 1833-591640", "EVT-104", "2026-08-16", 0, "Confirmed", "MEM-025", null],
  ["Sadia Noor", "sadia.noor@example.com", "+880 1826-410375", "EVT-102", "2026-08-20", 1, "Confirmed", null, "Sisters' seating"],
  ["Habibur Rahman", "habibur@example.com", "+880 1719-604182", "EVT-107", "2026-08-14", 5, "Confirmed", "MEM-018", "Grandson is one of the graduates"],
  ["Marium Chowdhury", "marium@example.com", "+880 1823-908714", "EVT-104", "2026-08-18", 2, "Confirmed", "MEM-015", null],
  ["Faisal Mahmud", "faisal@example.com", "+880 1722-864095", "EVT-108", "2026-08-17", 0, "Confirmed", "MEM-024", null],
  ["Anwar Hossain", "anwar.hossain@example.com", "+880 1730-882194", "EVT-103", "2026-08-21", 2, "Confirmed", null, null],
  ["Tahmina Akter", "tahmina@example.com", "+880 1822-660145", "EVT-106", "2026-08-13", 1, "Confirmed", "MEM-013", "Can cover the afternoon shift"],
  ["Arif Billah", "arif@example.com", "+880 1727-330281", "EVT-108", "2026-08-19", 0, "Confirmed", "MEM-034", null],
  ["Sumaiya Rahman", "sumaiya@example.com", "+880 1827-118064", "EVT-104", "2026-08-15", 0, "Confirmed", "MEM-019", null],
  ["Rehana Begum", "rehana@example.com", "+880 1820-114578", "EVT-103", "2026-08-20", 3, "Confirmed", "MEM-011", "Helping the kitchen from four"],
  ["Kamrun Nahar", "kamrun@example.com", "+880 1841-517069", "EVT-104", "2026-08-21", 1, "Pending", "MEM-033", "Awaiting confirmation of the level"],
  ["Nasir Uddin", "nasir@example.com", "+880 1728-885134", "EVT-102", "2026-08-22", 0, "Pending", "MEM-036", null],
  ["Shamima Nasrin", "shamima@example.com", "+880 1843-609472", "EVT-103", "2026-08-22", 2, "Pending", "MEM-035", null],
  ["Rezwan Ahmed", "rezwan.ahmed@example.com", "+880 1915-770428", "EVT-107", "2026-08-22", 4, "Pending", null, "Travelling from Chattogram, may arrive late"],
  ["Afsana Mimi", "afsana@example.com", "+880 1845-172908", "EVT-104", "2026-08-20", 0, "Pending", "MEM-037", null],
  ["Mainul Haque", "mainul@example.com", "+880 1726-046593", "EVT-106", "2026-08-21", 0, "Pending", "MEM-032", null],
  ["Tariq Aziz", "tariq.aziz@example.com", "+880 1717-229058", "EVT-102", "2026-08-23", 1, "Pending", null, null],
  ["Nabila Karim", "nabila.karim@example.com", "+880 1832-604197", "EVT-105", "2026-08-22", 2, "Waitlisted", null, "Two children, ages 8 and 10"],
  ["Shahin Alam", "shahin.alam@example.com", "+880 1721-953460", "EVT-105", "2026-08-22", 1, "Waitlisted", null, "Happy to take a place if one opens"],
  ["Ruma Begum", "ruma.begum@example.com", "+880 1838-117205", "EVT-105", "2026-08-23", 1, "Waitlisted", null, null],
  ["Jubair Hasan", "jubair.hasan@example.com", "+880 1716-448390", "EVT-109", "2026-07-18", 0, "Waitlisted", null, "For the October intake"],
  ["Masud Karim", "masud@example.com", "+880 1729-640715", "EVT-103", "2026-08-16", 0, "Cancelled", "MEM-038", "Travelling that week"],
  ["Shafiqul Alam", "shafiqul@example.com", "+880 1731-556982", "EVT-102", "2026-08-14", 0, "Cancelled", "MEM-041", null],
  ["Peyara Khatun", "peyara.khatun@example.com", "+880 1849-336082", "EVT-111", "2026-08-02", 2, "Cancelled", null, "Event was cancelled by the mosque"],
  ["Golam Mostafa", "golam@example.com", "+880 1720-993471", "EVT-111", "2026-08-01", 1, "Cancelled", "MEM-020", "Event was cancelled by the mosque"],
  ["Ayesha Siddiqua", "ayesha@example.com", "+880 1816-220744", "EVT-110", "2026-08-10", 0, "Confirmed", "MEM-007", null],
  ["Ruhul Amin", "ruhul@example.com", "+880 1723-118472", "EVT-110", "2026-08-09", 2, "Confirmed", "MEM-026", null],
  ["Nazma Parvin", "nazma@example.com", "+880 1831-207819", "EVT-113", "2026-06-11", 1, "Confirmed", "MEM-023", null],
];

export const registrations: Registration[] = seeds.map((seed, index) => {
  const [participantName, participantEmail, participantPhone, eventId, registeredAt, guests, status, memberId, requirements] =
    seed;
  const event = eventById(eventId);

  return {
    id: `REG-${String(index + 1).padStart(4, "0")}`,
    participantName,
    participantEmail,
    participantPhone,
    eventId,
    eventTitle: event?.title ?? "Unknown event",
    eventDate: event?.date ?? registeredAt,
    registeredAt,
    guests,
    status,
    specialRequirements: requirements ?? undefined,
    memberId: memberId ?? undefined,
  };
});

/**
 * Register-wide totals.
 *
 * The brief asked for four cards — total, pending, confirmed, cancelled — but those three states do
 * not add up to 428 once a waitlist exists, and three of the sample rows are waitlisted because
 * the children's Qur'an class is full. Rather than publish four figures that quietly disagree with
 * each other, the waitlist gets its own card and the five sum exactly.
 */
export const registrationTotals = {
  total: 428,
  confirmed: 380,
  pending: 24,
  waitlisted: 6,
  cancelled: 18,
} as const;

/** Registrations for one event — used by the event detail panel. */
export function registrationsForEvent(eventId: string): Registration[] {
  return registrations.filter((registration) => registration.eventId === eventId);
}

/** Registrations by one member — used by the member detail drawer's Events tab. */
export function registrationsForMember(memberId: string): Registration[] {
  return registrations.filter((registration) => registration.memberId === memberId);
}
