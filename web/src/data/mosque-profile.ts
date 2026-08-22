import type { MosqueProfile } from "@/lib/mosque/types";

/**
 * The mosque's own record. One object rather than a list — a dashboard session is always scoped to a
 * single mosque, and the header's mosque selector switches session, not this row.
 *
 * Front-end only. The profile page edits a copy of this in component state; nothing here is written
 * back, and the shape matches the `GET /api/mosque/:id` response the Express API will return.
 */
export const mosqueProfile: MosqueProfile = {
  name: "Noor Community Mosque",
  shortName: "Noor Mosque",
  tagline: "Serving the local Muslim community with faith, education and service.",
  established: "1998",
  phone: "+880 1711-204488",
  officePhone: "+880 2-9821140",
  emergencyContact: "+880 1811-660214",
  email: "info@noormosque.org",
  website: "www.noormosque.org",
  country: "Bangladesh",
  division: "Dhaka",
  district: "Dhaka",
  city: "Dhaka",
  postalCode: "1213",
  addressLine: "House 25, Road 7, Block C, Banani",
  about:
    "Noor Community Mosque has served the families of Banani and the surrounding neighbourhoods since 1998. " +
    "What began as a single prayer hall above a shopfront is now a three-storey masjid with room for eleven " +
    "hundred worshippers, a madrasa for two hundred children, and a women's prayer hall with its own entrance " +
    "from Road 7.\n\n" +
    "Five daily congregations are held throughout the year, with two Jumu'ah jama'ats every Friday to make room " +
    "for those who cannot leave work early. The mosque runs a hifz programme, weekend Qur'an classes for children " +
    "and adults, a Friday food distribution for families in need, and a zakat fund administered by the finance " +
    "committee and audited annually.\n\n" +
    "The mosque is governed by an elected committee of eleven members. Accounts are published each quarter and " +
    "read aloud after Jumu'ah at the end of the financial year. Everyone is welcome — for prayer, for study, or " +
    "simply to sit quietly.",
  social: {
    facebook: "facebook.com/noormosquedhaka",
    youtube: "youtube.com/@noormosque",
    instagram: "instagram.com/noormosque",
  },
};

/** Read-only figures shown beside the profile. Owned by other modules, surfaced here for context. */
export const mosqueFacts = [
  { label: "Established", value: "1998", hint: "28 years serving Banani" },
  { label: "Prayer capacity", value: "1,100", hint: "Main hall and first floor" },
  { label: "Women's hall", value: "240", hint: "Separate entrance, Road 7" },
  { label: "Madrasa students", value: "206", hint: "Hifz and weekend classes" },
] as const;

/** Committee posts shown on the profile. Display only — a position grants no permission. */
export const committee = [
  { name: "Hafiz Mizanur Rahman", position: "President", since: "2021" },
  { name: "Shahed Alam", position: "General Secretary", since: "2023" },
  { name: "Rafiqul Islam", position: "Treasurer", since: "2022" },
  { name: "Imam Abdul Karim", position: "Imam and Khatib", since: "2014" },
  { name: "Nurul Amin", position: "Muazzin", since: "2019" },
  { name: "Sabina Yeasmin", position: "Women's Section Coordinator", since: "2024" },
] as const;
