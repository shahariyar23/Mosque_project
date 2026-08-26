import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger as NestLogger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { env, type AppConfig } from './config/app.config';

/**
 * Boots the HTTP application.
 *
 * Everything cross-cutting is applied by `configureApp`, in `bootstrap.ts`, rather than per-controller,
 * so a module added in a later phase inherits validation, error handling, security headers and
 * versioning without having to remember to ask for them — and so the tests can apply the same
 * configuration to the application they build.
 *
 * What stays here is what only a process needs: the logger, the documentation site, and `listen()`.
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

  // ---- Cross-cutting configuration ------------------------------------------
  // Security headers, cookie parsing, CORS, routing, validation and error handling. Shared with the
  // tests so that what they assert against is what this process serves.
  configureApp(app, config);

  // ---- API documentation ----------------------------------------------------
  if (env.swaggerEnabled(config)) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('NOOR Mosque Management API')
        .setDescription(
          'REST API for the NOOR mosque management system. All endpoints are versioned under ' +
          '/api/v1. Send the access token as `Authorization: Bearer <token>`; the refresh token is ' +
          'set as an HttpOnly cookie scoped to /api/v1/auth and is never returned in a response ' +
          'body. `POST /auth/refresh` reads that cookie, rotates it, and returns a new access token.',
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
  await app.listen(port, '0.0.0.0');

  const startup = new NestLogger('Bootstrap');
  startup.log(`NOOR API listening on http://localhost:${port}/api/v1 [${env.nodeEnv(config)}]`);
  if (env.swaggerEnabled(config)) {
    startup.log(`API documentation at http://localhost:${port}/api/docs`);
  }
}

void bootstrap();
