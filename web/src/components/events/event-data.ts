export type EventCategory =
  | "All"
  | "Worship"
  | "Quran"
  | "Education"
  | "Community"
  | "Youth"
  | "Charity";

export type MosqueEvent = {
  slug: string;
  title: string;
  bnTitle: string;
  description: string;
  bnDescription: string;
  category: Exclude<EventCategory, "All">;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location: string;
  bnLocation?: string;
  address: string;
  bnAddress?: string;
  image: string;
  featured?: boolean;
  past?: boolean;
  registrationRequired?: boolean;
  capacity?: number;
  registered?: number;
};

export const eventCategories: EventCategory[] = [
  "All",
  "Worship",
  "Quran",
  "Education",
  "Community",
  "Youth",
  "Charity",
];

export const mosqueEvents: MosqueEvent[] = [
  {
    slug: "quran-tafsir-session",
    title: "Weekly Quran Tafsir & Reflection",
    bnTitle: "সাপ্তাহিক কুরআন তাফসির ও আলোচনা",
    description:
      "Join us for an enlightening evening reflection on Surah Al-Kahf, followed by an open Q&A and community tea with respected scholars.",
    bnDescription:
      "সূরা আল-কাহফের গভীর তাৎপর্য ও জীবনঘনিষ্ঠ শিক্ষার ওপর সান্ধ্যকালীন তাফসির মজলিস, উন্মুক্ত প্রশ্নোত্তর ও চায়ের আয়োজন।",
    category: "Education",
    date: "2026-09-11",
    startTime: "19:30",
    endTime: "21:00",
    location: "Main Prayer Hall",
    bnLocation: "মূল জামাত হল",
    address: "Noor Community Mosque, 123 Peace Avenue, Dhaka",
    bnAddress: "নূর কমিউনিটি মসজিদ, ১২৩ পিস অ্যাভিনিউ, ঢাকা",
    image: "/alim-L7J4ytEFRCg-unsplash.jpg",
    featured: true,
    registrationRequired: false,
    capacity: 250,
    registered: 180,
  },
  {
    slug: "youth-community-gathering",
    title: "Youth Brotherhood & Faith Circle",
    bnTitle: "তরুণদের দ্বীনি আড্ডা ও সমাবেশ",
    description:
      "An open interactive evening for university and college youth to connect, discuss contemporary challenges, and build lifelong bonds in faith.",
    bnDescription:
      "বিশ্ববিদ্যালয় ও কলেজপড়ুয়া তরুণদের জন্য আত্মিক উন্নয়ন, সমকালীন চ্যালেঞ্জ মোকাবেলা ও পারস্পরিক ভ্রাতৃত্বের এক উন্মুক্ত সন্ধ্যা।",
    category: "Youth",
    date: "2026-09-18",
    startTime: "17:00",
    endTime: "19:00",
    location: "Community Hall",
    bnLocation: "কমিউনিটি হল রুম",
    address: "Noor Community Mosque, Dhaka",
    bnAddress: "নূর কমিউনিটি মসজিদ, ঢাকা",
    image: "/fmaily praying.jpg",
    registrationRequired: true,
    capacity: 80,
    registered: 52,
  },
  {
    slug: "jummah-special-lecture",
    title: "Jumu'ah Special Khutbah & Halaqah",
    bnTitle: "জুমুআ বিশেষ খুতবা ও বয়ান",
    description:
      "A profound pre-khutbah discourse on upright moral character, civic honesty, and reviving the compassionate Sunnah in everyday life.",
    bnDescription:
      "উন্নত চরিত্র গঠন, সামাজিক সততা এবং দৈনন্দিন জীবনে মহানবী ﷺ-এর আদর্শ বাস্তবায়নের ওপর জুমুআর বিশেষ বয়ান ও খুতবা।",
    category: "Worship",
    date: "2026-09-12",
    startTime: "12:45",
    endTime: "13:45",
    location: "Main Prayer Sanctuary",
    bnLocation: "প্রধান জামাত কক্ষ",
    address: "Noor Community Mosque, Dhaka",
    bnAddress: "নূর কমিউনিটি মসজিদ, ঢাকা",
    image: "/comunity praying.jpg",
    registrationRequired: false,
    capacity: 500,
    registered: 480,
  },
  {
    slug: "quran-hifz-programme",
    title: "Tahfeez & Tajweed Intensive Circle",
    bnTitle: "হিফজুল কুরআন ও তাজবিদ প্রশিক্ষণ",
    description:
      "A structured Quranic learning circle for children and youth focusing on accurate Makhraj articulation and daily memorization guidance.",
    bnDescription:
      "শিশুকিশোরদের বিশুদ্ধ মাখরাজ, তাজবিদ ও সুশৃঙ্খল কুরআন মুখস্থকরণের ধারাবাহিক ও আনন্দদায়ক শিক্ষাদান কর্মসূচি।",
    category: "Quran",
    date: "2026-09-20",
    startTime: "08:30",
    endTime: "11:30",
    location: "Learning Wing — Room 2",
    bnLocation: "ইসলামিক শিক্ষাকক্ষ — রুম ২",
    address: "Noor Community Mosque, Dhaka",
    bnAddress: "নূর কমিউনিটি মসজিদ, ঢাকা",
    image: "/Children studying Quran.jpg",
    registrationRequired: true,
    capacity: 35,
    registered: 28,
  },
  {
    slug: "community-food-drive",
    title: "Monthly Neighborhood Food & Welfare Relief",
    bnTitle: "মাসিক খাদ্য সহায়তা ও ত্রাণ বিতরণ",
    description:
      "Community volunteers gather to sort, pack, and distribute essential grocery provisions for low-income and vulnerable families.",
    bnDescription:
      "অসহায় ও দুস্থ প্রতিবেশী পরিবারগুলোর মাঝে চাল, ডাল, তেলসহ মাসব্যাপী প্রয়োজনীয় খাদ্যসামগ্রী বিতরণ কার্যক্রম।",
    category: "Charity",
    date: "2026-09-25",
    startTime: "09:00",
    endTime: "13:00",
    location: "Courtyard Distribution Center",
    bnLocation: "মসজিদ প্রাঙ্গণ ও বিতরণ কেন্দ্র",
    address: "Noor Community Mosque, Dhaka",
    bnAddress: "নূর কমিউনিটি মসজিদ, ঢাকা",
    image: "/donation.jpg",
    registrationRequired: false,
    capacity: 100,
    registered: 95,
  },
  {
    slug: "family-iftar-evening",
    title: "Community Fasting & Sunnah Iftar",
    bnTitle: "কমিউনিটি নফল রোজা ও ইফতার মাহফিল",
    description:
      "An uplifting gathering for families and travelers observing the Sunnah fast of Ayyam al-Beed, featuring congregational Maghrib and shared meal.",
    bnDescription:
      "আইয়ামে বীজের সুন্নতি রোজাদার ও মুসল্লিদের সম্মানে আয়োজিত ভ্রাতৃত্বপূর্ণ গণ-ইফতার ও মাগরিবের বিশেষ জামাত।",
    category: "Community",
    date: "2026-09-26",
    startTime: "17:45",
    endTime: "19:30",
    location: "Community Dining Hall",
    bnLocation: "কমিউনিটি ডাইনিং হল",
    address: "Noor Community Mosque, Dhaka",
    bnAddress: "নূর কমিউনিটি মসজিদ, ঢাকা",
    image: "/grand-golden-chandelier-in-ornate-mosque-interior.jpg",
    registrationRequired: true,
    capacity: 150,
    registered: 150,
  },
  {
    slug: "summer-quran-workshop",
    title: "Youth Islamic Ethics & Quran Workshop",
    bnTitle: "তরুণদের কুরআন ও নৈতিকতা কর্মশালা",
    description:
      "Interactive multi-session workshop introducing adolescents to classical Arabic basics, Prophet stories, and practical ethics.",
    bnDescription:
      "কিশোর-কিশোরীদের সহজ আরবি ব্যাকরণ, নবীজির জীবনের শিক্ষণীয় ঘটনা ও উত্তম আচরণের বাস্তবমুখী কর্মশালা।",
    category: "Education",
    date: "2026-08-15",
    startTime: "09:30",
    endTime: "14:00",
    location: "Islamic Classroom 1",
    bnLocation: "ইসলামিক ক্লাসরুম ১",
    address: "Noor Community Mosque, Dhaka",
    bnAddress: "নূর কমিউনিটি মসজিদ, ঢাকা",
    image: "/classroom.jpg",
    past: true,
    registrationRequired: true,
    capacity: 40,
    registered: 40,
  },
];

