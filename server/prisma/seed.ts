/* eslint-disable no-console */
import {
  EventCategory,
  EventStatus,
  Position,
  PrismaClient,
  Role,
  ServiceCategory,
  ServiceStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';

/**
 * Development seed.
 *
 * Creates one mosque, its settings, users, facilities, milestones, values,
 * services, and gallery items for the Noor Mosque About & Community page.
 *
 * Idempotent throughout — `upsert` and `findFirst` checks — so it can be re-run safely.
 */

const prisma = new PrismaClient();

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'ChangeMe123';

/** Matches the hashing used by the auth module, so seeded accounts can actually sign in. */
async function hash(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed a production database.');
  }

  const storyText =
    'Noor Community Mosque was established with a clear and humble mission: to maintain a pure sanctuary for the worship of Allah, where every individual—young and old, resident and traveler—finds welcoming tranquility, compassionate counsel, and sacred learning. Beyond daily congregational prayers and Friday gatherings, Noor serves as a vibrant center for Islamic education, family counseling, charitable relief, and cultural dialogue. We believe a true mosque extends its warmth far beyond its walls into the everyday lives of the people it serves.';

  const missionText =
    'To foster an inspiring, tranquil, and compassionate sanctuary for authentic Islamic worship and lifelong learning, cultivating moral integrity across generations.';

  const visionText =
    'To be an enlightened community where deep faith, scholarly wisdom, and practical mercy flourish together—guiding youth, strengthening families, and serving society.';

  const mosque = await prisma.mosque.upsert({
    where: { slug: 'noor-jame-masjid' },
    update: {
      story: storyText,
      mission: missionText,
      vision: visionText,
      phone: '+880 1712 345678',
      email: 'contact@noormosque.org',
      website: 'https://noormosque.org',
      addressLine: '12 Mirpur Road',
      city: 'Dhaka',
      district: 'Dhaka',
      country: 'Bangladesh',
      postalCode: '1207',
    },
    create: {
      slug: 'noor-jame-masjid',
      name: 'Noor Jame Masjid',
      email: 'contact@noormosque.org',
      phone: '+880 1712 345678',
      website: 'https://noormosque.org',
      addressLine: '12 Mirpur Road',
      city: 'Dhaka',
      district: 'Dhaka',
      country: 'Bangladesh',
      postalCode: '1207',
      latitude: '23.780636',
      longitude: '90.399452',
      timezone: 'Asia/Dhaka',
      establishedYear: 1987,
      description: 'A sanctuary of worship, authentic Islamic education, and compassionate community service.',
      story: storyText,
      mission: missionText,
      vision: visionText,
      settings: { create: {} },
    },
  });

  const passwordHash = await hash(SEED_PASSWORD);

  const people: Array<{
    fullName: string;
    email: string;
    phone: string;
    role: Role;
    positions: Position[];
  }> = [
    { fullName: 'Platform Owner', email: 'super@noor.example', phone: '+8801700000001', role: Role.super_admin, positions: [] },
    { fullName: 'Abdul Karim', email: 'admin@noor.example', phone: '+8801700000002', role: Role.mosque_admin, positions: [Position.president] },
    { fullName: 'Rashed Ahmed', email: 'secretary@noor.example', phone: '+8801700000003', role: Role.secretary, positions: [Position.general_secretary] },
    { fullName: 'Nasir Uddin', email: 'treasurer@noor.example', phone: '+8801700000004', role: Role.treasurer, positions: [Position.treasurer] },
    { fullName: 'Jamal Hossain', email: 'cashier@noor.example', phone: '+8801700000005', role: Role.cashier, positions: [Position.cashier] },
    { fullName: 'Imam Yusuf Ali', email: 'imam@noor.example', phone: '+8801700000006', role: Role.imam, positions: [Position.imam, Position.khatib] },
    { fullName: 'Fatima Begum', email: 'member@noor.example', phone: '+8801700000007', role: Role.member, positions: [Position.member] },
  ];

  for (const person of people) {
    await prisma.user.upsert({
      where: { mosqueId_email: { mosqueId: mosque.id, email: person.email } },
      update: { fullName: person.fullName, role: person.role, positions: person.positions, isActive: true },
      create: { ...person, mosqueId: mosque.id, passwordHash, isActive: true },
    });
  }

  // Milestones
  const milestonesData = [
    {
      year: '1987',
      title: 'Foundation & Sacred Beginning',
      description: 'Founded as a local neighborhood sanctuary by devoted community elders to establish regular daily prayers.',
      sortOrder: 1,
    },
    {
      year: '2004',
      title: 'Islamic Maktab & Quran Academy',
      description: 'Inaugurated dedicated morning and evening Quran memorization and Islamic foundational classes for neighborhood youth.',
      sortOrder: 2,
    },
    {
      year: '2016',
      title: 'Sanctuary & Community Expansion',
      description: 'Expanded the main prayer hall, added dedicated women prayer facilities, and modernized ablution areas.',
      sortOrder: 3,
    },
    {
      year: '2024',
      title: 'Digital Prayer & Community Portal',
      description: 'Introduced digital prayer timing displays, online event bookings, community welfare tracking, and financial transparency.',
      sortOrder: 4,
    },
  ];

  for (const item of milestonesData) {
    const existing = await prisma.mosqueMilestone.findFirst({
      where: { mosqueId: mosque.id, year: item.year },
    });
    if (!existing) {
      await prisma.mosqueMilestone.create({
        data: { ...item, mosqueId: mosque.id, isPublished: true },
      });
    } else {
      await prisma.mosqueMilestone.update({
        where: { id: existing.id },
        data: { title: item.title, description: item.description, sortOrder: item.sortOrder },
      });
    }
  }

  // Values
  const valuesData = [
    {
      num: '01',
      icon: 'Moon',
      title: 'Faith & Devotion',
      subtitle: 'Tawheed, prayer & spiritual purification',
      description: 'We anchor everything in sincere worship of the One Creator, upholding the five daily prayers, congregational Jumuah, and remembrance of Allah.',
      sortOrder: 1,
    },
    {
      num: '02',
      icon: 'BookOpen',
      title: 'Knowledge & Wisdom',
      subtitle: 'Quran, Sunnah & lifelong learning',
      description: 'Knowledge is the vital light that guides righteous action. We provide accessible Islamic education for all generations—from foundational Quranic reading to adult fiqh.',
      sortOrder: 2,
    },
    {
      num: '03',
      icon: 'HeartHandshake',
      title: 'Service & Compassion',
      subtitle: 'Charity, welfare & community solidarity',
      description: 'Faith proves itself through mercy to mankind. We champion continuous food support, transparent zakat distribution, bereavement assistance, and standing with vulnerable neighbors.',
      sortOrder: 3,
    },
  ];

  for (const item of valuesData) {
    const existing = await prisma.mosqueValue.findFirst({
      where: { mosqueId: mosque.id, num: item.num },
    });
    if (!existing) {
      await prisma.mosqueValue.create({
        data: { ...item, mosqueId: mosque.id, isPublished: true },
      });
    } else {
      await prisma.mosqueValue.update({
        where: { id: existing.id },
        data: { title: item.title, subtitle: item.subtitle, description: item.description, icon: item.icon, sortOrder: item.sortOrder },
      });
    }
  }

  // Facilities
  const facilitiesData = [
    { name: 'Main Prayer Sanctuary', description: 'Expansive carpeted hall with central Qiblah mihrab, climate control, and clear audio system for daily and Jumuah congregations.', capacity: 1200 },
    { name: "Dedicated Women's Gallery", description: 'Private, dedicated space with separate entrance, audio relay, wudu facilities, and comfortable accommodations for sisters and families.', capacity: 300 },
    { name: 'Modern Wudu & Ablution Center', description: 'Hygienic, continuous-flow seated wudu stations, hot water supply in winter, and accessible restrooms.', capacity: 80 },
    { name: 'Islamic Classrooms & Maktab', description: 'Dedicated study rooms equipped for Quran memorization, Arabic language learning, and weekend children classes.', capacity: 150 },
    { name: 'Community Hall & Welfare Kitchen', description: 'Multi-purpose community hall hosting Ramadan community iftars, Islamic lectures, educational workshops, and charity sorting.', capacity: 250 },
    { name: 'Family Counseling & Nikah Room', description: 'Confidential room for spiritual guidance, marital counseling, bereavement support, and solemnization of marriage ceremonies.', capacity: 30 },
  ];

  for (const fac of facilitiesData) {
    const existing = await prisma.facility.findFirst({
      where: { mosqueId: mosque.id, name: fac.name },
    });
    if (!existing) {
      await prisma.facility.create({
        data: { ...fac, mosqueId: mosque.id, isAvailable: true },
      });
    }
  }

  // Services
  const servicesData = [
    {
      name: 'Quran Reading & Tajweed for Children',
      slug: 'quran-reading-tajweed',
      summary: 'Foundational Quran recitation and Tajweed for boys and girls.',
      description: 'Daily morning and evening sessions teaching foundational Arabic phonetics, correct articulation, and recitation.',
      category: ServiceCategory.education,
      coordinator: 'Qari Hafizullah',
      contactPhone: '+880 1712 345678',
      location: 'Ground Floor Maktab Room',
      availability: 'Sunday - Thursday (Morning & Evening)',
      turnaround: 'Continuous enrollment',
    },
    {
      name: 'Tahfeez-ul-Quran (Memorization Program)',
      slug: 'tahfeez-ul-quran',
      summary: 'Structured, supervised Quran memorization for committed students.',
      description: 'Structured, supervised memorization program guided by qualified Huffaz with individual student pacing.',
      category: ServiceCategory.education,
      coordinator: 'Hafiz Mahmudul Hasan',
      contactPhone: '+880 1712 345678',
      location: '1st Floor Study Hall',
      availability: 'Daily after Fajr & Asr',
      turnaround: 'Assessment required',
    },
    {
      name: 'Adult Fiqh & Arabic Comprehension',
      slug: 'adult-fiqh-arabic',
      summary: 'Essential practical fiqh and Arabic vocabulary for working adults.',
      description: 'Weekend study circles covering practical daily jurisprudence (taharah, salah, zakat) and fundamental Quranic vocabulary.',
      category: ServiceCategory.education,
      coordinator: 'Imam Yusuf Ali',
      contactPhone: '+880 1712 345678',
      location: 'Main Sanctuary Library Corner',
      availability: 'Friday & Saturday after Maghrib',
      turnaround: 'Open admission',
    },
    {
      name: 'Weekly Tafseer & Hadith Halaqahs',
      slug: 'weekly-tafseer-halaqahs',
      summary: 'Open community halaqahs on Quran and Sunnah.',
      description: 'Open community halaqahs examining timeless lessons of the Holy Quran and noble Sunnah of the Prophet ﷺ.',
      category: ServiceCategory.education,
      coordinator: 'Imam Yusuf Ali',
      contactPhone: '+880 1712 345678',
      location: 'Main Prayer Sanctuary',
      availability: 'Every Friday after Jumuah',
      turnaround: 'Open to all',
    },
    {
      name: 'Food Rations & Welfare Aid',
      slug: 'food-rations-welfare-aid',
      summary: 'Emergency food baskets and essential grocery support.',
      description: 'Regular emergency food packets, dry provisions, and monthly essentials distributed discretely to vulnerable neighborhood families.',
      category: ServiceCategory.welfare,
      coordinator: 'Nasir Uddin',
      contactPhone: '+880 1712 345678',
      location: 'Community Welfare Center',
      availability: '1st week of each month',
      turnaround: '24 hours notice',
    },
    {
      name: 'Transparent Zakat & Sadaqah Fund',
      slug: 'zakat-sadaqah-fund',
      summary: 'Shariah-compliant zakat collection and direct distribution.',
      description: '100% policy-compliant Shariah fund directing your contributions straight into local medical emergencies, debt relief, and orphan support.',
      category: ServiceCategory.welfare,
      coordinator: 'Nasir Uddin',
      contactPhone: '+880 1712 345678',
      location: 'Administration Office',
      availability: 'Daily during office hours',
      turnaround: 'Disbursed as needed',
    },
    {
      name: 'Nikah Facilitation & Counseling',
      slug: 'nikah-facilitation-counseling',
      summary: 'Sunnah marriage solemnization and pre-marital guidance.',
      description: 'Assisting couples with Islamic marriage solemnization, official certificate documentation, and pre-marital guidance.',
      category: ServiceCategory.marriage,
      coordinator: 'Imam Yusuf Ali',
      contactPhone: '+880 1712 345678',
      location: 'Executive Counseling Room',
      availability: 'By appointment',
      turnaround: '3 days notice',
    },
    {
      name: 'Janazah & Bereavement Support',
      slug: 'janazah-bereavement-support',
      summary: '24/7 funeral, ghusl, kafan, and janazah prayer assistance.',
      description: 'Compassionate, round-the-clock guidance during loss—including ghusl assistance, shroud preparation, and janazah prayer organization.',
      category: ServiceCategory.funeral,
      coordinator: 'Abdul Karim',
      contactPhone: '+880 1712 345678',
      location: 'Sanctuary & Mortuary Service Area',
      availability: '24/7 Emergency Line',
      turnaround: 'Immediate response',
    },
  ];

  for (const s of servicesData) {
    const existing = await prisma.service.findFirst({
      where: { mosqueId: mosque.id, slug: s.slug },
    });
    if (!existing) {
      await prisma.service.create({
        data: {
          ...s,
          mosqueId: mosque.id,
          status: ServiceStatus.active,
        },
      });
    }
  }

  // Gallery Items
  const galleryData = [
    { imageUrl: '/arshan-latheef-fnq9X0fjGqc-unsplash.jpg', title: 'Noor Mosque Minaret', altText: 'Mosque minaret rising gracefully into the serene sky', category: 'Architecture', sortOrder: 1 },
    { imageUrl: '/ekrem-osmanoglu--scqJ82Z55s-unsplash.jpg', title: 'Grand Central Dome', altText: 'Intricate geometric patterns decorating the grand central dome', category: 'Sacred Craft', sortOrder: 2 },
    { imageUrl: '/nourhan-sabek-6npKzC58MUE-unsplash.jpg', title: 'Sunlight in Archways', altText: 'Sunlight streaming through traditional mosque archways', category: 'Sanctuary', sortOrder: 3 },
    { imageUrl: '/alim-L7J4ytEFRCg-unsplash.jpg', title: 'Scholarly Guidance', altText: 'Scholarly guidance and spiritual contemplation at the mosque', category: 'Fellowship', sortOrder: 4 },
    { imageUrl: '/fmaily praying.jpg', title: 'Congregational Worship', altText: 'Congregational worship bringing families together', category: 'Devotion', sortOrder: 5 },
    { imageUrl: '/pexels-qaarif-14793742.jpg', title: 'Prayer Courtyard Colonnade', altText: 'Serene colonnade perspective inside the prayer courtyard', category: 'Atmosphere', sortOrder: 6 },
  ];

  for (const g of galleryData) {
    const existing = await prisma.mosqueGalleryItem.findFirst({
      where: { mosqueId: mosque.id, imageUrl: g.imageUrl },
    });
    if (!existing) {
      await prisma.mosqueGalleryItem.create({
        data: { ...g, mosqueId: mosque.id, isPublished: true },
      });
    }
  }

  // Community Events
  const eventsData = [
    {
      title: 'Weekly Quran Tafsir & Reflection',
      slug: 'weekly-quran-tafsir',
      category: EventCategory.education,
      status: EventStatus.upcoming,
      date: new Date('2026-09-15T00:00:00.000Z'),
      startTime: '19:30',
      endTime: '21:00',
      location: 'Main Prayer Sanctuary',
      speaker: 'Shaykh Ahmadullah',
      description: 'Join us for an inspiring evening reflection on Surah Al-Kahf, practical lessons for daily life, and open community Q&A over warm tea.',
      capacity: 150,
      registrationRequired: false,
      imageUrl: '/alim-L7J4ytEFRCg-unsplash.jpg',
      isPublished: true,
    },
    {
      title: 'Youth Leadership & Mentorship Circle',
      slug: 'youth-leadership-circle',
      category: EventCategory.youth,
      status: EventStatus.upcoming,
      date: new Date('2026-09-18T00:00:00.000Z'),
      startTime: '17:00',
      endTime: '19:00',
      location: 'Youth Activity Suite',
      speaker: 'Ustadh Tariq Aziz',
      description: 'Empowering students and young professionals with Islamic values, career counseling, ethical leadership, and supportive brotherhood fellowship.',
      capacity: 80,
      registrationRequired: true,
      imageUrl: '/fmaily praying.jpg',
      isPublished: true,
    },
    {
      title: 'Sisters Tajweed & Quran Halaqah',
      slug: 'sisters-quran-halaqah',
      category: EventCategory.quran,
      status: EventStatus.upcoming,
      date: new Date('2026-09-20T00:00:00.000Z'),
      startTime: '10:30',
      endTime: '12:30',
      location: 'Sisters Prayer & Educational Suite',
      speaker: 'Ustadha Fatima Begum',
      description: 'Structured Quran tajweed revision, memorization practice, and sisterhood networking circle welcoming sisters of all recitation proficiencies.',
      capacity: 60,
      registrationRequired: true,
      imageUrl: '/nourhan-sabek-6npKzC58MUE-unsplash.jpg',
      isPublished: true,
    },
    {
      title: 'Annual Community Health & Blood Donation Drive',
      slug: 'community-health-fair',
      category: EventCategory.community,
      status: EventStatus.upcoming,
      date: new Date('2026-09-26T00:00:00.000Z'),
      startTime: '09:00',
      endTime: '16:00',
      location: 'Mosque Courtyard & Multi-purpose Hall',
      speaker: 'Dr. Mahmud Hasan',
      description: 'Free medical checkups, diabetes & blood pressure screenings, and a voluntary blood donation drive organized with certified health professionals.',
      capacity: 300,
      registrationRequired: false,
      imageUrl: '/pexels-qaarif-14793742.jpg',
      isPublished: true,
    },
    {
      title: 'Zakat Calculation & Wealth Purification Workshop',
      slug: 'zakat-awareness-workshop',
      category: EventCategory.charity,
      status: EventStatus.upcoming,
      date: new Date('2026-10-02T00:00:00.000Z'),
      startTime: '18:00',
      endTime: '20:30',
      location: 'Conference Hall',
      speaker: 'Mufti Abdullah',
      description: 'Comprehensive practical seminar explaining accurate Zakat computation on businesses, stocks, real estate, and gold according to authentic Shariah rules.',
      capacity: 100,
      registrationRequired: true,
      imageUrl: '/arshan-latheef-fnq9X0fjGqc-unsplash.jpg',
      isPublished: true,
    },
  ];

  for (const ev of eventsData) {
    const existing = await prisma.event.findFirst({
      where: { mosqueId: mosque.id, slug: ev.slug },
    });
    if (!existing) {
      await prisma.event.create({
        data: { ...ev, mosqueId: mosque.id },
      });
    }
  }

  console.warn(
    `Seeded "${mosque.name}" with story, mission, vision, ${people.length} accounts, ` +
      `${milestonesData.length} milestones, ${valuesData.length} values, ` +
      `${facilitiesData.length} facilities, ${servicesData.length} services, ` +
      `${galleryData.length} gallery items, and ${eventsData.length} events.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
