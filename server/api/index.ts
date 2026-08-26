import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Express, type Request, type Response } from 'express';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { env, type AppConfig } from '../src/config/app.config';

const server: Express = express();
let isReady = false;
let initPromise: Promise<void> | null = null;

async function createNestServer(expressInstance: Express): Promise<void> {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressInstance), {
    bufferLogs: true,
  });

  const config = app.get<ConfigService, AppConfig>(ConfigService);
  const logger = app.get(Logger);
  app.useLogger(logger);

  configureApp(app, config);

  if (env.swaggerEnabled(config)) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('NOOR Mosque Management API')
        .setDescription(
          'REST API for the NOOR mosque management system. All endpoints are versioned under /api/v1.',
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

  await app.init();
  isReady = true;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  if (!isReady) {
    if (!initPromise) {
      initPromise = createNestServer(server);
    }
    await initPromise;
  }
  server(req, res);
}
