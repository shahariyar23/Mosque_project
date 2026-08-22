export type ServiceCategory =
  "Worship" | "Education" | "Community" | "Family" | "Funeral" | "Facilities";
export type ServiceAction =
  | "View times"
  | "View programs"
  | "Request service"
  | "Request assistance"
  | "Volunteer"
  | "Donate"
  | "Contact team"
  | "Request booking";

export type MosqueService = {
  slug: string;
  category: ServiceCategory;
  title: string;
  bnTitle: string;
  description: string;
  bnDescription: string;
  action: ServiceAction;
  href: string;
  icon: string;
  featured?: boolean;
};

export const serviceCategories: Array<"All" | ServiceCategory> = [
  "All",
  "Worship",
  "Education",
  "Community",
  "Family",
  "Funeral",
  "Facilities",
];

export const mosqueServices: MosqueService[] = [
  {
    slug: "prayer-services",
    category: "Worship",
    title: "Prayer Services",
    bnTitle: "নামাজের সেবা",
    description:
      "Daily salah, Jumu'ah and special prayer programmes in a welcoming space.",
    bnDescription: "দৈনিক নামাজ, জুমুআ এবং বিশেষ নামাজের কার্যক্রম।",
    action: "View times",
    href: "/prayer-times",
    icon: "◷",
    featured: true,
  },
  {
    slug: "quran-classes",
    category: "Education",
    title: "Quran & Education",
    bnTitle: "কুরআন ও শিক্ষা",
    description:
      "Quran classes, Islamic learning and study circles for every age.",
    bnDescription: "সব বয়সের জন্য কুরআন শিক্ষা, ইসলামী জ্ঞান ও পাঠচক্র।",
    action: "View programs",
    href: "/quran",
    icon: "◈",
    featured: true,
  },
  {
    slug: "community-support",
    category: "Community",
    title: "Community Support",
    bnTitle: "কমিউনিটি সহায়তা",
    description:
      "Practical support for individuals and families in our community.",
    bnDescription: "আমাদের কমিউনিটির ব্যক্তি ও পরিবারের জন্য বাস্তব সহায়তা।",
    action: "Request assistance",
    href: "/services/community-support",
    icon: "♡",
    featured: true,
  },
  {
    slug: "daily-salah",
    category: "Worship",
    title: "Daily Salah",
    bnTitle: "দৈনিক নামাজ",
    description: "Congregational prayers throughout the day.",
    bnDescription: "দিনভর জামাতে নামাজের ব্যবস্থা।",
    action: "View times",
    href: "/prayer-times",
    icon: "01",
  },
  {
    slug: "jumah",
    category: "Worship",
    title: "Jumu'ah",
    bnTitle: "জুমুআ",
    description: "Friday prayer and khutbah information.",
    bnDescription: "শুক্রবারের নামাজ ও খুতবার তথ্য।",
    action: "View times",
    href: "/prayer-times#jumuah",
    icon: "02",
  },
  {
    slug: "taraweeh-ramadan",
    category: "Worship",
    title: "Taraweeh & Ramadan",
    bnTitle: "তারাবি ও রমজান",
    description: "Special Ramadan prayers and community programmes.",
    bnDescription: "রমজানের বিশেষ নামাজ ও কমিউনিটি কার্যক্রম।",
    action: "View programs",
    href: "/events",
    icon: "03",
  },
  {
    slug: "eid-prayer",
    category: "Worship",
    title: "Eid Prayer",
    bnTitle: "ঈদের নামাজ",
    description: "Eid al-Fitr and Eid al-Adha prayer information.",
    bnDescription: "ঈদুল ফিতর ও ঈদুল আজহার নামাজের তথ্য।",
    action: "View times",
    href: "/events",
    icon: "04",
  },
  {
    slug: "islamic-studies",
    category: "Education",
    title: "Islamic Studies",
    bnTitle: "ইসলামী শিক্ষা",
    description: "Classes and study programmes for different age groups.",
    bnDescription: "বিভিন্ন বয়সের জন্য ক্লাস ও পাঠক্রম।",
    action: "View programs",
    href: "/quran",
    icon: "05",
  },
  {
    slug: "youth-programs",
    category: "Education",
    title: "Youth Programs",
    bnTitle: "যুব কার্যক্রম",
    description: "Learning and activities designed for young Muslims.",
    bnDescription: "তরুণ মুসলিমদের জন্য শিক্ষা ও কার্যক্রম।",
    action: "View programs",
    href: "/events",
    icon: "06",
  },
  {
    slug: "zakat-assistance",
    category: "Community",
    title: "Zakat Assistance",
    bnTitle: "যাকাত সহায়তা",
    description:
      "Information and assistance related to eligible community support.",
    bnDescription: "যোগ্য কমিউনিটি সহায়তা সম্পর্কে তথ্য ও সহযোগিতা।",
    action: "Request assistance",
    href: "/contact",
    icon: "07",
  },
  {
    slug: "sadaqah",
    category: "Community",
    title: "Sadaqah",
    bnTitle: "সদকা",
    description: "Support charitable initiatives in our community.",
    bnDescription: "আমাদের কমিউনিটির দাতব্য উদ্যোগে সহায়তা করুন।",
    action: "Donate",
    href: "/donations",
    icon: "08",
  },
  {
    slug: "food-assistance",
    category: "Community",
    title: "Food Assistance",
    bnTitle: "খাদ্য সহায়তা",
    description: "Community food distribution and support programmes.",
    bnDescription: "কমিউনিটি খাদ্য বিতরণ ও সহায়তা কার্যক্রম।",
    action: "Request assistance",
    href: "/contact",
    icon: "09",
  },
  {
    slug: "financial-assistance",
    category: "Community",
    title: "Financial Assistance",
    bnTitle: "আর্থিক সহায়তা",
    description: "Support for eligible community members facing hardship.",
    bnDescription: "কঠিন সময়ে যোগ্য কমিউনিটি সদস্যদের সহায়তা।",
    action: "Request assistance",
    href: "/contact",
    icon: "10",
  },
  {
    slug: "volunteer",
    category: "Community",
    title: "Volunteer Opportunities",
    bnTitle: "স্বেচ্ছাসেবার সুযোগ",
    description: "Give your time and skills to support Noor.",
    bnDescription: "নূরকে সহায়তা করতে আপনার সময় ও দক্ষতা দিন।",
    action: "Volunteer",
    href: "/about#volunteers",
    icon: "11",
  },
  {
    slug: "nikah",
    category: "Family",
    title: "Marriage / Nikah",
    bnTitle: "বিয়ে / নিকাহ",
    description:
      "Nikah services and arrangements for life's important beginning.",
    bnDescription: "জীবনের গুরুত্বপূর্ণ শুরুর জন্য নিকাহ সেবা ও ব্যবস্থা।",
    action: "Request service",
    href: "/services/nikah",
    icon: "12",
  },
  {
    slug: "counseling",
    category: "Family",
    title: "Counseling",
    bnTitle: "পরামর্শ সেবা",
    description: "Private guidance and community support, handled with care.",
    bnDescription: "যত্নের সঙ্গে ব্যক্তিগত পরামর্শ ও কমিউনিটি সহায়তা।",
    action: "Contact team",
    href: "/contact",
    icon: "13",
  },
  {
    slug: "new-muslim-support",
    category: "Family",
    title: "New Muslim Support",
    bnTitle: "নতুন মুসলিম সহায়তা",
    description:
      "Resources and guidance for those beginning their Islamic journey.",
    bnDescription:
      "ইসলামী যাত্রা শুরু করা মানুষদের জন্য সহায়তা ও দিকনির্দেশনা।",
    action: "Contact team",
    href: "/contact",
    icon: "14",
  },
  {
    slug: "family-programs",
    category: "Family",
    title: "Family Programs",
    bnTitle: "পারিবারিক কার্যক্রম",
    description: "Programs and activities for families across our community.",
    bnDescription: "আমাদের কমিউনিটির পরিবারের জন্য কার্যক্রম ও অনুষ্ঠান।",
    action: "View programs",
    href: "/events",
    icon: "15",
  },
  {
    slug: "janazah",
    category: "Funeral",
    title: "Janazah Services",
    bnTitle: "জানাজা সেবা",
    description:
      "Funeral prayer, coordination, burial information and family guidance.",
    bnDescription:
      "জানাজার নামাজ, সমন্বয়, দাফনের তথ্য ও পরিবারের দিকনির্দেশনা।",
    action: "Contact team",
    href: "/services/janazah",
    icon: "16",
  },
  {
    slug: "prayer-hall",
    category: "Facilities",
    title: "Main Prayer Hall",
    bnTitle: "প্রধান নামাজের হল",
    description: "Daily congregational prayers and Jumu'ah.",
    bnDescription: "দৈনিক জামাত ও জুমুআর জন্য স্থান।",
    action: "Contact team",
    href: "/contact",
    icon: "17",
  },
  {
    slug: "womens-prayer-area",
    category: "Facilities",
    title: "Women's Prayer Area",
    bnTitle: "মহিলা নামাজের স্থান",
    description: "Dedicated prayer facilities for women.",
    bnDescription: "মহিলাদের জন্য নির্দিষ্ট নামাজের স্থান।",
    action: "Contact team",
    href: "/contact",
    icon: "18",
  },
  {
    slug: "community-hall",
    category: "Facilities",
    title: "Community Hall",
    bnTitle: "কমিউনিটি হল",
    description: "Available for approved community programmes.",
    bnDescription: "অনুমোদিত কমিউনিটি কার্যক্রমের জন্য ব্যবহারযোগ্য।",
    action: "Request booking",
    href: "/services/community-hall",
    icon: "19",
  },
  {
    slug: "classroom",
    category: "Facilities",
    title: "Classroom",
    bnTitle: "শ্রেণিকক্ষ",
    description: "Educational programmes and Quran classes.",
    bnDescription: "শিক্ষামূলক কার্যক্রম ও কুরআন ক্লাসের জন্য স্থান।",
    action: "Contact team",
    href: "/contact",
    icon: "20",
  },
];

export const serviceActionLabels: Record<ServiceAction, string> = {
  "View times": "View times",
  "View programs": "View programs",
  "Request service": "Request service",
  "Request assistance": "Request assistance",
  Volunteer: "Volunteer",
  Donate: "Donate",
  "Contact team": "Contact team",
  "Request booking": "Request booking",
};

export function getService(slug: string) {
  return mosqueServices.find((service) => service.slug === slug);
}
