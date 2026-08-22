import type {
  IsoDate,
  Volunteer,
  VolunteerAvailability,
  VolunteerSchedule,
  VolunteerStatus,
  VolunteerTeam,
} from "@/lib/mosque/types";

/**
 * Volunteer teams and the people on them.
 *
 * Eight teams, eighty-six volunteers. `volunteerCount` is denormalised onto the team so a team card
 * does not scan the roster — the same choice the finance module makes for fund balances, and for the
 * same reason: the API will send it that way.
 */
export const volunteerTeams: VolunteerTeam[] = [
  {
    id: "cleaning",
    name: "Cleaning Team",
    description: "Prayer halls, ablution areas and the courtyard, before Fajr and after Isha.",
    icon: "sparkle",
    lead: "Abdullah Hasan",
    volunteerCount: 18,
    activeToday: 9,
  },
  {
    id: "event-support",
    name: "Event Support",
    description: "Setting up, seating, registration desks and packing down after programmes.",
    icon: "calendar-days",
    lead: "Mohammad Ali",
    volunteerCount: 14,
    activeToday: 7,
  },
  {
    id: "security",
    name: "Security",
    description: "Gates, shoe racks and the car park on Fridays and at large gatherings.",
    icon: "shield",
    lead: "Nasir Uddin",
    volunteerCount: 12,
    activeToday: 6,
  },
  {
    id: "food",
    name: "Food Distribution",
    description: "Friday food parcels for families in need, and iftar service through Ramadan.",
    icon: "utensils",
    lead: "Rehana Begum",
    volunteerCount: 16,
    activeToday: 8,
  },
  {
    id: "education",
    name: "Education Support",
    description: "Assisting the madrasa teachers and supervising the weekend Qur'an classes.",
    icon: "graduation-cap",
    lead: "Farhana Islam",
    volunteerCount: 10,
    activeToday: 5,
  },
  {
    id: "media",
    name: "Media Team",
    description: "Recording khutbahs, running the livestream and the mosque's notice boards.",
    icon: "camera",
    lead: "Tanvir Ahmed",
    volunteerCount: 8,
    activeToday: 3,
  },
  {
    id: "womens",
    name: "Women's Section",
    description: "The women's hall, its classes and the sisters' registration desk at events.",
    icon: "hands-heart",
    lead: "Sabina Yeasmin",
    volunteerCount: 5,
    activeToday: 2,
  },
  {
    id: "maintenance",
    name: "Maintenance",
    description: "Fans, lighting, plumbing and the small repairs that do not need a contractor.",
    icon: "sliders",
    lead: "Golam Mostafa",
    volunteerCount: 3,
    activeToday: 1,
  },
];

const teamNames = new Map(volunteerTeams.map((team) => [team.id, team.name]));

/* [name, email, phone, teamId, schedule, availability, joinedDate, status, skills, hours, events] */
type VolunteerSeed = readonly [
  string,
  string,
  string,
  string,
  VolunteerSchedule,
  VolunteerAvailability,
  IsoDate,
  VolunteerStatus,
  string,
  number,
  number,
];

