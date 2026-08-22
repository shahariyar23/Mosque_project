import type { AgeGroup, Gender, IsoDate, Member, MemberStatus, MembershipTier } from "@/lib/mosque/types";

/**
 * The member register.
 *
 * Forty-four rows rather than the full 1,248: enough to exercise sorting, filtering and paging on a
 * real spread of statuses, tiers, ages and join dates, and few enough to read. The summary figures on
 * the page are the mosque's true totals, and the table says plainly that it is holding a sample —
 * a count that quietly contradicts the card above it is worse than one that explains itself.
 *
 * Rows are written as tuples and expanded below. Forty-four literal objects of sixteen fields each is
 * a wall nobody reads or checks; a table with a documented column order is something you can scan for
 * a wrong gender or a join date in the future.
 */

/* Column order for the tuples below. */
type MemberSeed = readonly [
  name: string,
  email: string,
  phone: string,
  gender: Gender,
  dateOfBirth: IsoDate,
  joinDate: IsoDate,
  status: MemberStatus,
  tier: MembershipTier,
  area: string,
  monthlyContribution: number,
  contributionsPaidThisYear: number,
  eventsAttended: number,
  lastSeen: IsoDate,
];

const seeds: MemberSeed[] = [
  ["Ahmed Rahman", "ahmed@example.com", "+880 1712-556104", "Male", "1986-04-12", "2025-01-12", "Active", "General", "Road 7, Banani", 1000, 8, 12, "2026-08-22"],
  ["Fatima Khan", "fatima@example.com", "+880 1812-334027", "Female", "1991-09-03", "2025-02-18", "Active", "General", "Road 11, Banani", 800, 8, 9, "2026-08-21"],
  ["Abdullah Hasan", "abdullah@example.com", "+880 1912-780451", "Male", "1979-01-25", "2025-03-05", "Active", "Lifetime", "Block C, Banani", 2500, 8, 21, "2026-08-23"],
  ["Mohammad Ali", "mohammad.ali@example.com", "+880 1711-902348", "Male", "1994-06-17", "2025-03-22", "Active", "General", "Road 4, Mohakhali", 700, 7, 6, "2026-08-20"],
  ["Sabina Yeasmin", "sabina@example.com", "+880 1815-441209", "Female", "1983-11-08", "2024-07-14", "Active", "Founding", "Road 9, Banani", 3000, 8, 26, "2026-08-23"],
  ["Rafiqul Islam", "rafiqul@example.com", "+880 1713-668190", "Male", "1975-02-19", "2019-05-02", "Active", "Founding", "Road 5, Banani", 3500, 8, 31, "2026-08-23"],
  ["Ayesha Siddiqua", "ayesha@example.com", "+880 1816-220744", "Female", "2003-05-30", "2025-08-09", "Active", "Student", "Road 12, Banani", 300, 8, 4, "2026-08-19"],
  ["Tanvir Ahmed", "tanvir@example.com", "+880 1717-513806", "Male", "1998-12-02", "2025-09-16", "Active", "General", "Gulshan 1", 900, 8, 11, "2026-08-22"],
  ["Nusrat Jahan", "nusrat@example.com", "+880 1819-076332", "Female", "1996-03-14", "2025-10-01", "Active", "General", "Road 13, Banani", 600, 8, 8, "2026-08-18"],
  ["Shahed Alam", "shahed@example.com", "+880 1714-889201", "Male", "1981-07-21", "2020-11-19", "Active", "Lifetime", "Road 6, Banani", 2000, 8, 24, "2026-08-23"],
  ["Rehana Begum", "rehana@example.com", "+880 1820-114578", "Female", "1968-10-05", "2018-02-08", "Active", "Founding", "Road 8, Banani", 1500, 8, 19, "2026-08-21"],
  ["Jamil Hossain", "jamil@example.com", "+880 1715-330967", "Male", "1989-05-27", "2021-06-30", "Active", "General", "Mohakhali DOHS", 1200, 8, 15, "2026-08-22"],
  ["Tahmina Akter", "tahmina@example.com", "+880 1822-660145", "Female", "1993-08-11", "2025-11-24", "Active", "General", "Road 10, Banani", 700, 8, 7, "2026-08-17"],
  ["Nurul Amin", "nurul@example.com", "+880 1716-451028", "Male", "1972-12-30", "2019-09-12", "Active", "Lifetime", "Road 3, Banani", 2200, 8, 28, "2026-08-23"],
  ["Marium Chowdhury", "marium@example.com", "+880 1823-908714", "Female", "1987-01-19", "2026-01-15", "Active", "General", "Gulshan 2", 900, 7, 5, "2026-08-20"],
  ["Imran Chowdhury", "imran@example.com", "+880 1718-227503", "Male", "1990-04-08", "2026-02-03", "Active", "General", "Road 14, Banani", 1000, 6, 6, "2026-08-19"],
  ["Farhana Islam", "farhana@example.com", "+880 1825-773390", "Female", "2001-11-22", "2026-02-27", "Active", "Student", "Road 11, Banani", 300, 6, 9, "2026-08-22"],
  ["Habibur Rahman", "habibur@example.com", "+880 1719-604182", "Male", "1965-06-03", "2017-04-21", "Active", "Founding", "Road 2, Banani", 2500, 8, 33, "2026-08-23"],
  ["Sumaiya Rahman", "sumaiya@example.com", "+880 1827-118064", "Female", "1999-02-16", "2026-03-11", "Active", "General", "Banani Chairmanbari", 600, 5, 4, "2026-08-18"],
  ["Golam Mostafa", "golam@example.com", "+880 1720-993471", "Male", "1958-09-09", "2016-08-05", "Active", "Founding", "Road 1, Banani", 1800, 8, 22, "2026-08-21"],
  ["Rokeya Khatun", "rokeya@example.com", "+880 1829-440256", "Female", "1961-04-27", "2018-10-14", "Active", "Lifetime", "Road 4, Banani", 1200, 8, 17, "2026-08-16"],
  ["Anisur Rahman", "anisur@example.com", "+880 1721-556738", "Male", "1984-10-12", "2026-04-02", "Active", "General", "Mohakhali", 800, 4, 3, "2026-08-20"],
  ["Nazma Parvin", "nazma@example.com", "+880 1831-207819", "Female", "1977-07-07", "2022-01-29", "Active", "General", "Road 12, Banani", 700, 8, 13, "2026-08-19"],
  ["Faisal Mahmud", "faisal@example.com", "+880 1722-864095", "Male", "1995-01-31", "2026-04-19", "Active", "General", "Gulshan 1", 900, 4, 5, "2026-08-22"],
  ["Lubna Ahmed", "lubna@example.com", "+880 1833-591640", "Female", "2004-06-24", "2026-05-08", "Active", "Student", "Road 9, Banani", 300, 3, 6, "2026-08-21"],
  ["Ruhul Amin", "ruhul@example.com", "+880 1723-118472", "Male", "1970-03-18", "2020-02-16", "Active", "Lifetime", "Road 7, Banani", 2000, 8, 20, "2026-08-23"],
  ["Jannatul Ferdous", "jannatul@example.com", "+880 1835-670283", "Female", "1992-12-09", "2026-05-27", "Active", "General", "Banani DOHS", 800, 3, 4, "2026-08-17"],
  ["Zahid Hasan", "zahid@example.com", "+880 1724-402916", "Male", "2000-08-05", "2026-06-12", "Active", "Student", "Road 13, Banani", 400, 2, 3, "2026-08-20"],
  ["Saima Hossain", "saima@example.com", "+880 1837-935107", "Female", "1985-05-15", "2026-06-30", "Active", "General", "Mohakhali DOHS", 1000, 2, 2, "2026-08-18"],
  ["Saiful Islam", "saiful@example.com", "+880 1725-771358", "Male", "1988-09-28", "2026-07-08", "Active", "General", "Road 5, Banani", 900, 2, 3, "2026-08-22"],
  ["Rubina Akhter", "rubina@example.com", "+880 1839-284620", "Female", "1974-02-02", "2026-07-21", "Active", "General", "Road 10, Banani", 700, 1, 1, "2026-08-16"],
  ["Mainul Haque", "mainul@example.com", "+880 1726-046593", "Male", "1997-11-13", "2026-08-04", "Active", "General", "Gulshan 2", 800, 1, 2, "2026-08-21"],
  ["Kamrun Nahar", "kamrun@example.com", "+880 1841-517069", "Female", "1990-06-20", "2026-08-09", "Active", "General", "Road 6, Banani", 600, 1, 1, "2026-08-19"],
  ["Arif Billah", "arif@example.com", "+880 1727-330281", "Male", "2006-01-07", "2026-08-12", "Active", "Student", "Road 8, Banani", 250, 1, 2, "2026-08-22"],
  ["Shamima Nasrin", "shamima@example.com", "+880 1843-609472", "Female", "1982-10-16", "2026-08-15", "Pending", "General", "Banani Chairmanbari", 700, 0, 0, "2026-08-15"],
  ["Nasir Uddin", "nasir@example.com", "+880 1728-885134", "Male", "1993-04-04", "2026-08-18", "Pending", "General", "Road 14, Banani", 800, 0, 1, "2026-08-20"],
  ["Afsana Mimi", "afsana@example.com", "+880 1845-172908", "Female", "2005-09-11", "2026-08-20", "Pending", "Student", "Road 11, Banani", 250, 0, 0, "2026-08-20"],
  ["Masud Karim", "masud@example.com", "+880 1729-640715", "Male", "1980-12-22", "2026-08-21", "Pending", "General", "Mohakhali", 1000, 0, 0, "2026-08-21"],
  ["Shirin Sultana", "shirin@example.com", "+880 1847-903261", "Female", "1971-08-29", "2021-03-17", "Inactive", "General", "Moved to Sylhet", 0, 0, 8, "2026-02-11"],
  ["Delwar Hossain", "delwar@example.com", "+880 1730-218407", "Male", "1966-05-06", "2018-07-23", "Inactive", "General", "Moved to Chattogram", 0, 0, 14, "2025-12-04"],
  ["Shafiqul Alam", "shafiqul@example.com", "+880 1731-556982", "Male", "1991-02-14", "2022-09-05", "Inactive", "General", "Road 3, Banani", 0, 1, 11, "2026-04-19"],
  ["Sajid Karim", "sajid@example.com", "+880 1732-807163", "Male", "2002-07-19", "2024-01-08", "Inactive", "Student", "Studying abroad", 0, 0, 7, "2026-01-27"],
  ["Mizanur Rahman", "mizanur@example.com", "+880 1733-114290", "Male", "1969-11-01", "2017-01-15", "Active", "Founding", "Road 2, Banani", 4000, 8, 38, "2026-08-23"],
  ["Kamrul Hasan", "kamrul@example.com", "+880 1734-668035", "Male", "1978-03-26", "2020-08-11", "Active", "Lifetime", "Road 9, Banani", 2000, 8, 18, "2026-08-22"],
];

