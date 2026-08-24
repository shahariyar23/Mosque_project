import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';

/**
 * Authentication: who someone is, and how they prove it.
 *
 * Two Passport strategies, because there are two credentials with two different jobs. `jwt` verifies the
 * short-lived bearer token that every other endpoint expects, and is what the globally registered
 * `JwtAuthGuard` resolves. `jwt-refresh` verifies the long-lived cookie, against a different secret, and
 * is used by exactly one route. Separate secrets are what make the separation real rather than
 * conventional: an access token cannot be replayed at `/auth/refresh`, and a stolen refresh cookie cannot
 * be sent as a bearer token.
 *
 * `JwtModule.register({})` on purpose — no `secret`, no `signOptions`. A module-level default is a
 * footgun here: whichever of the two secrets it held would become the silent fallback for any `signAsync`
 * that forgot to name one, and a refresh token signed with the access secret is a refresh token an access
 * token can impersonate. Every call in `AuthService` passes its own secret and expiry, and an omission is
 * a runtime failure rather than a quiet downgrade.
 *
 * `UsersModule` is imported rather than reimplemented. Creating an account, reading a profile and mapping
 * a row to a response already exist there, correct and tested; a second copy in this module is how a
 * registration endpoint ends up able to set a role.
 *
 * `PrismaService` and `ConfigService` inject without being imported — both are registered globally.
 */
@Module({
  imports: [PassportModule, JwtModule.register({}), UsersModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RefreshTokenStrategy],
})
export class AuthModule {}
