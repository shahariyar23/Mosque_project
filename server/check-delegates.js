const { PrismaClient } = require('@prisma/client');
(async () => {
  const p = new PrismaClient();
  try {
    const counts = {
      prayerSettings: await p.prayerSettings.count(),
      jumuahSchedule: await p.jumuahSchedule.count(),
      ramadanSchedule: await p.ramadanSchedule.count(),
    };
    console.log('delegates OK', JSON.stringify(counts));
  } finally {
    await p.$disconnect();
  }
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
