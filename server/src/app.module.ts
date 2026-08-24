import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';

import { env, type AppConfig } from './config/app.config';
import { validateEnvironment } from './config/env.validation';
import { buildLoggerOptions } from './config/logger.config';
import { AuthModule } from './auth/auth.module';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { HealthModule } from './health/health.module';
import { PermissionsModule } from './permissions/permissions.module';
import { PrismaModule } from './prisma/prisma.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';

/**
 * The composition root.
 *
 * A modular monolith: one deployable, with each domain a Nest module that owns its controllers,
 * services and DTOs. Feature modules are registered here as the phases land.
 *
 * The rate-limit guard is bound globally rather than per-controller so an endpoint added later is
 * protected by default; auth-specific routes tighten it further with their own `@Throttle`.
 *
 * The two authorization guards are global for the same reason, and both pass through when a handler
 * carries no `@Roles()` or `@Permissions()` metadata — a route asks for authority by declaring it, and
 * a route that declares none is refused nothing. What they will not do is *assume* authority: with no
 * `request.user`, a route that declares a permission answers 401 rather than running.
 *
 * `JwtAuthGuard` is deliberately not registered here yet. Registering it would close every route,
 * including the Part 1 user endpoints, and nothing can issue a token until sign-in exists — the
 * alternative, a stub that fabricates a user, is exactly the kind of shortcut that survives into
 * production. It goes in this array *before* the two below when the auth endpoints land, because Nest
 * runs global guards in registration order and the authorization guards need `request.user` populated.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Validated before any provider is constructed, so a bad secret is a startup failure.
      validate: validateEnvironment,
      envFilePath: ['.env'],
    }),

    LoggerModule.forRootAsync({
      // `inject` names the token that supplies the instance; the parameter type is only a
      // compile-time view over `get()`. Declaring `AppConfig` here is what lets `env.*` infer a real
      // type from the validated schema — the generic cannot be attached to the token itself, and
      // asserting one ConfigService shape onto the other is not a conversion TypeScript will accept.
      inject: [ConfigService],
      useFactory: (config: AppConfig) => buildLoggerOptions(config),
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: AppConfig) => ({
        // The window is configured in seconds because that is how an operator thinks about it;
        // Nest wants milliseconds.
        throttlers: [{ ttl: env.throttleTtl(config) * 1000, limit: env.throttleLimit(config) }],
      }),
    }),

    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
