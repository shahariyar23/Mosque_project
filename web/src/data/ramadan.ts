import type { IsoDate } from "@/lib/mosque/types";

export type RamadanDayEntry = {
  id: string;
  year: number;
  date: IsoDate;
  dayNumber: number;
  fastingStart: string; // HH:mm
  fastingEnd: string;   // HH:mm
  suhoorTime?: string | null;
  iftarTime?: string | null;
  taraweehTime?: string | null;
  notes?: string | null;
};

export const mockRamadanSchedule: RamadanDayEntry[] = [
  {
    id: "RAM-01",
    year: 1447,
    date: "2026-02-18",
    dayNumber: 1,
    fastingStart: "05:08",
    fastingEnd: "17:56",
    suhoorTime: "04:50",
    iftarTime: "17:56",
    taraweehTime: "19:45",
    notes: "First day of Ramadan 1447",
  },
  {
    id: "RAM-02",
    year: 1447,
    date: "2026-02-19",
    dayNumber: 2,
    fastingStart: "05:07",
    fastingEnd: "17:57",
    suhoorTime: "04:50",
    iftarTime: "17:57",
    taraweehTime: "19:45",
    notes: null,
  },
  {
    id: "RAM-03",
    year: 1447,
    date: "2026-02-20",
    dayNumber: 3,
    fastingStart: "05:06",
    fastingEnd: "17:57",
    suhoorTime: "04:45",
    iftarTime: "17:57",
    taraweehTime: "19:45",
    notes: "First Friday of Ramadan — Special Lecture after Asr",
  },
  {
    id: "RAM-04",
    year: 1447,
    date: "2026-02-21",
    dayNumber: 4,
    fastingStart: "05:05",
    fastingEnd: "17:58",
    suhoorTime: "04:45",
    iftarTime: "17:58",
    taraweehTime: "19:45",
    notes: null,
  },
  {
    id: "RAM-05",
    year: 1447,
    date: "2026-02-22",
    dayNumber: 5,
    fastingStart: "05:04",
    fastingEnd: "17:58",
    suhoorTime: "04:45",
    iftarTime: "17:58",
    taraweehTime: "19:45",
    notes: null,
  },
  {
    id: "RAM-06",
    year: 1447,
    date: "2026-02-23",
    dayNumber: 6,
    fastingStart: "05:03",
    fastingEnd: "17:59",
    suhoorTime: "04:45",
    iftarTime: "17:59",
    taraweehTime: "19:45",
    notes: null,
  },
  {
    id: "RAM-07",
    year: 1447,
    date: "2026-02-24",
    dayNumber: 7,
    fastingStart: "05:02",
    fastingEnd: "17:59",
    suhoorTime: "04:40",
    iftarTime: "17:59",
    taraweehTime: "19:45",
    notes: null,
  },
  {
    id: "RAM-27",
    year: 1447,
    date: "2026-03-16",
    dayNumber: 27,
    fastingStart: "04:40",
    fastingEnd: "18:10",
    suhoorTime: "04:20",
    iftarTime: "18:10",
    taraweehTime: "19:45",
    notes: "Laylat al-Qadr — Night Qiyam & Dua",
  },
  {
    id: "RAM-29",
    year: 1447,
    date: "2026-03-18",
    dayNumber: 29,
    fastingStart: "04:37",
    fastingEnd: "18:11",
    suhoorTime: "04:15",
    iftarTime: "18:11",
    taraweehTime: "19:45",
    notes: "Khatm al-Quran in Taraweeh",
  },
];

