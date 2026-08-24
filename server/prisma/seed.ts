/* eslint-disable no-console */
import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

/**
 * Development seed.
 *
 * Creates one mosque, its settings, and one account per role so every screen in the dashboard can be
 * opened and every permission boundary exercised by signing in as a different person.
 *
 * Idempotent throughout — `upsert` keyed on natural identifiers — so it can be re-run after a schema
 * change without wiping the database first.
 *
 * The seed password is read from `SEED_PASSWORD` and falls back to an obvious development value.
 * That fallback is deliberately not a plausible production secret: this script must never be the
 * reason a real credential exists in the repository. Seeding is guarded against production below.
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

  const mosque = await prisma.mosque.upsert({
    where: { slug: 'noor-jame-masjid' },
    update: {},
    create: {
      slug: 'noor-jame-masjid',
      name: 'Noor Jame Masjid',
      email: 'info@noor-masjid.example',
      phone: '+8801700000000',
      addressLine: '12 Mirpur Road',
      city: 'Dhaka',
      district: 'Dhaka',
      country: 'Bangladesh',
      postalCode: '1207',
      // Dhaka, to six decimal places — enough for prayer-time calculation.
      latitude: '23.780636',
      longitude: '90.399452',
      timezone: 'Asia/Dhaka',
      establishedYear: 1987,
      description: 'A neighbourhood mosque serving the local community.',
      settings: { create: {} },
    },
  });

  const passwordHash = await hash(SEED_PASSWORD);

  /**
   * One account per role. Permissions are left empty on purpose: each account should demonstrate
   * exactly what its role grants, so a screen that unexpectedly opens or closes points at the role
   * definition rather than at a seeded exception.
   */
  const people: Array<{ fullName: string; email: string; phone: string; role: Role }> = [
    { fullName: 'Platform Owner', email: 'super@noor.example', phone: '+8801700000001', role: Role.super_admin },
    { fullName: 'Abdul Karim', email: 'admin@noor.example', phone: '+8801700000002', role: Role.mosque_admin },
    { fullName: 'Rashed Ahmed', email: 'secretary@noor.example', phone: '+8801700000003', role: Role.secretary },
    { fullName: 'Nasir Uddin', email: 'treasurer@noor.example', phone: '+8801700000004', role: Role.treasurer },
    { fullName: 'Jamal Hossain', email: 'cashier@noor.example', phone: '+8801700000005', role: Role.cashier },
    { fullName: 'Imam Yusuf Ali', email: 'imam@noor.example', phone: '+8801700000006', role: Role.imam },
    { fullName: 'Fatima Begum', email: 'member@noor.example', phone: '+8801700000007', role: Role.member },
  ];

  for (const person of people) {
    await prisma.user.upsert({
      where: { mosqueId_email: { mosqueId: mosque.id, email: person.email } },
      update: { fullName: person.fullName, role: person.role, isActive: true },
      create: { ...person, mosqueId: mosque.id, passwordHash, isActive: true },
    });
  }

  console.warn(
    `Seeded "${mosque.name}" with ${people.length} accounts. ` +
      'Sign in with any address above; the password is whatever SEED_PASSWORD was set to.',
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