/**
 * Emergency contacts, rotated across the register.
 *
 * Invented per-row rather than left blank: an emergency contact is the one field on a member record
 * that has to be filled in for the record to be worth keeping, and a table of empty cells would hide
 * how the field is meant to look.
 */
const emergencyContacts: Array<[string, string]> = [
  ["Salma Rahman", "+880 1711-330248"],
  ["Iqbal Khan", "+880 1812-994017"],
  ["Nasima Hasan", "+880 1913-217640"],
  ["Rezaul Karim", "+880 1714-508329"],
  ["Munira Yeasmin", "+880 1815-772104"],
  ["Aminul Islam", "+880 1716-063815"],
];

export const members: Member[] = seeds.map((seed, index) => {
  const [
    name,
    email,
    phone,
    gender,
    dateOfBirth,
    joinDate,
    status,
    tier,
    area,
    monthlyContribution,
    contributionsPaidThisYear,
    eventsAttended,
    lastSeen,
  ] = seed;

  const [emergencyContactName, emergencyContactPhone] = emergencyContacts[index % emergencyContacts.length];

  return {
    id: `MEM-${String(index + 1).padStart(3, "0")}`,
    name,
    email,
    phone,
    gender,
    dateOfBirth,
    address: `${area}, Dhaka`,
    joinDate,
    status,
    tier,
    emergencyContactName,
    emergencyContactPhone,
    monthlyContribution,
    contributionsPaidThisYear,
    eventsAttended,
    lastSeen,
  };
});

/* -------------------------------------------------------------------------- *
 * Register totals
 *
 * The mosque's real figures, which the sample above is a slice of. Written as constants rather than
 * derived from `members` because they describe the whole register, and deriving them would quietly
 * change the headline count every time a row is added to the sample.
 * -------------------------------------------------------------------------- */
export const memberTotals = {
  total: 1248,
  active: 1182,
  newThisMonth: 34,
  inactive: 66,
  male: 678,
  female: 570,
} as const;

/** Age distribution across the whole register, for the community breakdown. */
export const memberAgeBands: Array<{ label: AgeGroup; count: number }> = [
  { label: "Under 18", count: 186 },
  { label: "18–29", count: 331 },
  { label: "30–44", count: 402 },
  { label: "45–59", count: 224 },
  { label: "60+", count: 105 },
];
