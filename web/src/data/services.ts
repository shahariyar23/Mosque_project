import type { Service } from "@/lib/mosque/types";

/**
 * The mosque's service catalogue — what the community can call on the masjid for beyond the five
 * daily prayers. Funerals and marriages are the two the office is asked for most, so they sit at the
 * top; the welfare and counselling services are quieter but are the ones a family remembers.
 *
 * `fee` is a suggested contribution in BDT, and zero means genuinely free — a janazah is never
 * charged for. `bookingsThisMonth` is a denormalised count so a card does not have to scan the
 * bookings list; the recent requests themselves live in `data/bookings.ts`.
 */
export const services: Service[] = [
  {
    id: "SVC-001",
    name: "Janazah (Funeral) Service",
    category: "Funeral",
    status: "Active",
    summary: "Full funeral arrangement — ghusl, kafan, janazah prayer and burial coordination.",
    description:
      "The mosque arranges the whole janazah from the moment a family calls: washing and shrouding, the " +
      "funeral prayer after the next congregation, and coordination with the graveyard and the local " +
      "council. There is never a charge — the fund covers a family that cannot. Available at any hour; " +
      "call the emergency line first and the office will follow up.",
    coordinator: "Imam Abdul Karim",
    contactPhone: "+880 1713-668190",
    location: "Main prayer hall & mortuary room",
    availability: "24 hours, every day",
    fee: 0,
    requiresBooking: true,
    turnaround: "Same day",
    bookingsThisMonth: 6,
    totalBookings: 214,
    updatedAt: "2026-08-20",
  },
  {
    id: "SVC-002",
    name: "Ghusl & Kafan Preparation",
    category: "Funeral",
    status: "Active",
    summary: "Ritual washing and shrouding of the deceased by trained brothers and sisters.",
    description:
      "For families who need only the ghusl and kafan rather than the full arrangement. A trained team of " +
      "brothers and a separate team of sisters attend, and the mosque supplies the kafan cloth. Offered " +
      "free; contributions to the burial fund are welcome but never asked for.",
    coordinator: "Hafiz Mizanur Rahman",
    contactPhone: "+880 1719-604182",
    location: "Mortuary room, ground floor",
    availability: "24 hours, by call-out",
    fee: 0,
    requiresBooking: true,
    turnaround: "Same day",
    bookingsThisMonth: 4,
    totalBookings: 176,
    updatedAt: "2026-08-18",
  },
  {
    id: "SVC-003",
    name: "Nikah (Marriage) Ceremony",
    category: "Marriage",
    status: "Active",
    summary: "Islamic marriage solemnised by the imam, with two witnesses and the marriage register.",
    description:
      "The imam conducts the nikah in the main hall or the community room, records it in the mosque's " +
      "marriage register and issues a certificate. The suggested contribution covers the register entry and " +
      "the certificate; the hall itself is booked separately if a walima is to follow. Book at least a week " +
      "ahead so the paperwork and witnesses are in order.",
    coordinator: "Imam Abdullah Hasan",
    contactPhone: "+880 1912-780451",
    location: "Community room, first floor",
    availability: "By appointment",
    fee: 5000,
    requiresBooking: true,
    turnaround: "3–5 days",
    bookingsThisMonth: 3,
    totalBookings: 88,
    updatedAt: "2026-08-15",
  },
  {
    id: "SVC-004",
    name: "Marriage Certificate Attestation",
    category: "Certificate",
    status: "Active",
    summary: "Attested copies of a nikah recorded in the mosque register, for legal and visa use.",
    description:
      "Issues attested copies of a marriage the mosque solemnised, for embassy, immigration or family-court " +
      "purposes. The office locates the register entry, prepares the copy and the imam signs and stamps it. " +
      "Bring the original certificate and photo ID for both parties.",
    coordinator: "Shahed Alam",
    contactPhone: "+880 1714-889201",
    location: "Mosque office",
    availability: "Office hours, Sun–Thu",
    fee: 500,
    requiresBooking: false,
    turnaround: "2–3 days",
    bookingsThisMonth: 5,
    totalBookings: 143,
    updatedAt: "2026-08-19",
  },
  {
    id: "SVC-005",
    name: "Family & Marital Counselling",
    category: "Counselling",
    status: "Active",
    summary: "Confidential counselling for couples and families, grounded in Islamic guidance.",
    description:
      "A confidential sitting with the imam for couples working through a difficulty, or families in " +
      "dispute over inheritance, care of a parent or a child's upbringing. Sessions are private, unrecorded " +
      "and free. Where a matter needs more than the imam can offer, he refers on to a professional service.",
    coordinator: "Imam Abdullah Hasan",
    contactPhone: "+880 1912-780451",
    location: "Imam's office (private)",
    availability: "By appointment",
    fee: 0,
    requiresBooking: true,
    turnaround: "Within a week",
    bookingsThisMonth: 7,
    totalBookings: 132,
    updatedAt: "2026-08-21",
  },
  {
    id: "SVC-006",
    name: "Youth Mentoring & Guidance",
    category: "Counselling",
    status: "Active",
    summary: "One-to-one mentoring for young people navigating faith, school and identity.",
    description:
      "A regular sitting for teenagers and young adults — questions of faith, pressure at school or " +
      "university, and growing up between the language of home and the language of the street. Run by the " +
      "youth coordinator on weekends, free of charge, with a parent's consent for under-16s.",
    coordinator: "Tanvir Ahmed",
    contactPhone: "+880 1717-513806",
    location: "Youth room, first floor",
    availability: "Weekends",
    fee: 0,
    requiresBooking: true,
    turnaround: "Within a week",
    bookingsThisMonth: 5,
    totalBookings: 61,
    updatedAt: "2026-08-17",
  },
  {
    id: "SVC-007",
    name: "New Muslim (Shahada) Support",
    category: "Education",
    status: "Active",
    summary: "Taking the shahada, a certificate, and a mentor for the first months of the journey.",
    description:
      "For anyone embracing Islam: the shahada is witnessed at the mosque, a certificate is issued, and a " +
      "mentor is paired for the first few months to walk through wudu, salah and the basics without " +
      "pressure. A small welcome pack — a prayer mat, a Qur'an with translation — comes with it. Free.",
    coordinator: "Dr. Abdullah Rahman",
    contactPhone: "+880 1716-451028",
    location: "Community room, first floor",
    availability: "By appointment",
    fee: 0,
    requiresBooking: true,
    turnaround: "Within a week",
    bookingsThisMonth: 2,
    totalBookings: 47,
    updatedAt: "2026-08-14",
  },
  {
    id: "SVC-008",
    name: "Zakat Calculation & Advice",
    category: "Welfare",
    status: "Active",
    summary: "Help working out zakat due on savings, gold, business and property, with a written summary.",
    description:
      "The treasurer's team sits with anyone unsure how to calculate their zakat — on savings, gold, a " +
      "business or rental property — and provides a written summary of what is due and when. The mosque can " +
      "also distribute it to verified recipients on the donor's behalf. Busiest in Ramadan; available all " +
      "year by appointment. Free.",
    coordinator: "Rafiqul Islam",
    contactPhone: "+880 1713-668190",
    location: "Mosque office",
    availability: "By appointment; daily in Ramadan",
    fee: 0,
    requiresBooking: true,
    turnaround: "2–3 days",
    bookingsThisMonth: 4,
    totalBookings: 96,
    updatedAt: "2026-08-16",
  },
  {
    id: "SVC-009",
    name: "Community Welfare & Financial Aid",
    category: "Welfare",
    status: "Active",
    summary: "Discreet support for families in hardship, reviewed monthly by the welfare committee.",
    description:
      "A confidential application for a family facing hardship — rent, utility arrears, medical costs or " +
      "food support. Applications go to the welfare committee, which meets monthly, and support is drawn " +
      "from the sadaqah and zakat funds. Handled discreetly; no one is turned away without a hearing.",
    coordinator: "Rehana Begum",
    contactPhone: "+880 1820-114578",
    location: "Mosque office (private)",
    availability: "Reviewed monthly",
    fee: 0,
    requiresBooking: true,
    turnaround: "Monthly review",
    bookingsThisMonth: 3,
    totalBookings: 58,
    updatedAt: "2026-08-12",
  },
  {
    id: "SVC-010",
    name: "Main Hall Hire",
    category: "Facility",
    status: "Active",
    summary: "The main hall for a walima, aqiqah or community gathering — seats up to 250.",
    description:
      "The main hall is available to members for a walima, aqiqah, milad or community gathering — seating " +
      "for up to 250, with a small kitchen and separate seating for sisters. The contribution covers " +
      "cleaning and utilities. Prayer times take precedence, so bookings are arranged around the " +
      "congregation. No music, in keeping with the house rules.",
    coordinator: "Shahed Alam",
    contactPhone: "+880 1714-889201",
    location: "Main hall, ground floor",
    availability: "By booking; not during prayer",
    fee: 8000,
    requiresBooking: true,
    turnaround: "3–5 days",
    bookingsThisMonth: 4,
    totalBookings: 119,
    updatedAt: "2026-08-22",
  },
  {
    id: "SVC-011",
    name: "Islamic Will (Wasiyyah) Guidance",
    category: "Certificate",
    status: "Paused",
    summary: "Guidance on drafting a will in line with the shariah rules of inheritance.",
    description:
      "Guidance on preparing a will that follows the Qur'anic shares, with a template and a referral to a " +
      "solicitor for the legal drafting. Paused this month while the coordinator is on hajj leave — the " +
      "office is holding enquiries and will resume appointments in the first week of September.",
    coordinator: "Golam Mostafa",
    contactPhone: "+880 1720-993471",
    location: "Mosque office",
    availability: "Paused until September",
    fee: 1000,
    requiresBooking: true,
    turnaround: "1–2 weeks",
    bookingsThisMonth: 0,
    totalBookings: 34,
    updatedAt: "2026-08-05",
  },
  {
    id: "SVC-012",
    name: "Fidya & Kaffara Collection",
    category: "Welfare",
    status: "Draft",
    summary: "A collection point for fidya and kaffara, distributed to the needy on the giver's behalf.",
    description:
      "A dedicated point to pay fidya for missed fasts or kaffara for a broken oath, which the mosque " +
      "distributes to verified recipients. Being set up for the coming Ramadan — the rates and the online " +
      "form are not finished yet, so this is not open to the community.",
    coordinator: "Rafiqul Islam",
    contactPhone: "+880 1713-668190",
    location: "Mosque office",
    availability: "Not yet open",
    fee: 0,
    requiresBooking: false,
    turnaround: "To be confirmed",
    bookingsThisMonth: 0,
    totalBookings: 0,
    updatedAt: "2026-08-08",
  },
];

/** Headline figures for the services summary strip, derived from the catalogue above. */
export const serviceStats = {
  total: services.length,
  active: services.filter((service) => service.status === "Active").length,
  paused: services.filter((service) => service.status === "Paused").length,
  draft: services.filter((service) => service.status === "Draft").length,
  free: services.filter((service) => service.status === "Active" && service.fee === 0).length,
  bookingsThisMonth: services.reduce((sum, service) => sum + service.bookingsThisMonth, 0),
};

/** Look up one service by id — used by the bookings form to resolve a service name and category. */
export function serviceById(id: string): Service | undefined {
  return services.find((service) => service.id === id);
}
