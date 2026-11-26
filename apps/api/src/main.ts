import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { AppLogger } from './common/logging/app-logger.js';
import { ENV } from './config/env.js';

import type { Env } from './config/env.js';
import type { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const env = app.get<Env>(ENV);
  app.useLogger(new AppLogger({ json: env.NODE_ENV === 'production' }));
  // Behind a proxy the client address comes from X-Forwarded-For; trust only the configured hops.
  app.set('trust proxy', env.TRUST_PROXY);

  app.enableCors({ origin: env.CORS_ORIGINS, credentials: true });
  app.enableShutdownHooks();

  await app.listen(env.API_PORT);
  new Logger('Bootstrap').log(`API listening on port ${env.API_PORT} (${env.NODE_ENV})`);
}

await bootstrap();
