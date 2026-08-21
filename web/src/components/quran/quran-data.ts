export type Revelation = "Meccan" | "Medinan";

export type Surah = {
  number: number;
  slug: string;
  arabic: string;
  english: string;
  meaning: string;
  ayahs: number;
  revelation: Revelation;
};

const names: Array<[string, string, string, number, Revelation]> = [
  ["الفاتحة", "Al-Fatihah", "The Opening", 7, "Meccan"],
  ["البقرة", "Al-Baqarah", "The Cow", 286, "Medinan"],
  ["آل عمران", "Ali 'Imran", "Family of Imran", 200, "Medinan"],
  ["النساء", "An-Nisa", "The Women", 176, "Medinan"],
  ["المائدة", "Al-Ma'idah", "The Table Spread", 120, "Medinan"],
  ["الأنعام", "Al-An'am", "The Cattle", 165, "Meccan"],
  ["الأعراف", "Al-A'raf", "The Heights", 206, "Meccan"],
  ["الأنفال", "Al-Anfal", "The Spoils of War", 75, "Medinan"],
  ["التوبة", "At-Tawbah", "The Repentance", 129, "Medinan"],
  ["يونس", "Yunus", "Jonah", 109, "Meccan"],
  ["هود", "Hud", "Hud", 123, "Meccan"],
  ["يوسف", "Yusuf", "Joseph", 111, "Meccan"],
  ["الرعد", "Ar-Ra'd", "The Thunder", 43, "Medinan"],
  ["إبراهيم", "Ibrahim", "Abraham", 52, "Meccan"],
  ["الحجر", "Al-Hijr", "The Rocky Tract", 99, "Meccan"],
  ["النحل", "An-Nahl", "The Bee", 128, "Meccan"],
  ["الإسراء", "Al-Isra", "The Night Journey", 111, "Meccan"],
  ["الكهف", "Al-Kahf", "The Cave", 110, "Meccan"],
  ["مريم", "Maryam", "Mary", 98, "Meccan"],
  ["طه", "Ta-Ha", "Ta-Ha", 135, "Meccan"],
  ["الأنبياء", "Al-Anbiya", "The Prophets", 112, "Meccan"],
  ["الحج", "Al-Hajj", "The Pilgrimage", 78, "Medinan"],
  ["المؤمنون", "Al-Mu'minun", "The Believers", 118, "Meccan"],
  ["النور", "An-Nur", "The Light", 64, "Medinan"],
  ["الفرقان", "Al-Furqan", "The Criterion", 77, "Meccan"],
  ["الشعراء", "Ash-Shu'ara", "The Poets", 227, "Meccan"],
  ["النمل", "An-Naml", "The Ant", 93, "Meccan"],
  ["القصص", "Al-Qasas", "The Stories", 88, "Meccan"],
  ["العنكبوت", "Al-'Ankabut", "The Spider", 69, "Meccan"],
  ["الروم", "Ar-Rum", "The Romans", 60, "Meccan"],
  ["لقمان", "Luqman", "Luqman", 34, "Meccan"],
  ["السجدة", "As-Sajdah", "The Prostration", 30, "Meccan"],
  ["الأحزاب", "Al-Ahzab", "The Combined Forces", 73, "Medinan"],
  ["سبأ", "Saba", "Sheba", 54, "Meccan"],
  ["فاطر", "Fatir", "Originator", 45, "Meccan"],
  ["يس", "Ya-Sin", "Ya Sin", 83, "Meccan"],
  ["الصافات", "As-Saffat", "Those Ranges in Ranks", 182, "Meccan"],
  ["ص", "Sad", "The Letter Sad", 88, "Meccan"],
  ["الزمر", "Az-Zumar", "The Groups", 75, "Meccan"],
  ["غافر", "Ghafir", "The Forgiver", 85, "Meccan"],
  ["فصلت", "Fussilat", "Explained in Detail", 54, "Meccan"],
  ["الشورى", "Ash-Shura", "The Consultation", 53, "Meccan"],
  ["الزخرف", "Az-Zukhruf", "The Gold Adornment", 89, "Meccan"],
  ["الدخان", "Ad-Dukhan", "The Smoke", 59, "Meccan"],
  ["الجاثية", "Al-Jathiyah", "The Crouching", 37, "Meccan"],
  ["الأحقاف", "Al-Ahqaf", "The Wind-Curved Sandhills", 35, "Meccan"],
  ["محمد", "Muhammad", "Muhammad", 38, "Medinan"],
  ["الفتح", "Al-Fath", "The Victory", 29, "Medinan"],
  ["الحجرات", "Al-Hujurat", "The Rooms", 18, "Medinan"],
  ["ق", "Qaf", "The Letter Qaf", 45, "Meccan"],
  ["الذاريات", "Adh-Dhariyat", "The Winnowing Winds", 60, "Meccan"],
  ["الطور", "At-Tur", "The Mount", 49, "Meccan"],
  ["النجم", "An-Najm", "The Star", 62, "Meccan"],
  ["القمر", "Al-Qamar", "The Moon", 55, "Meccan"],
  ["الرحمن", "Ar-Rahman", "The Beneficent", 78, "Medinan"],
  ["الواقعة", "Al-Waqi'ah", "The Inevitable", 96, "Meccan"],
  ["الحديد", "Al-Hadid", "The Iron", 29, "Medinan"],
  ["المجادلة", "Al-Mujadila", "The Pleading Woman", 22, "Medinan"],
  ["الحشر", "Al-Hashr", "The Exile", 24, "Medinan"],
  ["الممتحنة", "Al-Mumtahanah", "She That Is To Be Examined", 13, "Medinan"],
  ["الصف", "As-Saff", "The Ranks", 14, "Medinan"],
  ["الجمعة", "Al-Jumu'ah", "Friday", 11, "Medinan"],
  ["المنافقون", "Al-Munafiqun", "The Hypocrites", 11, "Medinan"],
  ["التغابن", "At-Taghabun", "Mutual Disillusion", 18, "Medinan"],
  ["الطلاق", "At-Talaq", "Divorce", 12, "Medinan"],
  ["التحريم", "At-Tahrim", "The Prohibition", 12, "Medinan"],
  ["الملك", "Al-Mulk", "The Sovereignty", 30, "Meccan"],
  ["القلم", "Al-Qalam", "The Pen", 52, "Meccan"],
  ["الحاقة", "Al-Haqqah", "The Reality", 52, "Meccan"],
  ["المعارج", "Al-Ma'arij", "The Ascending Stairways", 44, "Meccan"],
  ["نوح", "Nuh", "Noah", 28, "Meccan"],
  ["الجن", "Al-Jinn", "The Jinn", 28, "Meccan"],
  ["المزمل", "Al-Muzzammil", "The Enshrouded One", 20, "Meccan"],
  ["المدثر", "Al-Muddaththir", "The Cloaked One", 56, "Meccan"],
  ["القيامة", "Al-Qiyamah", "The Resurrection", 40, "Meccan"],
  ["الإنسان", "Al-Insan", "The Man", 31, "Medinan"],
  ["المرسلات", "Al-Mursalat", "Those Sent Forth", 50, "Meccan"],
  ["النبأ", "An-Naba", "The Tidings", 40, "Meccan"],
  ["النازعات", "An-Nazi'at", "Those Who Drag Forth", 46, "Meccan"],
  ["عبس", "Abasa", "He Frowned", 42, "Meccan"],
  ["التكوير", "At-Takwir", "The Overthrowing", 29, "Meccan"],
  ["الانفطار", "Al-Infitar", "The Cleaving", 19, "Meccan"],
  ["المطففين", "Al-Mutaffifin", "Defrauding", 36, "Meccan"],
  ["الانشقاق", "Al-Inshiqaq", "The Sundering", 25, "Meccan"],
  ["البروج", "Al-Buruj", "The Mansions of the Stars", 22, "Meccan"],
  ["الطارق", "At-Tariq", "The Nightcomer", 17, "Meccan"],
  ["الأعلى", "Al-A'la", "The Most High", 19, "Meccan"],
  ["الغاشية", "Al-Ghashiyah", "The Overwhelming", 26, "Meccan"],
  ["الفجر", "Al-Fajr", "The Dawn", 30, "Meccan"],
  ["البلد", "Al-Balad", "The City", 20, "Meccan"],
  ["الشمس", "Ash-Shams", "The Sun", 15, "Meccan"],
  ["الليل", "Al-Layl", "The Night", 21, "Meccan"],
  ["الضحى", "Ad-Duha", "The Morning Hours", 11, "Meccan"],
  ["الشرح", "Ash-Sharh", "The Relief", 8, "Meccan"],
  ["التين", "At-Tin", "The Fig", 8, "Meccan"],
  ["العلق", "Al-'Alaq", "The Clot", 19, "Meccan"],
  ["القدر", "Al-Qadr", "The Power", 5, "Meccan"],
  ["البينة", "Al-Bayyinah", "The Clear Proof", 8, "Medinan"],
  ["الزلزلة", "Az-Zalzalah", "The Earthquake", 8, "Medinan"],
  ["العاديات", "Al-'Adiyat", "The Courser", 11, "Meccan"],
  ["القارعة", "Al-Qari'ah", "The Calamity", 11, "Meccan"],
  ["التكاثر", "At-Takathur", "Rivalry in World Increase", 8, "Meccan"],
  ["العصر", "Al-'Asr", "The Declining Day", 3, "Meccan"],
  ["الهمزة", "Al-Humazah", "The Traducer", 9, "Meccan"],
  ["الفيل", "Al-Fil", "The Elephant", 5, "Meccan"],
  ["قريش", "Quraysh", "Quraysh", 4, "Meccan"],
  ["الماعون", "Al-Ma'un", "Small Kindnesses", 7, "Meccan"],
  ["الكوثر", "Al-Kawthar", "Abundance", 3, "Meccan"],
  ["الكافرون", "Al-Kafirun", "The Disbelievers", 6, "Meccan"],
  ["النصر", "An-Nasr", "The Divine Support", 3, "Medinan"],
  ["المسد", "Al-Masad", "The Palm Fiber", 5, "Meccan"],
  ["الإخلاص", "Al-Ikhlas", "Sincerity", 4, "Meccan"],
  ["الفلق", "Al-Falaq", "The Daybreak", 5, "Meccan"],
  ["الناس", "An-Nas", "Mankind", 6, "Meccan"],
];