export function getEvent(slug: string): MosqueEvent | undefined {
  return mosqueEvents.find((event) => event.slug === slug);
}

/**
 * Format event dates strictly anchored to Dhaka timezone (+06:00)
 */
export function formatEventDate(
  dateStr: string,
  language: "en" | "bn",
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
): string {
  if (!dateStr) return "";
  // Anchor to noon Dhaka time to prevent any day-shift
  const dateObj = new Date(`${dateStr}T12:00:00+06:00`);
  return new Intl.DateTimeFormat(
    language === "bn" ? "bn-BD" : "en-US",
    { ...options, timeZone: "Asia/Dhaka" },
  ).format(dateObj);
}

export function formatEventDayNumber(dateStr: string, language: "en" | "bn"): string {
  if (!dateStr) return "";
  const day = Number(dateStr.split("-")[2]);
  if (language === "bn") {
    return String(day).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);
  }
  return String(day);
}

export function formatEventMonthShort(dateStr: string, language: "en" | "bn"): string {
  if (!dateStr) return "";
  const dateObj = new Date(`${dateStr}T12:00:00+06:00`);
  return new Intl.DateTimeFormat(
    language === "bn" ? "bn-BD" : "en-US",
    { month: "short", timeZone: "Asia/Dhaka" },
  ).format(dateObj);
}

export function formatEventWeekday(dateStr: string, language: "en" | "bn"): string {
  if (!dateStr) return "";
  const dateObj = new Date(`${dateStr}T12:00:00+06:00`);
  return new Intl.DateTimeFormat(
    language === "bn" ? "bn-BD" : "en-US",
    { weekday: "short", timeZone: "Asia/Dhaka" },
  ).format(dateObj);
}

export function formatEventTime(timeStr: string, language: "en" | "bn"): string {
  if (!timeStr) return "";
  const [hStr, mStr] = timeStr.split(":");
  const hours = Number(hStr);
  const minutes = Number(mStr);
  const dummyDate = new Date(2026, 0, 1, hours, minutes);

  return dummyDate.toLocaleTimeString(
    language === "bn" ? "bn-BD" : "en-US",
    { hour: "numeric", minute: "2-digit", hour12: true },
  );
}