const seeds: VolunteerSeed[] = [
  ["Abdullah Hasan", "abdullah@example.com", "+880 1912-780451", "cleaning", "Weekends", "Available", "2026-01-11", "Active", "Team lead|Rota planning|First aid", 124, 18],
  ["Mohammad Ali", "mohammad.ali@example.com", "+880 1711-902348", "event-support", "Evenings", "Available", "2026-02-04", "Active", "Team lead|Sound system|Crowd management", 96, 22],
  ["Nasir Uddin", "nasir@example.com", "+880 1728-885134", "security", "Fridays", "Busy", "2025-11-19", "Active", "Team lead|Car park|De-escalation", 142, 31],
  ["Rehana Begum", "rehana@example.com", "+880 1820-114578", "food", "Fridays", "Available", "2025-09-06", "Active", "Team lead|Bulk cooking|Food hygiene", 208, 44],
  ["Farhana Islam", "farhana@example.com", "+880 1825-773390", "education", "Weekends", "Available", "2026-02-27", "Active", "Team lead|Qur'an tajweed|Child supervision", 88, 14],
  ["Tanvir Ahmed", "tanvir@example.com", "+880 1717-513806", "media", "Flexible", "Available", "2025-09-16", "Active", "Team lead|Video editing|Livestream", 116, 26],
  ["Sabina Yeasmin", "sabina@example.com", "+880 1815-441209", "womens", "Weekends", "Available", "2025-07-14", "Active", "Team lead|Class coordination|Arabic", 174, 29],
  ["Golam Mostafa", "golam@example.com", "+880 1720-993471", "maintenance", "On call", "Available", "2025-08-05", "Active", "Team lead|Electrical|Plumbing", 156, 12],
  ["Ahmed Rahman", "ahmed@example.com", "+880 1712-556104", "cleaning", "Weekends", "Available", "2026-01-18", "Active", "Deep cleaning|Carpet care", 62, 9],
  ["Jamil Hossain", "jamil@example.com", "+880 1715-330967", "cleaning", "Evenings", "Busy", "2026-01-24", "Active", "Ablution area|Waste handling", 48, 6],
  ["Saiful Islam", "saiful@example.com", "+880 1725-771358", "cleaning", "Weekdays", "Available", "2026-07-12", "Active", "Courtyard|Window cleaning", 22, 3],
  ["Arif Billah", "arif@example.com", "+880 1727-330281", "cleaning", "Weekends", "Available", "2026-08-14", "Active", "General cleaning", 8, 2],
  ["Masud Karim", "masud@example.com", "+880 1729-640715", "cleaning", "Flexible", "Unavailable", "2026-03-08", "On Leave", "Deep cleaning|Store room", 54, 7],
  ["Imran Chowdhury", "imran@example.com", "+880 1718-227503", "event-support", "Evenings", "Available", "2026-02-08", "Active", "Seating|Registration desk", 71, 15],
  ["Faisal Mahmud", "faisal@example.com", "+880 1722-864095", "event-support", "Weekends", "Busy", "2026-04-22", "Active", "Stage setup|Signage", 44, 10],
  ["Zahid Hasan", "zahid@example.com", "+880 1724-402916", "event-support", "Evenings", "Available", "2026-06-16", "Active", "Ushering|Refreshments", 26, 6],
  ["Mainul Haque", "mainul@example.com", "+880 1726-046593", "event-support", "Flexible", "Available", "2026-08-06", "Active", "General support", 12, 3],
  ["Anisur Rahman", "anisur@example.com", "+880 1721-556738", "security", "Fridays", "Available", "2026-04-05", "Active", "Gate duty|Shoe racks", 58, 13],
  ["Ruhul Amin", "ruhul@example.com", "+880 1723-118472", "security", "Fridays", "Available", "2025-12-20", "Active", "Car park|Radio operation", 92, 21],
  ["Kamrul Hasan", "kamrul@example.com", "+880 1734-668035", "security", "Flexible", "Busy", "2026-01-30", "Active", "Gate duty|First aid", 67, 16],
  ["Shafiqul Alam", "shafiqul@example.com", "+880 1731-556982", "security", "Weekends", "Unavailable", "2025-10-11", "Inactive", "Gate duty", 34, 8],
  ["Nurul Amin", "nurul@example.com", "+880 1716-451028", "food", "Fridays", "Available", "2025-09-27", "Active", "Parcel packing|Deliveries", 118, 27],
  ["Tahmina Akter", "tahmina@example.com", "+880 1822-660145", "food", "Weekends", "Available", "2025-12-06", "Active", "Bulk cooking|Food hygiene", 84, 19],
  ["Rokeya Khatun", "rokeya@example.com", "+880 1829-440256", "food", "Weekdays", "Busy", "2026-01-16", "Active", "Menu planning|Stock control", 76, 17],
  ["Nazma Parvin", "nazma@example.com", "+880 1831-207819", "food", "Fridays", "Available", "2026-03-20", "Active", "Serving|Washing up", 52, 11],
  ["Jannatul Ferdous", "jannatul@example.com", "+880 1835-670283", "food", "Flexible", "Unavailable", "2026-06-05", "On Leave", "Parcel packing", 28, 5],
  ["Ayesha Siddiqua", "ayesha@example.com", "+880 1816-220744", "education", "Weekends", "Available", "2025-08-22", "Active", "Qur'an tajweed|Homework help", 96, 12],
  ["Lubna Ahmed", "lubna@example.com", "+880 1833-591640", "education", "Weekends", "Available", "2026-05-15", "Active", "Child supervision|Arabic", 41, 7],
  ["Sumaiya Rahman", "sumaiya@example.com", "+880 1827-118064", "education", "Evenings", "Busy", "2026-03-14", "Active", "Homework help|Registration", 38, 6],
  ["Nusrat Jahan", "nusrat@example.com", "+880 1819-076332", "media", "Flexible", "Available", "2025-10-08", "Active", "Photography|Social media", 64, 18],
  ["Sajid Karim", "sajid@example.com", "+880 1732-807163", "media", "Weekends", "Unavailable", "2024-02-11", "Inactive", "Video editing", 47, 9],
  ["Marium Chowdhury", "marium@example.com", "+880 1823-908714", "womens", "Weekends", "Available", "2026-01-22", "Active", "Class coordination|Registration desk", 58, 11],
  ["Kamrun Nahar", "kamrun@example.com", "+880 1841-517069", "womens", "Weekdays", "Busy", "2026-08-12", "Active", "Hall setup|Child supervision", 14, 2],
  ["Habibur Rahman", "habibur@example.com", "+880 1719-604182", "maintenance", "On call", "Available", "2025-08-14", "Active", "Carpentry|Fans and lighting", 102, 8],
];

