import { ValidationPipe, VersioningType, type INestApplication } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { env, type AppConfig } from './config/app.config';

/**
 * Everything cross-cutting, applied to an application instance.
 *
 * Extracted from `bootstrap()` so that the integration tests can build the same application the process
 * serves. That matters more than it looks: the security behaviour of these endpoints is largely *this*
 * function's — the validation pipe is what rejects a body carrying `role`, the cookie parser is what
 * makes the refresh token readable at all, and the exception filter is what stops a Prisma message
 * reaching a client. A test that re-declared its own pipe would be asserting against its own copy, and
 * would keep passing after a change here silently loosened the real one.
 *
 * Swagger and `listen()` stay in `main.ts`: one is documentation and the other is a running process, and
 * neither is something a test should have to opt out of.
 */
export function configureApp(app: INestApplication, config: AppConfig): void {
  // ---- Security headers -----------------------------------------------------
  // This process serves JSON to a separate frontend origin, so the HTML-oriented policies are off:
  // there is no document to apply a CSP to, and COEP would only complicate Swagger.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // The refresh token lives in an HttpOnly cookie, so the cookie has to be parsed before any route
  // reads it. Without this, `POST /auth/refresh` has no credential to find.
  app.use(cookieParser());

  // ---- CORS -----------------------------------------------------------------
  // An explicit origin list, never '*': credentials are required for the refresh cookie, and the
  // two cannot be combined. `CORS_ORIGINS` is validated at boot and rejects '*' in production.
  app.enableCors({
    origin: env.corsOrigins(config),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-request-id'],
    exposedHeaders: ['x-request-id'],
    maxAge: 86_400,
  });

  // ---- Routing --------------------------------------------------------------
  // Every route lives under /api/v1/... — the prefix plus URI versioning. The health probes opt out
  // of the version segment so a load balancer has a stable, unversioned URL.
  app.setGlobalPrefix('api', { exclude: ['health', 'health/ready'] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1', prefix: 'v' });

  // ---- Validation -----------------------------------------------------------
  app.useGlobalPipes(
    new ValidationPipe({
      // Strips properties with no decorator, then rejects the request if any were sent. Together
      // these stop a caller from smuggling a field a DTO never declared — the mass-assignment case,
      // which is what keeps `"role": "super_admin"` out of a registration body.
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      // Query and path parameters arrive as strings; DTOs opt into coercion with @Type.
      validateCustomDecorators: true,
    }),
  );

  // ---- Errors ---------------------------------------------------------------
  // One filter for everything, so no handler can leak a stack trace by omission.
  app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));
}
