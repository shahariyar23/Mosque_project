import { BadRequestException, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';

import type { AuthenticatedUser } from '../common/types/authenticated-user';
import type { AppConfig } from '../config/app.config';
import { PrismaService } from '../prisma/prisma.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { USER_SELECT, type SelectedUser } from '../users/types/user.types';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';

/**
 * Tests for the auth service.
 *
 * Argon2 is stubbed, as it is in the users specs: the real function costs roughly a tenth of a second
 * per call and its correctness is argon2's to test. What is asserted is which algorithm is asked for,
 * and — the part that would be a real defect — that a verification is *attempted even when there is no
 * account*, because that is the whole of the timing defence.
 *
 * Prisma, `JwtService` and `UsersService` are mocked, so these tests are about decisions rather than
 * storage: which columns a sign-in reads, what a refresh writes, which of two racing refreshes wins, and
 * what every one of the six ways to fail a sign-in reports back. Nothing here mocks a guard — the guards
 * are exercised over HTTP in `auth.integration.spec.ts`, against the real application.
 *
 * The tokens are real JWTs, signed by a real `JwtService` in `signAsync`, because two of the assertions
 * below are about the signature itself: that the refresh token is not signed with the access secret, and
 * that `remember` survives a rotation by being *in* the token rather than beside it.
 */
jest.mock('argon2', () => ({
  argon2id: 2,
  hash: jest.fn(() => Promise.resolve('$argon2id$v=19$m=65536,t=3,p=4$c3R1Yg$c3R1Yg')),
  verify: jest.fn(() => Promise.resolve(true)),
}));

const HASHED = '$argon2id$v=19$m=65536,t=3,p=4$c3R1Yg$c3R1Yg';
const PLAINTEXT = 'Str0ngPassphrase!';
const MOSQUE_ID = '3f1a7c2e-9b4d-4f6a-8c11-2d5e7a9b0c31';
const USER_ID = '9c8b7a65-4321-4f6a-8c11-2d5e7a9b0c31';
const OTHER_ID = '5e4d3c2b-1a09-4f6a-8c11-2d5e7a9b0c31';
const TOKEN_ROW_ID = '11111111-2222-4333-8444-555555555555';

const ACCESS_SECRET = 'test-access-secret-at-least-32-characters-long';
const REFRESH_SECRET = 'test-refresh-secret-at-least-32-characters-long';

const hashMock = argon2.hash as unknown as jest.Mock;
const verifyMock = argon2.verify as unknown as jest.Mock;

type MockedDelegate<K extends string> = Record<K, jest.Mock>;

interface PrismaMock {
  user: MockedDelegate<'findMany' | 'findFirst' | 'update' | 'updateMany'>;
  mosque: MockedDelegate<'findUnique' | 'findMany'>;
  refreshToken: MockedDelegate<'findUnique' | 'create' | 'updateMany'>;
  $transaction: jest.Mock;
}

const CREATED_AT = new Date('2026-01-15T10:00:00.000Z');

/** A row shaped exactly as `USER_SELECT` returns one. */
function userRow(over: Partial<SelectedUser> = {}): SelectedUser {
  return {
    id: USER_ID,
    mosqueId: MOSQUE_ID,
    fullName: 'Abdul Karim',
    email: 'karim@noor.example',
    phone: '+8801700000002',
    role: Role.member,
    positions: [],
    permissions: [],
    deniedPermissions: [],
    isActive: true,
    dateOfBirth: null,
    gender: null,
    city: 'Dhaka',
    avatarUrl: null,
    newsletter: false,
    emailVerifiedAt: null,
    lastLoginAt: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...over,
  };
}

/** A row shaped as `CREDENTIAL_SELECT` returns one — the only select in the project reading the hash. */
function credentialRow(over: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: USER_ID,
    mosqueId: MOSQUE_ID,
    email: 'karim@noor.example',
    isActive: true,
    passwordHash: HASHED,
    ...over,
  };
}

function registerDto(over: Partial<RegisterDto> = {}): RegisterDto {
  return {
    fullName: 'Abdul Karim',
    email: 'karim@noor.example',
    phone: '+8801700000002',
    password: PLAINTEXT,
    ...over,
  };
}

function loginDto(over: Partial<LoginDto> = {}): LoginDto {
  return { email: 'karim@noor.example', password: PLAINTEXT, ...over };
}

