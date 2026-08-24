/**
 * Prints a usable password-reset token for a local account.
 *
 * The API cannot give you one, by design: only a SHA-256 of the token is stored, so the raw value
 * exists for the length of one request and is then unrecoverable — including by whoever is building
 * the feature. `AuthService` writes the link to the server log in development, which covers the
 * normal case but assumes the right terminal is in front of you. This is the same token on demand.
 *
 * Development only, and it refuses to run in production. It mints a credential without proving
 * anything about who is asking, which is the entire reason the real endpoint mails a link instead of
 * answering with a token. Nothing in `src/` imports this file.
 *
 * Mirrors `AuthService.forgotPassword`: 32 random bytes as base64url, stored as SHA-256 hex, valid
 * 30 minutes. Those three facts are duplicated here rather than imported, because importing them
 * would mean compiling the Nest application to run a one-shot script. If they change there, change
 * them here — the tests in `auth.service.spec.ts` pin the real values.
 *
 *   node -r dotenv/config scripts/dev-reset-token.mjs super@noor.example
 */
import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';

const TTL_MINUTES = 30;

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to run: NODE_ENV is production. This script hands out a credential.');
  process.exit(1);
}

const identifier = process.argv[2];

if (!identifier) {
  console.error('Usage: node -r dotenv/config scripts/dev-reset-token.mjs <email|phone>');
  process.exit(1);
}

// Matched the way the service matches it — a phone if it starts with "+", an email otherwise.
const where = identifier.startsWith('+')
  ? { phone: identifier, deletedAt: null, isActive: true }
  : { email: identifier.trim().toLowerCase(), deletedAt: null, isActive: true };

const prisma = new PrismaClient();

try {
  // `findMany`, not `findUnique`: email and phone are unique per mosque, not globally, so an address
  // can legitimately match more than one row and there is no single-row lookup to use.
  const matches = await prisma.user.findMany({
    where,
    select: { id: true, email: true, phone: true, mosqueId: true },
    take: 2,
  });

  if (matches.length === 0) {
    console.error(
      `No active, non-deleted account matches ${identifier}.\n` +
        'A disabled or soft-deleted account is deliberately unrecoverable — reset would otherwise ' +
        'be a way to walk past the revocation.',
    );
    process.exit(1);
  }

  if (matches.length > 1) {
    console.error(
      `${identifier} belongs to more than one mosque, so there is no single account to reset.\n` +
        'The API asks for mosqueSlug in this case; this script does not disambiguate.',
    );
    process.exit(1);
  }

  const [user] = matches;
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + TTL_MINUTES * 60_000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: createHash('sha256').update(token).digest('hex'),
      passwordResetExpiresAt: expiresAt,
    },
  });

  const webUrl =
    process.env.APP_WEB_URL ||
    (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)[0] ||
    'http://localhost:3000';

  const link = new URL('/reset-password', webUrl);
  link.searchParams.set('token', token);

  // A ready-to-run command as well as the bare token, because every failure so far has been a
  // transcription problem rather than a logic one: the 64-character hash copied out of the database
  // instead of the token, a Swagger example submitted as-is, a token replaced by a later request
  // before it was used. One line to copy removes the step where those happen.
  const port = process.env.PORT ?? 4000;
  const body = JSON.stringify({ token, newPassword: 'ReplaceMe!23' });

  console.log('');
  console.log(`account   ${user.email ?? user.phone}`);
  console.log(`expires   ${expiresAt.toISOString()}  (${TTL_MINUTES} minutes)`);
  console.log('');
  console.log('token     (paste this into Swagger)');
  console.log(token);
  console.log('');
  console.log(`link      ${link.toString()}`);
  console.log('');
  console.log('Or run this directly, changing the password first:');
  console.log('');
  console.log(
    `curl -X POST http://localhost:${port}/api/v1/auth/reset-password ` +
      `-H 'Content-Type: application/json' -d '${body}'`,
  );
  console.log('');
  console.log('Single-use, and replaces any outstanding token on this account — so if you run this');
  console.log('script or POST /forgot-password again, everything printed above stops working.');
  console.log('');
} finally {
  await prisma.$disconnect();
}