export const surahs: Surah[] = names.map(
  ([arabic, english, meaning, ayahs, revelation], index) => ({
    number: index + 1,
    slug: english.toLowerCase().replaceAll("'", "").replaceAll(" ", "-"),
    arabic,
    english,
    meaning,
    ayahs,
    revelation,
  }),
);

export type Ayah = {
  number: number;
  arabic: string;
  english: string;
  bangla: string;
};

export const sampleAyahs: Record<number, Ayah[]> = {
  1: [
    {
      number: 1,
      arabic: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
      english:
        "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
      bangla: "পরম করুণাময়, অতি দয়ালু আল্লাহর নামে।",
    },
    {
      number: 2,
      arabic: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
      english: "[All] praise is [due] to Allah, Lord of the worlds.",
      bangla: "সমস্ত প্রশংসা আল্লাহর, যিনি সকল জগতের প্রতিপালক।",
    },
    {
      number: 3,
      arabic: "الرَّحْمَنِ الرَّحِيمِ",
      english: "The Entirely Merciful, the Especially Merciful.",
      bangla: "পরম করুণাময়, অতি দয়ালু।",
    },
    {
      number: 4,
      arabic: "مَالِكِ يَوْمِ الدِّينِ",
      english: "Sovereign of the Day of Recompense.",
      bangla: "বিচার দিনের মালিক।",
    },
    {
      number: 5,
      arabic: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
      english: "It is You we worship and You we ask for help.",
      bangla: "আমরা শুধু তোমারই ইবাদত করি এবং শুধু তোমারই সাহায্য চাই।",
    },
    {
      number: 6,
      arabic: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ",
      english: "Guide us to the straight path.",
      bangla: "আমাদের সরল পথে পরিচালিত কর।",
    },
    {
      number: 7,
      arabic:
        "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ",
      english:
        "The path of those upon whom You have bestowed Your favor, not of those who have earned Your anger or of those who are astray.",
      bangla:
        "তাদের পথ, যাদের তুমি অনুগ্রহ করেছ; তাদের পথ নয় যারা ক্রোধের পাত্র হয়েছে এবং যারা পথভ্রষ্ট।",
    },
  ],
};

export function getSurah(slug: string) {
  return surahs.find((surah) => surah.slug === slug);
}
export function getAudioUrl(number: number) {
  return `https://server8.mp3quran.net/afs/${String(number).padStart(3, "0")}.mp3`;
}