function forgotPasswordDto(over: Partial<ForgotPasswordDto> = {}): ForgotPasswordDto {
  return { email: 'karim@noor.example', ...over };
}

function resetPasswordDto(over: Partial<ResetPasswordDto> = {}): ResetPasswordDto {
  return { token: 'a-reset-token-that-is-never-stored-raw', newPassword: PLAINTEXT, ...over };
}

/** The caller as `JwtStrategy` builds one: resolved from the row, never from a request body. */
function subject(over: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: USER_ID,
    mosqueId: MOSQUE_ID,
    email: 'karim@noor.example',
    role: Role.member,
    permissions: [],
    deniedPermissions: [],
    isActive: true,
    ...over,
  };
}

function argsOf(mock: jest.Mock): Record<string, unknown> {
  expect(mock).toHaveBeenCalled();
  return mock.mock.calls[mock.mock.calls.length - 1][0] as Record<string, unknown>;
}

function dataOf(mock: jest.Mock): Record<string, unknown> {
  return argsOf(mock).data as Record<string, unknown>;
}

function whereOf(mock: jest.Mock): Record<string, unknown> {
  return argsOf(mock).where as Record<string, unknown>;
}

/** What the service stores: the SHA-256 of the token, hex, never the token. */
function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

const ORIGIN = { userAgent: 'jest', ipAddress: '127.0.0.1' };

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaMock;
  let users: MockedDelegate<'create' | 'findOne'>;
  let jwt: JwtService;
  let logged: jest.SpyInstance;
  let warned: jest.SpyInstance;

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([credentialRow()]),
        findFirst: jest.fn().mockResolvedValue({ id: USER_ID }),
        update: jest.fn().mockResolvedValue(userRow()),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      mosque: {
        findUnique: jest.fn().mockResolvedValue({ id: MOSQUE_ID, isActive: true }),
        findMany: jest.fn().mockResolvedValue([{ id: MOSQUE_ID }]),
      },
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn(
        (
          work: ((client: unknown) => Promise<unknown>) | Promise<unknown>[],
        ): Promise<unknown> | Promise<unknown[]> =>
          typeof work === 'function' ? work(prisma) : Promise.all(work),
      ),
    };

    users = {
      create: jest.fn().mockResolvedValue(UserResponseDto.from(userRow())),
      findOne: jest.fn().mockResolvedValue(UserResponseDto.from(userRow())),
    };

    hashMock.mockClear();
    verifyMock.mockClear();
    verifyMock.mockResolvedValue(true);

    // The service logs a user id on sign-in, sign-out and refusal. Silenced so the run stays readable,
    // and asserted where the log line is the behaviour being tested.
    logged = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warned = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsersService, useValue: users },
        JwtService,
        {
          // Only the keys the auth paths read. A miss returns undefined, which would fail loudly at
          // sign time rather than silently signing with the wrong secret.
          provide: ConfigService,
          useValue: {
            get: (key: string): unknown =>
              ({
                NODE_ENV: 'test',
                JWT_ACCESS_SECRET: ACCESS_SECRET,
                JWT_ACCESS_EXPIRES_IN: '15m',
                JWT_REFRESH_SECRET: REFRESH_SECRET,
                JWT_REFRESH_EXPIRES_IN: '7d',
                CORS_ORIGINS: 'http://localhost:3000',
              })[key],
          },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    jwt = moduleRef.get(JwtService);
  });

  afterEach(() => {
    logged.mockRestore();
    warned.mockRestore();
  });

  // ---------------------------------------------------------------------------
  // Register
  // ---------------------------------------------------------------------------

  describe('register', () => {
    it('creates the account through the users service and returns a sanitised profile', async () => {
      const result = await service.register(registerDto());

      expect(users.create).toHaveBeenCalledTimes(1);
      expect(result.id).toBe(USER_ID);
      expect(result.effectivePermissions).toEqual(expect.any(Array));
    });

    it('never returns the password or a hash', async () => {
      const result = await service.register(registerDto());

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('password');
      expect(JSON.stringify(result)).not.toContain(PLAINTEXT);
      expect(JSON.stringify(result)).not.toContain(HASHED);
    });

    it('passes no role, permissions or status, so the row lands on the schema defaults', async () => {
      await service.register(registerDto());

      // The registration path cannot mint an administrator even if a caller found a way past the DTO:
      // these keys are not written at all.
      const created = argsOf(users.create);
      expect(created).not.toHaveProperty('role');
      expect(created).not.toHaveProperty('permissions');
      expect(created).not.toHaveProperty('deniedPermissions');
      expect(created).not.toHaveProperty('positions');
      expect(created).not.toHaveProperty('status');
      expect(created).not.toHaveProperty('isActive');
    });

    it('starts no session — registering is not signing in', async () => {
      await service.register(registerDto());

      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('resolves the named mosque, and refuses one that is missing or closed', async () => {
      await service.register(registerDto({ mosqueSlug: 'noor-jame-masjid' }));
      expect(whereOf(prisma.mosque.findUnique)).toEqual({ slug: 'noor-jame-masjid' });
      expect(argsOf(users.create).mosqueId).toBe(MOSQUE_ID);

      prisma.mosque.findUnique.mockResolvedValue(null);
      await expect(service.register(registerDto({ mosqueSlug: 'nope' }))).rejects.toMatchObject({
        response: { code: 'MOSQUE_NOT_FOUND' },
      });

      // Closed reads the same as missing: a sign-up form learns nothing about which mosques exist.
      prisma.mosque.findUnique.mockResolvedValue({ id: MOSQUE_ID, isActive: false });
      await expect(service.register(registerDto({ mosqueSlug: 'closed' }))).rejects.toMatchObject({
        response: { code: 'MOSQUE_NOT_FOUND' },
      });
    });

    it('asks which mosque only when the deployment really serves more than one', async () => {
      prisma.mosque.findMany.mockResolvedValue([{ id: MOSQUE_ID }, { id: OTHER_ID }]);

      await expect(service.register(registerDto())).rejects.toMatchObject({
        response: { code: 'MOSQUE_REQUIRED' },
      });
    });

    it('propagates the duplicate-contact conflict the users service raises', async () => {
      // The 409 for a duplicate email or phone is the users service's, reused rather than reimplemented;
      // what this asserts is that the auth path does not swallow or reshape it.
      users.create.mockRejectedValue(
        Object.assign(new Error('taken'), { response: { code: 'EMAIL_TAKEN' } }),
      );

      await expect(service.register(registerDto())).rejects.toMatchObject({
        response: { code: 'EMAIL_TAKEN' },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------------

  describe('login', () => {
    it('returns an access token, its lifetime and a sanitised profile', async () => {
      const { session } = await service.login(loginDto(), ORIGIN);

      expect(session.tokenType).toBe('Bearer');
      expect(session.expiresIn).toBe(900);
      expect(session.user.id).toBe(USER_ID);
      expect(jwt.decode(session.accessToken)).toMatchObject({ sub: USER_ID });
    });

    it('signs the access token with the access secret and nothing but a subject', async () => {
      const { session } = await service.login(loginDto(), ORIGIN);

      const claims = jwt.verify<Record<string, unknown>>(session.accessToken, {
        secret: ACCESS_SECRET,
      });

      // No role and no permissions in the payload: authority is resolved from the row on every request,
      // so a token cannot carry a stale grant past the decision to revoke it.
      expect(Object.keys(claims).sort()).toEqual(['exp', 'iat', 'sub']);
      expect(claims.sub).toBe(USER_ID);
    });

    it('issues a refresh token, and stores only its hash', async () => {
      const { refresh } = await service.login(loginDto(), ORIGIN);

      const data = dataOf(prisma.refreshToken.create);
      expect(data.tokenHash).toBe(sha256(refresh.token));
      expect(data.tokenHash).toHaveLength(64);
      // The row must carry no copy of the token in any column.
      expect(JSON.stringify(data)).not.toContain(refresh.token);
      expect(data.userId).toBe(USER_ID);
      expect(data.userAgent).toBe('jest');
      expect(data.ipAddress).toBe('127.0.0.1');
      expect(data).not.toHaveProperty('replacedById');
    });

    it('signs the refresh token with its own secret, so an access token cannot impersonate one', async () => {
      const { refresh } = await service.login(loginDto(), ORIGIN);

      expect(() => {
        jwt.verify(refresh.token, { secret: REFRESH_SECRET });
      }).not.toThrow();
      expect(() => {
        jwt.verify(refresh.token, { secret: ACCESS_SECRET });
      }).toThrow();
    });

    it('never returns the refresh token in the session body', async () => {
      const { session, refresh } = await service.login(loginDto(), ORIGIN);

      // The only way out is the cookie the controller writes from `refresh`.
      expect(JSON.stringify(session)).not.toContain(refresh.token);
      expect(session).not.toHaveProperty('refreshToken');
    });

    it('never returns the password hash', async () => {
      const { session } = await service.login(loginDto(), ORIGIN);

      expect(JSON.stringify(session)).not.toContain(HASHED);
      expect(JSON.stringify(session)).not.toContain(PLAINTEXT);
      expect(session.user).not.toHaveProperty('passwordHash');
    });

    it('reads the credential row by email, excluding soft-deleted accounts', async () => {
      await service.login(loginDto(), ORIGIN);

      expect(whereOf(prisma.user.findMany)).toMatchObject({
        deletedAt: null,
        email: loginDto().email,
      });
    });

    it('accepts a phone number as the identifier', async () => {
      await service.login(loginDto({ email: undefined, phone: '+8801700000002' }), ORIGIN);

      expect(whereOf(prisma.user.findMany)).toMatchObject({ phone: '+8801700000002' });
    });

    it('refuses a body naming both identifiers, or neither', async () => {
      await expect(
        service.login(loginDto({ phone: '+8801700000002' }), ORIGIN),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(service.login(loginDto({ email: undefined }), ORIGIN)).rejects.toMatchObject({
        response: { code: 'IDENTIFIER_REQUIRED' },
      });
    });

    it('refuses a wrong password with the generic refusal', async () => {
      verifyMock.mockResolvedValue(false);

      await expect(service.login(loginDto({ password: 'wrong' }), ORIGIN)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      await expect(service.login(loginDto({ password: 'wrong' }), ORIGIN)).rejects.toMatchObject({
        response: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' },
      });

      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('refuses an unknown identifier with the same refusal, having spent the same work', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await expect(service.login(loginDto(), ORIGIN)).rejects.toMatchObject({
        response: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' },
      });

      // The point of the branch: argon2 runs even though there is nothing to compare against, so the
      // response time does not answer the question the body refuses to.
      expect(hashMock).toHaveBeenCalledWith(PLAINTEXT, { type: argon2.argon2id });
    });

    it('refuses a suspended account without saying so, and without verifying the password', async () => {
      prisma.user.findMany.mockResolvedValue([credentialRow({ isActive: false })]);

      await expect(service.login(loginDto(), ORIGIN)).rejects.toMatchObject({
        response: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' },
      });

      expect(verifyMock).not.toHaveBeenCalled();
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('asks which mosque when one address exists at two of them', async () => {
      prisma.user.findMany.mockResolvedValue([credentialRow(), credentialRow({ id: OTHER_ID })]);

      await expect(service.login(loginDto(), ORIGIN)).rejects.toMatchObject({
        response: { code: 'MOSQUE_REQUIRED' },
      });
    });

    it('narrows by mosque slug through the relation when one is sent', async () => {
      await service.login(loginDto({ mosqueSlug: 'noor-jame-masjid' }), ORIGIN);

      expect(whereOf(prisma.user.findMany)).toMatchObject({
        mosque: { slug: 'noor-jame-masjid' },
      });
    });

    it('stamps lastLoginAt, reading back through the users select', async () => {
      await service.login(loginDto(), ORIGIN);

      expect(dataOf(prisma.user.update).lastLoginAt).toBeInstanceOf(Date);
      expect(argsOf(prisma.user.update).select).toBe(USER_SELECT);
    });

    it('logs the user id on success and on failure, and never a password or a token', async () => {
      const { session, refresh } = await service.login(loginDto(), ORIGIN);

      const written = [...logged.mock.calls, ...warned.mock.calls].flat().join('\n');
      expect(written).toContain(USER_ID);
      expect(written).not.toContain(PLAINTEXT);
      expect(written).not.toContain(HASHED);
      expect(written).not.toContain(session.accessToken);
      expect(written).not.toContain(refresh.token);
      expect(written).not.toContain('karim@noor.example');
    });

    it('logs a failed sign-in by id, not by the address that was tried', async () => {
      verifyMock.mockResolvedValue(false);

      await expect(service.login(loginDto(), ORIGIN)).rejects.toThrow();

      const written = warned.mock.calls.flat().join('\n');
      expect(written).toContain(USER_ID);
      expect(written).not.toContain('karim@noor.example');
      expect(written).not.toContain(PLAINTEXT);
    });

    it('makes the cookie persistent only when the caller asked to be remembered', async () => {
      const plain = await service.login(loginDto(), ORIGIN);
      expect(plain.refresh.remember).toBe(false);

      const sticky = await service.login(loginDto({ remember: true }), ORIGIN);
      expect(sticky.refresh.remember).toBe(true);
      // Signed in, not stored beside the row, so a client cannot lengthen its own session by editing
      // a cookie — and so the flag survives the rotations to come.
      expect(jwt.decode(sticky.refresh.token)).toMatchObject({ remember: true });
    });

    it('gives two tokens signed in the same moment different values', async () => {
      const first = await service.login(loginDto(), ORIGIN);
      const second = await service.login(loginDto(), ORIGIN);

      // `jti` is what stops the unique index on `tokenHash` from rejecting the second sign-in.
      expect(second.refresh.token).not.toBe(first.refresh.token);
    });
  });

  // ---------------------------------------------------------------------------
  // Password recovery
  // ---------------------------------------------------------------------------

  describe('forgotPassword', () => {
    it('stores only a short-lived hash for an existing account', async () => {
      await expect(service.forgotPassword(forgotPasswordDto())).resolves.toBeUndefined();

      expect(whereOf(prisma.user.findMany)).toMatchObject({
        deletedAt: null,
        isActive: true,
        email: 'karim@noor.example',
      });
      const data = dataOf(prisma.user.update);
      expect(data.passwordResetTokenHash).toEqual(expect.any(String));
      expect(data.passwordResetTokenHash).toHaveLength(64);
      expect(data.passwordResetExpiresAt).toBeInstanceOf(Date);
      expect(JSON.stringify(data)).not.toContain('a-reset-token-that-is-never-stored-raw');
    });

    it('returns the same service result for an unknown account without writing a token', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await expect(service.forgotPassword(forgotPasswordDto())).resolves.toBeUndefined();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('does not return a reset token', async () => {
      const result = await service.forgotPassword(forgotPasswordDto());

      expect(result).toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('hashes a replacement password, consumes the token and revokes refresh sessions', async () => {
      const dto = resetPasswordDto();

      await expect(service.resetPassword(dto)).resolves.toBeUndefined();

      expect(hashMock).toHaveBeenCalledWith(dto.newPassword, { type: argon2.argon2id });
      expect(whereOf(prisma.user.findFirst)).toMatchObject({
        passwordResetTokenHash: sha256(dto.token),
        passwordResetExpiresAt: { gt: expect.any(Date) },
      });
      expect(dataOf(prisma.user.updateMany)).toEqual({
        passwordHash: HASHED,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: USER_ID, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('rejects an invalid token without changing credentials or sessions', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.resetPassword(resetPasswordDto())).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.user.updateMany).not.toHaveBeenCalled();
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('rejects an expired token with the same generic refusal', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.resetPassword(resetPasswordDto())).rejects.toMatchObject({
        response: { code: 'INVALID_RESET_TOKEN' },
      });
      expect(whereOf(prisma.user.findFirst).passwordResetExpiresAt).toEqual({
        gt: expect.any(Date),
      });
    });

    it('rejects a token that was already used', async () => {
      prisma.user.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.resetPassword(resetPasswordDto())).rejects.toMatchObject({
        response: { code: 'INVALID_RESET_TOKEN' },
      });
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Refresh
  // ---------------------------------------------------------------------------

  describe('refresh', () => {
    /** A live row for a token, as `findUnique` would return one. */
    function storedFor(over: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
      return {
        id: TOKEN_ROW_ID,
        userId: USER_ID,
        expiresAt: new Date(Date.now() + 86_400_000),
        revokedAt: null,
        ...over,
      };
    }

    /** A real refresh token for `USER_ID`, as `login` would have issued it. */
    async function issued(remember = false): Promise<string> {
      const { refresh } = await service.login(loginDto({ remember }), ORIGIN);
      prisma.refreshToken.create.mockClear();
      prisma.refreshToken.updateMany.mockClear();
      return refresh.token;
    }

    it('returns a new access token and a new refresh token', async () => {
      const presented = await issued();
      prisma.refreshToken.findUnique.mockResolvedValue(storedFor());

      const { session, refresh } = await service.refresh(subject(), presented, ORIGIN);

      expect(session.tokenType).toBe('Bearer');
      expect(jwt.decode(session.accessToken)).toMatchObject({ sub: USER_ID });
      expect(refresh.token).not.toBe(presented);
    });

    it('looks the token up by its hash, never by its value', async () => {
      const presented = await issued();
      prisma.refreshToken.findUnique.mockResolvedValue(storedFor());

      await service.refresh(subject(), presented, ORIGIN);

      expect(whereOf(prisma.refreshToken.findUnique)).toEqual({ tokenHash: sha256(presented) });
    });

    it('revokes the presented token and points it at its replacement, in one transaction', async () => {
      const presented = await issued();
      prisma.refreshToken.findUnique.mockResolvedValue(storedFor());

      const { refresh } = await service.refresh(subject(), presented, ORIGIN);

      // Revoked...
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: TOKEN_ROW_ID, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });

      // ...and the chain recorded, so a later reuse can be traced to the session it came from.
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.refreshToken.updateMany).toHaveBeenLastCalledWith({
        where: { id: TOKEN_ROW_ID },
        data: { replacedById: refresh.id },
      });
      expect(dataOf(prisma.refreshToken.create).tokenHash).toBe(sha256(refresh.token));
    });

    it('refuses a token whose row has already been revoked, and records the reuse', async () => {
      const presented = await issued();
      prisma.refreshToken.findUnique.mockResolvedValue(storedFor({ revokedAt: new Date() }));

      await expect(service.refresh(subject(), presented, ORIGIN)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      const written = warned.mock.calls.flat().join('\n');
      expect(written).toContain(USER_ID);
      expect(written).not.toContain(presented);

      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('refuses the token it just rotated — one use each', async () => {
      const presented = await issued();
      prisma.refreshToken.findUnique.mockResolvedValue(storedFor());

      await service.refresh(subject(), presented, ORIGIN);

      // The same cookie, arriving a second time: the row is now revoked.
      prisma.refreshToken.findUnique.mockResolvedValue(storedFor({ revokedAt: new Date() }));

      await expect(service.refresh(subject(), presented, ORIGIN)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('refuses a token whose stored row has expired, whatever its signature says', async () => {
      const presented = await issued();
      prisma.refreshToken.findUnique.mockResolvedValue(
        storedFor({ expiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(service.refresh(subject(), presented, ORIGIN)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('refuses a signature with no row behind it', async () => {
      const presented = await issued();
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh(subject(), presented, ORIGIN)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('refuses a token that belongs to somebody else', async () => {
      const presented = await issued();
      prisma.refreshToken.findUnique.mockResolvedValue(storedFor({ userId: OTHER_ID }));

      await expect(service.refresh(subject(), presented, ORIGIN)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('lets exactly one of two racing refreshes through', async () => {
      const presented = await issued();
      prisma.refreshToken.findUnique.mockResolvedValue(storedFor());
      // Both requests read a live row; the conditional update is what arbitrates, and the loser sees
      // a count of zero because the winner already moved `revokedAt`.
      prisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 0 });

      const results = await Promise.allSettled([
        service.refresh(subject(), presented, ORIGIN),
        service.refresh(subject(), presented, ORIGIN),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    });

    it('carries "keep me signed in" through the rotation', async () => {
      const presented = await issued(true);
      prisma.refreshToken.findUnique.mockResolvedValue(storedFor());

      const { refresh } = await service.refresh(subject(), presented, ORIGIN);

      // Without this the cookie would silently become a session cookie on the first rotation, and a
      // remembered sign-in would end when the browser closed.
      expect(refresh.remember).toBe(true);
      expect(jwt.decode(refresh.token)).toMatchObject({ remember: true });
    });

    it('does not invent "keep me signed in" for a session that did not ask for it', async () => {
      const presented = await issued(false);
      prisma.refreshToken.findUnique.mockResolvedValue(storedFor());

      const { refresh } = await service.refresh(subject(), presented, ORIGIN);

      expect(refresh.remember).toBe(false);
    });

    it('reads the profile fresh, so a role changed mid-session takes effect on refresh', async () => {
      const presented = await issued();
      prisma.refreshToken.findUnique.mockResolvedValue(storedFor());
      users.findOne.mockResolvedValue(
        UserResponseDto.from(userRow({ role: Role.mosque_admin, isActive: true })),
      );

      const { session } = await service.refresh(subject(), presented, ORIGIN);

      expect(users.findOne).toHaveBeenCalledWith(USER_ID);
      expect(session.user.role).toBe(Role.mosque_admin);
      // ...and the new authority is reflected in what the client is told it may do.
      expect(session.user.effectivePermissions.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  describe('logout', () => {
    it('revokes the presented session, scoped to the person presenting it', async () => {
      const { refresh } = await service.login(loginDto(), ORIGIN);
      prisma.refreshToken.updateMany.mockClear();

      await service.logout(subject(), refresh.token);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: USER_ID, tokenHash: sha256(refresh.token), revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('is safe to call twice', async () => {
      const { refresh } = await service.login(loginDto(), ORIGIN);

      prisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 1 });
      await expect(service.logout(subject(), refresh.token)).resolves.toBeUndefined();

      // Nothing left to revoke the second time, which is not an error.
      prisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(service.logout(subject(), refresh.token)).resolves.toBeUndefined();
    });

    it('succeeds when no cookie was sent at all', async () => {
      await expect(service.logout(subject(), null)).resolves.toBeUndefined();

      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('revokes nothing when the cookie belongs to another account', async () => {
      const { refresh } = await service.login(loginDto(), ORIGIN);
      prisma.refreshToken.updateMany.mockClear();
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      await service.logout(subject({ id: OTHER_ID }), refresh.token);

      expect(whereOf(prisma.refreshToken.updateMany).userId).toBe(OTHER_ID);
    });

    it('never logs the token it revoked', async () => {
      const { refresh } = await service.login(loginDto(), ORIGIN);
      logged.mockClear();

      await service.logout(subject(), refresh.token);

      const written = logged.mock.calls.flat().join('\n');
      expect(written).toContain(USER_ID);
      expect(written).not.toContain(refresh.token);
    });
  });

  // ---------------------------------------------------------------------------
  // Me
  // ---------------------------------------------------------------------------

  describe('me', () => {
    it('returns the profile with resolved permissions, read fresh from the row', async () => {
      const profile = await service.me(subject());

      expect(users.findOne).toHaveBeenCalledWith(USER_ID);
      expect(profile.id).toBe(USER_ID);
      expect(profile.effectivePermissions).toEqual(expect.any(Array));
    });

    it('resolves authority from the database, not from the token subject', async () => {
      users.findOne.mockResolvedValue(UserResponseDto.from(userRow({ role: Role.mosque_admin })));

      // The caller claims to be a plain member; the row says otherwise, and the row wins.
      const profile = await service.me(subject({ role: Role.member }));

      expect(profile.role).toBe(Role.mosque_admin);
    });

    it('reports no permissions for a suspended account', async () => {
      users.findOne.mockResolvedValue(UserResponseDto.from(userRow({ isActive: false })));

      const profile = await service.me(subject());

      expect(profile.effectivePermissions).toEqual([]);
    });

    it('hides every credential field', async () => {
      const profile = await service.me(subject());

      expect(profile).not.toHaveProperty('passwordHash');
      expect(profile).not.toHaveProperty('password');
      expect(profile).not.toHaveProperty('refreshTokenHash');
      expect(profile).not.toHaveProperty('deletedAt');
      expect(JSON.stringify(profile)).not.toContain(HASHED);
      expect(JSON.stringify(profile)).not.toContain(ACCESS_SECRET);
      expect(JSON.stringify(profile)).not.toContain(REFRESH_SECRET);
    });
  });
});

describe('AuthController password recovery responses', () => {
  it('returns the same token-free response for existing and missing accounts', async () => {
    const auth = {
      forgotPassword: jest.fn().mockResolvedValue(undefined),
      resetPassword: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuthService;
    const controller = new AuthController(auth, {} as AppConfig);

    const existing = await controller.forgotPassword({ email: 'karim@noor.example' });
    const missing = await controller.forgotPassword({ email: 'missing@noor.example' });

    expect(existing).toEqual(missing);
    expect(existing).toEqual({
      success: true,
      message: 'If the account exists, a password reset link has been sent.',
    });
    expect(existing).not.toHaveProperty('data');
  });
});
