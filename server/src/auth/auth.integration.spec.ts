import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import type { Position, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';

import { configureApp } from '../bootstrap';
import { env, type AppConfig } from '../config/app.config';
import { PrismaService } from '../prisma/prisma.service';
import { REFRESH_COOKIE_PATH } from './refresh-cookie';

/**
 * The authentication endpoints over HTTP, through the real application.
 *
 * `auth.service.spec.ts` covers the service in isolation. This file exists for the half of the
 * behaviour a unit test cannot reach, because it is not in the service at all: the global
 * `JwtAuthGuard` refusing an anonymous request, `PermissionsGuard` refusing an authenticated one,
 * `ValidationPipe` rejecting a body that carries `role`, `ThrottlerGuard` counting attempts, the
 * exception filter shaping a 401, and the `Set-Cookie` attributes a browser will actually enforce.
 *
 * So none of those are stubbed. The brief is explicit that the guards must not be disabled or mocked
 * away to make tests pass, and the point of testing at this level is that they are all switched on:
 * the application is built from the real `AppModule` and configured by the same `configureApp` that
 * `main.ts` calls, so what is asserted here is what the process serves.
 *
 * Two things are substituted, neither of them a security control.
 *
 * `PrismaService` becomes an in-memory store, because a test suite should not need a Postgres
 * instance and because seeding an expired session row or a soft-deleted account is far clearer as a
 * direct write than as a migration. It is deliberately not a bag of `jest.fn()`s: it projects rows
 * through the caller's `select`, so "the response contains no `passwordHash`" passes because
 * `USER_SELECT` omits the column — the real reason — rather than because a mock forgot to include it.
 * Filters it does not understand throw, so a silently-wrong match cannot masquerade as a pass.
 *
 * The throttler's *storage* is wrapped so the counter can be rotated between tests. The guard, the
 * limits and the real `ThrottlerStorageService` algorithm all stay; only the lifetime of the counters
 * shrinks from the whole file to one test, which is what a fresh application per test would have given
 * at a hundred times the cost. Rotating rather than clearing matters: `ThrottlerStorageService`
 * schedules timers that dereference their own key, so emptying the map underneath them throws inside a
 * `setTimeout` where no test can catch it.
 *
 * Argon2 is real. Password verification is the thing being tested.
 */

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

/**
 * Set before `app.module.ts` is loaded, which is why the import of it further down is dynamic.
 *
 * `ConfigModule.forRoot` validates the environment while the module file is being evaluated, and
 * `@nestjs/config` merges `{ ...dotenv, ...process.env }` — so these values win over a developer's
 * `.env`, but only if they are already set by the time that import runs. A static import would be
 * hoisted above this block and the suite would inherit whatever `.env` happens to hold, or fail
 * outright on a machine that has none.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://noor:noor@localhost:5432/noor_test';
process.env.JWT_ACCESS_SECRET = 'integration-access-secret-32-chars-min';
process.env.JWT_REFRESH_SECRET = 'integration-refresh-secret-32-chars-min';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.REFRESH_COOKIE_NAME = 'noor_refresh';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.THROTTLE_TTL = '60';
process.env.THROTTLE_LIMIT = '120';
// A `Domain=` attribute would change the cookie assertions below, and no test needs one.
delete process.env.COOKIE_DOMAIN;

const ACCESS_TTL_SECONDS = 900;
const MOSQUE_SLUG = 'noor-jame-masjid';
const CLOSED_MOSQUE_SLUG = 'closed-masjid';
const PASSWORD = 'Str0ngPassphrase!';

// ---------------------------------------------------------------------------
// In-memory Prisma
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

// Aliases rather than interfaces: only an alias gets an implicit index signature, which is what lets a
// row be passed to the `Row`-typed matcher and projector below without a cast at every call.
type UserRow = {
  id: string;
  mosqueId: string;
  fullName: string;
  email: string;
  phone: string | null;
  passwordHash: string;
  role: Role;
  positions: Position[];
  permissions: string[];
  deniedPermissions: string[];
  isActive: boolean;
  dateOfBirth: Date | null;
  gender: string | null;
  city: string | null;
  avatarUrl: string | null;
  newsletter: boolean;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type MosqueRow = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
};

type RefreshTokenRow = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
};

interface FindArgs {
  where?: unknown;
  select?: unknown;
  orderBy?: unknown;
  take?: number;
  skip?: number;
}

interface CreateArgs {
  data: Row;
  select?: unknown;
}

interface UpdateArgs {
  where: Row;
  data: Row;
  select?: unknown;
}

function isPlainObject(value: unknown): value is Row {
  return (
    typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)
  );
}

/** Prisma treats an absent key and an explicit `undefined` alike; a plain object does not. */
function defined(data: Row): Row {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

function matchesField(actual: unknown, expected: unknown): boolean {
  if (expected instanceof Date) {
    return actual instanceof Date && actual.getTime() === expected.getTime();
  }

  if (!isPlainObject(expected)) return actual === expected;

  for (const [operator, operand] of Object.entries(expected)) {
    switch (operator) {
      case 'equals':
        if (!matchesField(actual, operand)) return false;
        break;
      case 'not':
        if (matchesField(actual, operand)) return false;
        break;
      case 'in':
        if (!Array.isArray(operand) || !operand.some((value) => matchesField(actual, value))) {
          return false;
        }
        break;
      case 'contains': {
        if (typeof actual !== 'string' || typeof operand !== 'string') return false;
        const fold = expected.mode === 'insensitive';
        const haystack = fold ? actual.toLowerCase() : actual;
        const needle = fold ? operand.toLowerCase() : operand;
        if (!haystack.includes(needle)) return false;
        break;
      }
      case 'mode':
        // Consumed by `contains` above.
        break;
      default:
        // Loud rather than lenient: a filter this fake does not implement would otherwise match
        // everything, and a test asserting a refusal would pass for the wrong reason.
        throw new Error(`in-memory prisma: unsupported filter operator "${operator}"`);
    }
  }

  return true;
}

function matchesRow(
  row: Row,
  where: unknown,
  relations: Record<string, (row: Row) => Row | undefined> = {},
): boolean {
  if (!isPlainObject(where)) return true;

  for (const [key, expected] of Object.entries(where)) {
    if (expected === undefined) continue;

    if (key === 'OR') {
      if (
        !Array.isArray(expected) ||
        !expected.some((clause) => matchesRow(row, clause, relations))
      ) {
        return false;
      }
      continue;
    }

    if (key === 'AND') {
      if (
        !Array.isArray(expected) ||
        !expected.every((clause) => matchesRow(row, clause, relations))
      ) {
        return false;
      }
      continue;
    }

    if (key === 'NOT') {
      if (matchesRow(row, expected, relations)) return false;
      continue;
    }

    const resolve = relations[key];
    if (resolve !== undefined) {
      const related = resolve(row);
      if (related === undefined || !matchesRow(related, expected)) return false;
      continue;
    }

    if (!matchesField(row[key], expected)) return false;
  }

  return true;
}

/**
 * Copies only the columns the caller asked for.
 *
 * The reason this fake projects at all. `USER_SELECT` is the project's single statement of what a user
 * is over HTTP, and it does not name `passwordHash`; honouring the select here means the assertions
 * about what a response cannot contain are testing that decision rather than this file's own defaults.
 */
function project(row: Row, select: unknown): Row {
  if (!isPlainObject(select)) return { ...row };

  const projected: Row = {};
  for (const [column, wanted] of Object.entries(select)) {
    if (wanted === true) projected[column] = row[column];
  }

  return projected;
}

function sortRows(rows: Row[], orderBy: unknown): Row[] {
  const clauses = (Array.isArray(orderBy) ? orderBy : [orderBy]).filter(isPlainObject);
  if (clauses.length === 0) return rows;

  return [...rows].sort((left, right) => {
    for (const clause of clauses) {
      for (const [column, direction] of Object.entries(clause)) {
        const a = left[column];
        const b = right[column];
        const order = a === b ? 0 : (a as never) < (b as never) ? -1 : 1;
        if (order !== 0) return direction === 'desc' ? -order : order;
      }
    }
    return 0;
  });
}

/**
 * Stands in for `PrismaService`.
 *
 * Registered with `useValue`, so `onModuleInit` never runs and nothing tries to reach a database.
 * Only the delegates the auth and users paths actually call are implemented; anything else is absent
 * and would fail as a missing function rather than quietly returning undefined.
 */
class InMemoryDatabase {
  readonly users: UserRow[] = [];
  readonly mosques: MosqueRow[] = [];
  readonly refreshTokens: RefreshTokenRow[] = [];

  /** Every `data` object handed to `user.create`, so a test can assert what was *not* in it. */
  readonly userCreates: Row[] = [];

  private readonly userRelations = {
    mosque: (row: Row): Row | undefined =>
      this.mosques.find((mosque) => mosque.id === row.mosqueId),
  };

  readonly user = {
    findFirst: (args: FindArgs): Promise<Row | null> => {
      const found = this.matchingUsers(args.where)[0];
      return Promise.resolve(found === undefined ? null : project(found, args.select));
    },

    findMany: (args: FindArgs): Promise<Row[]> => {
      const matched = sortRows(this.matchingUsers(args.where), args.orderBy);
      const skipped = args.skip === undefined ? matched : matched.slice(args.skip);
      const limited = args.take === undefined ? skipped : skipped.slice(0, args.take);
      return Promise.resolve(limited.map((row) => project(row, args.select)));
    },

    count: (args: FindArgs): Promise<number> =>
      Promise.resolve(this.matchingUsers(args.where).length),

    create: (args: CreateArgs): Promise<Row> => {
      const data = defined(args.data);
      this.userCreates.push(data);
      return Promise.resolve(project(this.seedUser(data as Partial<UserRow>), args.select));
    },

    update: (args: UpdateArgs): Promise<Row> => {
      const row = this.matchingUsers(args.where)[0];
      if (row === undefined) throw new Error('in-memory prisma: user.update matched no row');

      Object.assign(row, defined(args.data), { updatedAt: new Date() });
      return Promise.resolve(project(row, args.select));
    },
  };

  readonly mosque = {
    findUnique: (args: FindArgs): Promise<Row | null> => {
      const found = this.mosques.find((row) => matchesRow(row, args.where));
      return Promise.resolve(found === undefined ? null : project(found, args.select));
    },

    findMany: (args: FindArgs): Promise<Row[]> => {
      const matched = this.mosques.filter((row) => matchesRow(row, args.where));
      const limited = args.take === undefined ? matched : matched.slice(0, args.take);
      return Promise.resolve(limited.map((row) => project(row, args.select)));
    },
  };

  readonly refreshToken = {
    findUnique: (args: FindArgs): Promise<Row | null> => {
      const found = this.refreshTokens.find((row) => matchesRow(row, args.where));
      return Promise.resolve(found === undefined ? null : project(found, args.select));
    },

    create: (args: CreateArgs): Promise<Row> => {
      const data = defined(args.data);
      const row: RefreshTokenRow = {
        id: randomUUID(),
        userId: '',
        tokenHash: '',
        expiresAt: new Date(),
        revokedAt: null,
        replacedById: null,
        userAgent: null,
        ipAddress: null,
        createdAt: new Date(),
        ...(data as Partial<RefreshTokenRow>),
      };

      this.refreshTokens.push(row);
      return Promise.resolve(project(row, args.select));
    },

    updateMany: (args: { where: unknown; data: Row }): Promise<{ count: number }> => {
      const matched = this.refreshTokens.filter((row) => matchesRow(row, args.where));
      for (const row of matched) Object.assign(row, defined(args.data));
      return Promise.resolve({ count: matched.length });
    },
  };

  /**
   * The array form only, which is all this project uses.
   *
   * The operations have already begun by the time they arrive — a fake has no lazy promise — so this
   * is not atomic. It does not need to be: what the rotation test asserts is the arbitration in
   * `updateMany`, which is a single statement either way.
   */
  $transaction(operations: Promise<unknown>[]): Promise<unknown[]> {
    return Promise.all(operations);
  }

  isHealthy(): Promise<boolean> {
    return Promise.resolve(true);
  }

  // ---- Test helpers ---------------------------------------------------------

  reset(): void {
    this.users.length = 0;
    this.mosques.length = 0;
    this.refreshTokens.length = 0;
    this.userCreates.length = 0;

    this.mosques.push(
      { id: randomUUID(), slug: MOSQUE_SLUG, name: 'Noor Jame Masjid', isActive: true },
      { id: randomUUID(), slug: CLOSED_MOSQUE_SLUG, name: 'Closed Masjid', isActive: false },
    );
  }

  get mosqueId(): string {
    return this.mosques[0].id;
  }

  seedUser(overrides: Partial<UserRow> = {}): UserRow {
    const now = new Date();
    const row: UserRow = {
      id: randomUUID(),
      mosqueId: this.mosqueId,
      fullName: 'Seeded Member',
      email: `seed-${this.users.length}@noor.example`,
      phone: null,
      passwordHash: '',
      role: 'member',
      positions: [],
      permissions: [],
      deniedPermissions: [],
      isActive: true,
      dateOfBirth: null,
      gender: null,
      city: null,
      avatarUrl: null,
      newsletter: false,
      emailVerifiedAt: null,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      ...overrides,
    };

    this.users.push(row);
    return row;
  }

  private matchingUsers(where: unknown): UserRow[] {
    return this.users.filter((row) => matchesRow(row, where, this.userRelations));
  }
}

/**
 * The real throttler storage, replaceable between tests.
 *
 * `ThrottlerGuard` is untouched and the limits are the application's own, so a test can still prove
 * that the sixth sign-in attempt in a minute is refused. What this adds is a way to start the next
 * test from zero without rebuilding the application: `rotate()` shuts the current storage down —
 * which is what cancels its pending expiry timers — and puts a fresh one in its place.
 */
class RotatingThrottlerStorage implements ThrottlerStorage {
  private delegate = new ThrottlerStorageService();

  increment(
    ...args: Parameters<ThrottlerStorage['increment']>
  ): ReturnType<ThrottlerStorage['increment']> {
    return this.delegate.increment(...args);
  }

  rotate(): void {
    this.delegate.onApplicationShutdown();
    this.delegate = new ThrottlerStorageService();
  }

  shutdown(): void {
    this.delegate.onApplicationShutdown();
  }
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

/** Typed structurally so it does not depend on which version of supertest's typings is installed. */
function setCookies(response: { headers: unknown }): string[] {
  const headers = response.headers;
  if (!isPlainObject(headers)) return [];

  const raw = headers['set-cookie'];
  if (typeof raw === 'string') return [raw];

  return Array.isArray(raw)
    ? raw.filter((value): value is string => typeof value === 'string')
    : [];
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

describe('Auth (integration)', () => {
  let app: INestApplication;
  let server: Server;
  let config: AppConfig;
  let jwt: JwtService;

  const database = new InMemoryDatabase();
  const throttling = new RotatingThrottlerStorage();

  let cookieName: string;
  let passwordHash: string;

  // ---- Fixtures -------------------------------------------------------------

  function registration(overrides: Row = {}): Row {
    return {
      fullName: 'Abdul Karim',
      email: 'karim@noor.example',
      phone: '+8801700000001',
      password: PASSWORD,
      ...overrides,
    };
  }

  /** A member with a real argon2 hash of `PASSWORD`, hashed once in `beforeAll` and reused. */
  function seedMember(overrides: Partial<UserRow> = {}): UserRow {
    return database.seedUser({
      fullName: 'Abdul Karim',
      email: 'karim@noor.example',
      phone: '+8801700000001',
      passwordHash,
      ...overrides,
    });
  }

  function refreshCookieOf(response: { headers: unknown }): string {
    const cookie = setCookies(response).find((value) => value.startsWith(`${cookieName}=`));
    if (cookie === undefined) throw new Error('the response set no refresh cookie');
    return cookie;
  }

  function refreshTokenOf(response: { headers: unknown }): string {
    const [pair] = refreshCookieOf(response).split(';');
    return pair.slice(cookieName.length + 1);
  }

  function cookieHeader(token: string): string {
    return `${cookieName}=${token}`;
  }

  async function signIn(body: Row = {}): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'karim@noor.example', password: PASSWORD, ...body })
      .expect(200);

    return {
      accessToken: response.body.data.accessToken,
      refreshToken: refreshTokenOf(response),
    };
  }

  /** Signs a token the application will accept the signature of, with whatever claims a test needs. */
  function sign(
    payload: Row,
    secret: string,
    expiresIn: JwtSignOptions['expiresIn'],
  ): Promise<string> {
    return jwt.signAsync(payload, { secret, expiresIn });
  }

  // ---- Lifecycle ------------------------------------------------------------

  beforeAll(async () => {
    // Dynamic so that the environment above is in place before `ConfigModule.forRoot` validates it.
    const { AppModule } = await import('../app.module');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(database)
      .overrideProvider(ThrottlerStorage)
      .useValue(throttling)
      .compile();

    app = moduleRef.createNestApplication();
    config = app.get<ConfigService, AppConfig>(ConfigService);

    // The same cross-cutting configuration `main.ts` applies: helmet, cookie parsing, CORS, the global
    // prefix and version, the validation pipe and the exception filter. Re-declaring any of it here
    // would mean asserting against this file's copy instead of the application's.
    configureApp(app, config);

    await app.init();

    server = app.getHttpServer();
    jwt = app.get(JwtService);
    cookieName = env.refreshCookieName(config);

    passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id });
  });

  afterAll(async () => {
    throttling.shutdown();
    await app?.close();
  });

  beforeEach(() => {
    database.reset();
    throttling.rotate();
  });

  // =========================================================================
  // REGISTER
  // =========================================================================

  describe('POST /api/v1/auth/register', () => {
    it('creates the account and returns it in the envelope', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send(registration())
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Account created successfully',
      });
      expect(response.body.data.user).toMatchObject({
        fullName: 'Abdul Karim',
        email: 'karim@noor.example',
        phone: '+8801700000001',
        role: 'member',
        status: 'active',
        isActive: true,
        positions: [],
        permissions: [],
        deniedPermissions: [],
      });
      expect(database.users).toHaveLength(1);
    });

    it('resolves the only active mosque when none is named', async () => {
      await request(server).post('/api/v1/auth/register').send(registration()).expect(201);

      expect(database.users[0].mosqueId).toBe(database.mosqueId);
    });

    it('returns the effective permission set, which for a member is not empty', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send(registration())
        .expect(201);

      expect(response.body.data.user.effectivePermissions).toContain('donation.viewOwn');
      expect(response.body.data.user.effectivePermissions).not.toContain('user.manage');
    });

    it('stores an argon2id hash and never the password itself', async () => {
      await request(server).post('/api/v1/auth/register').send(registration()).expect(201);

      const stored = database.users[0].passwordHash;
      expect(stored).toMatch(/^\$argon2id\$/);
      expect(stored).not.toContain(PASSWORD);
      await expect(argon2.verify(stored, PASSWORD)).resolves.toBe(true);
    });

    it('returns neither the password nor its hash', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send(registration())
        .expect(201);

      // The whole body as text, so a leak nested anywhere under `data` is caught too.
      const body = JSON.stringify(response.body);
      expect(body).not.toContain('passwordHash');
      expect(body).not.toContain(PASSWORD);
      expect(body).not.toContain(database.users[0].passwordHash);
    });

    it('does not send role, permissions or positions to the database at all', async () => {
      await request(server).post('/api/v1/auth/register').send(registration()).expect(201);

      // The account is a `member` because the column fell to its schema default, not because this
      // code path chose a value — which is what makes privilege escalation here impossible rather
      // than merely unimplemented.
      const [created] = database.userCreates;
      expect(Object.keys(created)).not.toContain('role');
      expect(Object.keys(created)).not.toContain('permissions');
      expect(Object.keys(created)).not.toContain('deniedPermissions');
      expect(Object.keys(created)).not.toContain('positions');
    });

    it('rejects a body that carries a role', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send(registration({ role: 'super_admin' }))
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.errors).toHaveProperty('role');
      expect(database.users).toHaveLength(0);
    });

    it('rejects a body that carries permissions', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send(registration({ permissions: ['user.manage'] }))
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.errors).toHaveProperty('permissions');
      expect(database.users).toHaveLength(0);
    });

    it.each(['isActive', 'status', 'isAdmin', 'emailVerifiedAt'])(
      'rejects a body that carries %s',
      async (field) => {
        await request(server)
          .post('/api/v1/auth/register')
          .send(registration({ [field]: true }))
          .expect(400);

        expect(database.users).toHaveLength(0);
      },
    );

    it('refuses a duplicate email with 409', async () => {
      seedMember();

      const response = await request(server)
        .post('/api/v1/auth/register')
        .send(registration({ phone: '+8801700009999' }))
        .expect(409);

      expect(response.body.code).toBe('EMAIL_TAKEN');
      expect(database.users).toHaveLength(1);
    });

    it('refuses a duplicate phone with 409', async () => {
      seedMember();

      const response = await request(server)
        .post('/api/v1/auth/register')
        .send(registration({ email: 'someone.else@noor.example' }))
        .expect(409);

      expect(response.body.code).toBe('PHONE_TAKEN');
      expect(database.users).toHaveLength(1);
    });

    it('refuses an unknown mosque slug', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send(registration({ mosqueSlug: 'no-such-mosque' }))
        .expect(400);

      expect(response.body.code).toBe('MOSQUE_NOT_FOUND');
    });

    it('treats an inactive mosque as one that does not exist', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send(registration({ mosqueSlug: CLOSED_MOSQUE_SLUG }))
        .expect(400);

      expect(response.body.code).toBe('MOSQUE_NOT_FOUND');
    });

    it('rate-limits after five attempts in the window', async () => {
      // The limiter counts attempts, not failures, so malformed bodies exhaust it just as well as
      // real ones — and far faster, since none of them reaches argon2.
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await request(server).post('/api/v1/auth/register').send({}).expect(400);
      }

      await request(server).post('/api/v1/auth/register').send(registration()).expect(429);
      expect(database.users).toHaveLength(0);
    });
  });

  // =========================================================================
  // LOGIN
  // =========================================================================

  describe('POST /api/v1/auth/login', () => {
    it('returns an access token and the profile', async () => {
      seedMember();

      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'karim@noor.example', password: PASSWORD })
        .expect(200);

      expect(response.body).toMatchObject({ success: true, message: 'Signed in successfully' });
      expect(response.body.data).toMatchObject({
        tokenType: 'Bearer',
        expiresIn: ACCESS_TTL_SECONDS,
      });
      expect(typeof response.body.data.accessToken).toBe('string');
      expect(response.body.data.user.email).toBe('karim@noor.example');
    });

    it('accepts a phone number as the identifier', async () => {
      seedMember();

      await request(server)
        .post('/api/v1/auth/login')
        .send({ phone: '+8801700000001', password: PASSWORD })
        .expect(200);
    });

    it('sets the refresh token as an HttpOnly cookie scoped to the auth routes', async () => {
      seedMember();

      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'karim@noor.example', password: PASSWORD })
        .expect(200);

      const cookie = refreshCookieOf(response);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain(`Path=${REFRESH_COOKIE_PATH}`);
      // Outside production the frontend is same-site over plain HTTP, so `Lax` without `Secure` is
      // what actually reaches the browser; `None` would be dropped for want of a certificate.
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).not.toContain('Secure');
      expect(cookie).not.toContain('Domain=');
    });

    it('sends a session cookie unless "remember me" was asked for', async () => {
      seedMember();

      const plain = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'karim@noor.example', password: PASSWORD })
        .expect(200);

      expect(refreshCookieOf(plain)).not.toContain('Max-Age');

      const remembered = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'karim@noor.example', password: PASSWORD, remember: true })
        .expect(200);

      expect(refreshCookieOf(remembered)).toContain('Max-Age=');
    });

    it('keeps the refresh token out of the response body', async () => {
      seedMember();

      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'karim@noor.example', password: PASSWORD })
        .expect(200);

      const body = JSON.stringify(response.body);
      expect(body).not.toContain(refreshTokenOf(response));
      expect(body).not.toContain('refreshToken');
      expect(body).not.toContain('passwordHash');
      expect(body).not.toContain(PASSWORD);
    });

    it('stores only a SHA-256 of the refresh token', async () => {
      seedMember();

      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'karim@noor.example', password: PASSWORD })
        .expect(200);

      const token = refreshTokenOf(response);
      const [stored] = database.refreshTokens;

      expect(stored.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(stored.tokenHash).toBe(hashToken(token));
      // The raw token is nowhere in the row: not in the hash column, not in the metadata.
      expect(JSON.stringify(stored)).not.toContain(token);
      expect(stored.revokedAt).toBeNull();
      expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('records the sign-in time', async () => {
      const member = seedMember();
      expect(member.lastLoginAt).toBeNull();

      await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'karim@noor.example', password: PASSWORD })
        .expect(200);

      expect(member.lastLoginAt).toBeInstanceOf(Date);
    });

    it('answers the same 401 for a wrong password, an unknown address, a disabled account and a deleted one', async () => {
      seedMember({ email: 'karim@noor.example' });
      seedMember({ email: 'disabled@noor.example', phone: null, isActive: false });
      seedMember({ email: 'deleted@noor.example', phone: null, deletedAt: new Date() });

      const attempts = [
        { email: 'karim@noor.example', password: 'not-the-password' },
        { email: 'nobody@noor.example', password: PASSWORD },
        { email: 'disabled@noor.example', password: PASSWORD },
        { email: 'deleted@noor.example', password: PASSWORD },
      ];

      const bodies: unknown[] = [];
      for (const attempt of attempts) {
        const response = await request(server).post('/api/v1/auth/login').send(attempt).expect(401);

        expect(setCookies(response)).toHaveLength(0);
        // `path` and `timestamp` differ per request; the parts that could distinguish the four cases
        // are the code and the message, and they must not.
        bodies.push({ code: response.body.code, message: response.body.message });
      }

      expect(bodies).toEqual([
        { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' },
        { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' },
        { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' },
        { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' },
      ]);
      expect(database.refreshTokens).toHaveLength(0);
    });

    it('refuses a request that names neither identifier, or both', async () => {
      seedMember();

      const neither = await request(server)
        .post('/api/v1/auth/login')
        .send({ password: PASSWORD })
        .expect(400);
      expect(neither.body.code).toBe('IDENTIFIER_REQUIRED');

      const both = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'karim@noor.example', phone: '+8801700000001', password: PASSWORD })
        .expect(400);
      expect(both.body.code).toBe('IDENTIFIER_REQUIRED');
    });

    it('rate-limits after five attempts in the window', async () => {
      seedMember();

      for (let attempt = 0; attempt < 5; attempt += 1) {
        await request(server).post('/api/v1/auth/login').send({}).expect(400);
      }

      await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'karim@noor.example', password: PASSWORD })
        .expect(429);
    });
  });

  // =========================================================================
  // ME — the access token, and the guard that reads it
  // =========================================================================

  describe('GET /api/v1/auth/me', () => {
    it('returns the profile for a valid access token', async () => {
      const member = seedMember();
      const { accessToken } = await signIn();

      const response = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Profile retrieved successfully',
      });
      expect(response.body.data).toMatchObject({
        id: member.id,
        email: 'karim@noor.example',
        role: 'member',
        status: 'active',
      });
      expect(response.body.data.effectivePermissions).toContain('donation.viewOwn');
    });

    it('hides every credential column', async () => {
      seedMember();
      const { accessToken } = await signIn();

      const response = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).not.toHaveProperty('passwordHash');
      expect(response.body.data).not.toHaveProperty('refreshTokenHash');
      expect(response.body.data).not.toHaveProperty('deletedAt');

      const body = JSON.stringify(response.body);
      expect(body).not.toContain(passwordHash);
      expect(body).not.toContain(env.accessSecret(config));
      expect(body).not.toContain(env.refreshSecret(config));
    });

    it('reflects a change of authority without waiting for the token to expire', async () => {
      const member = seedMember();
      const { accessToken } = await signIn();

      member.role = 'treasurer';
      member.deniedPermissions = ['donation.viewOwn'];

      const response = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.role).toBe('treasurer');
      expect(response.body.data.effectivePermissions).toContain('finance.view');
      expect(response.body.data.effectivePermissions).not.toContain('donation.viewOwn');
    });

    it('refuses an anonymous request', async () => {
      const response = await request(server).get('/api/v1/auth/me').expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        code: 'UNAUTHENTICATED',
        message: 'Please sign in to continue.',
      });
    });

    it.each([
      ['a malformed token', 'not-a-jwt'],
      ['an empty bearer value', ''],
    ])('refuses %s', async (_label, token) => {
      await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it('refuses a token signed with the refresh secret', async () => {
      const member = seedMember();

      // The separation the two secrets exist for: a stolen refresh token cannot be presented as a
      // bearer token, even though its `sub` names a live account.
      const forged = await sign(
        { sub: member.id, jti: randomUUID() },
        env.refreshSecret(config),
        '7d',
      );

      await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${forged}`)
        .expect(401);
    });

    it('refuses a token signed with an unrelated secret', async () => {
      const member = seedMember();
      const forged = await sign({ sub: member.id }, 'a-secret-this-server-has-never-held', '15m');

      await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${forged}`)
        .expect(401);
    });

    it('refuses an expired token', async () => {
      const member = seedMember();
      const expired = await sign({ sub: member.id }, env.accessSecret(config), '-1s');

      await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expired}`)
        .expect(401);
    });

    it('refuses a token whose subject no longer exists', async () => {
      const stranger = await sign({ sub: randomUUID() }, env.accessSecret(config), '15m');

      await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${stranger}`)
        .expect(401);
    });

    it('refuses a token whose account was soft-deleted after it was issued', async () => {
      const member = seedMember();
      const { accessToken } = await signIn();

      member.deletedAt = new Date();

      await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });

    it('refuses a token whose account was disabled after it was issued', async () => {
      const member = seedMember();
      const { accessToken } = await signIn();

      member.isActive = false;

      await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });

    it('does not accept the refresh cookie in place of a bearer token', async () => {
      seedMember();
      const { refreshToken } = await signIn();

      await request(server)
        .get('/api/v1/auth/me')
        .set('Cookie', cookieHeader(refreshToken))
        .expect(401);
    });
  });

  // =========================================================================
  // REFRESH
  // =========================================================================

  describe('POST /api/v1/auth/refresh', () => {
    it('returns a new session and replaces the cookie', async () => {
      const member = seedMember();
      const { refreshToken } = await signIn();

      const response = await request(server)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieHeader(refreshToken))
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Session refreshed successfully',
      });
      expect(response.body.data).toMatchObject({
        tokenType: 'Bearer',
        expiresIn: ACCESS_TTL_SECONDS,
      });

      const rotated = refreshTokenOf(response);
      expect(rotated).not.toBe(refreshToken);

      // Deliberately not `expect(issued).not.toBe(accessToken)`. An access payload is `{ sub }` plus
      // the registered `iat` and `exp`, all of which are whole seconds, and HS256 is deterministic —
      // so a refresh that lands in the same second as the login before it returns a byte-identical
      // string. That is a correct, full-length token rather than a stale one, and asserting inequality
      // would be asserting the clock. The properties that actually matter hold either way: the token
      // is for the right subject, and it carries a complete window rather than the remains of the
      // previous one.
      const issued: string = response.body.data.accessToken;
      const claims = jwt.verify<{ sub: string; iat: number; exp: number }>(issued, {
        secret: env.accessSecret(config),
      });
      expect(claims.sub).toBe(member.id);
      expect(claims.exp - claims.iat).toBe(ACCESS_TTL_SECONDS);

      // The new access token works.
      await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${issued}`)
        .expect(200);
    });

    it('revokes the presented token and links the chain', async () => {
      seedMember();
      const { refreshToken } = await signIn();

      const response = await request(server)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieHeader(refreshToken))
        .expect(200);

      const spent = database.refreshTokens.find((row) => row.tokenHash === hashToken(refreshToken));
      const issued = database.refreshTokens.find(
        (row) => row.tokenHash === hashToken(refreshTokenOf(response)),
      );

      expect(spent?.revokedAt).toBeInstanceOf(Date);
      expect(spent?.replacedById).toBe(issued?.id);
      expect(issued?.revokedAt).toBeNull();
    });

    it('refuses the old cookie once it has been rotated', async () => {
      seedMember();
      const { refreshToken } = await signIn();

      await request(server)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieHeader(refreshToken))
        .expect(200);

      const replay = await request(server)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieHeader(refreshToken))
        .expect(401);

      expect(replay.body.code).toBe('UNAUTHENTICATED');
    });

    it('carries "remember me" through a rotation', async () => {
      seedMember();
      const { refreshToken } = await signIn({ remember: true });

      const response = await request(server)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieHeader(refreshToken))
        .expect(200);

      // The preference is signed into the token, so rotation cannot silently downgrade a persistent
      // cookie to a session one.
      expect(refreshCookieOf(response)).toContain('Max-Age=');
    });

    it('is not open to anonymous callers despite carrying @Public()', async () => {
      // `@Public()` steps the *access-token* guard aside so this route works with an expired bearer
      // token. `RefreshTokenGuard` deliberately does not honour it, so with no cookie there is no
      // credential and the answer is still 401.
      const response = await request(server).post('/api/v1/auth/refresh').expect(401);

      expect(response.body.code).toBe('UNAUTHENTICATED');
    });

    it('refuses a bearer token with no cookie', async () => {
      seedMember();
      const { accessToken } = await signIn();

      await request(server)
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });

    it('refuses an access token placed in the refresh cookie', async () => {
      seedMember();
      const { accessToken } = await signIn();

      await request(server)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieHeader(accessToken))
        .expect(401);
    });

    it('refuses a malformed cookie', async () => {
      seedMember();

      await request(server)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieHeader('not-a-jwt'))
        .expect(401);
    });

    it('refuses an expired refresh token', async () => {
      const member = seedMember();
      const expired = await sign(
        { sub: member.id, jti: randomUUID(), remember: false },
        env.refreshSecret(config),
        '-1s',
      );

      await request(server)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieHeader(expired))
        .expect(401);
    });

    it('refuses a signature-valid token whose stored row has expired', async () => {
      const member = seedMember();
      const { refreshToken } = await signIn();

      // The token itself is still within its seven days; the server's own record is not. The row is
      // what survives a change of configured lifetime, so it is checked in its own right.
      const stored = database.refreshTokens.find((row) => row.userId === member.id);
      expect(stored).toBeDefined();
      if (stored !== undefined) stored.expiresAt = new Date(Date.now() - 1_000);

      await request(server)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieHeader(refreshToken))
        .expect(401);
    });

    it('refuses a token with no row behind it', async () => {
      const member = seedMember();
      const orphan = await sign(
        { sub: member.id, jti: randomUUID(), remember: false },
        env.refreshSecret(config),
        '7d',
      );

      await request(server)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieHeader(orphan))
        .expect(401);
    });

    it('refuses a token whose account has since been disabled', async () => {
      const member = seedMember();
      const { refreshToken } = await signIn();

      member.isActive = false;

      await request(server)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieHeader(refreshToken))
        .expect(401);
    });

    it('hands a session to exactly one of two simultaneous uses of the same cookie', async () => {
      seedMember();
      const { refreshToken } = await signIn();

      const outcomes = await Promise.all([
        request(server).post('/api/v1/auth/refresh').set('Cookie', cookieHeader(refreshToken)),
        request(server).post('/api/v1/auth/refresh').set('Cookie', cookieHeader(refreshToken)),
      ]);

      const statuses = outcomes.map((response) => response.status).sort((a, b) => a - b);
      expect(statuses).toEqual([200, 401]);
    });
  });

  // =========================================================================
  // LOGOUT
  // =========================================================================

  describe('POST /api/v1/auth/logout', () => {
    it('revokes the session and clears the cookie', async () => {
      seedMember();
      const { accessToken, refreshToken } = await signIn();

      const response = await request(server)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', cookieHeader(refreshToken))
        .expect(200);

      expect(response.body).toEqual({ success: true, message: 'Signed out successfully' });

      const stored = database.refreshTokens.find(
        (row) => row.tokenHash === hashToken(refreshToken),
      );
      expect(stored?.revokedAt).toBeInstanceOf(Date);

      // Name, path and domain all have to match the cookie that was set, or the browser keeps its copy.
      const cleared = refreshCookieOf(response);
      expect(refreshTokenOf(response)).toBe('');
      expect(cleared).toContain(`Path=${REFRESH_COOKIE_PATH}`);
      expect(cleared).toContain('HttpOnly');
      expect(cleared).toContain('Expires=');
    });

    it('leaves the refresh token unusable afterwards', async () => {
      seedMember();
      const { accessToken, refreshToken } = await signIn();

      await request(server)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', cookieHeader(refreshToken))
        .expect(200);

      await request(server)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieHeader(refreshToken))
        .expect(401);
    });

    it('is safe to call twice', async () => {
      seedMember();
      const { accessToken, refreshToken } = await signIn();

      for (let call = 0; call < 2; call += 1) {
        const response = await request(server)
          .post('/api/v1/auth/logout')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Cookie', cookieHeader(refreshToken))
          .expect(200);

        expect(response.body.success).toBe(true);
      }

      expect(database.refreshTokens.filter((row) => row.revokedAt !== null)).toHaveLength(1);
    });

    it('succeeds with no cookie at all', async () => {
      seedMember();
      const { accessToken } = await signIn();

      await request(server)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('refuses an anonymous request', async () => {
      seedMember();
      const { refreshToken } = await signIn();

      // Authenticated by the access token, not by the cookie — so holding a cookie alone revokes
      // nothing, and the session stays live.
      await request(server)
        .post('/api/v1/auth/logout')
        .set('Cookie', cookieHeader(refreshToken))
        .expect(401);

      expect(database.refreshTokens.every((row) => row.revokedAt === null)).toBe(true);
    });

    it('revokes nothing when the cookie belongs to somebody else', async () => {
      seedMember();
      seedMember({ email: 'other@noor.example', phone: '+8801700000002' });

      const mine = await signIn();
      const theirs = await signIn({ email: 'other@noor.example' });

      await request(server)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${mine.accessToken}`)
        .set('Cookie', cookieHeader(theirs.refreshToken))
        .expect(200);

      const other = database.refreshTokens.find(
        (row) => row.tokenHash === hashToken(theirs.refreshToken),
      );
      expect(other?.revokedAt).toBeNull();

      // And their session still works.
      await request(server)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieHeader(theirs.refreshToken))
        .expect(200);
    });
  });

  // =========================================================================
  // The guards that are now global
  // =========================================================================

  describe('global guards', () => {
    it('keeps both health probes open to anonymous callers', async () => {
      await request(server).get('/health').expect(200);
      await request(server).get('/health/ready').expect(200, { status: 'ok', database: 'up' });
    });

    it('closes the users routes to anonymous callers', async () => {
      const response = await request(server).get('/api/v1/users').expect(401);

      expect(response.body.code).toBe('UNAUTHENTICATED');
    });

    it('opens them to any authenticated caller, since they declare no permission', async () => {
      seedMember();
      const { accessToken } = await signIn();

      await request(server)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('refuses a member the routes that declare a permission', async () => {
      const member = seedMember();
      const { accessToken } = await signIn();

      // `PermissionsGuard` is live and reads the row, not the token: a member holds no `role.assign`,
      // so the request never reaches the handler.
      const response = await request(server)
        .patch(`/api/v1/users/${member.id}/role`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ role: 'super_admin' })
        .expect(403);

      expect(response.body).toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'You do not have permission to do that.',
      });
      expect(member.role).toBe('member');
    });
  });
});
