import type {
  ActiveSession,
  AppearanceSettings,
  GeneralSettings,
  LoginEvent,
  MosqueSettings,
  NotificationSetting,
  PrayerSettings,
  SecuritySettings,
} from "@/lib/mosque/types";

/** Option lists for the settings selects. Kept here so the page has no literals in it. */
export const timezoneOptions = [
  "Asia/Dhaka",
  "Asia/Kolkata",
  "Asia/Karachi",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Europe/London",
] as const;

export const languageOptions = [
  { value: "en", label: "English" },
  { value: "bn", label: "বাংলা (Bangla)" },
] as const;

export const currencyOptions = [
  { value: "BDT", label: "BDT (৳) — Bangladeshi Taka" },
  { value: "USD", label: "USD ($) — US Dollar" },
  { value: "GBP", label: "GBP (£) — Pound Sterling" },
  { value: "SAR", label: "SAR (﷼) — Saudi Riyal" },
] as const;

export const dateFormatOptions = ["DD MMM YYYY", "DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const;

export const weekStartOptions = ["Saturday", "Sunday", "Monday"] as const;

/**
 * Prayer calculation methods.
 *
 * These are the recognised conventions, not a free-text field: the times a mosque publishes are a
 * claim about when a prayer becomes valid, and the community needs to know which convention produced
 * them. Karachi is the default because it is what mosques in Bangladesh overwhelmingly follow.
 */
export const calculationMethodOptions = [
  "University of Islamic Sciences, Karachi",
  "Muslim World League",
  "Islamic Society of North America (ISNA)",
  "Egyptian General Authority of Survey",
  "Umm al-Qura University, Makkah",
  "Islamic Foundation Bangladesh",
] as const;

/** Asr falls at different times under the two schools, so this is a real setting, not a preference. */
export const juristicMethodOptions = ["Hanafi", "Shafi'i / Maliki / Hanbali"] as const;

export const reminderOptions = [
  { value: "0", label: "No reminder" },
  { value: "5", label: "5 minutes before" },
  { value: "10", label: "10 minutes before" },
  { value: "15", label: "15 minutes before" },
  { value: "30", label: "30 minutes before" },
] as const;

const general: GeneralSettings = {
  mosqueName: "Noor Community Mosque",
  timezone: "Asia/Dhaka",
  language: "en",
  currency: "BDT",
  dateFormat: "DD MMM YYYY",
  weekStart: "Saturday",
};

const notifications: NotificationSetting[] = [
  {
    key: "email",
    label: "Email notifications",
    description: "Send dashboard alerts to the address on your staff record.",
    enabled: true,
  },
  {
    key: "eventRegistration",
    label: "Event registration notifications",
    description: "When someone registers for an event, or cancels a place.",
    enabled: true,
  },
  {
    key: "newMember",
    label: "New member notifications",
    description: "When a membership application is submitted for review.",
    enabled: true,
  },
  {
    key: "volunteer",
    label: "Volunteer notifications",
    description: "Team assignments, availability changes and service-hour submissions.",
    enabled: true,
  },
  {
    key: "prayerSchedule",
    label: "Prayer schedule updates",
    description: "When adhan or iqamah times change, including the Jumu'ah schedule.",
    enabled: true,
  },
  {
    key: "system",
    label: "System notifications",
    description: "Sign-in from a new device, permission changes and maintenance notices.",
    enabled: true,
  },
];

const prayer: PrayerSettings = {
  calculationMethod: "University of Islamic Sciences, Karachi",
  juristicMethod: "Hanafi",
  location: "Dhaka, Bangladesh",
  timezone: "Asia/Dhaka",
  timeFormat: "12h",
  reminderMinutes: 10,
  hijriAdjustment: 0,
};

const sessions: ActiveSession[] = [
  {
    id: "SES-1",
    device: "Windows 11 · Desktop",
    browser: "Chrome 141",
    location: "Dhaka, Bangladesh",
    lastActive: "Active now",
    current: true,
  },
  {
    id: "SES-2",
    device: "iPhone 15 · Mobile",
    browser: "Safari 18",
    location: "Dhaka, Bangladesh",
    lastActive: "2 hours ago",
    current: false,
  },
  {
    id: "SES-3",
    device: "iPad Air · Tablet",
    browser: "Safari 17",
    location: "Chattogram, Bangladesh",
    lastActive: "4 days ago",
    current: false,
  },
];

const loginActivity: LoginEvent[] = [
  { id: "LOG-1", at: "2026-08-23T09:04:00", device: "Chrome · Windows", location: "Dhaka", result: "Success" },
  { id: "LOG-2", at: "2026-08-23T06:41:00", device: "Safari · iPhone", location: "Dhaka", result: "Success" },
  { id: "LOG-3", at: "2026-08-22T21:18:00", device: "Chrome · Windows", location: "Dhaka", result: "Success" },
  { id: "LOG-4", at: "2026-08-22T14:52:00", device: "Unknown · Linux", location: "Frankfurt, Germany", result: "Failed" },
  { id: "LOG-5", at: "2026-08-21T08:30:00", device: "Safari · iPad", location: "Chattogram", result: "Success" },
  { id: "LOG-6", at: "2026-08-20T19:07:00", device: "Chrome · Android", location: "Dhaka", result: "Success" },
];

const security: SecuritySettings = {
  twoFactorEnabled: true,
  passwordUpdatedAt: "2026-05-14",
  sessions,
  loginActivity,
};

const appearance: AppearanceSettings = {
  theme: "system",
  sidebar: "expanded",
  density: "comfortable",
};

export const mosqueSettings: MosqueSettings = {
  general,
  notifications,
  prayer,
  security,
  appearance,
};