const emergencyContacts: Array<[string, string]> = [
  ["Salma Rahman", "+880 1711-330248"],
  ["Iqbal Khan", "+880 1812-994017"],
  ["Nasima Hasan", "+880 1913-217640"],
  ["Rezaul Karim", "+880 1714-508329"],
  ["Munira Yeasmin", "+880 1815-772104"],
];

export const volunteers: Volunteer[] = seeds.map((seed, index) => {
  const [
    name,
    email,
    phone,
    teamId,
    schedule,
    availability,
    joinedDate,
    status,
    skills,
    serviceHours,
    eventsParticipated,
  ] = seed;

  const [emergencyContactName, emergencyContactPhone] = emergencyContacts[index % emergencyContacts.length];

  return {
    id: `VOL-${String(index + 1).padStart(3, "0")}`,
    name,
    email,
    phone,
    teamId,
    teamName: teamNames.get(teamId) ?? "Unassigned",
    schedule,
    availability,
    joinedDate,
    status,
    skills: skills.split("|"),
    serviceHours,
    eventsParticipated,
    emergencyContactName,
    emergencyContactPhone,
  };
});

/**
 * Roster totals for the whole volunteer body, which the sample above is a slice of. Constants for the
 * same reason as `memberTotals`: they describe all eighty-six people, not the thirty-four listed.
 */
export const volunteerTotals = {
  total: 86,
  active: 72,
  availableToday: 41,
  teams: volunteerTeams.length,
} as const;

export function teamById(id: string): VolunteerTeam | undefined {
  return volunteerTeams.find((team) => team.id === id);
}

/** Team filter options, in roster order with an "all" entry first. */export const teamFilterOptions = [
  { value: "all", label: "All teams" },
  ...volunteerTeams.map((team) => ({ value: team.id, label: team.name })),
];
