import 'reflect-metadata';

import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger as NestLogger, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { env, type AppConfig } from './config/app.config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/**
 * Boots the HTTP application.
 *
 * Everything cross-cutting is applied here rather than per-controller, so a module added in a later
 * phase inherits validation, error handling, security headers and versioning without having to
 * remember to ask for them.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    // Nest's own startup logs are buffered until the pino logger is attached below, so nothing is
    // written in two different formats.
    bufferLogs: true,
  });

  // Two type arguments rather than an assertion: the first is the token's own shape, the second is
  // what this call returns. `AppConfig` carries the validated schema, which is what makes `env.*`
  // type-safe here.
  const config = app.get<ConfigService, AppConfig>(ConfigService);
  const logger = app.get(Logger);
  app.useLogger(logger);

  // ---- Security headers -----------------------------------------------------
  // This process serves JSON to a separate frontend origin, so the HTML-oriented policies are off:
  // there is no document to apply a CSP to, and COEP would only complicate Swagger.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // The refresh token lives in an HttpOnly cookie for web clients, so the cookie has to be parsed
  // before any route reads it.
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
      // which matters most on the finance and permission endpoints.
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

  // ---- API documentation ----------------------------------------------------
  if (env.swaggerEnabled(config)) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('NOOR Mosque Management API')
        .setDescription(
          'REST API for the NOOR mosque management system. All endpoints are versioned under ' +
            '/api/v1. Send the access token as `Authorization: Bearer <token>`; the refresh token ' +
            'is set as an HttpOnly cookie for web clients and returned in the body for mobile.',
        )
        .setVersion('1.0')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
        .build(),
    );

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customSiteTitle: 'NOOR API',
    });
  }

  // Lets the platform stop the container cleanly — Prisma's onModuleDestroy closes the pool.
  app.enableShutdownHooks();

  const port = env.port(config);
  await app.listen(port);

  const startup = new NestLogger('Bootstrap');
  startup.log(`NOOR API listening on http://localhost:${port}/api/v1 [${env.nodeEnv(config)}]`);
  if (env.swaggerEnabled(config)) {
    startup.log(`API documentation at http://localhost:${port}/api/docs`);
  }
}

void bootstrap();
