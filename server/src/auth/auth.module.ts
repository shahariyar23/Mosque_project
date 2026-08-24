import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * The authentication foundation: token verification, and nothing else.
 *
 * This module exists so `JwtAuthGuard` has a `jwt` strategy to resolve. It deliberately has no
 * controller — sign-in, refresh, sign-out and password reset are the next phase's, and adding a route
 * here now would mean shipping a credential path before the decisions behind it have been made.
 *
 * `PrismaService` injects into the strategy without importing `PrismaModule`: it is registered
 * `@Global()`.
 */
@Module({
  imports: [PassportModule],
  providers: [JwtStrategy],
})
export class AuthModule {}
