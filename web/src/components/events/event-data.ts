export type EventCategory = "Worship" | "Quran" | "Education" | "Community" | "Youth" | "Charity";

export type MosqueEvent = {
  slug: string;
  title: string;
  bnTitle: string;
  description: string;
  bnDescription: string;
  category: EventCategory;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  address: string;
  image: string;
  featured?: boolean;
  past?: boolean;
  registrationRequired?: boolean;
};

export const eventCategories: Array<"All" | EventCategory> = ["All", "Worship", "Quran", "Education", "Community", "Youth", "Charity"];

export const mosqueEvents: MosqueEvent[] = [
  {
    slug: "quran-tafsir-session",
    title: "Quran Tafsir Session",
    bnTitle: "কুরআন তাফসির সেশন",
    description: "Join us for an evening reflection on the Quran, followed by open questions and tea with the community.",
    bnDescription: "কুরআনের আয়াত নিয়ে সন্ধ্যার আলোচনা, প্রশ্নোত্তর এবং কমিউনিটির সঙ্গে চায়ের আয়োজন।",
    category: "Education",
    date: "2026-08-21",
    startTime: "19:30",
    endTime: "21:00",
    location: "Main Prayer Hall",
    address: "Noor Community Mosque, Dhaka",
    image: "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=1200&q=80",
    featured: true,
  },
  {
    slug: "youth-community-gathering",
    title: "Youth Community Gathering",
    bnTitle: "যুব কমিউনিটি সমাবেশ",
    description: "An open evening for young people to connect, share and grow together in faith.",
    bnDescription: "তরুণদের জন্য বিশ্বাস, বন্ধুত্ব এবং একসঙ্গে বেড়ে ওঠার একটি সন্ধ্যা।",
    category: "Youth",
    date: "2026-08-23",
    startTime: "17:00",
    endTime: "19:00",
    location: "Community Hall",
    address: "Noor Community Mosque, Dhaka",
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=80",
  },
  {
    slug: "jummah-special-lecture",
    title: "Jumu'ah Special Lecture",
    bnTitle: "জুমুআ বিশেষ আলোচনা",
    description: "A practical reminder on mercy, responsibility and the ties that hold a community together.",
    bnDescription: "দয়া, দায়িত্ব এবং কমিউনিটিকে একসঙ্গে ধরে রাখার বন্ধন নিয়ে বিশেষ আলোচনা।",
    category: "Worship",
    date: "2026-08-28",
    startTime: "13:15",
    endTime: "14:00",
    location: "Main Prayer Hall",
    address: "Noor Community Mosque, Dhaka",
    image: "https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=1000&q=80",
  },
  {
    slug: "quran-hifz-programme",
    title: "Quran Hifz Programme",
    bnTitle: "কুরআন হিফজ কার্যক্রম",
    description: "A welcoming weekly learning circle for students beginning or continuing their memorisation journey.",
    bnDescription: "কুরআন মুখস্থের যাত্রা শুরু বা চালিয়ে যাওয়া শিক্ষার্থীদের জন্য সাপ্তাহিক শিক্ষার আসর।",
    category: "Quran",
    date: "2026-09-02",
    startTime: "18:00",
    endTime: "20:00",
    location: "Learning Room 2",
    address: "Noor Community Mosque, Dhaka",
    image: "https://images.unsplash.com/photo-1604147706283-d7119b5b822c?auto=format&fit=crop&w=1000&q=80",
    registrationRequired: true,
  },
  {
    slug: "community-food-drive",
    title: "Community Food Drive",
    bnTitle: "কমিউনিটি খাদ্য সহায়তা",
    description: "Neighbours come together to prepare and distribute food parcels for families who need support.",
    bnDescription: "প্রয়োজনীয় পরিবারগুলোর জন্য খাদ্যসামগ্রী প্রস্তুত ও বিতরণে প্রতিবেশীদের একসঙ্গে হওয়া।",
    category: "Charity",
    date: "2026-08-10",
    startTime: "10:00",
    endTime: "13:00",
    location: "Community Courtyard",
    address: "Noor Community Mosque, Dhaka",
    image: "https://images.unsplash.com/photo-1593113646773-028c64a8f1b8?auto=format&fit=crop&w=900&q=80",
    past: true,
  },
  {
    slug: "family-iftar-evening",
    title: "Family Iftar Evening",
    bnTitle: "পারিবারিক ইফতার সন্ধ্যা",
    description: "An evening of shared food, prayer and conversation for families across our community.",
    bnDescription: "আমাদের কমিউনিটির পরিবারের জন্য খাবার, নামাজ এবং আলাপের একটি সন্ধ্যা।",
    category: "Community",
    date: "2026-07-28",
    startTime: "18:45",
    endTime: "20:30",
    location: "Community Hall",
    address: "Noor Community Mosque, Dhaka",
    image: "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=900&q=80",
    past: true,
  },
  {
    slug: "summer-quran-workshop",
    title: "Summer Quran Workshop",
    bnTitle: "গ্রীষ্মকালীন কুরআন কর্মশালা",
    description: "A focused learning day for young readers, with recitation practice and creative activities.",
    bnDescription: "তরুণ পাঠকদের জন্য তিলাওয়াত অনুশীলন ও সৃজনশীল কার্যক্রমের একটি দিন।",
    category: "Quran",
    date: "2026-07-14",
    startTime: "09:30",
    endTime: "15:00",
    location: "Learning Wing",
    address: "Noor Community Mosque, Dhaka",
    image: "https://images.unsplash.com/photo-1585036156171-384164a8c675?auto=format&fit=crop&w=900&q=80",
    past: true,
  },
];

export function getEvent(slug: string) {
  return mosqueEvents.find((event) => event.slug === slug);
}

export function formatEventDate(date: string, language: "en" | "bn", options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  return new Intl.DateTimeFormat(language === "bn" ? "bn-BD" : "en-GB", options).format(new Date(`${date}T12:00:00`));
}

export function formatEventTime(time: string, language: "en" | "bn") {
  const [hours, minutes] = time.split(":").map(Number);
  const formatted = new Date(2026, 0, 1, hours, minutes).toLocaleTimeString(language === "bn" ? "bn-BD" : "en-GB", { hour: "numeric", minute: "2-digit", hour12: language === "en" });
  return formatted;
}
